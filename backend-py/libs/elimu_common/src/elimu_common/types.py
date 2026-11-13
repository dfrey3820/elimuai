"""Cross-dialect column types.

On the AWS/Postgres branch models use sqlalchemy.dialects.postgresql directly;
on the cPanel/MySQL branch they use these portable equivalents so the same ORM
code runs on MySQL/MariaDB.
"""
from __future__ import annotations

import uuid

from sqlalchemy import CHAR, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.types import JSON, TypeDecorator

__all__ = ["GUID", "PortableJSON", "Inet"]


class GUID(TypeDecorator):
    """UUID stored natively on Postgres, as CHAR(36) elsewhere."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PgUUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None or isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


# MySQL's JSON works with the generic SQLAlchemy JSON type.
PortableJSON = JSON


def Inet() -> String:
    """INET on Postgres is just a VARCHAR(45) elsewhere (fits IPv6)."""
    return String(45)
