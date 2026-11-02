"""Typed settings loaded from the environment / .env."""

from pydantic import Field
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


settings = Settings()
