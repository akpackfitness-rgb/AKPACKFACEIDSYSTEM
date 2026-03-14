# AK Pack Face ID

A browser-based face recognition check-in system for AK Pack Fitness. Members are verified via webcam and matched against face encodings stored in Google Sheets.

## Features

- **Face Scanner** — Auto-scans members via webcam on check-in. On successful match, displays membership details. Falls back to manual entry after 2 failed attempts.
- **Face Registration** — Admin page to enroll a member's face by Membership ID. Captures and saves face image + encoding to Google Sheets.

## Tech Stack

- React 19 + TypeScript + Vite
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) for in-browser face detection & recognition
- Google Sheets (via GViz API) as the member database
- Google Apps Script for write-back (face data saving)
- Tailwind CSS v4
- Deployed via GitHub Pages

## Setup

```bash
npm install
npm run dev
```

## Configuration

Edit `src/config.ts` to update:

| Variable | Description |
|---|---|
| `APPS_SCRIPT_URL` | Your deployed Google Apps Script URL |
| `SHEET_ID` | Your Google Sheets document ID |
| `CONTROL_SYSTEM_URL` | Fallback URL on failed face scan |
| `FACE_THRESHOLD` | Match sensitivity (default: `0.5`, lower = stricter) |

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.

Make sure GitHub Pages is set to use **GitHub Actions** as the source (Settings → Pages → Source).

## Google Sheets Structure

The sheet should have these column headers:

`Membership ID`, `Client Name`, `Mobile No`, `Created On`, `Package Details`, `Package Validity`, `Starting Date`, `Renewal Date`, `Face Image`, `Face Encoding`
