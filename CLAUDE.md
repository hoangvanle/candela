# Working agreement — Candela

Read `SPEC.md` first. It is the source of truth. `design/prototype.html` is the visual and
interaction reference — open it in a browser at 393×852 before writing any UI code, and
re-open it whenever the spec is ambiguous. It is a single self-contained HTML file with
working state; you can read its source.

## What this is

A prep-notes app for one Cuban salsa teacher. It has exactly two jobs: capture what her
boss Ido says while he is saying it, and make that readable a week later. Every decision
serves one of those two moments.

## Rules

1. **Do not add features.** The spec's non-goals list is binding. Video, teach mode,
   workshops, search and voice are all deliberately out. If something seems missing,
   raise it — do not build it.
2. **Do not reintroduce a sorting or triage step.** A previous iteration had one and the
   user rejected it as too slow. Structure is created during capture and repaired in
   place.
3. **The capture path must never wait.** No spinner, no network call, no confirmation
   dialog between a keystroke and the line appearing. Writes go to local state and
   IndexedDB optimistically; sync observes.
4. **No modals for spatial operations.** Reordering, editing and deleting all happen on
   the row itself, in view. The one permitted overlay is the iOS-style lifted context
   menu, where the row stays visible above the scrim.
5. **Match the numbers in §7 of the spec.** 280ms hold, 92px swipe threshold, 10px axis
   lock, 64px auto-scroll margin, 4s undo. They were tuned in the prototype.
6. **Order with fractional indexes, never array positions.** Even in single-user v1.
7. **Never hardcode the tag list.** Warm-up / Principle / Rutina are seed data, not an
   enum.
8. **Nothing is destroyed.** Soft deletes, undo on every structural change, and the raw
   capture view always shows every line as originally typed.

## How to work

- Follow the build order in §11. **Stop after step 2** and get it onto the user's phone.
  She has a prep session with Ido every two weeks; that session is the only real test.
- Prefer plain, boring code. This is a small app that has to be maintainable by one
  person a year from now.
- No component library. No CSS-in-JS runtime. The design system is 20 tokens and about
  a dozen components.
- Test gestures with real Pointer Events in a headless browser (Playwright can drive
  `mouse.down` / `move` / `up`), not just by eye. The prototype's test script does this.
- Verify on a real iPhone over the local network (`vite --host`) before calling anything
  done. Safari's keyboard, safe areas and momentum scrolling will surprise you.

## Language

UI copy is in English; move names stay in Spanish (`Dile que no`, `Adiós con la hermana`,
`Sombrero`). Keep the user's own wording in seed and sample data — lowercase, terse,
occasionally ungrammatical. That is what real capture looks like and the UI has to hold it.

## Repo

Create the GitLab project and push. Suggested layout:

```
candela/
  design/prototype.html      # reference — do not delete, do not "improve"
  SPEC.md
  CLAUDE.md
  src/
    db/          Dexie schema, migrations, fractional index helpers
    sync/        outbox, Supabase client, merge
    ui/          components
    screens/     Classes, Capture, Review, Moves, Ask
```
