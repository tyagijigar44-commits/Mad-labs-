# LabPulse AI — Laboratory Information System

A responsive React/Vite laboratory workflow interface with Express API routes and Netlify Functions deployment support.

## Included modules
- Single login/register screen for lab owners and staff accounts
- Lab registration with monthly/yearly subscription selection
- Super Admin overview, lab/subscription management, payment QR/UPI and editable subscription prices
- Dashboard, patient directory, test orders, specimen tracking, bench workflow, reports, billing, analyzers, QC, staff/audit pages, patient portal, AI assistant and API docs
- Netlify Function API routing and Netlify Blobs persistence adapter
- Signed 12-hour auth tokens, password hashing for new registrations, and session restoration after refresh

## Deploy
Read `NETLIFY-SETUP-HINDI.md` before deploying. In Netlify environment variables, set a strong `SESSION_SECRET` (32+ random characters). Do not commit secrets to GitHub.

Build: `npm install && npm run build`
Publish directory: `dist`
Functions directory: `netlify/functions`

## Demo Super Admin
- Email: `admin@labpulse.ai`
- Password: `LabPulse@2026#Admin`

This is a development/demo project, not certified medical software. Sample data is included. Do not use real patient information until the system has been migrated to a transactional persistent database, secured and reviewed for applicable privacy, medical-record and laboratory requirements. QR/UPI display does not automatically verify payments.
