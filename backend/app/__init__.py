import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from app.api.errors import register_error_handlers
from app.config import get_config
from app.extensions import db


def _ensure_sqlite_dir_exists(database_uri):
    if not database_uri.startswith("sqlite:///") or database_uri == "sqlite:///:memory:":
        return
    db_path = database_uri.removeprefix("sqlite:///")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)


def create_app(env_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(env_name))

    _ensure_sqlite_dir_exists(app.config["SQLALCHEMY_DATABASE_URI"])
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)

    origins = [o.strip() for o in app.config["CORS_ORIGINS"].split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})

    db.init_app(app)

    with app.app_context():
        from app.models import associations, category, resource, tag, topic, visual  # noqa: F401

    register_blueprints(app)
    register_error_handlers(app)

    # Not part of the versioned JSON API — just serves what POST /uploads wrote,
    # so the frontend has something to point an <img> at.
    @app.get("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_DIR"], filename)

    return app


def register_blueprints(app):
    from app.api.categories import bp as categories_bp
    from app.api.health import bp as health_bp
    from app.api.meta import bp as meta_bp
    from app.api.tags import bp as tags_bp
    from app.api.topics import bp as topics_bp
    from app.api.uploads import bp as uploads_bp
    from app.api.visuals import bp as visuals_bp

    prefix = "/api/v1"
    app.register_blueprint(health_bp, url_prefix=prefix)
    app.register_blueprint(meta_bp, url_prefix=prefix)
    app.register_blueprint(categories_bp, url_prefix=prefix)
    app.register_blueprint(tags_bp, url_prefix=prefix)
    app.register_blueprint(topics_bp, url_prefix=prefix)
    app.register_blueprint(visuals_bp, url_prefix=prefix)
    app.register_blueprint(uploads_bp, url_prefix=prefix)
