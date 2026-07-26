# How I used AI on this exercise

## Tools and models used

I used Claude Code with access to the repository.

I used different models for different tasks:

* **Opus 5** for planning, research, architecture discussions, and review.
* **Sonnet** for implementation based on written notes.
* **Opus 5 again** for reviewing the final work, focusing on security and architecture issues.

I only used Claude Code, so the work was not compared against another AI provider. This means the feedback came from the same model family and may share some of the same assumptions.

---

## How I used AI

For **Part A**, I used AI to challenge decisions I had already made, improve explanations, and help write the documentation.

For **Part B**, I used AI to implement the validator, form description, and tests based on my written decisions.

The important part of my process was writing the decisions first before asking AI to implement them. This kept the design choices visible and made AI act more like an implementation assistant rather than making architectural decisions itself.

---

## What worked well

The most valuable use of AI was reviewing my own work.

Instead of only asking for opinions, I started asking it to verify things directly.

For example:

* Running tests to confirm behaviour.
* Checking whether client names appeared in the code.
* Comparing files against the starter repository.

A good example was testing whether a required `version` field was actually enforced. Instead of discussing it, I created a small test and confirmed the real behaviour.

---

## Things AI got wrong

Two issues came from accepting AI-generated text without checking the facts.

### 1. Contradicting sections

One section claimed that a separate user pool could always identify the client.

However, Client A and Client B share the same installation, so they also share the same user pool.

Another section correctly said client identity comes from the user's account.

The contradiction was only visible when reviewing the whole document together.

### 2. Incorrect authorship claim

One section said that I created the three client definitions.

That was incorrect because those definitions were already provided with the exercise.

The mistake was found by comparing the files against the original starter repository.

---

## A suggestion I rejected

I rejected automatic type conversion in the validator.

For example, converting:

```
"1500"
```

into:

```
1500
```

A validator should report incorrect data, not silently fix it.

If conversion is needed, it should happen in a separate step before validation.

---

## Where AI helped the least

AI is weakest when reviewing something based on a wrong assumption.

It can identify possible problems very confidently, but those problems still need to be verified.

For example, it incorrectly flagged some existing definitions and documentation as outdated. These issues were easy to check by comparing files, but they sounded just as convincing as real findings.

The lesson is:

AI is useful for finding possible issues, but its feedback should be treated as a list of things to verify, not automatic truth.

---

## Final takeaway

AI was most useful as a partner for exploration, implementation, and review.

However, the important decisions still need human ownership.

The architecture choices, trade-offs, and reasons behind decisions had to come from me. AI helped test those decisions, but it could not replace the responsibility of making them.
