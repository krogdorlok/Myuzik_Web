"""Typed settings loaded from the environment / .env."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str = Field(min_length=32)
    jwt_expire_days: int = 7
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    frontend_url: str
    vggish_path: str = "./models/vggish.tflite"
    classifier_path: str = "./app/ml/classifier.npz"
    log_level: str = "INFO"

    @field_validator("database_url")
    @classmethod
    def use_asyncpg(cls, v: str) -> str:
        """Accept the plain postgres(ql):// URLs hosting providers hand out."""
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v.removeprefix(prefix)
        return v


settings = Settings()
