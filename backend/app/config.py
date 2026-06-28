from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "SAS UCAB FINANCE API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+psycopg2://user:pass@localhost:5432/sas_ucab"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    NEON_AUTH_URL: str = "https://ep-morning-art-ad42yeb6.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth"
    NEON_AUTH_JWKS_URL: str = "https://ep-morning-art-ad42yeb6.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json"

    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()
