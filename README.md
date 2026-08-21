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

Design is settled through three prototype rounds with the user. No code yet.
Build order is in `SPEC.md` §11 — ship after step 2, before building anything else.
