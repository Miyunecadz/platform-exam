# How I used AI on this exercise

> Draft — edit this to match how *you* actually worked, so it is true. The two
> parts the brief reads most carefully are "what it got wrong" and "where it
> helped least"; keep those honest and specific.

**Tools and models.** Claude Code running Claude Opus 4.8, as a single agent with
access to the repository — used for thinking through the architecture, writing the
library and its tests, drafting the Part A and Part C prose, and building this page.

**What I used it for.**
- *Architecture (Part A):* a long back-and-forth. I set the decisions I cared about
  — the stack, the tenancy model, the unknown-field policy — and used the model to
  pressure-test them and to draft the write-ups, which I then reworked in my own
  words.
- *Code (Part B):* it wrote the first pass of the validator, the form descriptor,
  and the test suite from the format spec and the sample records; I directed the
  design decisions (no coercion, warnings for unknown fields, ISO dates).
- *This page:* built by the model to my structure.

**How I worked with it.** Mostly long, iterative conversation rather than one-shot
prompts: draft, critique, revise. I had it argue against its own choices — for
example, whether a shared database with row-level security is really enough
isolation for the clinic — so the reasoning on the page is reasoning I can defend,
not reasoning I accepted on faith.

**Something it got wrong, and a suggestion I rejected.**
- A concrete bug: in the first pass of the validator it reported unknown-field
  errors by reusing the `"required"` error code with a different message. That is
  the kind of shortcut that looks fine and quietly corrupts the machine-readable
  contract the codes exist to provide. I had it add a proper `unknown_field` code.
- A suggestion I rejected: it initially reached for **type coercion** — treating
  `"1500"` as the number `1500`. I rejected it: a validator that guesses hides the
  errors it exists to surface. Coercion, if wanted, belongs in a separate,
  explicit step.

**Where it helped least.** The judgement the exercise is actually testing. The
model drafts plausible prose and defensible-sounding tradeoffs quickly, but it does
not *hold an opinion* — press it and it will happily argue the opposite just as
fluently. Deciding which tradeoffs are right *for these specific clients*, which of
my own decisions I am least sure about, and what I would say when someone pushes
back in the follow-up conversation — that part did not come from the model, and it
is the part that matters most here.
