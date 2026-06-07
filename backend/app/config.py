from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expire_days: int = 7
    spotify_client_id: str
    spotify_client_secret: str
    frontend_url: str
    model_path: str = "./data/processed/classifier_model.pkl"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
