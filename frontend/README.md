# Frontend

React + TypeScript + Vite + Tailwind v4. See `../docs/ARCHITECTURE.md` §6–8 for
the full page spec and layout, `../docs/DECISIONS.md` for why things are the way
they are.

Only the home page exists so far (arc navigation, layout, theme). The other
four routes are not built yet.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to Flask on :5001
```

Requires the backend running (`cd ../backend && python run.py`) — the home
page fetches `GET /api/v1/categories` and has a "Test backend connection"
button that hits `GET /api/v1/health`.

## Commands

| command | does |
|---|---|
| `npm run dev` | dev server on :5173 |
| `npm run build` | typecheck + production build |
| `npm run lint` | oxlint |
| `npm run preview` | serve the production build locally |

## Layout

```
src/
  api/        only place fetch() appears — one module per endpoint group
  domain/     Category (TypeScript mirror of the backend model)
  theme/      tokens.css (Tailwind v4 @theme, light/dark via [data-theme]), useTheme hook
  components/ ArcNav, ThemeToggle, ConnectionCheck
  pages/      Home — the only page so far
```
