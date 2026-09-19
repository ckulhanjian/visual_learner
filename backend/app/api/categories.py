from flask import Blueprint, jsonify, request

from app.schemas.category import CategoryCreateSchema, CategorySchema
from app.schemas.visual import VisualCardSchema
from app.services.auth import require_trusted_request
from app.services.category_service import CategoryService

bp = Blueprint("categories", __name__)


@bp.get("/categories")
def list_categories():
    pairs = CategoryService.list_with_counts()
    data = []
    for category, count in pairs:
        item = CategorySchema().dump(category)
        item["published_count"] = count
        data.append(item)
    return jsonify(data)


@bp.get("/categories/<slug>")
def get_category(slug):
    category = CategoryService.get_by_slug(slug)
    visuals = CategoryService.published_visuals(category)
    data = CategorySchema().dump(category)
    data["visuals"] = VisualCardSchema(many=True).dump(visuals)
    return jsonify(data)


@bp.post("/categories")
def create_category():
    require_trusted_request()
    payload = CategoryCreateSchema().load(request.get_json(force=True) or {})
    category = CategoryService.create(payload)
    return jsonify(CategorySchema().dump(category)), 201


@bp.delete("/categories/<slug>")
def delete_category(slug):
    require_trusted_request()
    CategoryService.delete(slug)
    return "", 204
