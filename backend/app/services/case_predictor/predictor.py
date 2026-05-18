"""
case_predictor/predictor.py

FRIEND IMPLEMENTS THIS FILE.

Interface stub — do not change the class/method signatures without
coordinating with the backend lead. Routes call this via:

    from app.services.case_predictor.predictor import CaseOutcomePredictor

    predictor = CaseOutcomePredictor()
    result = await predictor.predict(query, specialisation, jurisdiction)
"""
from dataclasses import dataclass


@dataclass
class OutcomePrediction:
    win_probability: float         # 0.0–1.0
    confidence: float              # model confidence in prediction
    key_factors: list[str]         # what drives the prediction
    similar_cases: list[dict]      # [{"citation": str, "outcome": str, "similarity": float}]
    disclaimer: str                # ALWAYS include legal disclaimer


class CaseOutcomePredictor:
    """
    Predicts likely case outcome based on the legal query, area of law,
    and jurisdiction. Uses historical case data + fine-tuned classifier.

    This is a PREMIUM feature — only available to premium users.
    Feature flag: DOC_SCANNER_ENABLED controls this for now (reuse flag).

    Friend implements using:
        - Fine-tuned classifier on Indian court case data
        - OR few-shot LLM with structured output
        - Must ALWAYS include a legal disclaimer in the response
    """

    async def predict(
        self,
        query: str,
        specialisation: str,    # e.g. "criminal", "civil", "family"
        jurisdiction: str,      # e.g. "Bombay High Court"
        language: str = "en",
    ) -> OutcomePrediction:
        """
        Returns OutcomePrediction.
        Never present this as legal advice — always include disclaimer.
        """
        raise NotImplementedError("Friend implements this")
