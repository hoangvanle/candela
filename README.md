# Candela

Prep notes for teaching Cuban salsa at La Candela.

Two moments, nothing else:

- **Capture** — Ido is talking, you are standing, one thumb. Type a line, press return.
  One tap when a new move starts. That is the whole interaction.
- **Recall** — a week later, alone, prepping the class you have to teach. The running
  order, the things not to forget, and the questions you still owe Ido — in one look.

## Where to start

1. `SPEC.md` — the build spec. Read it first.
2. `design/prototype.html` — open it in a browser at 393×852. It works: type in it, swipe
   a line, hold a row and drag it. This is the target.
3. `CLAUDE.md` — the working agreement.

## Stack

React + TypeScript + Vite, installed as a PWA. Local-first: IndexedDB via Dexie is the
source of truth, Supabase syncs behind an outbox queue. The studio has no signal — the UI
never waits on the network.

## Status

**Build order steps 1 and 2 are done** (`SPEC.md` §11): the shell, and typed capture.
Stopped there on purpose — the next prep session with Ido is the only test that counts.

Working now:

- **New note** — hero, three steppers, `Start typing`, and a `Continue …` card for a note
  started today. One tap from a cold launch to a live keyboard.
- **Capture** — the stream, the composer with its move token and accessory bar,
  return-to-commit, new-move mode, `!` / `?` flags, the `Tag it?` prompt, the
  `Write into` menu, and a suggestion when a move name matches one written down before.
- **Classes** — notes grouped by `Level n · Block n`, with move, line and open-question
  counts.
- Everything is stored in IndexedDB the moment you press return, and ordered by
  fractional index rather than array position.

Not built yet, and deliberately so:

| | Build order |
| --- | --- |
| Inline edit, swipe, long-press menu, drag reorder, undo | step 3 |
| Review — the brief, one look / every detail, raw capture | step 4 |
| Moves and Ask Ido tabs, search | step 5 |
| Supabase sync | step 6 |

The Moves, Ask Ido and Review routes exist and say which step they are waiting on. Until
Review lands, tapping a class opens it in Capture — the stream is already readable there,
and `Done` goes back to the list.

**A typo cannot be fixed yet.** Repair is step 3. Retype the line; nothing is destroyed
and the raw order is kept.

## Running it

```bash
npm install
npm run dev -- --host     # then open the Network URL on the iPhone
```

Other scripts:

```bash
npm run build      # typecheck, then build into dist/ with the service worker
npm run preview    # serve the built output
npm test           # Playwright, driving real keyboard and pointer events
npm run icons      # regenerate the home-screen icons into public/
```

### Getting it onto the phone

`npm run dev -- --host` is enough to *use* it over the wifi, and enough for the checks in
`CLAUDE.md` — Safari's keyboard, the safe areas, momentum scrolling.

It is **not** enough for the studio. iOS only registers a service worker over HTTPS (or
localhost), so a home-screen icon pointing at `http://192.168.…` opens a blank page the
moment the laptop is off the network. For a prep session with no signal the built output
has to be served from somewhere with a certificate. That host has not been picked yet.

## Layout

```
candela/
  design/prototype.html      reference — do not delete, do not "improve"
  SPEC.md  CLAUDE.md
  scripts/make-icons.mjs     dependency-free PNG icon generator
  src/
    db/        Dexie schema, fractional index helpers, grouping rules, seed tags
    store/     in-memory note state, live queries, tags
    ui/        NavBar, TabBar, Sheet, icons, tag chips
    screens/   NewNote, Classes, Capture, Stream, Composer
    styles/    tokens.css (SPEC §8) and base.css
  tests/       capture.spec.ts — the typing rules; shots.spec.ts — screenshots
```

`src/sync/` arrives with step 6. The `outbox` table is already in the version-1 schema so
that turning sync on is not a migration.
