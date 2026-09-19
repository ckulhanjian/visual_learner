# Atlas

A personal collection of visualizations — physics, signals and systems,
programming, circuits. Each visual gets a page with the math, worked examples,
how it was made, and personal notes.

Publicly readable, no login. Anyone can submit; nothing is visible until reviewed.

## Quick start

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(32))"   # → ATLAS_WRITE_KEY

python run.py seed
python run.py            # http://localhost:5001/api/v1/health
```

A plain HTML/JS page (`frontend-test/index.html`) exercises the API for manual
testing. The real React frontend is not built yet.

## Documentation

| | |
|---|---|
| `CLAUDE.md` | conventions, commands, invariants — read every session |
| `docs/ARCHITECTURE.md` | data dictionary, routes, pages, renderer registry |
| `docs/DECISIONS.md` | why things are this way, what is open, what is deferred |
| `backend/README.md` | backend setup and endpoint reference |

## Stack

React + TypeScript + Vite + Tailwind v4 · Flask + SQLAlchemy + Marshmallow ·
SQLite → Postgres · Chart.js, D3, plain SVG
