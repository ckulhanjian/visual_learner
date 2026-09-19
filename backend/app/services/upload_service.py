import os
import uuid

from flask import current_app

from app.services.errors import ValidationError

# An allowlist, not a denylist of dangerous extensions — a denylist is a guess
# about what is harmful and the guess is always incomplete.
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class UploadService:
    @staticmethod
    def save(file_storage):
        if file_storage is None or file_storage.filename == "":
            raise ValidationError("No file provided.")

        ext = os.path.splitext(file_storage.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"File type '{ext}' is not allowed.",
                details={"allowed": sorted(ALLOWED_EXTENSIONS)},
            )

        file_storage.stream.seek(0, os.SEEK_END)
        size = file_storage.stream.tell()
        file_storage.stream.seek(0)
        if size > MAX_UPLOAD_BYTES:
            raise ValidationError("File exceeds the maximum upload size of 5 MB.")

        upload_dir = current_app.config["UPLOAD_DIR"]
        os.makedirs(upload_dir, exist_ok=True)

        stored_name = f"{uuid.uuid4().hex}{ext}"
        file_storage.save(os.path.join(upload_dir, stored_name))

        return f"/uploads/{stored_name}"
