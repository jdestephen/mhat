"""Doctor printing preferences."""
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class PrintSettingsUpdate(BaseModel):
    name_override: str | None = Field(None, max_length=200)
    degree_override: str | None = Field(None, max_length=200)
    clinic_name: str | None = Field(None, max_length=200)
    phone_1: str | None = Field(None, max_length=50)
    phone_2: str | None = Field(None, max_length=50)
    address: str | None = Field(None, max_length=500)
    public_email: EmailStr | None = Field(None, max_length=200)
    show_duration: bool = True
    paper_size: Literal["A4", "LETTER"] = "A4"

    @field_validator(
        "name_override", "degree_override", "clinic_name", "phone_1", "phone_2", "address",
        mode="before",
    )
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else value


class PrintSettingsResponse(PrintSettingsUpdate):
    default_name: str
    default_degree: str | None
    logo_present: bool
