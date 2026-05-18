"""
hallucination_guard/guard.py

FRIEND IMPLEMENTS THIS FILE.

Interface stub — do not change the class/method signatures without
coordinating with the backend lead. Routes call this via:

    from app.services.hallucination_guard.guard import HallucinationGuard

    guard = HallucinationGuard()
    result = await guard.check(answer, citations, query)
"""
from dataclasses import dataclass


@dataclass
class GuardResult:
    passed: bool
    confidence: float          # 0.0–1.0 — how confident the guard is that this is safe
    flagged_sentences: list[str]   # sentences that look hallucinated
    reason: str | None             # human-readable explanation if failed


class HallucinationGuard:
    """
    Checks whether an AI-generated legal answer is grounded in the
    provided citations and does not contain fabricated legal claims.

    Friend implements using:
        - NLI (Natural Language Inference) model, OR
        - LLM self-check prompt, OR
        - Sentence-level citation coverage scoring
    """

    async def check(
        self,
        answer: str,
        citations: list[dict],   # list of {"source": str, "text": str}
        original_query: str,
    ) -> GuardResult:
        """
        Returns GuardResult.
        If passed=False, the route returns the answer with a warning banner.
        Answer is NEVER blocked — only flagged.
        """
        raise NotImplementedError("Friend implements this")
