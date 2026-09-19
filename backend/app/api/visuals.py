from flask import Blueprint, jsonify, request

from app.schemas.visual import (
    VisualCardSchema,
    VisualCreateSchema,
    VisualDetailSchema,
    VisualStatusSchema,
    VisualUpdateSchema,
)
from app.services.auth import is_trusted_request, require_trusted_request
from app.services.rate_limit import enforce_rate_limit
from app.services.visual_service import VisualService

bp = Blueprint("visuals", __name__)


@bp.get("/visuals")
def list_visuals():
    trusted = is_trusted_request()
    visuals = VisualService.list_visuals(
        category_slug=request.args.get("category"),
        tags=request.args.getlist("tag"),
        status=request.args.get("status"),
        include_pending=trusted,
    )
    return jsonify(VisualCardSchema(many=True).dump(visuals))


@bp.get("/visuals/<slug>")
def get_visual(slug):
    trusted = is_trusted_request()
    visual = VisualService.get_by_slug(slug, include_pending=trusted)
    return jsonify(VisualDetailSchema().dump(visual))


@bp.post("/visuals")
def create_visual():
    enforce_rate_limit()
    trusted = is_trusted_request()
    payload = VisualCreateSchema().load(request.get_json(force=True) or {})
    visual = VisualService.create(payload, trusted=trusted)
    return jsonify(VisualDetailSchema().dump(visual)), 201


@bp.patch("/visuals/<slug>")
def update_visual(slug):
    require_trusted_request()
    payload = VisualUpdateSchema().load(request.get_json(force=True) or {}, partial=True)
    visual = VisualService.update(slug, payload)
    return jsonify(VisualDetailSchema().dump(visual))


@bp.post("/visuals/<slug>/status")
def update_visual_status(slug):
    require_trusted_request()
    payload = VisualStatusSchema().load(request.get_json(force=True) or {})
    visual = VisualService.set_status(slug, payload["status"])
    return jsonify(VisualDetailSchema().dump(visual))


@bp.delete("/visuals/<slug>")
def delete_visual(slug):
    require_trusted_request()
    VisualService.delete(slug)
    return "", 204
