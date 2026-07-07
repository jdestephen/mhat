from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    PROJECT_NAME: str = "Medical History App"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None

    # AUTH
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # STORAGE
    UPLOAD_DIR: str = "/app/uploads"
    STORAGE_LOCAL_MODE: bool = True
    STORAGE_ENDPOINT: Optional[str] = None
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_BUCKET: str = "mhat-documents"
    STORAGE_REGION: str = "auto"
    STORAGE_PRESIGNED_EXPIRY: int = 3600  # 1 hour

    # EMAIL
    EMAIL_ENABLED: bool = False
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "noreply@mhathn.com"
    EMAIL_FROM_NAME: str = "Numa - Historial Médico"

    # TOKEN EXPIRY
    EMAIL_VERIFY_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    # FRONTEND
    FRONTEND_URL: str = "http://localhost:3000"

    # ADMIN
    ADMIN_NOTIFICATION_EMAIL: Optional[str] = None

    # CORS — comma-separated list of allowed origins, configurable per environment.
    # Dev defaults are included so local development works without extra config.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:19000,http://localhost:19006,http://localhost:8081,exp://localhost:19000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
    
    def assemble_db_url(self):
        if not self.DATABASE_URL:
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        # Normalize: ensure asyncpg driver is always used
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
settings.DATABASE_URL = settings.assemble_db_url()
