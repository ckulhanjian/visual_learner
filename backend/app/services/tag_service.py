from sqlalchemy import func

from app.extensions import db
from app.models.associations import visual_tags
from app.models.enums import Status
from app.models.tag import Tag
from app.models.visual import Visual
from app.services.slugs import slugify


class TagService:
    @staticmethod
    def list_with_counts():
        counts = dict(
            db.session.query(visual_tags.c.tag_id, func.count(visual_tags.c.visual_id))
            .join(Visual, Visual.id == visual_tags.c.visual_id)
            .filter(Visual.status == Status.PUBLISHED)
            .group_by(visual_tags.c.tag_id)
            .all()
        )
        tags = Tag.query.order_by(Tag.name.asc()).all()
        return [(t, counts.get(t.id, 0)) for t in tags]

    @staticmethod
    def get_or_create_many(names):
        tags = []
        seen_slugs = set()
        for raw in names:
            name = raw.strip()
            if not name:
                continue
            slug = slugify(name)
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            tag = Tag.query.filter_by(slug=slug).first()
            if not tag:
                tag = Tag(slug=slug, name=name)
                db.session.add(tag)
                db.session.flush()
            tags.append(tag)
        return tags
