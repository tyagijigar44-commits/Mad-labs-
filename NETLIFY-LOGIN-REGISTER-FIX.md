# LabPulse AI — Netlify API routing fix

This build adds a Netlify Function adapter for the existing Express API and rewrites `/api/*` to that function. It addresses the missing API route that causes `API Request failed` when only the static frontend is deployed.

## Deploy
1. Extract this ZIP into a GitHub repository (do not upload the ZIP as one file).
2. In Netlify choose **Add new site → Import an existing project** and select that repository.
3. Build settings should be read from `netlify.toml`: build command `npm install && npm run build`, publish directory `dist`, functions directory `netlify/functions`.
4. In Netlify Site configuration → Environment variables, add `GEMINI_API_KEY` if AI features are needed. Trigger a fresh deploy.
5. Test `https://YOUR-SITE.netlify.app/api/health`. It should return JSON with `ok: true`.
6. Test Login and Register after the health endpoint responds successfully.

## Important limitations
This is a routing/runtime adapter, not a production database migration. The existing app stores data in `.data/lis-database.json` and keeps sessions in process memory. Netlify Functions have ephemeral filesystem/runtime behavior, so accounts and sessions may not reliably persist across cold starts or different function instances. Use a persistent database and shared session store before relying on this for real users. Do not store real patient/clinical data or process real payments with this prototype. The function wrapper cannot be considered fully verified until deployed and tested in the user's Netlify account.

Demo seed credentials in the development data (if present): `admin@labpulse.ai` / `LabPulse@2026#Admin`. Change them before public use; do not assume they work until the deployed API is tested.
