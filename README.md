# Donation Platform

A React + Vite donation platform with an Express backend. It now includes:

- a public donation website at `/`
- an admin dashboard at `/admin`
- one shared backend and shared data store
- manual verification for QR, UPI, and bank-transfer donations

## Current flow

1. Donor opens the public site and submits donation details.
2. Donor pays outside the website using QR or bank details.
3. The donation is saved as `Pending`.
4. Admin reviews the submission and marks it `Confirmed` or `Rejected`.
5. Confirmed donations receive receipt numbers and become available for receipt/declaration output.

## Features

- Public donation request form
- Public event listing with Google Form registration links
- Admin dashboard for pending, confirmed, and rejected records
- Admin home page with navigation to donations and events
- Admin event management with upcoming/past event views
- Registration table support through a linked Google Sheets CSV URL per event
- Manual donation entry from admin
- Shared reporting across public and admin donations
- Receipt generation for confirmed donations
- Corpus declaration support after confirmation
- Excel import and export
- Year-wise workbook storage in `server/data`

## Run locally

```bash
npm install
npm run dev
```

Open:

- `http://localhost:5173/` for the public website
- `http://localhost:5173/admin` for the admin side

## Production build

```bash
npm run build
npm start
```

## Data model notes

The backend currently stores records in year-wise Excel files and tracks:

- submission ID
- verification status
- receipt status
- donation source (`public` or `admin`)
- transaction reference
- verified timestamp

This keeps the public and admin sides in sync without introducing payment gateway automation yet.

## Event registration setup

For each event, admin can now save:

- a Google Form URL for the public `Register Now` button
- a Google Sheets CSV URL for response viewing in admin

To show registrations in the admin table, connect your Google Form to a Google Sheet and use a CSV export or published CSV link for that responses sheet.

## Next likely step

When you are ready, we can add:

- confirmation emails after admin verification
- payment proof upload
- admin login
- database migration from Excel to a full database
- automated reconciliation later

## Email confirmation setup

The backend can now send a confirmation email when admin clicks `Confirm`, if SMTP is configured.

1. Copy `.env.example` to `.env`
2. Fill in your SMTP credentials
3. Restart the server

For Gmail, use:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- your Gmail address as `SMTP_USER`
- a Google App Password as `SMTP_PASS`

If SMTP is not configured, confirmation still works, but no email is sent.
