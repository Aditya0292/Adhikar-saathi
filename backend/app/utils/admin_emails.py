from typing import Optional, List
import structlog

logger = structlog.get_logger()

async def send_approval_email(lawyer_email: str, lawyer_name: str) -> None:
    """
    Send an email notifying the lawyer that their profile has been verified.
    TODO: Phase 2 - Implement actual email sending using Supabase Admin API or external provider.
    """
    logger.info("send_approval_email", email=lawyer_email, name=lawyer_name)
    pass


async def send_rejection_email(
    lawyer_email: str,
    lawyer_name: str,
    reason: str,
    missing_docs: Optional[List[str]] = None
) -> None:
    """
    Send an email notifying the lawyer that their application requires attention.
    TODO: Phase 2 - Implement actual email sending using Supabase Admin API or external provider.
    """
    logger.info("send_rejection_email", email=lawyer_email, name=lawyer_name, reason=reason, missing_docs=missing_docs)
    pass
