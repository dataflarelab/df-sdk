from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field, AliasChoices


class DatasetQueryRequest(BaseModel):
    dataset: str
    limit: Optional[int] = Field(default=None, le=1000)
    cursor: Optional[str] = None
    search_term: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class DatasetDocument(BaseModel):
    id: Optional[str] = Field(default=None, validation_alias=AliasChoices("id", "_id"))
    text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    source_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class DatasetQueryResponse(BaseModel):
    data: List[DatasetDocument]
    count: int
    total_count: Optional[int] = None
    next_cursor: Optional[str] = None
    latency: Optional[str] = None
