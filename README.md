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

## Run locally on Windows

These steps are for a fresh Windows computer that does not already have Node, npm, React, Vite, or Express installed.

You do not need to install React separately. React and all other project libraries are installed by `npm install` from `package.json`.

### 1. Install Node.js and npm

1. Go to `https://nodejs.org/`
2. Download the Windows LTS installer.
3. Run the installer and keep the default options. If it asks about adding Node to `PATH`, allow it.
4. Close and reopen PowerShell or Command Prompt.
5. Check that Node and npm are available:

```powershell
node -v
npm -v
```

Both commands should print version numbers. If Windows says `node` or `npm` is not recognized, restart the computer and try again. If it still fails, reinstall Node.js and make sure it is added to `PATH`.

### 2. Get the project files

If Git is not installed, use the ZIP download:

1. Open `https://github.com/jahnabiroy/rksm`
2. Click `Code`
3. Click `Download ZIP`
4. Extract the ZIP file
5. Open PowerShell or Command Prompt inside the extracted folder

If Git is installed, you can clone instead:

```powershell
git clone https://github.com/jahnabiroy/rksm.git
cd rksm
```

If the folder path has spaces, wrap it in quotes:

```powershell
cd "C:\Users\YourName\Downloads\rksm-main"
```

### 3. Install the project libraries

Run this inside the project folder:

```powershell
npm install
```

This downloads React, Vite, Express, and the other dependencies into a local `node_modules` folder. The `node_modules` folder is intentionally not stored in GitHub.

### 4. Create the local settings file

The app reads private/local settings from `.env`. This file is not uploaded to GitHub.

For basic local testing, create a `.env` file with these values:

```env
PORT=3001
APP_BASE_URL=http://localhost:5173
ADMIN_PORTAL_PASSWORD=choose-a-password-here
```

PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Command Prompt:

```cmd
copy .env.example .env
notepad .env
```

At minimum, set `ADMIN_PORTAL_PASSWORD` to the password you want to use for the admin page.

If you do not want email sending yet, leave the SMTP fields blank or remove the SMTP lines from `.env`. If fake SMTP values are left in place, the app may try to send email and show email-related errors in the terminal.

### 5. Start the app for development

Run:

```powershell
npm run dev
```

Keep this terminal open while using the app. Open these URLs in a browser:

- `http://localhost:5173/` for the public website
- `http://localhost:5173/admin` for the admin side

The backend API runs on `http://localhost:3001`. The frontend runs on `http://localhost:5173`.

To stop the app, click the terminal and press `Ctrl + C`.

### 6. Run a production-style build locally

Use this when you want to test the built app instead of the development server:

```powershell
npm run build
npm start
```

Then open:

- `http://localhost:3001/`
- `http://localhost:3001/admin`

## Common Windows problems

### `npm` is not recognized

Node.js is not installed correctly, or PowerShell/CMD was opened before installation finished. Close the terminal and open it again. If that does not work, reinstall Node.js from `https://nodejs.org/`.

### PowerShell script execution error

If PowerShell blocks npm scripts, run the commands in Command Prompt instead:

```cmd
npm install
npm run dev
```

You can also use PowerShell with:

```powershell
npm.cmd install
npm.cmd run dev
```

### Port already in use

If `3001` or `5173` is already being used, close the other app or terminal that is using it. You can also change `PORT=3001` in `.env` for the backend port.

### Windows Defender or firewall prompt

If Windows asks whether to allow Node.js access, allow it on private networks so the local development server can run.

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
