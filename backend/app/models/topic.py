from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class Topic(db.Model):
    """A node in a category's subject tree (Programming > Data Structures > Stack).

    No timestamps, same reasoning as Tag: a topic is a name in a hierarchy,
    not an event. Slugs are unique per category, not globally — two
    categories may each have their own "basics" topic.
    """

    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("category_id", "slug", name="uq_topic_category_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True, nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=True
    )

    category: Mapped["Category"] = relationship(back_populates="topics")
    parent: Mapped[Optional["Topic"]] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[List["Topic"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Topic.position, Topic.name",
    )
