from flask import Blueprint, jsonify

from app.models.enums import Context, Origin, ResourceKind, Status, ThemeAffinity, VisualKind

bp = Blueprint("meta", __name__)


@bp.get("/meta")
def meta():
    return jsonify(
        {
            "visual_kinds": [k.value for k in VisualKind],
            "theme_affinities": [k.value for k in ThemeAffinity],
            "origins": [k.value for k in Origin],
            "contexts": [k.value for k in Context],
            "statuses": [k.value for k in Status],
            "resource_kinds": [k.value for k in ResourceKind],
        }
    )
