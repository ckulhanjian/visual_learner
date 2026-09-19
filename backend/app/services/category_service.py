from sqlalchemy import func

from app.extensions import db
from app.models.category import Category
from app.models.enums import Status
from app.models.visual import Visual
from app.services.errors import ConflictError, NotFoundError
from app.services.slugs import make_unique_slug


class CategoryService:
    @staticmethod
    def list_with_counts():
        counts = dict(
            db.session.query(Visual.category_id, func.count(Visual.id))
            .filter(Visual.status == Status.PUBLISHED)
            .group_by(Visual.category_id)
            .all()
        )
        categories = Category.query.order_by(Category.position.asc()).all()
        return [(c, counts.get(c.id, 0)) for c in categories]

    @staticmethod
    def get_by_slug(slug):
        category = Category.query.filter_by(slug=slug).first()
        if not category:
            raise NotFoundError(f"No category '{slug}'.")
        return category

    @staticmethod
    def published_visuals(category):
        return [v for v in category.visuals if v.status == Status.PUBLISHED]

    @staticmethod
    def create(data):
        slug = make_unique_slug(
            data["name"], lambda s: Category.query.filter_by(slug=s).first() is not None
        )
        category = Category(
            slug=slug,
            name=data["name"],
            color=data["color"],
            blurb=data.get("blurb", ""),
            position=data.get("position", 0),
        )
        db.session.add(category)
        db.session.commit()
        return category

    @staticmethod
    def delete(slug):
        category = CategoryService.get_by_slug(slug)
        if category.visuals:
            raise ConflictError(f"Category '{slug}' is not empty.")
        db.session.delete(category)
        db.session.commit()
