from marshmallow import Schema, fields


class TopicSchema(Schema):
    slug = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
    # Recursive: a topic's own children serialize the same way, however deep
    # the tree goes (Programming > Data Structures > Stack has one level of
    # nesting; nothing stops a future topic from going deeper).
    children = fields.List(fields.Nested(lambda: TopicSchema()), dump_only=True)
