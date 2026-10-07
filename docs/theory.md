# Frameworks for reading a design process

[Español](teoria.md)

designdiff uses four frameworks to analyze each decision. They aren't decoration: each one answers a different question about the process, and together they let you read it as a whole instead of as a list of changes.

| Framework | Question it answers | Field in `moments.json` |
|---|---|---|
| Design rationale (QOC) | What was being decided, between which options and by which criteria? | `question`, `direction`, `ai`, `decision`, `criteria` |
| Reflective practice | Did it change the problem or only the solution? | `move` |
| Double Diamond | Which stage of the process was it in? | `phase` |
| Six Thinking Hats | Which kind of thinking drove the decision? | `hat` |

One rule for all of them: **classify from what the person said, not from what we assume they thought.** If the evidence isn't enough, leave the field empty. An empty field is more honest than an invented one.

---

## 1. Design rationale: questions, options and criteria (QOC)

**Origin.** MacLean, Young, Bellotti and Moran, *Questions, Options, and Criteria: Elements of Design Space Analysis* (1991). It proposes documenting design as a space of decisions, not just as the final result.

**What it's for here.** It's the structure of every moment. Each decision answers a design **question**, chooses between **options** (at least the one the AI proposed and the one the person chose) and does so according to **criteria**.

**How to apply it.**
- `question`: the design question, phrased as an open question. "How much history does the app need to be useful on day one?", not "History".
- `direction`: the starting point the person set (a brief, references, a problem they spotted). Without it, the decision looks like a reaction to the AI instead of part of the person's own process.
- `ai`: the option the AI proposed or built.
- `decision`: the option that was chosen.
- `criteria`: the criteria that weighed in, 1 to 3 words each, taken from what the person said. Examples: "trust", "user effort", "legibility", "maintenance cost".

**What it reveals overall.** Criteria that repeat are the designer's **real principles**, proven with decisions rather than stated in a deck. If "user effort" shows up in five decisions, it's a principle.

---

## 2. Reflective practice: reframe or adjustment

**Origin.** Donald Schön, *The Reflective Practitioner* (1983). It describes design as a "conversation with the situation": the designer makes a move, the situation talks back, and that response changes how they understand the problem. With AI agents the situation literally talks back: every AI proposal is a response.

**What it's for here.** It separates two kinds of decisions that carry very different weight:

- **`reframe`**: the decision changes **which problem** is being solved. "It's not an app for logging expenses, it's an app so you don't have to log them." After a reframe, part of the earlier work stops being useful.
- **`adjustment`**: the decision improves **the solution** to the same problem. "The main number isn't legible on that background."

**How to apply it.** Ask: if this decision hadn't been made, would the AI still be solving the same problem, only worse? If so, it's an adjustment. If it would be solving a different problem, it's a reframe.

**What it reveals overall.** Few reframes and many adjustments is normal in a mature project. Reframes are the most valuable moments for a case study because they show product judgment. Adjustments show craft.

---

## 3. Double Diamond

**Origin.** Design Council (UK, 2005). It splits the process into two diamonds and four phases. Each diamond first opens options (diverge) and then narrows them (converge).

| `phase` | Diamond | Movement | You recognize it when the person… |
|---|---|---|---|
| `discover` | Problem | Diverge | explores references, users, context, how others solve it |
| `define` | Problem | Converge | decides what the problem is, who it's for and what's left out |
| `develop` | Solution | Diverge | tries alternatives, asks for variants, explores directions |
| `deliver` | Solution | Converge | polishes, fixes, cuts to ship, decides when and to whom to open it |

**How to apply it.** The phase depends on **what the decision does**, not on the date. A scope cut in the last week is `define`, even if the project is almost done.

**What it reveals overall.** The order of phases over time. A real process is almost never linear: going back to `define` after `develop` isn't a mistake, it's learning, and it's worth showing. If there's no `discover` decision at all, that's an honest signal that the project started from the solution.

---

## 4. Six Thinking Hats

**Origin.** Edward de Bono, *Six Thinking Hats* (1985). It's a facilitation technique: a group "wears" one hat at a time to think in a single mode. Here it's used **not as a workshop technique but as an analysis lens**: it identifies which thinking mode drove each decision.

| `hat` | Mode | You recognize it in phrases like… |
|---|---|---|
| `white` | Data and information: what we know, what's missing | "the API doesn't return that field", "we only get the last 90 days" |
| `red` | Intuition and emotion, unjustified | "I don't like it", "it feels generic", "something's off" |
| `black` | Risk and caution: what could go wrong | "that leaves my data exposed", "I don't want anyone in yet" |
| `yellow` | Value and benefit: why it's worth it | "this way you don't have to enter anything", "this helps it scale to more people" |
| `green` | Creativity and alternatives | "what if instead of connecting every account…?", "maybe a short onboarding" |
| `blue` | Process and priorities: what comes first | "first make it work", "let's leave that for later" |

**How to apply it.** One hat per decision: the one that **best explains the why**. If the person proposes an alternative because they're worried about a risk, the hat is `black` (the reason), not `green` (the form).

**What it reveals overall.** The designer's thinking profile:
- Lots of `black` and `blue`: careful, organized decisions. Guards risk and focus.
- Lots of `green`: explores. Check whether it also converges.
- Lots of `red`: decides on aesthetic judgment or intuition. Valuable, but a stronger case study backs it with evidence.
- Little `white`: decisions made with little data. A useful signal for where to add research, not a criticism.

---

## 5. Named principles (optional)

If a decision clearly applies a known principle, name it in `principle`. **Only if the link is direct**: forcing a principle to make a decision look more academic costs credibility.

Some that come up often:
- **Nielsen's heuristics (1994):** visibility of system status, recognition rather than recall, error prevention, minimalist design, user control and freedom, consistency.
- **Hick's law:** more options, more time to decide. Shows up in scope cuts.
- **Progressive disclosure:** show only what's needed and reveal the rest when it's needed. Shows up in onboarding.
- **Sensible defaults:** the app works well without configuration.
- **Privacy by design (Cavoukian):** ask for the minimum access needed.
- **WCAG contrast:** text legibility against its background.

---

## The overall reading

`render.mjs` combines these fields into a **"How it was thought through"** section near the top of the page: the criteria that repeat most, the share of reframes and adjustments, the path through the Double Diamond phases and the hats profile. That section is what turns a list of changes into a readable process.
