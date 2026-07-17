from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "schools-service"
    port: int = 5102
    max_teachers_per_school: int = 40
    max_batch_teachers: int = 50
    max_batch_students: int = 100
