from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class DatasetQueryRequest(BaseModel):
    dataset: str
    limit: Optional[int] = Field(default=None, le=1000)
    cursor: Optional[str] = None
    search_term: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class DatasetDocument(BaseModel):
    id: str = Field(alias="_id")
    text: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    source_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class DatasetQueryResponse(BaseModel):
    data: List[DatasetDocument]
    count: int
    next_cursor: Optional[str] = None
    latency: Optional[str] = None
