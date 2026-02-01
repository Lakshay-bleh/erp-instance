"""Pydantic and domain models for ERP Incident Triage Portal."""

from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ERPModule(str, Enum):
    AP = "AP"
    AR = "AR"
    GL = "GL"
    Inventory = "Inventory"
    HR = "HR"
    Payroll = "Payroll"


class Environment(str, Enum):
    Prod = "Prod"
    Test = "Test"


class Severity(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


# Display names for classification (Groq chooses one)
CATEGORY_CHOICES = [
    "Configuration Issue",
    "Data Issue",
    "Integration Failure",
    "Security / Access",
    "Unknown",
]


class Category(str, Enum):
    Configuration_Issue = "Configuration Issue"
    Data_Issue = "Data Issue"
    Integration_Failure = "Integration Failure"
    Security_Access = "Security / Access"
    Unknown = "Unknown"


class Status(str, Enum):
    Open = "Open"
    In_Progress = "In Progress"
    Resolved = "Resolved"


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    erp_module: ERPModule
    environment: Environment
    business_unit: str = Field(..., min_length=1, max_length=200)


class IncidentUpdateStatus(BaseModel):
    status: Status


class IncidentUpdateTags(BaseModel):
    tags: List[str] = Field(..., max_length=50)


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    erp_module: str
    environment: str
    business_unit: str
    severity: str
    category: str
    status: str
    tags: List[str] = Field(default_factory=list)
    auto_summary: Optional[str] = None
    suggested_action: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
