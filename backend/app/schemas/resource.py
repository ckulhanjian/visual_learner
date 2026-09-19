from marshmallow import Schema, fields, validate

from app.models.enums import ResourceKind


class ResourceSchema(Schema):
    id = fields.Int(dump_only=True)
    label = fields.Str(dump_only=True)
    url = fields.Url(dump_only=True)
    kind = fields.Str(dump_only=True)


class ResourceCreateSchema(Schema):
    label = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    url = fields.Url(required=True, schemes={"http", "https"})
    kind = fields.Str(
        load_default=ResourceKind.OTHER.value,
        validate=validate.OneOf([k.value for k in ResourceKind]),
    )
