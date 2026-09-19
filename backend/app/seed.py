from datetime import date

from app.extensions import db
from app.models.category import Category
from app.models.resource import Resource
from app.models.tag import Tag
from app.models.topic import Topic
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


def _get_or_create_topic(category, name, parent=None, position=0):
    slug = slugify(name)
    topic = Topic.query.filter_by(category_id=category.id, slug=slug).first()
    if topic:
        return topic
    topic = Topic(slug=slug, name=name, category=category, parent=parent, position=position)
    db.session.add(topic)
    db.session.flush()
    return topic


def run_seed():
    categories = {c["name"]: _get_or_create_category(c) for c in CATEGORIES}

    fourier_tag = _get_or_create_tag("Fourier Analysis")
    waves_tag = _get_or_create_tag("Waves")

    square_wave = _get_or_create_visual(
        "fourier-series-square-wave",
        title="Fourier Series: Square Wave",
        kind="svg",
        source="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'>"
        "<polyline points='0,80 20,80 20,20 40,20 40,80 60,80 60,20 80,20 80,80 200,80' "
        "stroke='#0039A6' stroke-width='4' fill='none'/></svg>",
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

    # One more published visual per category so the home page's top-3 preview
    # has something to show for categories beyond Physics/Signals & Systems.
    binary_search = _get_or_create_visual(
        "binary-search-walkthrough",
        title="Binary Search, Step by Step",
        kind="svg",
        source="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'>"
        "<rect x='1' y='4' width='2' height='2' fill='#00933C'/>"
        "<rect x='4' y='2' width='2' height='6' fill='#00933C'/>"
        "<rect x='7' y='1' width='2' height='8' fill='#00933C'/></svg>",
        origin="human",
        created_on=date(2025, 7, 20),
        context="personal",
        summary_md="Halving the search space on a sorted array.",
        notes_md="# Binary Search\n\nO(log n) by discarding half the remaining range each step.",
        status="published",
        category=categories["Programming"],
    )
    binary_search.tags = [_get_or_create_tag("Algorithms")]

    voltage_divider = _get_or_create_visual(
        "voltage-divider",
        title="Voltage Divider",
        kind="svg",
        source="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'>"
        "<line x1='5' y1='0' x2='5' y2='3' stroke='#FF6319'/>"
        "<rect x='3' y='3' width='4' height='2' fill='none' stroke='#FF6319'/>"
        "<line x1='5' y1='5' x2='5' y2='7' stroke='#FF6319'/>"
        "<rect x='3' y='7' width='4' height='2' fill='none' stroke='#FF6319'/>"
        "<line x1='5' y1='9' x2='5' y2='10' stroke='#FF6319'/></svg>",
        origin="human",
        created_on=date(2025, 4, 2),
        context="class",
        course="EEL 3111",
        summary_md="Two resistors, one output voltage.",
        notes_md="# Voltage Divider\n\n$$V_{out} = V_{in} \\cdot \\frac{R_2}{R_1 + R_2}$$",
        status="published",
        category=categories["Circuits"],
    )

    pendulum = _get_or_create_visual(
        "pendulum-motion",
        title="Simple Pendulum",
        kind="svg",
        source="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'>"
        "<line x1='5' y1='0' x2='5' y2='8' stroke='#EE352E'/>"
        "<circle cx='5' cy='9' r='1' fill='#EE352E'/></svg>",
        origin="human",
        created_on=date(2025, 2, 18),
        context="class",
        course="PHY 2048",
        summary_md="Small-angle approximation and period.",
        notes_md="# Simple Pendulum\n\n$$T = 2\\pi\\sqrt{\\frac{L}{g}}$$",
        status="published",
        category=categories["Physics"],
    )
    pendulum.tags = [waves_tag]

    # Topic tree — currently only under Programming; other categories are
    # legitimately empty for now (docs/DECISIONS.md's category-hierarchy note).
    data_structures = _get_or_create_topic(categories["Programming"], "Data Structures", position=0)
    _get_or_create_topic(categories["Programming"], "Stack", parent=data_structures, position=0)
    _get_or_create_topic(categories["Programming"], "Queue", parent=data_structures, position=1)

    algorithms = _get_or_create_topic(categories["Programming"], "Algorithms", position=1)
    _get_or_create_topic(categories["Programming"], "Binary Search", parent=algorithms, position=0)
    _get_or_create_topic(categories["Programming"], "Merge Sort", parent=algorithms, position=1)

    db.session.commit()
