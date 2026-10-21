# Fix for `API Request failed` on Netlify

## Why it happened
The app was uploaded to Netlify as a static frontend. The login calls `/api/auth/login`, but Netlify does not run this project's Express/Node backend automatically. The frontend therefore receives a 404/HTML response and login fails.

## Recommended easiest deployment (single website + API)
1. Upload this ZIP to a private GitHub repository (extract it first; do not upload the ZIP as one source file).
2. Open https://render.com and create a new **Blueprint** from that GitHub repository.
3. Render reads `render.yaml`, builds the React frontend and starts the Express backend in one service.
4. After deploy, open `https://YOUR-SERVICE.onrender.com/api/health`. It should return JSON like `{"ok":true,"service":"LabPulse AI API"}`.
5. Open the main `https://YOUR-SERVICE.onrender.com` URL and log in from the normal shared login page.

Demo seed credentials from this development database:
- Email: `admin@labpulse.ai`
- Password: `LabPulse@2026#Admin`

Important: this is still a development prototype. The JSON-file database may reset on free/ephemeral hosting redeploy/restart, and clinical APIs do not yet have complete authorization/tenant isolation. Do not use real patient data or take real customer payments until persistent database storage, full API security, backups, and payment verification are implemented and tested. Change demo credentials before any public use.

## If you keep the frontend on Netlify
You must separately deploy the backend, then set Netlify environment variable `VITE_API_BASE_URL` to the backend origin (for example `https://your-api-service.onrender.com`, without a trailing slash), allow the Netlify domain in backend CORS, and redeploy the frontend. The recommended single-service Render setup avoids that separate-origin setup.
