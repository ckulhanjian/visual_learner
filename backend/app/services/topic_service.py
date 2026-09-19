from collections import defaultdict

from app.models.category import Category
from app.models.topic import Topic


class TopicService:
    @staticmethod
    def roots_by_category():
        """Every category paired with its top-level topics.

        Children come along for free via Topic.children (ordered, per the
        relationship's own order_by) — no manual tree-building here.
        """
        categories = Category.query.order_by(Category.position).all()
        roots = Topic.query.filter(Topic.parent_id.is_(None)).order_by(Topic.position, Topic.name).all()

        roots_by_category_id = defaultdict(list)
        for topic in roots:
            roots_by_category_id[topic.category_id].append(topic)

        return [(category, roots_by_category_id.get(category.id, [])) for category in categories]
