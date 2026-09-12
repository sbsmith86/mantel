# Mantel — build context

## What we're building

Mantel is an agent that lives on a screen in a family's kitchen. It reads the family's
calendar, notices when a change creates a problem nobody has spotted yet, shows
that on the wall, and routes a decision to the right person over Telegram.

The demo moment: a calendar event moves, and the wall reorganizes itself into a
pickup conflict and asks one question. Nobody typed anything.

## Constraints

- This is a one-day hackathon build. Ship the loop, not the platform.
- Hackathon theme: agents leaving the chatbox. The agent's home is the wall
  screen. Telegram is a reach channel, never the place you talk to the agent.
- The demo runs on venue wifi in front of judges. Prefer long polling over
  webhooks. Nothing that needs a public URL or a tunnel.
- Seeded test calendar, not a real Google account. Do not spend time on OAuth
  consent screens.

## The core loop

1. Poll the calendar every 10 seconds.
2. Diff today's events against last known state. Watch three fields only:
   start time, end time, location.
3. On any delta, re-evaluate the whole day from scratch. Do not try to patch
   state incrementally.
4. Evaluation produces two things: a status line per person, and at most one
   open ask.
5. If there's an open ask, push it to the relevant people on Telegram with
   inline keyboard buttons. Their tap resolves it and updates the wall.

Re-evaluating from scratch is deliberate. It's cheaper to reason about and it
means the wall can never drift out of sync with the calendar.

## Data model

Four entities. Resist adding a fifth.

- `person` — id, name, role (guardian | kid), telegram_chat_id
- `event` — id, title, person_id, start, end, location
- `assignment` — who is covering which kid's pickups/dropoffs (keyed on the
  kid's person_id, not a specific event_id — survives swapping calendar
  sources, since a real calendar's event IDs won't match seeded ones)
- `ask` — one open question: text, reason, who was asked, status

Everything on the screen is a render of these. If a feature doesn't feed the
conflict logic, it doesn't get a field.

## Conflict logic

Start with exactly one rule, and make it good:

A kid's event ends at time T at location L. No guardian is free at T. That's a
conflict. Rank candidate guardians by who is free soonest, ask the top two.

"Guardian" isn't literally "parent" — it's anyone eligible to cover a pickup
(an older sibling, a grandparent). No new entity or eligibility field needed:
just seed more `role: 'guardian'` people if you want more than two candidates.

Do not generalize this into a rules engine. One rule demoed well beats five
rules that half-work.

## Project layout

```
mantel/
├── CLAUDE.md
├── server.js          # HTTP: GET /world (JSON), serves frontend/dist
├── api/world.js        # derives /world's JSON from seed data — pure functions
├── data/seed.js         # in-memory person/event/assignment/ask data
└── frontend/            # Vite + React wall screen
    ├── vite.config.js   # dev-server proxy to server.js on :3000
    └── src/
        ├── App.jsx       # polls GET /world, renders from that state
        └── App.css       # the wall's design system
```

`npm run build` in `frontend/`, then `node server.js` alone serves everything —
one process, one URL. For live-reload iteration, run `npm run dev` in
`frontend/` alongside `node server.js`.

## Interfaces

### Wall screen
A React app in `frontend/` (Vite, no router, no state library — `useState` /
`useEffect` + `fetch('/world')` on an interval is the whole data layer). This
replaced an earlier static `wall.html` prototype; its design ideas carried
over into `App.css` (dark theme, ask banner, person grid, trace line), but not
the file or its vanilla-JS build. This was a deliberate exception to "ask
before adding a dependency" below — decided mid-build once real polling-driven
state made component-based rendering worth the tooling.

The poller in `App.jsx` is the only seam: it fetches `/world` and sets state.
No hardcoded demo beats, no manual advance controls.

Three ask tones exist: `calm`, `open`, `settled`. Person rows carry a flag that
tints their status line to match the ask. Keep that coupling.

### Telegram
Bot token from BotFather. Long polling. If using a group chat, turn privacy
mode OFF in BotFather or the bot will only see commands.

Outbound only for the demo: agent sends the ask with an inline keyboard
("I've got it" / "Can't"). Callback query updates the wall.

## Non-goals for today

- User accounts, auth, onboarding
- More than one family
- Natural language input on the wall
- Voice
- Persistence beyond process memory
- Web search / external data enrichment

If any of these start feeling necessary, that's scope creep. Say so instead of
building it.

## Build order

1. Backend holds `world` state, serves it over a JSON endpoint. Fake calendar
   in memory.
2. React frontend polls that endpoint and renders. Prototype now shows real
   state.
3. Conflict rule. Mutating a fake event's start time produces an ask.
4. Telegram outbound + callback resolves the ask.
5. Only then: swap the fake calendar for a real source, if time remains.

Stop after step 4 if the clock runs out. Steps 1-4 are a complete demo.

## Working style

- Ask before adding a dependency. Small surface area.
- Plain functions over classes. This is a one-day build.
- When a design choice is ambiguous, pick the one that demos better from six
  feet away, and say which you picked.
- Flag anything that will take more than 30 minutes before starting it.
