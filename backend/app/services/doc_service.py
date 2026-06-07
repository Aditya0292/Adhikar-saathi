"""
Adhikar साथी Legal Doc Scanner — AI Analysis Pipeline
====================================================
OCR extraction → Classification → Parallel analysis → Risk scoring

Handles 12 Indian legal document types:
  rental_agreement, employment_contract, court_summons, fir,
  property_deed, cheque_bounce_notice, consumer_notice,
  loan_agreement, power_of_attorney, will, police_notice,
  government_notice
"""

import asyncio
import hashlib
import io
import json
import logging
from datetime import date, datetime
from statistics import mean
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from app.config import settings
from app.supabase_client import get_service_client
from app.utils.llm_client import generate_chat_completion
from app.utils.redis_client import redis_client

logger = logging.getLogger("doc_service")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PYDANTIC MODELS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class OcrResult(BaseModel):
    text: str
    method: str  # "pdfplumber" | "llm_vision" | "raw_text"
    confidence: float = 1.0
    is_handwritten: bool = False
    language_detected: str = "en"
    page_count: int = 1


class DocumentClassification(BaseModel):
    document_type: str = "other"
    primary_language: str = "en"
    urgency: str = "normal"  # "critical" | "high" | "normal"
    parties: List[str] = Field(default_factory=list)


class KeyClause(BaseModel):
    clause_name: str
    original_text: str = ""
    plain_explanation: str
    importance: str = "standard"  # "critical" | "important" | "standard"


class RiskFlag(BaseModel):
    risk_type: str
    clause_text: str = ""
    severity: str = "medium"  # "critical" | "high" | "medium" | "low"
    plain_explanation: str
    relevant_law: str = ""
    recommendation: str = ""


class CriticalDate(BaseModel):
    date_description: str
    date_value: str = ""  # YYYY-MM-DD
    days_until: int = 0
    is_critical: bool = False
    action_required: str = ""


class LegalReference(BaseModel):
    act_name: str
    section: Optional[str] = None
    plain_description: str
    relevance_to_document: str = ""
    source: str = "applicable_by_type"  # "document_cited" | "applicable_by_type"


class FinalRiskScore(BaseModel):
    score: float
    tier: str  # "low" | "medium" | "high" | "critical"
    suggest_lawyer: bool = False


class RiskAnalysisRaw(BaseModel):
    overall_risk_score: float = 0.3
    risk_tier: str = "low"
    risk_summary: str = ""
    risk_flags: List[RiskFlag] = Field(default_factory=list)


class DocumentAnalysisResult(BaseModel):
    document_id: str
    original_filename: str = ""
    document_type: str = "other"
    document_type_label: str = "Unknown Document"
    language: str = "en"
    ocr_confidence: float = 1.0
    is_handwritten: bool = False
    processing_time_ms: int = 0
    summary: str = ""
    key_clauses: List[KeyClause] = Field(default_factory=list)
    risk_score: float = 0.0
    risk_tier: str = "low"
    risk_flags: List[RiskFlag] = Field(default_factory=list)
    critical_dates: List[CriticalDate] = Field(default_factory=list)
    legal_references: List[LegalReference] = Field(default_factory=list)
    suggest_lawyer: bool = False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONSTANTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOC_TYPE_LABELS = {
    "rental_agreement": "Rental / Lease Agreement",
    "employment_contract": "Employment Contract / Offer Letter",
    "court_summons": "Court Summons / Notice",
    "fir": "FIR (First Information Report)",
    "property_deed": "Property / Sale Deed",
    "cheque_bounce_notice": "Cheque Bounce Notice (S.138 NI Act)",
    "consumer_notice": "Consumer Complaint / Notice",
    "loan_agreement": "Loan / Credit Agreement",
    "power_of_attorney": "Power of Attorney",
    "will": "Will / Testament",
    "police_notice": "Police Notice / Section 41A",
    "government_notice": "Government Notice / Order",
    "other": "Legal Document",
}

# Floor risk scores by document type
TYPE_MINIMUMS = {
    "fir": 0.80,
    "court_summons": 0.65,
    "cheque_bounce_notice": 0.60,
    "police_notice": 0.55,
    "government_notice": 0.45,
    "power_of_attorney": 0.40,
    "loan_agreement": 0.35,
    "property_deed": 0.30,
    "consumer_notice": 0.25,
    "employment_contract": 0.20,
    "rental_agreement": 0.15,
    "will": 0.10,
    "other": 0.10,
}

# Applicable laws by document type (for cross-reference section)
APPLICABLE_LAWS: Dict[str, List[Dict[str, str]]] = {
    "rental_agreement": [
        {"act_name": "Transfer of Property Act 1882", "section": "Sections 105-117", "desc": "Defines leases, rights and obligations of landlord and tenant"},
        {"act_name": "Registration Act 1908", "section": "Section 17", "desc": "Leases over 11 months must be registered to be valid as evidence"},
        {"act_name": "Indian Stamp Act 1899", "section": None, "desc": "Stamp duty requirements for rental agreements (varies by state)"},
    ],
    "employment_contract": [
        {"act_name": "Indian Contract Act 1872", "section": "Section 27", "desc": "Non-compete clauses are generally unenforceable in India"},
        {"act_name": "Payment of Wages Act 1936", "section": None, "desc": "Regulates how and when wages must be paid"},
        {"act_name": "Payment of Gratuity Act 1972", "section": None, "desc": "Employees with 5+ years service are entitled to gratuity"},
        {"act_name": "Employees' Provident Fund Act 1952", "section": None, "desc": "Mandatory PF contributions for eligible employees"},
    ],
    "court_summons": [
        {"act_name": "Bharatiya Nagarik Suraksha Sanhita 2023", "section": None, "desc": "Criminal procedure — summons, warrants, and court appearances"},
        {"act_name": "Code of Civil Procedure 1908", "section": "Order V", "desc": "Civil summons procedure and service requirements"},
    ],
    "fir": [
        {"act_name": "Bharatiya Nyaya Sanhita 2023", "section": None, "desc": "Criminal offences and penalties (replaced IPC)"},
        {"act_name": "Bharatiya Nagarik Suraksha Sanhita 2023", "section": "Section 173", "desc": "Right to receive a copy of the FIR"},
        {"act_name": "Constitution of India", "section": "Article 22", "desc": "Right to be informed of grounds of arrest and right to consult a lawyer"},
    ],
    "property_deed": [
        {"act_name": "Transfer of Property Act 1882", "section": None, "desc": "Governs transfer of property between living persons"},
        {"act_name": "Registration Act 1908", "section": "Section 17", "desc": "Property transfers must be registered to transfer title"},
        {"act_name": "Real Estate (Regulation and Development) Act 2016", "section": "Section 3", "desc": "All new real estate projects must be RERA registered"},
    ],
    "cheque_bounce_notice": [
        {"act_name": "Negotiable Instruments Act 1881", "section": "Section 138", "desc": "Dishonour of cheque for insufficiency of funds — criminal offence"},
    ],
    "consumer_notice": [
        {"act_name": "Consumer Protection Act 2019", "section": None, "desc": "Consumer rights and dispute resolution mechanism"},
        {"act_name": "Consumer Protection (E-Commerce) Rules 2020", "section": None, "desc": "Rules for e-commerce consumer protection"},
    ],
    "loan_agreement": [
        {"act_name": "Indian Contract Act 1872", "section": None, "desc": "General law governing contracts and agreements"},
        {"act_name": "SARFAESI Act 2002", "section": None, "desc": "Secured creditors can enforce security without court intervention"},
        {"act_name": "RBI Fair Practices Code", "section": None, "desc": "Guidelines on fair lending practices, prepayment, and disclosure"},
    ],
    "power_of_attorney": [
        {"act_name": "Powers of Attorney Act 1882", "section": None, "desc": "Legal framework for granting and executing powers of attorney"},
        {"act_name": "Registration Act 1908", "section": None, "desc": "Registration requirements for powers of attorney involving immovable property"},
    ],
    "will": [
        {"act_name": "Indian Succession Act 1925", "section": None, "desc": "Governs testamentary succession and probate"},
        {"act_name": "Hindu Succession Act 1956", "section": None, "desc": "Succession rules for Hindu families"},
    ],
    "police_notice": [
        {"act_name": "Bharatiya Nagarik Suraksha Sanhita 2023", "section": "Section 35 (replaces 41A CrPC)", "desc": "Notice to appear before police — not an arrest. Right to take a lawyer."},
        {"act_name": "Constitution of India", "section": "Article 20(3)", "desc": "Right against self-incrimination — no one can be compelled to be a witness against themselves"},
    ],
    "government_notice": [
        {"act_name": "Income Tax Act 1961", "section": None, "desc": "Taxation of income — notices must be responded to within specified period"},
        {"act_name": "Central Goods and Services Tax Act 2017", "section": None, "desc": "GST compliance and notice response requirements"},
    ],
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 1 — OCR / TEXT EXTRACTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def extract_text(
    file_bytes: bytes,
    content_type: str,
    document_id: str
) -> OcrResult:
    """
    Extract text from uploaded document.
    PDF: tries pdfplumber first (fast, high quality for digital PDFs).
    Images: uses LLM-based text extraction.
    """
    if content_type == "application/pdf":
        return await _extract_from_pdf(file_bytes)
    elif content_type.startswith("image/"):
        return await _extract_from_image(file_bytes, content_type)
    else:
        return OcrResult(
            text="[Unsupported file format]",
            method="none",
            confidence=0.0
        )


async def _extract_from_pdf(file_bytes: bytes) -> OcrResult:
    """Extract text from PDF using pdfplumber."""
    try:
        import pdfplumber

        pages_text = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages_text.append(text)

        full_text = "\n".join(pages_text)

        if len(full_text.strip()) > 100:
            return OcrResult(
                text=full_text,
                method="pdfplumber",
                confidence=0.95,
                is_handwritten=False,
                page_count=page_count,
            )
        else:
            # Scanned PDF — very little extractable text
            # Fall back to LLM-based extraction on first page
            logger.info(f"PDF has minimal text ({len(full_text)} chars), attempting LLM extraction")
            return await _extract_from_image(file_bytes, "application/pdf")

    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
        return OcrResult(
            text="",
            method="pdfplumber_failed",
            confidence=0.0,
        )


async def _extract_from_image(file_bytes: bytes, content_type: str) -> OcrResult:
    """
    Extract text from image using LLM vision capabilities.
    Falls back to a placeholder if no vision-capable model is available.
    """
    import base64

    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    mime = content_type if content_type.startswith("image/") else "image/jpeg"

    # Try OpenAI Vision (GPT-4o-mini) if key available
    if settings.openai_api_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Extract ALL text from this Indian legal document image. "
                                    "Preserve the original layout and formatting as much as possible. "
                                    "Include every word, number, date, and name visible in the document. "
                                    "If the document is handwritten, do your best to transcribe accurately. "
                                    "Output ONLY the extracted text, nothing else."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime};base64,{b64_data}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                "max_tokens": 4000,
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                extracted = data["choices"][0]["message"]["content"]

                return OcrResult(
                    text=extracted,
                    method="openai_vision",
                    confidence=0.85,
                    is_handwritten=False,
                    page_count=1,
                )
        except Exception as e:
            logger.error(f"OpenAI Vision OCR failed: {e}")

    # Fallback: return a message indicating OCR is not available
    return OcrResult(
        text="[Image-based OCR requires an OpenAI API key with vision capabilities. "
             "Please upload a digital PDF instead, or configure OPENAI_API_KEY in your environment.]",
        method="ocr_unavailable",
        confidence=0.0,
        page_count=1,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 2 — DOCUMENT CLASSIFICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFICATION_PROMPT = """Classify this Indian legal document into exactly one of these 12 types:

1. rental_agreement
2. employment_contract
3. court_summons
4. fir
5. property_deed
6. cheque_bounce_notice
7. consumer_notice
8. loan_agreement
9. power_of_attorney
10. will
11. police_notice
12. government_notice
13. other (if none match)

Also extract:
- primary_language: the main language of the document (ISO 639-1 code)
- urgency: "critical" | "high" | "normal"
  critical = court summons/FIR/cheque bounce notice
  high = police notice/government notice
  normal = rental/employment/property/other
- parties: list of party names mentioned (maximum 3, first names only for privacy)

Return as JSON only. No explanation.
{"document_type": "rental_agreement", "primary_language": "en", "urgency": "normal", "parties": ["Ramesh", "Priya Apartments Ltd"]}

Document text (first 2000 chars):
"""


async def classify_document(text: str) -> DocumentClassification:
    """Classify document type using LLM. Caches by text hash."""
    text_hash = hashlib.sha256(text[:500].encode()).hexdigest()[:16]
    cache_key = f"doc_classify:{text_hash}"

    cached = await redis_client.get(cache_key)
    if cached:
        try:
            data = json.loads(cached)
            return DocumentClassification(**data)
        except Exception:
            pass

    try:
        prompt_text = CLASSIFICATION_PROMPT + text[:2000]
        raw = await generate_chat_completion(
            messages=[{"role": "user", "content": prompt_text}],
            system_prompt="You are a legal document classifier. Return only valid JSON.",
            max_tokens=200,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        data = json.loads(raw)
        result = DocumentClassification(
            document_type=data.get("document_type", "other"),
            primary_language=data.get("primary_language", "en"),
            urgency=data.get("urgency", "normal"),
            parties=data.get("parties", [])[:3],
        )

        # Cache for 1 hour
        await redis_client.setex(cache_key, 3600, json.dumps(result.model_dump()))
        return result

    except Exception as e:
        logger.error(f"Document classification failed: {e}")
        return DocumentClassification()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 3 — PARALLEL ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_summary(text: str, classification: DocumentClassification) -> str:
    """Generate plain-language summary."""
    prompt = f"""You are a legal analyst explaining an Indian legal document to a person with no legal education.

Document type: {classification.document_type}
Document language: {classification.primary_language}

Write a plain-language summary that answers:
1. What is this document? (1 sentence)
2. Who are the parties? (name them)
3. What does it require each party to do?
4. What are the most important terms?
5. What could go wrong for the person reading this?

Rules:
- Write in English
- Maximum 200 words
- No legal jargon. If you must use a legal term, immediately explain it in brackets.
- Write as if explaining to a friend.
- Never use bullet points or numbered lists. Write in flowing paragraphs.

Document text:
{text[:6000]}"""

    try:
        return await generate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
        )
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return "Unable to generate summary. Please try again."


async def extract_clauses(text: str, classification: DocumentClassification) -> List[KeyClause]:
    """Extract key clauses from the document."""
    prompt = f"""Extract the most important clauses from this {classification.document_type} document.

For each clause, return a JSON object:
- clause_name: plain English name (e.g. "Security Deposit" not "Consideration")
- original_text: exact text from document (max 150 words)
- plain_explanation: what this means for the person in 1-2 sentences
- importance: "critical" | "important" | "standard"

Return as a JSON object with a "clauses" array. Maximum 8 clauses.
Focus on clauses that directly affect the user's rights or obligations.

Document text:
{text[:6000]}"""

    try:
        raw = await generate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a legal clause extractor. Return only valid JSON with a 'clauses' array.",
            max_tokens=2000,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(raw)
        clauses_raw = data.get("clauses", [])
        return [KeyClause(**c) for c in clauses_raw[:8]]
    except Exception as e:
        logger.error(f"Clause extraction failed: {e}")
        return []


# ━━ RISK PROMPTS — one per document type ━━

RISK_PROMPTS = {
    "rental_agreement": """Analyse this rental agreement for risk factors that could harm the tenant.

Check these specific risk factors in order:
1. Is the lease > 11 months? If yes, is it registered? (Unregistered = legally weak)
2. Security deposit amount — is it more than 3 months rent? (Potentially excessive)
3. Is there a notice period for vacation?
4. Is there a lock-in period? Can tenant exit?
5. Does landlord have unrestricted entry rights?
6. What is the rent escalation clause?
7. Who is responsible for repairs?
8. Is stamp duty mentioned/adequate?
9. What is the dispute resolution mechanism?
10. Is jurisdiction clause local to tenant?""",

    "employment_contract": """Analyse this employment contract for clauses that are unfair to the employee or potentially illegal under Indian employment law.

Check specifically:
1. Non-compete clause → likely unenforceable under Indian Contract Act Section 27
2. Notice period asymmetry (employer shorter than employee)
3. Mandatory unpaid overtime
4. Unilateral salary/designation change clause
5. Intellectual property assignment — too broad?
6. Termination for convenience (any time, no reason)
7. Deductions from salary — are they listed?
8. Is PF/ESI mentioned if applicable?
9. Governing law and jurisdiction clause
10. Non-disparagement clause post-employment""",

    "court_summons": """This is a COURT SUMMONS. Treat as HIGH URGENCY.

Extract and analyse:
1. Hearing date — calculate days remaining from today ({today_date})
2. Court name and full address
3. Case number
4. Whether criminal (CrPC/BNSS) or civil (CPC)
5. All sections/acts mentioned — explain each
6. Whether the person is accused, witness, or party to civil dispute
7. Consequence of non-appearance
8. Whether any bail condition is mentioned

Risk assessment:
- If hearing < 7 days: CRITICAL
- If hearing already passed: CRITICAL + "May have issued warrant/ex-parte order"
- Criminal summons: always HIGH minimum
- Civil summons: MEDIUM minimum""",

    "fir": """This is an FIR (First Information Report). This is always a HIGH or CRITICAL risk document.

Extract:
1. FIR number and date
2. Police station name and district
3. ALL sections charged — for each section: section number, act name, offence name in plain language, whether bailable or non-bailable, maximum punishment
4. Brief description of alleged offence (sanitised, no personal details)
5. Is anticipatory bail needed? (Yes if non-bailable and person is accused)

Return risk_score=0.85 minimum for all FIRs.
Return risk_tier="critical" for non-bailable offences.""",

    "cheque_bounce_notice": """This is a cheque bounce legal notice under Section 138 of the Negotiable Instruments Act.

TIME CRITICAL: The recipient has 15 days from receipt of this notice to make payment.

Extract:
1. Notice date (start of 15-day window)
2. Amount demanded (principal + interest)
3. Cheque number, date, and bank
4. Reason for bounce (as stated in notice)
5. Sender (who sent this notice)
6. Deadline date (notice date + 15 days)
7. Days remaining until deadline

Risk flags:
- If deadline < 3 days: CRITICAL
- If deadline passed: CRITICAL
Today's date: {today_date}""",

    "property_deed": """Analyse this property sale deed for risk factors.

Check:
1. Document registered? (Unregistered = does not transfer title)
2. Stamp duty sufficient?
3. Encumbrance certificate mentioned?
4. Property described with survey number?
5. Seller's title chain mentioned?
6. RERA number for new flat?""",

    "loan_agreement": """Analyse this loan/credit agreement for unfair terms.

Check:
1. Interest rate > 36% p.a.? (Flag usury)
2. Prepayment penalty clause (RBI: no penalty on floating rate)
3. Arbitration clause — who appoints arbitrator?
4. Cross-default clause
5. Hidden charges or processing fees""",

    "power_of_attorney": """Analyse this Power of Attorney document.

Check:
1. General PoA or Specific PoA? (General = HIGH RISK)
2. Does it allow property sale? (CRITICAL if yes — most property frauds involve PoA misuse)
3. Is it irrevocable? (Flag if yes)
4. Duration/expiry specified?
5. Is it registered?""",

    "will": """Analyse this Will/Testament document.

Check:
1. Testator signature present?
2. Two witnesses present and signed?
3. Is it registered? (Not mandatory but safer)
4. Executor named?
5. Any ambiguous distribution of property?
6. Does it comply with applicable succession law?""",

    "police_notice": """This is a Police Notice (Section 41A/35 BNSS). HIGH URGENCY.

Extract:
1. Date to appear at police station
2. Police station name and address
3. Subject of inquiry
4. Sections mentioned

IMPORTANT RIGHTS TO HIGHLIGHT:
- Right to take a lawyer
- Right to remain silent
- Not obliged to give self-incriminating statement (Article 20(3))""",

    "government_notice": """Analyse this government notice/order.

Extract:
1. Issuing authority
2. Subject/purpose of notice
3. Response deadline
4. Consequences of non-response
5. Type: Income Tax / GST / Municipal / Land Acquisition / Other

Flag: "Do not ignore government notices. Missing the response deadline can result in ex-parte orders or penalties."
Today's date: {today_date}""",

    "consumer_notice": """Analyse this consumer complaint/notice.

Extract:
1. Forum tier based on claim amount (District/State/National Commission)
2. Claim amount
3. Product/service complained about
4. Respondent (company/seller)
5. Relief sought

Consumer Commission tiers:
- Up to Rs.50 lakh → District Consumer Commission
- Rs.50 lakh to Rs.2 crore → State Commission
- Above Rs.2 crore → National Commission""",
}

# Default risk prompt for "other" or missing types
DEFAULT_RISK_PROMPT = """Analyse this legal document for any risk factors or concerning clauses.

For each issue found, return:
- risk_type: category of risk
- clause_text: the problematic text (if found)
- severity: "critical" | "high" | "medium" | "low"
- plain_explanation: what risk this creates in simple language
- relevant_law: which Indian law applies
- recommendation: what user should do

Return overall_risk_score (0.0-1.0), risk_tier, and risk_summary.
Today's date: {today_date}"""


async def analyze_risks(text: str, classification: DocumentClassification) -> RiskAnalysisRaw:
    """Run document-type-specific risk analysis."""
    today_str = date.today().isoformat()
    base_prompt = RISK_PROMPTS.get(classification.document_type, DEFAULT_RISK_PROMPT)
    risk_prompt = base_prompt.replace("{today_date}", today_str)

    full_prompt = f"""{risk_prompt}

For each issue found, return a JSON object with:
- risk_type, clause_text, severity, plain_explanation, relevant_law, recommendation

Also return:
- overall_risk_score: 0.0 to 1.0 (0.0 = perfectly fair, 1.0 = extremely dangerous)
- risk_tier: "low" | "medium" | "high" | "critical"
- risk_summary: one paragraph explaining the overall risk level

Return as JSON with "risk_flags" array and top-level fields.

Document text:
{text[:6000]}"""

    try:
        raw = await generate_chat_completion(
            messages=[{"role": "user", "content": full_prompt}],
            system_prompt="You are an Indian legal risk analyst. Return only valid JSON.",
            max_tokens=2000,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(raw)

        flags = []
        for f in data.get("risk_flags", []):
            flags.append(RiskFlag(
                risk_type=f.get("risk_type", "Unknown"),
                clause_text=f.get("clause_text", ""),
                severity=f.get("severity", "medium"),
                plain_explanation=f.get("plain_explanation", ""),
                relevant_law=f.get("relevant_law", ""),
                recommendation=f.get("recommendation", ""),
            ))

        return RiskAnalysisRaw(
            overall_risk_score=float(data.get("overall_risk_score", 0.3)),
            risk_tier=data.get("risk_tier", "low"),
            risk_summary=data.get("risk_summary", ""),
            risk_flags=flags,
        )
    except Exception as e:
        logger.error(f"Risk analysis failed: {e}")
        return RiskAnalysisRaw()


async def extract_dates(text: str, classification: DocumentClassification) -> List[CriticalDate]:
    """Extract critical dates and deadlines."""
    today_str = date.today().isoformat()

    prompt = f"""Extract ALL dates and deadlines from this legal document. Missing a legal deadline can have serious consequences.

For each date found, return a JSON object:
- date_description: what this date means
- date_value: the date in YYYY-MM-DD format. If only month/year given, use last day of month. If relative ("within 30 days"), calculate from document date or today ({today_str}).
- days_until: integer days from today ({today_str}). Negative = already passed.
- is_critical: true if missing this date has legal consequences
- action_required: what the user must do by this date

Sort by: critical first, then by date ascending.
Return as JSON with a "dates" array. Maximum 10 dates.

Document text:
{text[:6000]}"""

    try:
        raw = await generate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a legal date extractor. Return only valid JSON with a 'dates' array.",
            max_tokens=1500,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data = json.loads(raw)
        dates_raw = data.get("dates", [])
        return [CriticalDate(**d) for d in dates_raw[:10]]
    except Exception as e:
        logger.error(f"Date extraction failed: {e}")
        return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 4 — LEGAL CROSS-REFERENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def extract_legal_references(
    text: str,
    document_type: str,
    risk_flags: List[RiskFlag],
) -> List[LegalReference]:
    """Extract cited laws + add applicable-by-type laws."""
    refs: List[LegalReference] = []

    # 1. Add standard laws applicable to this document type
    applicable = APPLICABLE_LAWS.get(document_type, [])
    for law in applicable:
        refs.append(LegalReference(
            act_name=law["act_name"],
            section=law.get("section"),
            plain_description=law["desc"],
            relevance_to_document=f"Applies to all {DOC_TYPE_LABELS.get(document_type, 'legal')} documents",
            source="applicable_by_type",
        ))

    # 2. Extract any laws mentioned in risk flags that aren't already covered
    existing_acts = {r.act_name.lower() for r in refs}
    for flag in risk_flags:
        if flag.relevant_law and flag.relevant_law.lower() not in existing_acts:
            refs.append(LegalReference(
                act_name=flag.relevant_law,
                section=None,
                plain_description=flag.plain_explanation[:100] if flag.plain_explanation else "",
                relevance_to_document="Referenced in risk analysis",
                source="document_cited",
            ))
            existing_acts.add(flag.relevant_law.lower())

    return refs


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 5 — RISK SCORE AGGREGATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def compute_final_risk_score(
    llm_risk_score: float,
    document_type: str,
    risk_flags: List[RiskFlag],
    critical_dates: List[CriticalDate],
) -> FinalRiskScore:
    """Aggregate final risk score from LLM score, type floor, dates, and flags."""
    base_score = llm_risk_score

    # Date-based adjustments
    overdue_dates = [d for d in critical_dates if d.is_critical and d.days_until < 0]
    imminent_dates = [d for d in critical_dates if d.is_critical and 0 <= d.days_until <= 7]

    if overdue_dates:
        base_score = max(base_score, 0.90)
    if imminent_dates:
        base_score = max(base_score, 0.75)

    # Critical flags boost
    critical_flags = [f for f in risk_flags if f.severity == "critical"]
    if critical_flags:
        base_score = max(base_score, 0.70)

    # Document type floor scores
    floor = TYPE_MINIMUMS.get(document_type, 0.10)
    final_score = max(base_score, floor)
    final_score = min(final_score, 1.0)

    # Risk tier
    if final_score >= 0.75:
        tier = "critical"
    elif final_score >= 0.50:
        tier = "high"
    elif final_score >= 0.25:
        tier = "medium"
    else:
        tier = "low"

    return FinalRiskScore(
        score=round(final_score, 2),
        tier=tier,
        suggest_lawyer=(final_score >= 0.50),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STEP 6 — FULL PIPELINE ORCHESTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def update_doc_progress(document_id: str, stage: str, progress: int):
    """Update processing progress in the database."""
    try:
        client = get_service_client()
        client.table("documents").update({
            "processing_progress": progress,
            "processing_status": "processing",
        }).eq("id", document_id).execute()
    except Exception as e:
        logger.error(f"Failed to update progress for {document_id}: {e}")


async def update_doc_status(document_id: str, status: str, error_message: str = ""):
    """Update processing status in the database."""
    try:
        client = get_service_client()
        update_data: Dict[str, Any] = {"processing_status": status}
        if error_message:
            update_data["error_message"] = error_message
        if status == "done":
            update_data["processing_progress"] = 100
        client.table("documents").update(update_data).eq("id", document_id).execute()
    except Exception as e:
        logger.error(f"Failed to update status for {document_id}: {e}")


async def process(document_id: str, storage_path: str, content_type: str) -> None:
    """
    Full document analysis pipeline.
    Called as a background task after upload.
    Updates the documents table in DB at each step.
    """
    import time as _time
    start_time = _time.time()

    try:
        await update_doc_status(document_id, "processing")

        # 1. Download from Supabase Storage
        client = get_service_client()
        try:
            file_bytes = client.storage.from_("user-documents").download(storage_path)
        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            await update_doc_status(document_id, "failed", "Could not read uploaded file.")
            return

        # 2. OCR
        await update_doc_progress(document_id, "ocr", 10)
        ocr_result = await extract_text(file_bytes, content_type, document_id)

        if ocr_result.confidence < 0.1 or len(ocr_result.text.strip()) < 50:
            await update_doc_status(
                document_id, "failed",
                "Could not extract text from document. Please try a clearer scan or upload a digital PDF."
            )
            return

        # 3. Classify
        await update_doc_progress(document_id, "classify", 25)
        classification = await classify_document(ocr_result.text)

        # 4. Parallel analysis (the heavy lifting)
        await update_doc_progress(document_id, "analysis", 40)

        summary, clauses, risk_raw, dates = await asyncio.gather(
            generate_summary(ocr_result.text, classification),
            extract_clauses(ocr_result.text, classification),
            analyze_risks(ocr_result.text, classification),
            extract_dates(ocr_result.text, classification),
        )

        # 5. Legal cross-reference
        await update_doc_progress(document_id, "laws", 75)
        legal_refs = await extract_legal_references(
            ocr_result.text,
            classification.document_type,
            risk_raw.risk_flags,
        )

        # 6. Final risk score
        final_risk = compute_final_risk_score(
            risk_raw.overall_risk_score,
            classification.document_type,
            risk_raw.risk_flags,
            dates,
        )

        # 7. Save everything to DB
        await update_doc_progress(document_id, "saving", 90)

        elapsed_ms = int((_time.time() - start_time) * 1000)

        save_data = {
            "processing_status": "done",
            "processing_progress": 100,
            "document_type": classification.document_type,
            "document_language": ocr_result.language_detected or classification.primary_language,
            "ocr_confidence": round(ocr_result.confidence, 2),
            "is_handwritten": ocr_result.is_handwritten,
            "summary": summary,
            "key_clauses": [c.model_dump() for c in clauses],
            "risk_score": final_risk.score,
            "risk_tier": final_risk.tier,
            "risk_flags": [f.model_dump() for f in risk_raw.risk_flags],
            "risk_summary": risk_raw.risk_summary,
            "critical_dates": [d.model_dump() for d in dates],
            "legal_references": [r.model_dump() for r in legal_refs],
            "suggest_lawyer": final_risk.suggest_lawyer,
            "processing_time_ms": elapsed_ms,
            "ocr_text": ocr_result.text[:10000],  # Store first 10k chars for reference
        }

        try:
            client.table("documents").update(save_data).eq("id", document_id).execute()
        except Exception as e:
            logger.error(f"Failed to save analysis results: {e}")
            await update_doc_status(document_id, "failed", "Failed to save analysis results.")
            return

        logger.info(
            f"Document {document_id} processed successfully in {elapsed_ms}ms. "
            f"Type: {classification.document_type}, Risk: {final_risk.tier} ({final_risk.score})"
        )

    except Exception as e:
        logger.error(f"doc_processing_failed: document_id={document_id}, error={str(e)}")
        await update_doc_status(document_id, "failed", f"Analysis failed: {str(e)}")
