import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class BaseConfig:
    ATLAS_ENV = os.environ.get("ATLAS_ENV", "development")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Empty by design: is_trusted_request() fails closed when no key is configured.
    ATLAS_WRITE_KEY = os.environ.get("ATLAS_WRITE_KEY", "")
    RATE_LIMIT_MAX = int(os.environ.get("RATE_LIMIT_MAX", 20))
    RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", 3600))
    UPLOAD_DIR = os.environ.get("UPLOAD_DIR") or os.path.join(BASE_DIR, "uploads")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        "sqlite:///" + os.path.join(BASE_DIR, "instance", "atlas.db")
    )


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(BaseConfig):
    DEBUG = False


_CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(env_name=None):
    env_name = env_name or os.environ.get("ATLAS_ENV", "development")
    return _CONFIGS.get(env_name, DevelopmentConfig)
