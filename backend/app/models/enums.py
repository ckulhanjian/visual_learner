import enum

from sqlalchemy import Enum as SAEnum


class _StrEnum(str, enum.Enum):
    # Later Python versions changed str(str, Enum) to render "ClassName.MEMBER"
    # instead of the raw value, which broke every Marshmallow string dump. Force
    # str() back to the value so "pending" serializes as "pending", not "Status.PENDING".
    def __str__(self):
        return str(self.value)


class VisualKind(_StrEnum):
    SVG = "svg"
    IMAGE = "image"
    CHARTJS = "chartjs"
    D3 = "d3"
    HTML = "html"
    P5 = "p5"

    @classmethod
    def code_bearing(cls):
        return {cls.D3, cls.HTML, cls.P5}


class ThemeAffinity(_StrEnum):
    ADAPTIVE = "adaptive"
    LIGHT = "light"
    DARK = "dark"


class Origin(_StrEnum):
    HUMAN = "human"
    MACHINE = "machine"
    HYBRID = "hybrid"


class Context(_StrEnum):
    CLASS = "class"
    PERSONAL = "personal"


class Status(_StrEnum):
    PENDING = "pending"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ResourceKind(_StrEnum):
    PAPER = "paper"
    VIDEO = "video"
    REPO = "repo"
    ARTICLE = "article"
    OTHER = "other"


def as_sa_enum(enum_cls):
    # native_enum=False -> VARCHAR + CHECK. A real Postgres ENUM needs a migration
    # to add a value; this keeps the eventual Postgres move a connection-string change.
    return SAEnum(enum_cls, native_enum=False, values_callable=lambda e: [member.value for member in e])
