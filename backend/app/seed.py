from datetime import date

from app.extensions import db
from app.models.category import Category
from app.models.resource import Resource
from app.models.tag import Tag
from app.models.visual import Visual
from app.services.slugs import slugify

CATEGORIES = [
    {"name": "Physics", "color": "#EE352E", "blurb": "Mechanics, waves, fields.", "position": 0},
    {"name": "Signals & Systems", "color": "#0039A6", "blurb": "Transforms, filters, control.", "position": 1},
    {"name": "Programming", "color": "#00933C", "blurb": "Algorithms and data structures.", "position": 2},
    {"name": "Circuits", "color": "#FF6319", "blurb": "Analog and digital circuit design.", "position": 3},
]


def _get_or_create_category(data):
    slug = slugify(data["name"])
    category = Category.query.filter_by(slug=slug).first()
    if category:
        return category
    category = Category(slug=slug, **data)
    db.session.add(category)
    db.session.flush()
    return category


def _get_or_create_tag(name):
    slug = slugify(name)
    tag = Tag.query.filter_by(slug=slug).first()
    if tag:
        return tag
    tag = Tag(slug=slug, name=name)
    db.session.add(tag)
    db.session.flush()
    return tag


def _get_or_create_visual(slug, **kwargs):
    visual = Visual.query.filter_by(slug=slug).first()
    if visual:
        return visual
    visual = Visual(slug=slug, **kwargs)
    db.session.add(visual)
    db.session.flush()
    return visual


def run_seed():
    categories = {c["name"]: _get_or_create_category(c) for c in CATEGORIES}

    fourier_tag = _get_or_create_tag("Fourier Analysis")
    waves_tag = _get_or_create_tag("Waves")

    square_wave = _get_or_create_visual(
        "fourier-series-square-wave",
        title="Fourier Series: Square Wave",
        kind="svg",
        source="<svg viewBox='0 0 200 100'><polyline points='0,50 200,50' stroke='black' fill='none'/></svg>",
        theme_affinity="adaptive",
        origin="human",
        created_on=date(2025, 3, 12),
        context="class",
        course="EEL 3135",
        summary_md="Building a square wave from its odd harmonics.",
        notes_md="# Fourier Series\n\nA square wave is the sum of its odd harmonics:\n\n"
        "$$f(x) = \\frac{4}{\\pi} \\sum_{k=1,3,5,\\dots} \\frac{1}{k} \\sin(kx)$$",
        status="published",
        category=categories["Signals & Systems"],
    )
    square_wave.tags = [fourier_tag, waves_tag]
    square_wave.resources = [
        Resource(label="3Blue1Brown: But what is a Fourier series?", url="https://www.youtube.com/watch?v=r6sGWTCMz2k", kind="video"),
    ]

    projectile = _get_or_create_visual(
        "projectile-motion",
        title="Projectile Motion",
        kind="chartjs",
        source='{"type": "line", "data": {"labels": [], "datasets": []}}',
        theme_affinity="adaptive",
        origin="machine",
        generator="Claude Opus 5",
        created_on=date(2025, 6, 1),
        context="personal",
        summary_md="Trajectory of a projectile under constant gravity.",
        notes_md="# Projectile Motion\n\n$$y = x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$$",
        status="published",
        category=categories["Physics"],
    )
    projectile.tags = [waves_tag]

    _get_or_create_visual(
        "pending-example",
        title="Pending Example",
        kind="svg",
        source="<svg viewBox='0 0 10 10'></svg>",
        summary_md="An unreviewed submission, for exercising the moderation queue.",
        notes_md="Waiting for review.",
        status="pending",
        category=categories["Programming"],
    )

    db.session.commit()
