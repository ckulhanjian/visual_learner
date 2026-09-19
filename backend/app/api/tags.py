from flask import Blueprint, jsonify

from app.schemas.tag import TagSchema
from app.services.tag_service import TagService

bp = Blueprint("tags", __name__)


@bp.get("/tags")
def list_tags():
    pairs = TagService.list_with_counts()
    data = []
    for tag, count in pairs:
        item = TagSchema().dump(tag)
        item["usage_count"] = count
        data.append(item)
    return jsonify(data)
