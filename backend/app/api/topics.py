from flask import Blueprint, jsonify

from app.schemas.topic import TopicSchema
from app.schemas.visual import CategoryRefSchema
from app.services.topic_service import TopicService

bp = Blueprint("topics", __name__)


@bp.get("/topics")
def list_topics():
    pairs = TopicService.roots_by_category()
    data = [
        {
            "category": CategoryRefSchema().dump(category),
            "topics": TopicSchema(many=True).dump(roots),
        }
        for category, roots in pairs
    ]
    return jsonify(data)
