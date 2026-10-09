# W05 Submission helpers (not required in repo; delete if you like)

## Canvas submission text – individual contributions
(Edit so it matches what you actually did and the dates/commits.)
1. Designed and implemented the Users and Recipes collections: routes, controllers, MongoDB access and express-validator rules, plus try/catch error handling returning 400/404/409/500 (see commits in the GitHub repo).
2. Wrote the Swagger/OpenAPI documentation (`swagger.js` → `swagger.json`), published at `/api-docs` on Render, and deployed the API (Render web service + MongoDB Atlas, secrets kept in environment variables).

## 5–8 minute video script (rubric order)
1. (0:00–0:45) **Deployment** – show the Render URL (not localhost). Show GitHub repo: `.gitignore` lists `.env`, no secrets in code; show `.env.example` only.
2. (0:45–2:00) **Docs** – open `/api-docs`; show the Users and Recipes sections and the schemas.
3. (2:00–5:30) **Endpoints on Render, with MongoDB Atlas open side by side** – for each collection: GET all, POST (copy the returned id; show new doc in Atlas, expect 201), GET by id, PUT (show doc changed in Atlas, 200), DELETE (doc gone in Atlas, 200). Call out each status code.
4. (5:30–7:00) **Error handling** – bad id (400), missing/invalid fields (400), unknown id (404), duplicate user (409). Then open a controller in the code and point at the `try/catch` returning 500, and `middleware/validate.js`.
5. (7:00–7:30) Wrap up. Stay under 8:00 – longer videos get a zero.

## Checklist before submitting
- [ ] Render URL `/api-docs` loads and requests succeed against Atlas
- [ ] No `.env` or connection string in GitHub (check history too)
- [ ] YouTube video 5–8 min, link works
- [ ] Canvas: GitHub repo, Render site, YouTube link, contributions text
