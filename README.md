# Meal Compass API

REST API for planning weekly meals (CSE 341 final project, Andrea González).
**Part 1:** `users` and `recipes` collections with full CRUD, validation, error handling and Swagger docs.

- Docs: `/api-docs` (e.g. `https://<your-service>.onrender.com/api-docs`)
- Stack: Node.js, Express, MongoDB (native driver), express-validator, swagger-ui-express

## Run locally
```bash
npm install
cp .env.example .env     # then fill in MONGODB_URI
npm start                # http://localhost:3000/api-docs
npm test                 # route tests (in-memory DB stand-in, no database needed)
npm run swagger          # regenerate swagger.json after changing swagger.js
```

## Endpoints
| Method | Path | Success | Errors |
|---|---|---|---|
| GET | /users, /recipes | 200 | 500 |
| GET | /users/{id}, /recipes/{id} | 200 | 400 bad id, 404, 500 |
| POST | /users, /recipes | 201 | 400 validation, 409 duplicate user, 500 |
| PUT | /users/{id}, /recipes/{id} | 200 | 400, 404, 409 (users), 500 |
| DELETE | /users/{id}, /recipes/{id} | 200 | 400, 404, 500 |

Every controller wraps its work in `try/catch` and returns a JSON `500` on unexpected errors (no stack traces or DB details leaked). Validation failures return `400` with a list of field messages.

## Deploy to Render
1. Push this repo to GitHub (`.env` is git-ignored).
2. Render → New → Web Service → connect the repo. Build: `npm install`, Start: `npm start`.
3. Environment variables: `MONGODB_URI`, `DB_NAME` (optional).
4. In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (Render IPs change).
5. Open `https://<service>.onrender.com/api-docs`.
