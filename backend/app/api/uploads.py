from flask import Blueprint, jsonify, request

from app.services.rate_limit import enforce_rate_limit
from app.services.upload_service import UploadService

bp = Blueprint("uploads", __name__)


@bp.post("/uploads")
def upload_file():
    enforce_rate_limit()
    asset_path = UploadService.save(request.files.get("file"))
    return jsonify({"asset_path": asset_path}), 201
