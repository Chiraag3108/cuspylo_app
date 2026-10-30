# CUSPYLO — The Pie Product

A lightweight Node.js + Express dental student storefront. Frontend and backend are separate folders.

## Run locally (Windows)
1. Install Node.js LTS.
2. Open PowerShell in this folder (`CUSPYLO-PieProduct`).
3. Run `npm install`.
4. Run `npm start`.
5. Open http://127.0.0.1:3000

## Admin
Open the website footer and click **Admin**.
- Admin ID: `cuspylo_admin`
- Password: `Cusp@2026#KCDS`

Change these in `backend/config.js` before sharing or deploying.

## Editable settings
- `frontend/config.js`: founder note, dashboard message, dashboard tiles.
- `backend/config.js`: admin credentials, WhatsApp number, email, time-based pricing.
- `frontend/style.css`: visual design.
- `frontend/app.js`: storefront interactions.

## Current functionality
- Founder note shown to first-time visitors (Explore/Sign in).
- Student sign-up and login.
- Dashboard with Dental Store and coming-soon tiles.
- FDI selection of all 32 permanent teeth.
- Hour-based pricing in India time: 9 AM–12 PM ₹49; 12 PM–3 PM ₹52; other hours ₹50.
- Cart, checkout and COD order placement.
- Product requests with optional image upload.
- WhatsApp contact link (set number in `backend/config.js`).
- Feedback submission.
- Separate admin sign-in and admin view limited to orders/invoices, requests and feedback.
- Student account page and order history.
- JSON-file persistence in `backend/data.json` (created automatically).

## Important before public deployment
This is a functional MVP, not a security-reviewed production service. Configure a long random `secret`, change admin credentials, set your WhatsApp number and contact email, use HTTPS, add rate limiting/CSRF protections, and move persistence to a managed database with backups before public launch. Test hosting and backups before taking real orders.
