from app.extensions import db
from app.models.category import Category
from app.models.enums import Status, VisualKind
from app.models.resource import Resource
from app.models.visual import Visual
from app.services.errors import NotFoundError, ValidationError
from app.services.slugs import make_unique_slug
from app.services.tag_service import TagService

UPDATABLE_FIELDS = (
    "title",
    "source",
    "asset_path",
    "theme_affinity",
    "origin",
    "generator",
    "created_on",
    "context",
    "course",
    "summary_md",
    "notes_md",
)


class VisualService:
    @staticmethod
    def list_visuals(category_slug=None, tags=None, status=None, include_pending=False):
        query = Visual.query

        if category_slug:
            category = Category.query.filter_by(slug=category_slug).first()
            if not category:
                return []
            query = query.filter(Visual.category_id == category.id)

        for tag_slug in tags or []:
            query = query.filter(Visual.tags.any(slug=tag_slug))

        if include_pending and status:
            query = query.filter(Visual.status == Status(status))
        else:
            query = query.filter(Visual.status == Status.PUBLISHED)

        return query.order_by(Visual.created_at.desc()).all()

    @staticmethod
    def get_by_slug(slug, include_pending=False):
        visual = Visual.query.filter_by(slug=slug).first()
        # A pending visual returns 404, not 403, so the moderation queue cannot
        # be enumerated by guessing slugs — same response whether it's missing
        # or just not public yet.
        if not visual or (visual.status != Status.PUBLISHED and not include_pending):
            raise NotFoundError(f"No visual '{slug}'.")
        return visual

    @staticmethod
    def _require_category(category_slug):
        category = Category.query.filter_by(slug=category_slug).first()
        if not category:
            raise ValidationError("Unknown category.", details={"field": "category_slug"})
        return category

    @staticmethod
    def create(data, trusted):
        category = VisualService._require_category(data["category_slug"])
        kind = VisualKind(data["kind"])

        if kind == VisualKind.IMAGE and not data.get("asset_path"):
            raise ValidationError("An image visual requires asset_path.", details={"field": "asset_path"})
        if kind != VisualKind.IMAGE and not data.get("source"):
            raise ValidationError("This kind requires source content.", details={"field": "source"})

        slug = make_unique_slug(
            data["title"], lambda s: Visual.query.filter_by(slug=s).first() is not None
        )

        visual = Visual(
            slug=slug,
            title=data["title"],
            kind=kind,
            source=data.get("source", ""),
            asset_path=data.get("asset_path"),
            theme_affinity=data.get("theme_affinity", "adaptive"),
            origin=data.get("origin", "human"),
            generator=data.get("generator"),
            created_on=data.get("created_on"),
            context=data.get("context", "personal"),
            course=data.get("course"),
            summary_md=data.get("summary_md", ""),
            notes_md=data.get("notes_md", ""),
            status=Status.PUBLISHED if trusted else Status.PENDING,
            category=category,
        )
        # Register with the session before anything below triggers an autoflush
        # (TagService's lookup queries do): otherwise SQLAlchemy tries to flush
        # the category->visual backref for a visual the session doesn't know yet.
        db.session.add(visual)

        visual.tags = TagService.get_or_create_many(data.get("tags", []))
        visual.resources = [
            Resource(label=r["label"], url=r["url"], kind=r.get("kind", "other"))
            for r in data.get("resources", [])
        ]

        db.session.commit()
        return visual

    @staticmethod
    def update(slug, data):
        visual = Visual.query.filter_by(slug=slug).first()
        if not visual:
            raise NotFoundError(f"No visual '{slug}'.")

        if "category_slug" in data:
            visual.category = VisualService._require_category(data["category_slug"])

        for field in UPDATABLE_FIELDS:
            if field in data:
                setattr(visual, field, data[field])

        if "kind" in data:
            visual.kind = VisualKind(data["kind"])

        if "tags" in data:
            visual.tags = TagService.get_or_create_many(data["tags"])

        db.session.commit()
        return visual

    @staticmethod
    def set_status(slug, new_status):
        visual = Visual.query.filter_by(slug=slug).first()
        if not visual:
            raise NotFoundError(f"No visual '{slug}'.")
        visual.status = Status(new_status)
        db.session.commit()
        return visual

    @staticmethod
    def delete(slug):
        visual = Visual.query.filter_by(slug=slug).first()
        if not visual:
            raise NotFoundError(f"No visual '{slug}'.")
        db.session.delete(visual)
        db.session.commit()
