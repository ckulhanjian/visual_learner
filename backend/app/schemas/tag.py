from marshmallow import Schema, fields


class TagSchema(Schema):
    id = fields.Int(dump_only=True)
    slug = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
