"""Shared Pydantic v2 response schemas."""
from typing import Generic, TypeVar, Any
from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    trace_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[Any]
    total: int
    page: int
    page_size: int


class ExplainabilityPayload(BaseModel):
    trace_id: str
    output_type: str
    method_tag: str
    confidence_score: float
    source_record_refs: list[dict]


class AIQueryResponse(BaseModel):
    result_type: str
    data: Any
    trace_id: str
    confidence: float
    reasoning_path: list[dict] | None = None
    explainability: ExplainabilityPayload | None = None
