import time
import os
import asyncio
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from pinecone_text.sparse import BM25Encoder
import cohere
import json
import logging

from app.config import settings
from app.utils.llm_client import generate_chat_completion, LLMProvider

logger = logging.getLogger(__name__)

class Citation(BaseModel):
    index: int
    act_name: str
    section: str
    case_name: str
    court: str
    year: str
    excerpt: str
    url: Optional[str] = None

class VerifiedModeResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: str
    hallucination_guard_passed: bool
    latency_ms: int
    disclaimer: str
    accuracy: Optional[int] = None
    query_type: Optional[str] = None
    needs_lawyer: bool = False


class VerifiedModeService:
    def __init__(self):
        self.model_name = settings.default_llm_model
        self.provider = settings.default_llm_provider
        
        if settings.pinecone_api_key:
            self.pc = Pinecone(api_key=settings.pinecone_api_key)
            self.index = self.pc.Index(settings.pinecone_index_name)
        else:
            self.pc = None
            self.index = None
            
        self.cohere_client = cohere.Client(settings.cohere_api_key) if settings.cohere_api_key else None
        
        try:
            self.model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')
        except Exception:
            self.model = None

        self.bm25 = None
        bm25_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "rag-mode", "bm25_encoder.json")
        try:
            if os.path.exists(bm25_path):
                self.bm25 = BM25Encoder().load(bm25_path)
            else:
                logger.warning(f"{bm25_path} not found. Hybrid search will fail.")
        except Exception as e:
            logger.error(f"Error loading BM25: {e}")

    def embed_query(self, text: str) -> list[float]:
        if not self.model: return []
        embedding = self.model.encode(text, normalize_embeddings=True).tolist()
        return embedding

    async def classify_query(self, query: str) -> str:
        try:
            completion = await generate_chat_completion(
                messages=[{"role": "user", "content": query}],
                system_prompt="Classify the following Indian legal query into ONE of these exact categories: criminal, civil, consumer, constitutional, labour, women, other. Output ONLY the category word.",
                provider=self.provider,
                model=self.model_name,
                temperature=0.1,
                max_tokens=20
            )
            return completion.strip().lower()
        except Exception as e:
            logger.error(f"Error classifying query: {e}")
            return "other"

    async def hyde_expand(self, query: str, query_type: str = "other") -> str:
        try:
            system_prompt = (
                f"Write a hypothetical paragraph from an Indian legal document that answers: {query}. "
                "Include specific terms like section numbers, acts, or rules where applicable. "
                "Write as actual legal text, not as an answer."
            )
            completion = await generate_chat_completion(
                messages=[{"role": "user", "content": system_prompt}],
                provider=self.provider,
                model=self.model_name,
                temperature=0.1,
                max_tokens=150
            )
            return completion.strip()
        except Exception as e:
            logger.error(f"Error in hyde expand: {e}")
            return query

    async def hybrid_search(self, query: str, original_query: str = None, top_k: int = 20, query_type: str = "other", hypothetical_doc: str = None) -> list:
        hyde_query = original_query if original_query else query
        if not hypothetical_doc:
            if len(hyde_query.split()) < 10:
                hypothetical_doc = hyde_query
            else:
                hypothetical_doc = await self.hyde_expand(hyde_query, query_type)
            
        if self.bm25 is None or not self.index:
            return []
            
        # Run CPU-bound embedding and BM25 encoding concurrently in separate threads
        dense_vec, sparse_vec = await asyncio.gather(
            asyncio.to_thread(self.embed_query, hypothetical_doc),
            asyncio.to_thread(self.bm25.encode_queries, query)
        )
        
        # Run Pinecone query in a separate thread to avoid blocking the event loop
        def run_pinecone():
            return self.index.query(
                vector=dense_vec,
                sparse_vector=sparse_vec,
                top_k=top_k,
                include_metadata=True
            )
            
        results = await asyncio.to_thread(run_pinecone)
        return results.get("matches", [])

    async def rerank(self, query: str, candidates: list, top_n: int = 3, query_type: str = "other") -> list:
        if not candidates or not self.cohere_client: return candidates[:top_n]
        
        def run_cohere():
            documents = [c["metadata"]["text"] for c in candidates if "text" in c["metadata"]]
            if not documents: return candidates[:top_n]
            try:
                return self.cohere_client.rerank(
                    model="rerank-multilingual-v3.0",
                    query=query,
                    documents=documents,
                    top_n=top_n
                )
            except Exception as e:
                logger.error(f"Cohere API call failed: {e}")
                return None
            
        try:
            reranked = await asyncio.to_thread(run_cohere)
            if reranked is None:
                return [c for c in candidates if c.get("score", 0) > 0.5][:top_n]
                
            filtered_candidates = []
            for r in reranked.results:
                if query_type in ["consumer", "women", "criminal"] or r.relevance_score > 0.1:
                    cand_obj = candidates[r.index]
                    if hasattr(cand_obj, "to_dict"):
                        cand = cand_obj.to_dict()
                    elif hasattr(cand_obj, "dict"):
                        cand = cand_obj.dict()
                    else:
                        cand = dict(cand_obj)
                    cand["rerank_score"] = r.relevance_score
                    filtered_candidates.append(cand)
            return filtered_candidates
        except Exception as e:
            logger.error(f"Cohere rerank error: {e}")
            return [c for c in candidates if c.get("score", 0) > 0.5][:top_n]

    async def check_faithfulness(self, answer: str, context: str) -> dict:
        prompt = f"""
        Given the context and the answer, check if the answer is faithful to the context.
        Context: {context}
        Answer: {answer}
        
        Return JSON with "faithful" (bool) and "score" (0-100).
        """
        try:
            completion = await generate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                provider=self.provider,
                model=self.model_name,
                temperature=0.1,
                max_tokens=100,
                response_format={"type": "json_object"}
            )
            result = json.loads(completion)
            return {
                "faithful": result.get("faithful", True),
                "score": result.get("score", 50)
            }
        except Exception as e:
            logger.error(f"Error checking faithfulness: {e}")
            return {"faithful": True, "score": 50}

    async def answer(self, query: str, language: str = "en", session_id: str = None) -> VerifiedModeResponse:
        start_time = time.time()
        
        # Resolve target language name
        lang_names = {
            "en": "English",
            "hi": "Hindi",
            "ta": "Tamil",
            "te": "Telugu",
            "bn": "Bengali",
            "mr": "Marathi",
            "gu": "Gujarati",
            "kn": "Kannada",
            "ml": "Malayalam",
            "pa": "Punjabi",
            "or": "Odia"
        }
        lang_prefix = language.lower().split("-")[0]
        target_lang_name = lang_names.get(lang_prefix, "English")
        
        # Translate query to English internally for RAG if it's in a regional language
        english_query = query
        if lang_prefix != "en":
            try:
                translation_prompt = f"Translate the following Indian legal query to English. Do not add any explanation or preamble. Output ONLY the English translation:\n{query}"
                translation_res = await generate_chat_completion(
                    messages=[{"role": "user", "content": translation_prompt}],
                    provider=self.provider,
                    model=self.model_name,
                    temperature=0.1,
                    max_tokens=150
                )
                if translation_res and translation_res.strip():
                    english_query = translation_res.strip()
                    logger.info(f"Translated query '{query}' to '{english_query}' for internal RAG processing")
            except Exception as te:
                logger.error(f"Failed to translate query to English: {te}")

        # Start classifying the query immediately in the background using the English translation
        classify_task = asyncio.create_task(self.classify_query(english_query))
        
        # If the query is long, start HyDE query expansion in parallel
        hyde_query = english_query
        if len(hyde_query.split()) >= 10:
            hyde_task = asyncio.create_task(self.hyde_expand(hyde_query))
            query_type, hypothetical_doc = await asyncio.gather(classify_task, hyde_task)
        else:
            query_type = await classify_task
            hypothetical_doc = hyde_query
            
        if query_type == "other":
            latency = int((time.time() - start_time) * 1000)
            return VerifiedModeResponse(
                answer="I can only answer questions related to Indian law. Please ask about your legal rights or legal procedures in India.",
                citations=[],
                confidence="high",
                hallucination_guard_passed=False,
                latency_ms=latency,
                disclaimer="",
                accuracy=0,
                query_type="other",
                needs_lawyer=False
            )
            
        # Retrieve
        expanded_query = english_query
        if query_type == "consumer" or any(w in english_query.lower() for w in ["refund", "defective", "amazon"]):
            expanded_query = english_query + " Consumer Protection Act 2019"
            
        candidates = await self.hybrid_search(
            expanded_query,
            original_query=english_query,
            top_k=20,
            query_type=query_type,
            hypothetical_doc=hypothetical_doc
        )
        reranked = await self.rerank(expanded_query, candidates, top_n=3, query_type=query_type)
        
        context_parts = []
        citations = []
        
        for i, c in enumerate(reranked):
            meta = c.get("metadata", {})
            text = meta.get("text", "")
            if not text: continue
            
            source_name = meta.get("source", "Unknown Source")
            chunk_id = meta.get("chunk_id", str(i+1))
            
            chunk_context = f"[Source {i+1} | {source_name}]\n{text}\n---"
            context_parts.append(chunk_context)
            
            citations.append(Citation(
                index=i+1,
                act_name=source_name,
                section=chunk_id,
                case_name="",
                court="",
                year="",
                excerpt=text[:200] + "...",
                url=None
            ))
            
        context_string = "\n\n".join(context_parts)
        
        if not context_string:
            prompt = f"""
            Answer the following legal query about Indian law based on your general knowledge.
            Explain the rights and procedures clearly.
            
            STRICT OUTPUT FORMAT:
            You MUST format your answer exactly like this, using these exact headings:
            
            Direct Answer: [Give a clear, direct answer to the user's question]
            
            Relevant Law: [List the specific Acts or laws that apply]
            
            Plain Explanation: [Explain the law and consequences in simple, easy-to-understand language]
            
            Next Step: [Give practical, actionable advice on what the user should do next]
            
            Sources Used: General AI Knowledge (No specific documents found in database)
            
            Verified from Adhikar साथी legal database.
            
            Query: {query}
            Please answer in {target_lang_name}.
            """
            fallback_used = True
        else:
            prompt = f"""
            Answer the following legal query using ONLY the provided context.
            If the context does not contain the exact answer, you may supplement it with your general knowledge of Indian law, but clearly state what is from the source.
            
            STRICT OUTPUT FORMAT:
            You MUST format your answer exactly like this, using these exact headings:
            
            Direct Answer: [Give a clear, direct answer to the user's question, citing the [Source X] whenever you state a fact]
            
            Relevant Law: [List the specific Indian Penal Code sections, Acts, or laws mentioned in the sources]
            
            Plain Explanation: [Explain the law and consequences in simple, easy-to-understand language]
            
            Next Step: [Give practical, actionable advice on what the user should do next]
            
            Sources Used: [List the sources you used, e.g. [Source 1], [Source 2]]
            
            Verified from Adhikar साथी legal database.
            
            Context:
            {context_string}
            
            Query: {query}
            Please answer in {target_lang_name}.
            """
            fallback_used = False
        
        try:
            final_response = await generate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                provider=self.provider,
                model=self.model_name,
                temperature=0.3,
                max_tokens=1024
            )
            final_response = final_response.strip()
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return VerifiedModeResponse(
                answer="Sorry, the LLM API is currently unavailable.",
                citations=citations,
                confidence="low",
                hallucination_guard_passed=False,
                latency_ms=int((time.time() - start_time) * 1000),
                disclaimer="API Error",
                accuracy=0,
                query_type="unknown",
                needs_lawyer=False
            )
        
        faith_result = await self.check_faithfulness(final_response, context_string)
        faith_score = faith_result["score"]
        
        if faith_score >= 80: confidence = "high"
        elif faith_score >= 50: confidence = "medium"
        else: confidence = "low"
        
        is_verified = faith_score >= 35 and "No verified legal information found" not in final_response
        
        if fallback_used:
            final_disclaimer = "⚠️ Answer generated from general AI knowledge. No specific verified sources were found in your database."
            is_verified = False
        else:
            final_disclaimer = "⚠️ This is AI-generated legal information based on verified sources, not professional legal advice."
            
        latency = int((time.time() - start_time) * 1000)
        
        # Determine if lawyer matching is needed
        needs_lawyer = False
        if query_type in ["criminal", "civil", "consumer", "labour", "women"]:
            needs_lawyer = True
        
        query_lower = english_query.lower()
        lawyer_keywords = ["lawyer", "advocate", "consult", "hire", "attorney", "court", "fir", "police", "arrest", "legal aid", "representation", "sue", "litigation"]
        if any(kw in query_lower for kw in lawyer_keywords):
            needs_lawyer = True
            
        return VerifiedModeResponse(
            answer=final_response,
            citations=citations,
            confidence=confidence,
            hallucination_guard_passed=is_verified,
            latency_ms=latency,
            disclaimer=final_disclaimer,
            accuracy=faith_score,
            query_type=query_type,
            needs_lawyer=needs_lawyer
        )

verified_mode_service = VerifiedModeService()
