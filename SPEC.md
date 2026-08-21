# Candela — build spec

A prep-notes app for a Cuban salsa teacher at **La Candela**. This document is the
source of truth for v1. The clickable reference is `design/prototype.html` — open it
in a browser at 393×852 and use it whenever this document is ambiguous.

---

## 1. The problem, in the user's words

> "I prep my class every two weeks with my boss Ido. He explains the moves and I take
> notes on my iPhone. In class I look at the notes to remember. The more classes I prep,
> the less overview I have. My notes don't make sense after a while."

Two moments matter. Everything else is secondary.

**Moment 1 — capture.** Ido is talking and demonstrating. Van is standing, one hand on
the phone, thumb typing. Anything that costs attention here is a bug. No titles, no
folders, no forms, no decisions.

**Moment 2 — recall.** One week later, alone, prepping the class Van has to teach.
The question is: *what am I teaching, in what order, and what must I not forget?*
Answered in seconds, with a way to drill into every detail so nothing is missed.

A previous iteration had a separate "sort your notes" pass after capture. It was cut —
the user rejected it as too much time investment. **Do not reintroduce a sorting stage.**
Structure is created during capture (one tap per move) and repaired in place afterwards.

---

## 2. Product principles

1. **The class has no name.** It is `Level · Block · Class` — three numbers. Creating a
   note is one tap from the home screen because the numbers are pre-filled with the next
   class in the block.
2. **One tap per move, zero taps per note line.** Typing a line and pressing return
   attaches it to the current move. The only structural action during capture is
   "new move", used ~5× per session.
3. **Nothing is ever rewritten or lost.** Repair is always additive or reversible. The
   raw capture — every line, in the order typed — is permanently viewable.
4. **Repair happens in place, not in a modal.** Reordering is dragging the actual row.
   Editing turns the row into a field. Deleting is a swipe. A user must always see the
   consequence of the action they are performing.
5. **Two depths, one note.** "One look" is the running order plus the single most
   important line per move. "Every detail" is everything. Same data, one toggle.
6. **Tags are open.** Warm-up, Principle and Rutina are the three that exist today. The
   user will invent more. Never hardcode the list.

---

## 3. Scope

### In scope for v1

- New note tab: the Level / Block / Class stepper and nothing else
- Classes tab: list of prep notes grouped by Level · Block
- Capture screen: typed capture, inline repair, gestures, the accessory bar
- Review screen: the "Before you teach" brief, one-look / every-detail, raw capture
- Moves tab: every move written down, deduped across classes, searchable and filterable by tag
- Ask Ido tab: every open question across all classes, answerable
- Offline-first local storage, installable as a PWA
- A sync-ready data model and a backend, even though only one user exists at first

### Explicitly not in v1

- Video capture and playback (comes later — see the v1 concept file)
- Teach mode / in-class display
- Workshops and masterclasses (different template)
- Multi-user real-time collaboration, comments, presence
- Voice capture. The mic button in the prototype is a placeholder. Leave it visible and
  inert, or hide it — do not build speech-to-text yet.

---

## 4. Stack

Decided with the user:

| Concern | Choice | Why |
| --- | --- | --- |
| Shell | PWA, installed to iPhone home screen | No App Store, works offline in the studio, Ido can open it anywhere |
| Framework | React 18 + TypeScript + Vite | |
| PWA | `vite-plugin-pwa`, `registerType: 'autoUpdate'` | |
| Local store | IndexedDB via **Dexie**, treated as the source of truth | Studio has no signal. The UI must never wait on the network |
| Sync | **Supabase** (Postgres + RLS + Realtime) behind an outbox queue | User asked for "sync built in from the start" so sharing with Ido later is a config change, not a rewrite |
| Auth | Anonymous device identity in v1, claimable by a magic-link account later | No login wall at the first prep session |
| State | Local component state + a thin store (Zustand or a context+reducer). No Redux | |
| Styling | Plain CSS with custom properties, or Tailwind configured with the tokens below. No component library | The visual system is small and specific; a library will fight it |
| Gestures | Hand-rolled Pointer Events. See §7 | dnd-kit is acceptable for the drag if it can reproduce the group-drag and the drop indicator exactly |

**Non-negotiable:** every write is applied to local state and IndexedDB synchronously and
optimistically. The sync layer observes; it never gates the UI.

---

## 5. Data model

```ts
type ID = string;               // uuid v4, generated client-side

type Note = {                   // one prep session = one class
  id: ID;
  level: number;                // 1..6
  block: number;                // 1..n
  classNo: number;              // 1..6
  preppedOn: string;            // ISO date
  preppedWith: string;          // 'Ido' for now; a userId once accounts exist
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;     // soft delete, for sync
};

type Item = {                   // one line in the note — a move title or a note under it
  id: ID;
  noteId: ID;
  kind: 'move' | 'line';
  text: string;
  flag: '' | '!' | '?';         // important / question for Ido
  answer: string;               // filled when a '?' is resolved; empty = still open
  tags: ID[];                   // tag ids; only meaningful on kind === 'move'
  libraryMoveId: ID | null;     // set when linked to a known move
  sort: string;                 // fractional index — see below
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type Tag = {
  id: ID;                       // slug
  label: string;
  color: string;                // token name, not a hex
  createdAt: string;
};
```

### Ordering

Items are ordered by `sort`, **not** by array index. Use a fractional-index /
LexoRank-style string key (`fractional-indexing` on npm is fine). Reordering writes one
row. Two people reordering concurrently converge instead of clobbering each other. An
array index would make sync unimplementable later — this matters even though v1 is
single-user.

### Grouping

There is no parent pointer. A `line` belongs to the nearest preceding `move` in `sort`
order. Lines before the first move are **loose notes**. This is deliberate: it means
promoting a line to a move, or deleting a move title, never requires rewriting children.

- `movesOf(note)` → items where `kind === 'move'`
- `detailsOf(note, moveId)` → items after that move until the next move
- `looseOf(note)` → items before the first move

### Conflict policy

Last-write-wins per field, using `updatedAt`. `sort` is the exception and is safe by
construction. Deletes are soft (`deletedAt`) so a delete on one device does not resurrect
on another.

---

## 6. Screens

Four tabs, in this order: **New note · Classes · Moves · Ask Ido**. The tab bar is visible
on all four roots and on Review, and **hidden on the Capture screen** (it is a full-screen
editing context with the keyboard up).

### 6.1 New note (tab root)

Creating a note is a destination, not a button buried in a list.

- An ember hero showing the class about to be created: `L2 · B3 · C2`, pre-filled with the
  next class in the most recently used block
- Three steppers (Level / Block / Class) to override it. Stepper buttons are 44×38 minimum
- A full-width primary button `Start typing` → creates the note and opens Capture with the
  keyboard up and the field in new-move mode
- If an unfinished note exists, a `Continue L2 · B3 · C1` card in ember below

Target: two taps from opening the app to a live keyboard.

### 6.2 Classes (tab root)

- Header "Classes". Existing notes only — no creation UI here
- Notes grouped under `Level n · Block n` headers. Each row: class number, date, move
  count, line count, and a badge with the number of open questions
- Tapping a note opens **Review**, not Capture. A week later, reading is what you want
- Empty state points at the New note tab

### 6.3 Capture

The most important screen in the app.

- Nav bar: back, `L2 · B3 · C1` with `prep with Ido · 22 lines` beneath, and `Done` →
  Review
- A dismissible hint strip on first use: **Tap** to edit · **swipe** to delete or flag ·
  **hold** to move
- The stream: move titles as headings with a left rule and a drag handle; lines indented
  beneath. Important lines are ember, questions are gold, answers appear as a teal block
  under their question
- The current move is marked `writing here` and has a solid ember left rule; the others
  are grey
- A tag prompt appears directly under a move the moment it is created:
  `Tag it?  Warm-up · Principle · Rutina · +` — it disappears when the next line is typed
- When a typed move name matches the move library, a teal suggestion offers to link it

**Composer** — two zones, modelled on an iOS input accessory bar:

1. **Field row.** A rounded field containing a *token chip* showing the current move
   (`Peso en el suelo ⌄`), then the text input, then a circular send button. Tapping the
   token opens a "Write into" menu listing every move plus "End of the note". In new-move
   mode the token turns ember and reads `NEW MOVE`, the field border turns ember, and the
   placeholder becomes `Move name…`
2. **Accessory bar.** Keyboard-grey, hairline top border, 48px. One labelled pill
   `＋ New move`, a hairline separator, icon-only `!` and `?`, another separator, the mic
   placeholder, and an Undo button on the right when an undoable action exists

Typing rules:

- Return commits the line and clears the field. The field never loses focus
- A leading `!` or `?` sets the flag and is stripped from the text
- The `!` / `?` buttons arm the flag for the next line and reset after it is committed
- A committed line is inserted after the last line of the current move, not at the end of
  the note — so jumping back to an earlier move and adding to it works

### 6.4 Review

- Nav bar: `L2 · B3 · C1`, `prepped 7 days ago with Ido`, and `Edit` → Capture
- **Before you teach** card, three rows, each collapsed to one line and expandable:
  1. `n questions for Ido` (gold) — each row tappable to answer
  2. `n things not to forget` (ember)
  3. `Running order` — every move name separated by `›`
- Segmented control: **One look** / **Every detail**
- Move cards, numbered, with tags. Collapsed: the one most important line (falling back to
  the first question, then the first note) plus `+ n more`. Expanded: every line, plus any
  cues inherited from the move library. Cards expand **individually**; the segmented
  control expands or collapses all
- `Not attached to a move` section for loose notes
- `Raw capture — n lines as typed` opens a sheet listing every line in order

### 6.5 Moves (tab root)

- A search field at the top: `Search moves and notes…`. It matches **both** move names and
  the text of the notes captured under them. A move that matched only on its notes shows a
  teal `n matching notes` line; matches are highlighted in the expanded view. A clear (×)
  button appears once there is a query
- Search must not steal or drop keyboard focus while typing — re-render and restore the
  caret, or keep the input uncontrolled
- Every move title across every note, deduped case-insensitively by name, sorted
  alphabetically
- Filter chips below the search: `All n`, one per tag actually in use, and `Untagged`.
  Search and tag filter combine
- Each row: name, tags, and the classes it appears in. Expanding shows, per class, the
  notes captured under it that time
- This is how the user builds a warm-up for a block or finds a principle

### 6.6 Ask Ido (tab root)

- Every unanswered `?` across every note, each labelled with its class and date
- Tapping opens a sheet with the question and a field for the answer. Saving writes
  `answer` on the item; it leaves this list and appears under its line everywhere else
- A collapsed `Answered (n)` section below
- The tab bar carries a badge with the open count

---

## 7. Interaction spec

Every number here is in the prototype and was tuned there. Match them.

### Rows — one gesture recogniser per row

| Input | Result |
| --- | --- |
| Tap | Edit in place. The row becomes a field with `!` / `?` toggles and a confirm button. Return or the confirm saves, Escape cancels. The composer dims and is disabled while editing |
| Swipe left ≥ 92px | Delete, with an Undo toast |
| Swipe right ≥ 92px | Toggle *important* |
| Press and hold 280ms, then move | Lift and drag to reorder |
| Press and hold 280ms, then release | Context menu |
| Drag from the handle on a move row | Immediate drag, no hold |

Axis lock: on the first pointer movement, if `|dx| > 10 && |dx| > |dy|` it is a swipe; if
`|dy| > 10` and the row is not lifted, abandon the gesture and let the list scroll.

**Swipe.** The row translates with the finger, capped at 150px. A coloured layer is
revealed behind it, opacity `min(1, |dx| / 40)`. At the 92px threshold the colour deepens
and the label changes to `Release`. Below the threshold the row springs back.

**Drag.** The lifted row scales to 1.02 with a large soft shadow. A 3px ember insertion
line shows where it will land. Auto-scroll when the pointer is within 64px of the top or
bottom of the scroll area, 10px per pointer move. Row geometry is re-measured on every
move so it stays correct while scrolling.

**Dragging a move carries its notes.** They are dimmed to 32% opacity to show they are
travelling with it. A move can only be dropped between other moves; a line can be dropped
anywhere, including into another move.

**Context menu.** iOS-style: a snapshot of the row is lifted above a blurred scrim, and
the menu floats beside it, clamped inside the viewport. The row being acted on stays sharp
and visible — this is the point of the pattern, do not replace it with a bottom sheet.

Menu on a line: Edit · Mark important · Ask Ido about this · This is actually a move ·
Duplicate · Delete.
Menu on a move: Rename · Tags · Write into this move · Make it a plain note ·
Delete title, keep notes.

### Undo

Every structural change (delete, promote, demote, reorder) snapshots the item list first
and shows a toast with **Undo** for 4 seconds. The Undo button also remains in the
accessory bar while an undoable action exists. Undo must restore ordering exactly.

---

## 8. Design tokens

```css
--bg:#FBF7F3;  --card:#FFFFFF;
--ink:#1B1411; --ink2:#655952; --ink3:#7A6C63;
--line:#ECE4DC; --line2:#DED3C9;
--ember:#D9452A; --ember-2:#B3341D; --ember-soft:#FDECE6;
--teal:#0E7C7B; --teal-soft:#E4F2F1;
--gold:#B5820A; --gold-soft:#FBF0D8;
--purple:#6B4E9E; --purple-soft:#F0EBFA;   /* Principle */
--blue:#2E6BB8;  --blue-soft:#E7EFF9;      /* Warm-up */
```

- Tag colours: Warm-up = blue, Principle = purple, Rutina = gold, user-created = teal
- Font: the system stack. No web fonts — they cost a round trip on first paint
- Type: note lines 15.5px/1.42 · move titles 19.5px/780 · nav title 16px/750 ·
  secondary 13px · section labels 10.5px uppercase, 0.14em tracking
- Radii: cards 15px · fields 12–13px · sheets 24px top · pills 999px
- Minimum touch target 44×44. `--ink3` is the lightest text permitted on `--bg`
  (4.7:1) — do not lighten it
- Motion: 160–260ms, `cubic-bezier(.22,1,.36,1)`. Sheets slide up, the lift pops from
  0.97. Respect `prefers-reduced-motion`

---

## 9. Accessibility

- Every gesture has a non-gesture equivalent, reachable from the context menu
- All text meets 4.5:1 on its background
- Rows are focusable and operable by keyboard: Enter edits, Delete deletes,
  `⌥↑` / `⌥↓` reorder
- Flags are never colour-only — `!` and `?` glyphs always accompany the colour
- Dynamic Type: honour the user's text-size setting; the layout must survive 130%

---

## 10. Acceptance criteria

The build is done when all of these pass on a real iPhone, installed to the home screen,
in airplane mode:

1. From a cold app launch, two taps and the keyboard is up in a new note
2. Typing 20 lines with 5 moves takes 5 extra taps and no other interaction
3. Force-quitting the app mid-sentence loses nothing already committed with Return
4. A line can be edited, deleted, flagged, promoted to a move and reordered without any
   full-screen modal appearing
5. Dragging a move moves its notes with it, and the drop position is visible before release
6. Every destructive action is undoable for at least 4 seconds
7. Raw capture shows every line ever typed, in the original order and wording
8. The Review screen's "Before you teach" card and running order are visible without
   scrolling on a 393×852 screen
9. Answering a question removes it from Ask Ido and shows the answer under the line
10. A new tag can be created during capture and immediately used as a filter in Moves
11. Typing in the Moves search never drops keyboard focus, and matches inside note text
    surface the move that contains them
12. Lighthouse PWA installable, and the app loads with the network disabled

---

## 11. Build order

1. **Skeleton** — Vite + TS + PWA shell, tokens, tab bar, routing, Dexie schema
2. **Capture, typed only** — the stream, the composer, Return-to-commit, new-move,
   flags. Stop here and let the user run one real prep session with Ido
3. **Repair** — inline edit, swipe, long-press menu, drag reorder, undo
4. **Review** — brief, one-look / every-detail, raw capture
5. **Moves and Ask Ido tabs**, including search
6. **Sync** — Supabase schema with RLS, outbox, pull/merge, then accounts

Ship after step 2 to the user's phone. The next prep session is the only test that matters.

---

## 12. Open questions

- Swipe-right currently maps to *important*. If questions turn out to be the more frequent
  flag, that mapping should flip. Instrument it or just ask after two sessions
- Are two flags enough, or does a third (`for the warm-up`, `music`) emerge?
- Voice capture: is it worth building once the user has typed through a real session?
- Should a move title auto-link to the library on exact match, or always require the
  explicit Link tap? Prototype requires the tap
