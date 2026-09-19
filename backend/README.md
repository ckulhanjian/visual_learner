# Backend

Flask + SQLAlchemy 2.0 + Marshmallow, SQLite. See `../docs/ARCHITECTURE.md` for
the data model and full route table, `../docs/DECISIONS.md` for why.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(32))"   # paste as ATLAS_WRITE_KEY

python run.py seed      # sample content, idempotent
python run.py           # serve on :5001
```

## Commands

| command | does |
|---|---|
| `python run.py` | serve on :5001 |
| `python run.py seed` | sample content, idempotent |
| `python run.py reset` | drop, recreate, re-seed |
| `python run.py routes` | print the URL map |
| `python verify.py` | end-to-end smoke test, prints PASS/FAIL |

## Endpoints

Base `/api/v1`. Auth is the `X-Atlas-Key` header.

| method | route | auth | notes |
|---|---|---|---|
| GET | `/health` | open | liveness |
| GET | `/meta` | open | controlled vocabularies |
| GET | `/categories` | open | categories + published counts |
| GET | `/categories/<slug>` | open | one category + its published visuals |
| POST | `/categories` | key | 201 |
| DELETE | `/categories/<slug>` | key | 204, or 409 if non-empty |
| GET | `/tags` | open | tags + usage counts |
| GET | `/visuals` | open | card-shaped list. query: `category`, `tag` (repeatable), `status` (key only) |
| GET | `/visuals/<slug>` | open | full visual. pending returns 404 without a key |
| POST | `/visuals` | open, rate-limited | 201, queued unless the request is trusted |
| PATCH | `/visuals/<slug>` | key | partial update |
| POST | `/visuals/<slug>/status` | key | moderation: `{"status": "published"}` etc |
| DELETE | `/visuals/<slug>` | key | 204 |
| POST | `/uploads` | open, rate-limited | multipart `file`, image extensions only → `{"asset_path": "..."}` |
| GET | `/uploads/<filename>` *(not versioned)* | open | serves what `/uploads` wrote |

Errors always look like: `{"error": "not_found", "message": "...", "details": {}}`.
