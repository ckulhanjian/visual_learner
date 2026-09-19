from flask import jsonify
from marshmallow import ValidationError as MarshmallowValidationError

from app.services.errors import DomainError


def register_error_handlers(app):
    @app.errorhandler(DomainError)
    def handle_domain_error(err):
        response = jsonify({"error": err.code, "message": err.message, "details": err.details})
        response.status_code = err.status
        if err.code == "rate_limited":
            response.headers["Retry-After"] = str(err.retry_after)
        return response

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_error(err):
        response = jsonify({"error": "validation_error", "message": "Invalid request.", "details": err.messages})
        response.status_code = 422
        return response

    @app.errorhandler(404)
    def handle_404(err):
        response = jsonify({"error": "no_such_endpoint", "message": "No such endpoint.", "details": {}})
        response.status_code = 404
        return response

    @app.errorhandler(500)
    def handle_500(err):
        response = jsonify({"error": "internal_error", "message": "Something went wrong.", "details": {}})
        response.status_code = 500
        return response
