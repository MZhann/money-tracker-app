# money-tracker-app
An app for tracking your money flow and keeping an eye on your finances


Flow — calm money tracker. Monorepo:

- `app/` — Expo (React Native, TypeScript). Expo Router, Zustand, expo-sqlite. Fully usable offline.
- `server/` — Node.js + Express + MongoDB sync API. Deploy on Railway.

## Quick start

```bash
# server
cd server && cp .env.example .env   # fill MONGODB_URI + JWT_SECRET
npm install && npm run dev

# app
cd app && npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `app/.env` to your Railway URL to enable sync; the app works fully offline without it.

Design source of truth: `design_handoff_flow_app/README.md` (tokens, screens, behavior).
