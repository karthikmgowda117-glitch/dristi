"""Jurisdiction scope filter — applied POST-parse, BEFORE execution."""
from shared.auth import UserContext
from .grammar import QueryIntent


def apply_jurisdiction_scope(intent: QueryIntent, user: UserContext) -> QueryIntent:
    """
    Injects the user's jurisdiction unit_id into the intent.
    This filter runs AFTER LLM parsing to prevent prompt injection
    attempts from escaping jurisdiction boundaries.
    """
    # Policymaker/Admin: see all (scoped at DB view level)
    if user.role in ("POLICYMAKER", "ADMIN"):
        return intent

    # Inject user's unit_id — overwrites any unitId in LLM output
    intent.unit_id = user.unit_id
    intent.filters["_jurisdiction_unit_id"] = user.unit_id
    intent.filters["_jurisdiction_path"] = user.jurisdiction_path

    return intent
