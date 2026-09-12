# Mantel

An agent that lives on your kitchen wall, not in a chatbox.

Mantel watches a family's shared calendar, notices when a schedule change
creates a pickup conflict nobody's spotted yet, reorganizes the wall around
it, and routes a decision to the right person over Telegram — one tap to
resolve.

## The problem

Families coordinate pickups and schedule changes over group texts that turn
into chaos the moment something moves. Mantel puts that coordination on a
screen everyone already looks at, and only reaches into chat when a real
decision is needed.

## How it works

1. A backend polls the family's calendar every 10 seconds and diffs today's
   events against the last known state (start, end, location).
2. On any change, it re-evaluates the whole day from scratch — no
   incremental patching, so the wall can never drift out of sync.
3. The one rule: a kid's event ends at time T at location L, no guardian is
   free at T. Candidates are ranked by who's free soonest; the top two get
   asked.
4. If there's an open question, it's pushed to the relevant guardians on
   Telegram with inline buttons. A tap resolves it and updates the wall.

## Stack

- **Backend**: plain Node.js (`http`, no framework) — `server.js`, `api/`,
  `data/`
- **Frontend**: React + Vite (`frontend/`) — polls `GET /world` and renders
  from that state
- **Calendar**: Google Calendar API (OAuth, `calendar.events.readonly`) —
  falls back to an in-memory fake calendar if not connected
- **Messaging**: Telegram Bot API — long polling, no webhooks, no public URL
  needed

## Data model

Four entities:

- `person` — id, name, role (`guardian` | `kid`), telegram_chat_id
- `event` — id, title, person_id, start, end, location
- `assignment` — who covers which kid's pickups
- `ask` — one open question: text, reason, who was asked, status

## Running it locally

```bash
npm install --prefix frontend
npm run build --prefix frontend
node server.js
```

Open `http://localhost:3000`.

### Environment variables (`.env`, see `.env.example`)

```
TELEGRAM_BOT_TOKEN=       # from @BotFather
GOOGLE_CLIENT_ID=         # Google Cloud Console OAuth client
GOOGLE_CLIENT_SECRET=
```

Without a Telegram token, everything runs except outbound messages. Without
Google credentials, it runs on the seeded fake calendar in `data/seed.js`.

To connect a real calendar, visit `/oauth/start` once and approve access.
Calendar events must be titled `Name: Title` (e.g. `Maya: Soccer practice`)
to be attributed to a seeded person.

## Debug endpoints (not part of the real interface)

- `POST /debug/move-event` — simulate a calendar edit without a real
  calendar connected
- `POST /debug/reset` — restore the demo to its baseline state without
  restarting the process
- `GET /debug/telegram-updates` — find a chat_id to put in `data/seed.js`
- `GET /debug/google-status` — check whether Google Calendar is connected

## What this is not

Built in one day for a hackathon. No auth, no persistence beyond process
memory, one family, one conflict rule on purpose. See `CLAUDE.md` for the
full build spec and reasoning behind those constraints.
