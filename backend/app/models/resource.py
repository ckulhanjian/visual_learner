from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.enums import ResourceKind, as_sa_enum


class Resource(db.Model):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(600), nullable=False)
    kind: Mapped[ResourceKind] = mapped_column(as_sa_enum(ResourceKind), nullable=False, default=ResourceKind.OTHER)
    visual_id: Mapped[int] = mapped_column(ForeignKey("visuals.id", ondelete="CASCADE"), index=True, nullable=False)

    visual: Mapped["Visual"] = relationship(back_populates="resources")
