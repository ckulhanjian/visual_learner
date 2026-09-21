import json
import math
import os
import shutil
from datetime import date

from flask import current_app

from app.extensions import db
from app.models.category import Category
from app.models.resource import Resource
from app.models.tag import Tag
from app.models.topic import Topic
from app.models.visual import Visual
from app.services.slugs import slugify

# Sample content generated to compare kinds (docs/DECISIONS.md) — a handful
# of the svg/d3/p5/html visuals below draw a sine curve by hand rather than
# hardcoding a few thousand characters of coordinates.
def _sine_polyline(n_cycles, width=400, height=150, amplitude=45, samples=200):
    cy = height / 2
    points = []
    for i in range(samples + 1):
        x = width * i / samples
        y = cy - amplitude * math.sin(2 * math.pi * n_cycles * i / samples)
        points.append(f"{x:.1f},{y:.1f}")
    return " ".join(points)


def _sample_dots(n_cycles, n_samples, width=400, height=150, amplitude=45):
    cy = height / 2
    dots = []
    for i in range(n_samples + 1):
        x = width * i / n_samples
        y = cy - amplitude * math.sin(2 * math.pi * n_cycles * x / width)
        dots.append((x, y))
    return dots


def _projectile_points(v0=20, angle_deg=45, g=9.8, n=40):
    theta = math.radians(angle_deg)
    x_range = (v0**2) * math.sin(2 * theta) / g
    points = []
    for i in range(n + 1):
        x = x_range * i / n
        y = x * math.tan(theta) - (g * x**2) / (2 * v0**2 * math.cos(theta) ** 2)
        points.append({"x": round(x, 2), "y": round(max(y, 0), 2)})
    return points


SEED_ASSETS_DIR = os.path.join(os.path.dirname(__file__), "seed_assets")


def _seed_asset_path(filename):
    # Copies a checked-in seed asset into UPLOAD_DIR under its own name, the
    # same "image on disk, path in the database" shape POST /uploads
    # produces (app/services/upload_service.py) — idempotent, since a seed
    # re-run shouldn't re-copy a file that's already there.
    upload_dir = current_app.config["UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)
    dest = os.path.join(upload_dir, filename)
    if not os.path.exists(dest):
        shutil.copy(os.path.join(SEED_ASSETS_DIR, filename), dest)
    return f"/uploads/{filename}"

CATEGORIES = [
    {"name": "Physics", "color": "#EE352E", "blurb": "Mechanics, waves, fields.", "position": 0},
    {"name": "Signals & Systems", "color": "#0039A6", "blurb": "Transforms, filters, control.", "position": 1},
    {"name": "Programming", "color": "#00933C", "blurb": "Algorithms and data structures.", "position": 2},
    {"name": "Circuits", "color": "#FF6319", "blurb": "Analog and digital circuit design.", "position": 3},
    # The rest of the real, unused NYC subway line colors — CLAUDE.md had
    # reserved #B933AD (7 train) and #FCCC0A (N/Q/R/W) for exactly this; the
    # other two (G train, L train, J/Z train) round out five new categories.
    {"name": "Design", "color": "#FCCC0A", "blurb": "Typography, layout, visual systems.", "position": 4},
    {"name": "Music", "color": "#B933AD", "blurb": "Theory, notation, sound.", "position": 5},
    {"name": "Economics", "color": "#6CBE45", "blurb": "Markets, incentives, growth.", "position": 6},
    {"name": "History", "color": "#A7A9AC", "blurb": "Timelines, causes, consequences.", "position": 7},
    {"name": "Religion", "color": "#996633", "blurb": "Belief, ritual, tradition.", "position": 8},
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
        source=json.dumps(
            {
                "type": "line",
                "data": {
                    "datasets": [
                        {
                            "label": "Trajectory",
                            "data": _projectile_points(),
                            "borderColor": "#EE352E",
                            "backgroundColor": "#EE352E33",
                            "fill": True,
                            "tension": 0.3,
                            "pointRadius": 0,
                        }
                    ]
                },
                "options": {
                    "parsing": False,
                    "plugins": {"legend": {"display": False}},
                    "scales": {
                        "x": {"type": "linear", "title": {"display": True, "text": "Horizontal distance (m)"}},
                        "y": {"title": {"display": True, "text": "Height (m)"}},
                    },
                },
            }
        ),
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

    # --- Kind comparison set: five topics, each in the kind that suits it
    # best, plus a sixth entry (the image twin of the svg one) so all six
    # renderer kinds are represented — requested to compare svg/chartjs/
    # image/d3/p5/html side by side. ---
    complex_tag = _get_or_create_tag("Complex Numbers")
    midi_tag = _get_or_create_tag("MIDI")
    sampling_tag = _get_or_create_tag("Sampling")

    polar_complex = _get_or_create_visual(
        "polar-vs-complex-numbers",
        title="Polar vs. Complex Numbers",
        kind="d3",
        # Sets its own dark background (matching theme_affinity="dark"
        # below) — the sandboxed iframe's own document defaults to a plain
        # white body regardless of the page's theme; VisualPage's matting
        # only colors the box *around* the iframe, not the document inside
        # it (docs/DECISIONS.md).
        source=(
            "document.body.style.background = '#1c1c1c';\n"
            "const width = window.innerWidth, height = window.innerHeight;\n"
            "const svg = d3.select('body').append('svg').attr('width', width).attr('height', height);\n"
            "const cx = width / 2, cy = height / 2, R = Math.min(width, height) * 0.32;\n"
            "const g = svg.append('g');\n"
            "g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none')"
            ".attr('stroke', '#0039A6').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');\n"
            "g.append('line').attr('x1', cx - R - 20).attr('y1', cy).attr('x2', cx + R + 20).attr('y2', cy).attr('stroke', '#888');\n"
            "g.append('line').attr('x1', cx).attr('y1', cy - R - 20).attr('x2', cx).attr('y2', cy + R + 20).attr('stroke', '#888');\n"
            "const radiusLine = g.append('line').attr('x1', cx).attr('y1', cy).attr('stroke', '#0039A6').attr('stroke-width', 3);\n"
            "const dot = g.append('circle').attr('r', 6).attr('fill', '#0039A6');\n"
            "const label = svg.append('text').attr('x', 20).attr('y', 36).attr('fill', '#ccc')"
            ".attr('font-family', 'monospace').attr('font-size', 18);\n"
            "let theta = 0;\n"
            "d3.timer(() => {\n"
            "  theta += 0.01;\n"
            "  const x = cx + R * Math.cos(theta), y = cy - R * Math.sin(theta);\n"
            "  radiusLine.attr('x2', x).attr('y2', y);\n"
            "  dot.attr('cx', x).attr('cy', y);\n"
            "  const re = Math.cos(theta).toFixed(2), im = Math.sin(theta).toFixed(2);\n"
            "  const deg = (((theta * 180 / Math.PI) % 360 + 360) % 360).toFixed(0);\n"
            "  label.text(`z = ${re} ${im >= 0 ? '+' : '-'} ${Math.abs(im).toFixed(2)}i   =   1\u2220${deg}\u00b0`);\n"
            "});"
        ),
        theme_affinity="dark",
        origin="human",
        created_on=date(2025, 8, 4),
        context="class",
        course="EEL 3135",
        summary_md="Euler's formula, animated \u2014 the same rotating point in rectangular and polar form.",
        notes_md=(
            "# Polar vs. Complex Numbers\n\n"
            "Every point on the unit circle has both a rectangular reading and a polar one:\n\n"
            "$$z = \\cos\\theta + i\\sin\\theta = e^{i\\theta} = 1\\angle\\theta$$\n\n"
            "The animation sweeps $\\theta$ from $0$ to $2\\pi$, printing both readings of the same point live."
        ),
        status="published",
        category=categories["Signals & Systems"],
    )
    polar_complex.tags = [complex_tag]

    fourier_phasor = _get_or_create_visual(
        "fourier-series-rotating-phasor",
        title="Fourier Series: Rotating Phasor",
        kind="p5",
        source=(
            "document.body.style.background = '#1c1c1c';\n"
            "let time = 0;\n"
            "let wave = [];\n"
            "function setup() {\n"
            "  createCanvas(windowWidth, windowHeight);\n"
            "}\n"
            "function windowResized() {\n"
            "  resizeCanvas(windowWidth, windowHeight);\n"
            "}\n"
            "function draw() {\n"
            "  background(28);\n"
            "  const cx = width * 0.28, cy = height * 0.5;\n"
            "  push();\n"
            "  translate(cx, cy);\n"
            "  let x = 0, y = 0;\n"
            "  const harmonics = 6;\n"
            "  for (let i = 0; i < harmonics; i++) {\n"
            "    const n = 2 * i + 1;\n"
            "    const prevX = x, prevY = y;\n"
            "    const radius = 70 * (4 / (n * Math.PI));\n"
            "    x += radius * cos(n * time);\n"
            "    y += radius * sin(n * time);\n"
            "    noFill();\n"
            "    stroke(255, 90);\n"
            "    ellipse(prevX, prevY, radius * 2);\n"
            "    stroke(255);\n"
            "    line(prevX, prevY, x, y);\n"
            "  }\n"
            "  pop();\n"
            "  wave.unshift(cy + y);\n"
            "  const maxLen = max(10, width - cx - 40);\n"
            "  if (wave.length > maxLen) wave.pop();\n"
            "  stroke('#0039A6');\n"
            "  strokeWeight(2);\n"
            "  noFill();\n"
            "  beginShape();\n"
            "  for (let i = 0; i < wave.length; i++) vertex(cx + 40 + i, wave[i]);\n"
            "  endShape();\n"
            "  stroke(80);\n"
            "  strokeWeight(1);\n"
            "  line(cx + x, cy + y, cx + 40, cy + y);\n"
            "  time += 0.05;\n"
            "}"
        ),
        theme_affinity="dark",
        origin="human",
        created_on=date(2025, 8, 11),
        context="class",
        course="EEL 3135",
        summary_md="Six rotating circles (odd harmonics) summing to trace a square wave.",
        notes_md=(
            "# Fourier Series: Rotating Phasor\n\n"
            "Each circle is one odd harmonic of the series, rotating at $n$ times the base rate with radius "
            "$\\frac{4}{n\\pi}$:\n\n"
            "$$f(t) = \\frac{4}{\\pi}\\sum_{n=1,3,5,\\dots} \\frac{1}{n}\\sin(n t)$$\n\n"
            "Chaining the tips of the rotating vectors and tracing the last one over time reconstructs the wave "
            "on the right."
        ),
        status="published",
        category=categories["Signals & Systems"],
    )
    fourier_phasor.tags = [fourier_tag, complex_tag]

    musical_scale = _get_or_create_visual(
        "musical-scale-midi-frequencies",
        title="Musical Scale: MIDI Frequencies",
        kind="html",
        source=(
            "<!doctype html><html><head><meta charset='utf-8' />"
            "<style>"
            "body{margin:0;font-family:'JetBrains Mono',monospace;background:#1c1c1c;color:#eee;"
            "display:flex;align-items:center;justify-content:center;height:100vh;}"
            ".keys{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:90vw;}"
            ".key{background:#262626;border:1px solid #B933AD;border-radius:4px;padding:10px 6px;"
            "text-align:center;cursor:pointer;width:64px;}"
            ".key:hover{background:#3a1f38;}"
            ".name{font-size:14px;font-weight:bold;color:#B933AD;}"
            ".midi,.freq{font-size:10px;opacity:0.75;margin-top:2px;}"
            "</style></head><body>"
            "<div class='keys' id='keys'></div>"
            "<script>"
            "const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];\n"
            "const container = document.getElementById('keys');\n"
            "let ctx;\n"
            "for (let n = 60; n <= 71; n++) {\n"
            "  const freq = 440 * Math.pow(2, (n - 69) / 12);\n"
            "  const div = document.createElement('div');\n"
            "  div.className = 'key';\n"
            "  div.innerHTML = '<div class=\"name\">' + notes[n % 12] + '4</div>'"
            " + '<div class=\"midi\">MIDI ' + n + '</div>'"
            " + '<div class=\"freq\">' + freq.toFixed(1) + ' Hz</div>';\n"
            "  div.onclick = () => {\n"
            "    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();\n"
            "    const osc = ctx.createOscillator();\n"
            "    const gain = ctx.createGain();\n"
            "    osc.frequency.value = freq;\n"
            "    gain.gain.setValueAtTime(0.2, ctx.currentTime);\n"
            "    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);\n"
            "    osc.connect(gain).connect(ctx.destination);\n"
            "    osc.start();\n"
            "    osc.stop(ctx.currentTime + 0.5);\n"
            "  };\n"
            "  container.appendChild(div);\n"
            "}\n"
            "</script></body></html>"
        ),
        theme_affinity="dark",
        origin="human",
        created_on=date(2025, 8, 18),
        context="personal",
        summary_md="One octave, each key showing its MIDI number, frequency, and a click-to-hear tone.",
        notes_md=(
            "# Musical Scale: MIDI Frequencies\n\n"
            "MIDI note number $n$ maps to frequency by equal temperament, tuned from A4 = 440 Hz (MIDI 69):\n\n"
            "$$f(n) = 440 \\cdot 2^{(n - 69) / 12}$$\n\n"
            "Click a key to hear it — each tone is a plain oscillator at that key's computed frequency."
        ),
        status="published",
        category=categories["Music"],
    )
    musical_scale.tags = [midi_tag]

    fundamental = _get_or_create_visual(
        "fundamental-frequency",
        title="Fundamental Frequency",
        kind="chartjs",
        source=json.dumps(
            {
                "type": "bar",
                "data": {
                    "labels": ["f\u2080 (110 Hz)", "2f\u2080 (220 Hz)", "3f\u2080 (330 Hz)", "4f\u2080 (440 Hz)", "5f\u2080 (550 Hz)"],
                    "datasets": [
                        {
                            "label": "Relative amplitude",
                            "data": [1.0, 0.5, 0.33, 0.25, 0.2],
                            "backgroundColor": ["#EE352E", "#EE352E66", "#EE352E66", "#EE352E66", "#EE352E66"],
                        }
                    ],
                },
                "options": {
                    "plugins": {
                        "legend": {"display": False},
                        "title": {"display": True, "text": "Harmonic series above a 110 Hz fundamental"},
                    },
                    "scales": {"y": {"title": {"display": True, "text": "Relative amplitude"}}},
                },
            }
        ),
        theme_affinity="adaptive",
        origin="human",
        created_on=date(2025, 9, 1),
        context="personal",
        summary_md="The lowest resonant frequency of a vibrating string \u2014 every overtone is a multiple of it.",
        notes_md=(
            "# Fundamental Frequency\n\n"
            "A vibrating string (or air column) resonates at a fundamental frequency $f_0$ and integer "
            "multiples of it, the overtone series:\n\n"
            "$$f_n = n f_0, \\quad n = 1, 2, 3, \\dots$$\n\n"
            "The fundamental ($n=1$) carries the most energy; each overtone above it is progressively quieter."
        ),
        status="published",
        category=categories["Physics"],
    )
    fundamental.tags = [waves_tag]

    true_points = _sine_polyline(9)
    alias_points = _sine_polyline(1)
    dots_svg = "".join(
        f"<circle cx='{x:.1f}' cy='{y:.1f}' r='3.5' fill='#0039A6'/>" for x, y in _sample_dots(9, 10)
    )
    aliasing_source = (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 150'>"
        "<line x1='0' y1='75' x2='400' y2='75' stroke='#888' stroke-width='0.5'/>"
        f"<polyline points='{true_points}' fill='none' stroke='#888' stroke-width='1.5' stroke-dasharray='3,2'/>"
        f"<polyline points='{alias_points}' fill='none' stroke='#0039A6' stroke-width='2.5'/>"
        f"{dots_svg}"
        "</svg>"
    )
    principal_alias = _get_or_create_visual(
        "principal-alias",
        title="Principal Alias",
        kind="svg",
        source=aliasing_source,
        theme_affinity="adaptive",
        origin="human",
        created_on=date(2025, 9, 10),
        context="class",
        course="EEL 3135",
        summary_md="Undersample a 9 Hz signal at 10 Hz and it looks exactly like a 1 Hz signal.",
        notes_md=(
            "# Principal Alias\n\n"
            "Sampling below the Nyquist rate folds a signal's true frequency down to a lower **apparent** "
            "frequency \u2014 its principal alias:\n\n"
            "$$f_{alias} = |f_{true} - k f_s|, \\quad k \\in \\mathbb{Z}$$\n\n"
            "Here a 9 Hz sine (dashed) is sampled 10 times a second (dots) \u2014 every sample also lands "
            "exactly on a 1 Hz sine (solid), so that's the frequency a reconstruction filter would actually "
            "produce."
        ),
        status="published",
        category=categories["Signals & Systems"],
    )
    principal_alias.tags = [sampling_tag, fourier_tag]

    # The same content again as `image` (a flat screenshot of the svg
    # version above, backend/app/seed_assets/principal-alias.png) \u2014
    # specifically so the two sit side by side for comparing kinds, not
    # because this content is better served as a raster image.
    principal_alias_image = _get_or_create_visual(
        "principal-alias-photo",
        title="Principal Alias (image)",
        kind="image",
        source="",
        asset_path=_seed_asset_path("principal-alias.png"),
        theme_affinity="adaptive",
        origin="human",
        created_on=date(2025, 9, 10),
        context="class",
        course="EEL 3135",
        summary_md="Same aliasing diagram as the svg version, rendered as a flat image instead \u2014 for comparing kinds.",
        notes_md=(
            "# Principal Alias \u2014 image kind\n\n"
            "A screenshot of the `svg`-kind [Principal Alias](/v/principal-alias) above, uploaded as a flat "
            "raster image instead of live markup, so the same content can be compared kind for kind."
        ),
        status="published",
        category=categories["Signals & Systems"],
    )
    principal_alias_image.tags = [sampling_tag]

    # Topic tree — currently only under Programming; other categories are
    # legitimately empty for now (docs/DECISIONS.md's category-hierarchy note).
    data_structures = _get_or_create_topic(categories["Programming"], "Data Structures", position=0)
    _get_or_create_topic(categories["Programming"], "Stack", parent=data_structures, position=0)
    _get_or_create_topic(categories["Programming"], "Queue", parent=data_structures, position=1)

    algorithms = _get_or_create_topic(categories["Programming"], "Algorithms", position=1)
    _get_or_create_topic(categories["Programming"], "Binary Search", parent=algorithms, position=0)
    _get_or_create_topic(categories["Programming"], "Merge Sort", parent=algorithms, position=1)

    db.session.commit()
