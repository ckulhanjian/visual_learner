from marshmallow import Schema, fields, validate


class CategorySchema(Schema):
    id = fields.Int(dump_only=True)
    slug = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
    color = fields.Str(dump_only=True)
    blurb = fields.Str(dump_only=True)
    position = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CategoryCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    color = fields.Str(required=True, validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"))
    blurb = fields.Str(load_default="")
    position = fields.Int(load_default=0)
