from marshmallow import Schema, fields, validate

from app.models.enums import Context, Origin, Status, ThemeAffinity, VisualKind
from app.schemas.resource import ResourceCreateSchema, ResourceSchema

# Sends `source` on the card for any kind under this size, so the grid can
# attempt a real preview instead of a bare kind-name placeholder — a visual
# whose source is too big just falls back to that placeholder (or the
# frontend's ascii-art cover) on the card, same as before this existed for
# non-svg kinds. See docs/DECISIONS.md.
THUMBNAIL_MAX_BYTES = 20_000


def _values(enum_cls):
    return [member.value for member in enum_cls]


class CategoryRefSchema(Schema):
    slug = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
    color = fields.Str(dump_only=True)


class VisualCardSchema(Schema):
    slug = fields.Str(dump_only=True)
    title = fields.Str(dump_only=True)
    kind = fields.Str(dump_only=True)
    theme_affinity = fields.Str(dump_only=True)
    summary_md = fields.Str(dump_only=True)
    created_on = fields.Date(dump_only=True, allow_none=True)
    needs_sandbox = fields.Bool(dump_only=True)
    attribution = fields.Str(dump_only=True)
    category = fields.Nested(CategoryRefSchema, dump_only=True)
    tags = fields.Method("get_tag_names", dump_only=True)
    # `image`'s actual content is a file, not `source` — cheap to send on
    # every card (it's just a path the browser requests, not the asset
    # bytes themselves), unlike `thumbnail_source` below which is
    # size-gated.
    asset_path = fields.Str(dump_only=True, allow_none=True)
    thumbnail_source = fields.Method("get_thumbnail_source", dump_only=True)

    def get_tag_names(self, visual):
        return [tag.name for tag in visual.tags]

    def get_thumbnail_source(self, visual):
        if visual.kind == VisualKind.IMAGE:
            return None
        if len(visual.source or "") < THUMBNAIL_MAX_BYTES:
            return visual.source
        return None


class VisualDetailSchema(VisualCardSchema):
    source = fields.Str(dump_only=True)
    origin = fields.Str(dump_only=True)
    generator = fields.Str(dump_only=True, allow_none=True)
    context = fields.Str(dump_only=True)
    course = fields.Str(dump_only=True, allow_none=True)
    notes_md = fields.Str(dump_only=True)
    status = fields.Str(dump_only=True)
    resources = fields.Nested(ResourceSchema, many=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class VisualCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=160))
    kind = fields.Str(required=True, validate=validate.OneOf(_values(VisualKind)))
    source = fields.Str(load_default="")
    asset_path = fields.Str(load_default=None, allow_none=True)
    theme_affinity = fields.Str(
        load_default=ThemeAffinity.ADAPTIVE.value, validate=validate.OneOf(_values(ThemeAffinity))
    )
    origin = fields.Str(load_default=Origin.HUMAN.value, validate=validate.OneOf(_values(Origin)))
    generator = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=80))
    created_on = fields.Date(load_default=None, allow_none=True)
    context = fields.Str(load_default=Context.PERSONAL.value, validate=validate.OneOf(_values(Context)))
    course = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=60))
    summary_md = fields.Str(load_default="")
    notes_md = fields.Str(load_default="")
    category_slug = fields.Str(required=True)
    tags = fields.List(fields.Str(), load_default=list)
    resources = fields.List(fields.Nested(ResourceCreateSchema), load_default=list)


class VisualUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=160))
    kind = fields.Str(validate=validate.OneOf(_values(VisualKind)))
    source = fields.Str()
    asset_path = fields.Str(allow_none=True)
    theme_affinity = fields.Str(validate=validate.OneOf(_values(ThemeAffinity)))
    origin = fields.Str(validate=validate.OneOf(_values(Origin)))
    generator = fields.Str(allow_none=True, validate=validate.Length(max=80))
    created_on = fields.Date(allow_none=True)
    context = fields.Str(validate=validate.OneOf(_values(Context)))
    course = fields.Str(allow_none=True, validate=validate.Length(max=60))
    summary_md = fields.Str()
    notes_md = fields.Str()
    category_slug = fields.Str()
    tags = fields.List(fields.Str())


class VisualStatusSchema(Schema):
    status = fields.Str(required=True, validate=validate.OneOf(_values(Status)))
