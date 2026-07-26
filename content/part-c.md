# Part C — Closing reflection

## What I deliberately left out

**From the design: a cost model.**

Question 4 argues that separating clients physically is the strongest guarantee available, and question 6 commits to one database and one AWS account per installation. I still think that is right. I did not price it.

Question 5 reasons about 300 clients, so the number is already in the document. At 300 clients that topology is up to 300 database instances, 300 accounts, and 300 Terraform states to keep current. Question 5 says the scheduler breaks first. The scheduler is what breaks *technically* — what more likely breaks the business is the monthly bill and the number of environments a small team has to patch.

I left it out because the brief asks about architecture and I had no pricing to work from. That is a reason, not an excuse: I chose the most expensive shape available and did not count it, and "how many clients share an installation" is a commercial decision I presented as a purely technical one.

**From the code: external checks and I/O.**

The library does none.

`validate` only judges what is inside the record itself. External checks — verifying a national ID against the registry, spotting a duplicate report, confirming a previous application — happen somewhere else.

This keeps validation predictable and stops an unavailable third-party service from breaking it.

The cost is that real validation is split in two and this library covers one half. Everything a record can be judged on by itself is here. Everything needing the rest of the world is not, and I have neither built that side nor said where it lives.

A smaller one: if a definition is broken — an unparseable pattern, an unknown type — the library skips that check rather than failing, so a fault in the definition cannot stop a record from being told what is wrong with *it*. But a skipped check is silent, and silence is the wrong shape for "this field was never validated". A warning naming the faulty field would fix it. I did not add one.

---

## What I noticed and did not address

The definition format only supports English labels. There is no slot for a second language.

My error messages are English strings too, but that is my code and I can fix it. The label problem is upstream: a platform that must speak Hebrew cannot express a Hebrew field label in this format at all.

I did not invent a shape for it because the right structure depends on requirements I do not have. Naming the gap is more honest than guessing at it.

---

## The decision I am least confident about

Adding `describeIndexes`. Nobody asked for it, and the flags it reads are mine.

The format as shipped says how a field is entered and nothing about how it is used. That matters here: the flexible fields sit in one JSON document per record, so nothing is indexed by default, and the definition is the only thing that knows what a client actually queries on. So I added three optional flags — `filterable`, `sortable`, `reporting_dimension` — to the three definitions, and wrote a function that reads them.

That is a bigger step than the other four format gaps I found, where I wrote down the problem and stopped. Here I extended the format and then built the consumer for my own extension, which is a short walk from proving a point to marking my own homework.

It is defensible: the flags are optional, the validator ignores them, and a definition written to the format exactly as shipped still runs unchanged. But a fourth client's definition will carry none of them, and against that definition the function returns an empty list and looks like invention for its own sake.

Seeing that definition would settle it. If the format has since grown something in this shape, the instinct was right. If it has not, I should have left this as the fifth paragraph in a list and not as a module.

---

## What I would do differently

I would build the smallest working version before writing the architecture note.

I wrote Part A first, and it was confident that validation lives on the field. That only broke when I sat down with a real definition and tried to say "the project end date must not be before the start", and found the sentence had nowhere to go. It is the first entry in Question 8 because the code found it, not because the thinking did.

Prose stays plausible indefinitely. A definition file does not.

---

## What I wanted to add and did not

Property-based tests: generate random but valid definitions and records, and assert the library behaves.

The central claim of both parts is that this code contains no knowledge of any specific client. Right now that claim rests on three definitions I can see and on my own discipline while writing it.

Generated definitions are the closest honest proxy for the fourth client I have not been shown. They would test the claim instead of asserting it.
