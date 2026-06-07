import time
import logging
from typing import Optional
from pydantic import BaseModel
from app.config import settings
from app.utils.llm_client import generate_chat_completion

logger = logging.getLogger(__name__)

class FastModeResponse(BaseModel):
    answer: str
    relevant_law: str
    category: str
    needs_lawyer: bool
    disclaimer: str
    latency_ms: int
    cached: bool
    confidence: Optional[str] = "medium"
    hallucination_guard_passed: Optional[bool] = True

class FastModeService:
    def __init__(self):
        self.model = settings.default_llm_model
        self.provider = settings.default_llm_provider
        
        self.SYSTEM_PROMPT = """
You are Adhikar साथी, an AI legal awareness assistant specializing
exclusively in Indian law. Your purpose is to educate Indian citizens
about their legal rights, applicable laws, consequences of crimes,
and legal procedures in simple, clear language.

STRICT RULES YOU MUST FOLLOW:

1. ONLY answer questions related to Indian law, legal rights, crimes,
   legal procedures, courts, police, consumer rights, property law,
   family law, labour law, constitutional rights, or any topic
   involving the Indian legal system.

2. If a user asks ANYTHING outside Indian legal topics respond with:
   "I can only assist with questions related to Indian law and legal
   matters. Please ask me about your legal rights, applicable laws,
   or legal procedures in India."

3. NEVER make up laws, sections, or case names. If unsure say:
   "I am not certain of the exact section — please verify with a
   legal professional or on Indian Kanoon."

4. ALWAYS end every response with this disclaimer on a new line:
   "⚠️ This is general legal information for awareness purposes only,
   not legal advice. For your specific situation, consult a qualified
   lawyer."

5. Structure responses clearly:
   - Direct answer first
   - Relevant law or act by name
   - Simple explanation
   - Consequences or rights
   - Practical next step

6. Maximum 250 words unless more detail is genuinely needed.

7. Respond in the same language the user uses (English/Hindi/Hinglish).

8. Be empathetic. Explain legal terms in brackets immediately.

9. Never ask for personal information.

10. If the situation sounds like an emergency (arrest, domestic
    violence, accident), start with "This sounds urgent." and give
    immediate actionable steps first.

11. INTENT CLASSIFICATION — After the disclaimer, add exactly:
    INTENT:none
    Replace "none" with:
    - "police"  → FIR, crime report, arrest, theft, assault, harassment
    - "legal"   → need lawyer, legal aid, court, advocate, consultation
    - "traffic" → vehicle, licence, RTO, challan, road accident, traffic
    - "none"    → everything else
    Do not explain this line. Just output it as the very last line.
"""

    async def answer(self, query: str, language: str = "en", session_id: str = None) -> FastModeResponse:
        start_time = time.time()
        
        user_content = f"Please answer in {language if language != 'en' else 'English'}:\n{query}"
        
        try:
            final_response = await generate_chat_completion(
                messages=[{"role": "user", "content": user_content}],
                system_prompt=self.SYSTEM_PROMPT,
                provider=self.provider,
                model=self.model,
                temperature=0.3,
                max_tokens=1024
            )
            
            if not final_response:
                final_response = "I'm having trouble connecting right now."
                
            intent = "none"
            clean_lines = []
            for line in final_response.strip().split("\n"):
                if line.strip().startswith("INTENT:"):
                    intent = line.strip().replace("INTENT:", "").strip().lower()
                else:
                    clean_lines.append(line)
                    
            text = "\n".join(clean_lines).strip()
            
            disclaimer = ""
            answer_text = text
            if "⚠️" in text:
                parts = text.split("⚠️")
                answer_text = parts[0].strip()
                disclaimer = "⚠️" + parts[1].strip()
                
            latency = int((time.time() - start_time) * 1000)
            
            return FastModeResponse(
                answer=answer_text,
                relevant_law="",
                category=intent,
                needs_lawyer=intent in ["legal", "police"],
                disclaimer=disclaimer,
                latency_ms=latency,
                cached=False
            )
            
        except Exception as e:
            print(f"Groq /chat error: {e}")
            latency = int((time.time() - start_time) * 1000)
            return FastModeResponse(
                answer="I'm having trouble connecting right now.",
                relevant_law="",
                category="none",
                needs_lawyer=False,
                disclaimer="",
                latency_ms=latency,
                cached=False
            )

fast_mode_service = FastModeService()
