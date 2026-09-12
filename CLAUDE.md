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

- `person` — id, name, role (parent | kid), telegram_chat_id
- `event` — id, title, person_id, start, end, location
- `assignment` — who is covering which event (pickup, dropoff)
- `ask` — one open question: text, reason, who was asked, status

Everything on the screen is a render of these. If a feature doesn't feed the
conflict logic, it doesn't get a field.

## Conflict logic

Start with exactly one rule, and make it good:

A kid's event ends at time T at location L. No parent is free at T. That's a
conflict. Rank candidate parents by who is free soonest, ask the top two.

Do not generalize this into a rules engine. One rule demoed well beats five
rules that half-work.

## Interfaces

### Wall screen
`wall.html` already exists. It is state-machine driven, not hardcoded screens.
A `world` object holds people, their status lines, and the current ask.
`render()` is a pure function of `world`.

To wire the real backend: delete the `beats` array, have the poller mutate
`world`, call `render()`. That is the only seam. Do not restructure the markup
or the CSS.

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
2. Wall polls that endpoint and renders. Prototype now shows real state.
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
