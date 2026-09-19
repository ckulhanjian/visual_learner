from sqlalchemy import Column, ForeignKey, Integer, Table

from app.extensions import db

visual_tags = Table(
    "visual_tags",
    db.Model.metadata,
    Column("visual_id", Integer, ForeignKey("visuals.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
