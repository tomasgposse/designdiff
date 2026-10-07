---
name: designdiff
description: Reconstructs the design, product and code process behind a product built with AI coding agents. Reads the project's Claude Code and Codex sessions plus its git history, finds the moments where the person corrected, cut or reframed what the AI proposed, analyzes them with design frameworks (design rationale, reflective practice, the Double Diamond and the Six Thinking Hats) and builds an HTML timeline with before/after screenshots of each screen. Use it when someone wants to show or understand their design or product process, or turn a real project into a case study.
---

# designdiff

Shows the distance between what the AI proposed and what the person decided, and what that says about how they think.

## Before you start

- `<skill>` is the folder this file lives in. Run every script as `node <skill>/src/<script>.mjs`.
- `<project>` is the path to the repo being analyzed. Usually it's the current working directory.
- All output goes to `~/.designdiff/<project-name>/`, outside any repo, so session data never gets committed by accident. Call that folder `<out>`.
- Requires Node 22+. Screenshots also require Chrome or Edge (or a browser path in `DESIGNDIFF_BROWSER`) and currently work only with Next.js projects.
- Talk to the person in their language. Their sessions tell you which one it is.

## Steps

### 1. Extract

```bash
node <skill>/src/extract.mjs <project> [--ref origin/main]
```

Writes `<out>/candidates.json`: the person's messages with decision signals, what the AI said right before and right after, and the commits with the files that changed most. Everything stays local, and emails, tokens, amounts and account numbers are masked. Use `--ref` to read a branch without pulling.

If it finds no sessions, tell the person: designdiff only reads Claude Code (`~/.claude/projects`) and Codex (`~/.codex/sessions`) sessions from this machine.

### 2. Configure the screenshots

Look at the app (its code, or a first screenshot) and write `<out>/designdiff.json` with the screens that matter for the decisions and how to reach each one:

```json
{
  "size": [430, 932],
  "screens": [
    { "name": "home", "route": "/", "steps": [{ "click": ["Explore the app", "Skip"] }] },
    { "name": "activity", "route": "/", "steps": [{ "click": "Explore the app" }, { "click": ["Activity", "Expenses"] }] }
  ]
}
```

- Each screen starts in a clean browser, like someone opening the app for the first time.
- Available steps: `{ "click": "visible text" }`, `{ "click": ["new text", "old text"] }` (labels change between versions), `{ "localStorage": { "key": value } }` to load demo data, `{ "goto": "/route" }`, `{ "wait": 1000 }` and `{ "eval": "JS code" }`.
- If the app has onboarding or a login, this step is required: without it, every screenshot shows the same entry screen.
- To find button labels, search the project's code, or capture only the latest commit first with `--only <hash>` and look at the result.
- A change counts only if it alters at least 1.5% of the screen (`"minChange"` in this file adjusts it). Below that it's noise and isn't shown.

### 3. Capture (optional)

```bash
node <skill>/src/capture.mjs <project> [--ref origin/main] [--only hash1,hash2]
```

Runs the app at every commit that touched the UI, in a separate git worktree, and captures each configured screen. It doesn't modify the project. Builds take a while: run it in the background on long histories. It flags clicks that didn't find their button (`missedSteps`). **Look at a few screenshots before moving on**: if they show the wrong screen, fix the configuration.

### 4. Curate

This step is yours, the agent's. **First read [`docs/theory.md`](docs/theory.md)**: it explains how to classify each decision. Then read `candidates.json` and write `<out>/moments.json`:

```json
{
  "project": "Name",
  "summary": "One sentence, in first person: what the product is and how it changed.",
  "lang": "en | es — the page language. Defaults to English.",
  "moments": [{
    "at": "the candidate's ts, as is (UTC, ends in Z)",
    "kind": "Vision | Scope cut | Simplification | Privacy | Real behavior | Product | Model | Visual judgment | Identity | Architecture | Dependencies | Technical simplification | Launch",
    "title": "The decision in fewer than 7 words",
    "question": "The design question being answered, as an open question",
    "direction": "The direction the person set before the AI acted: a brief, references, a problem they spotted, their own observation. Look for it in the messages before the candidate.",
    "ai": "What the AI built or proposed from that direction. Take it from aiBefore.",
    "decision": "What the person chose, corrected or cut. Take it from user.",
    "criteria": ["1 to 3 criteria, a few words each"],
    "why": "Why that decision makes the product better.",
    "quote": "A short, literal quote from the person, with no private data.",
    "move": "reframe | adjustment",
    "phase": "discover | define | develop | deliver",
    "hat": "white | red | black | yellow | green | blue",
    "principle": "optional: only if a named principle clearly applies",
    "commit": "short hash, optional: defaults to the first commit after the moment",
    "screen": "the designdiff.json screen where the decision shows",
    "visual": "false if the decision didn't change the screen: the code change is shown instead"
  }]
}
```

Rules:
- **A moment is a decision, not a request.** "Push this" doesn't count. "We don't need the full history" does.
- **There has to be contrast.** If the person just accepted what the AI proposed, it isn't a judgment moment.
- **Tell the story of the collaboration, not a summary of what the AI did.** Every moment has three steps: the person's direction, the AI's execution and the person's decision. If the person wrote a brief, shared references or spotted the problem, that goes in `direction`, even if it happened several messages earlier. Read the earlier candidates too.
- **Write `direction`, `decision` and `summary` in first person** ("I defined", "I chose", "I cut"): the page belongs to the person and will end up in their portfolio. `ai` goes in third person ("It built", "It proposed").
- **Group** consecutive messages that are the same decision.
- **Never invent.** If it's unclear what the AI proposed or why something was decided, leave it out or ask. If the evidence isn't enough for an analysis field (`move`, `phase`, `hat`, `criteria`), leave it empty.
- **Use the same criteria with the same words** across decisions: the page counts which ones repeat.
- **Pick `screen` on purpose:** the screen where the decision is visible. If none shows it, set `visual: false`.
- **Take care of the person.** Remove anger, insults, third-party names, amounts, banks and account details. A quote can fix spelling but not change the meaning.
- **Language:** write in the language the person uses in their sessions and set it in `lang`. If unclear, use English. The page translates its own labels (`en` or `es`). `move`, `phase` and `hat` accept English or Spanish values.
- 5 to 12 moments are enough for a project of a few weeks.

### 5. Review with the person

Show them the list of moments, with their classification, before generating anything. Ask what to remove or fix. It's the only real safeguard before anything gets published.

### 6. Generate

```bash
node <skill>/src/render.mjs <out>
```

Writes `<out>/proceso.html`: the evolution of each screen, a "How it was thought through" reading, and the timeline of decisions with their evidence. No exact dates are shown: weeks since the first commit and numbered versions (v01, v02…). To view it with its images, serve the folder locally (for example `python -m http.server --directory <out>`) or open the file directly in a browser.

## What it doesn't do

- It doesn't read sessions from tools other than Claude Code and Codex.
- It doesn't capture screens behind a real login or with data from a database: use `localStorage` steps or the app's demo mode.
- It doesn't replace the person's review of privacy and classification.
