# Part A — Architecture note

## 1. Questions I would ask before building

Each question is followed by the assumption I proceeded on.

### 1. Who will be responsible for making configuration changes - your team or the client?

The brief doesn't explain who will actually update the settings. This is important because it affects how much work your team will need to do.

If your developers have to make every change, each change might be faster, but clients will still need to ask your team whenever they want something updated. As more clients join, your team could still become the bottleneck.

*I assumed your team would handle the initial setup to make sure everything is configured correctly. Once everything is running smoothly, clients can be given access to simple settings, such as email templates, field labels, and filters. No matter who makes the changes, anything that is different between clients should be stored as configuration, not hard-coded. That makes the platform easier to maintain and avoids code changes for small client requests.*

### 2. What should happen when the national registry API is unavailable or returns no data?

The brief doesn't explain what should happen if the government registry API is unavailable or returns no result. This is important because applications below the score threshold are rejected automatically without anyone reviewing them.

If the registry is unavailable, or the applicant enters the wrong registry number, a valid application could be rejected by mistake.

*I assumed the system never automatically rejects an application when it can't get the information it needs. Instead, those applications are sent to a staff member for manual review. When registry data is successfully retrieved, it is stored along with the date and time it was collected. This provides a clear record of how the score was calculated and avoids calling the registry again every time someone opens the application.*

### 3. How do users log in, and are there any authentication requirements for the clinic?

The brief clearly explains the user roles, but it doesn't say how users log in. It isn't clear whether the municipality already has a staff directory or single sign-on system that the platform should use. It also doesn't mention whether there are extra security requirements, such as two-factor authentication for staff who can access clinical information.

*I assumed the platform has its own user accounts, with roles configured for each client. Two-factor authentication is available and enabled for clinic staff who have access to patient or clinical data. I also assumed that residents, applicants, and referring physicians do not log into the platform, so they don't need user accounts.*

*There is one more type of user to consider: your own support team. These accounts are the highest risk because they can access more than one client. I assumed these accounts always require two-factor authentication, and every time one is used to access a client's data, the action and reason are recorded. I also assumed these support accounts are not available in the clinic's dedicated installation.*

### 4. What are the data retention rules, and what happens if a client leaves?

The brief doesn't explain how long medical records should be kept or what happens when a client stops using the platform. Both are important. Healthcare organisations often have legal requirements for keeping records, and they may need to prove they have followed those rules. The process for returning or removing data when a client leaves is also not covered.

*I assumed each client has its own data retention settings so every organisation can follow its own policies. I also assumed that records are never permanently deleted by default.*

*The removal process depends on how the client is hosted. The clinic has its own database, so its data can be exported and the entire database can then be removed. Clients sharing the same installation cannot be removed that way because their data is stored alongside other clients in the same tables.*

*For shared installations, I assumed there is a removal tool that deletes data belonging to one client and produces a report showing exactly what was removed. This allows the process to be checked and verified. This tool should be built before multiple clients share the same installation, not after a client has already decided to leave.*

*The same applies to data retention. Any automated process that removes old records should always work on one client at a time so that one client's retention policy can never delete another client's data.*

### 5. Does data from the three existing systems need to be migrated?

The brief doesn't mention moving data from the current systems. This should be included because the existing systems have been used for years and contain records that staff still need for reporting, audits, and daily work. For example, Client A's reports would lose much of their value if historical data wasn't available.

*I assumed the existing records are migrated as read-only, so staff can view them but cannot edit them. I also assumed each client is migrated on a different date instead of moving all three clients at the same time. Migrating one client at a time is safer, easier to manage, and gives the team time to fix any issues before the next migration.*

*If a client is moving into an installation that already serves another client, I assumed the migration can run without taking the platform offline.*

### 6. How should the platform behave when one client's volume increases sharply?

Client A normally receives around 200 reports each day but has received up to 4,000 reports in a single afternoon after a storm. The brief doesn't explain what should happen to other clients during this type of spike.

When multiple clients share the same installation, one client's sudden increase in work could slow down everyone else because they share the same processing resources and notification system.

*I assumed incoming reports are placed into a queue and processed steadily instead of all at once. I also assumed notifications are rate-limited for each client. This means a large increase in work only affects the client that caused it and doesn't impact other clients using the same installation.*

### 7. Is the upcoming fourth client the same shape as these three?

The platform is designed around one common workflow: something is submitted, it moves through different stages, notifications are sent, staff work from queues, and managers view reports. This approach works well for the first three clients because they all follow the same process.

The brief doesn't explain whether future clients will follow this same pattern, even though the platform depends on it.

*I assumed any future client will fit this same workflow. If a new client needs a completely different process that can't be handled through configuration, then it falls outside the scope of this platform. In that case, it's better to decline the work than to add client-specific code that makes the platform harder to maintain.*

*I also assumed every new client is reviewed for both its business process and its legal requirements to decide whether it can share an installation or needs its own dedicated environment, like the clinic.*

---

## 2. How would you model "a client's data shape"?

### Every record has a fixed part and a flexible part

I split every record into two parts. One part is the same for every client, and the other contains the information that is unique to that client.

The fixed part includes everything the three existing clients already have in common, even though they use different names. Every record, whether it's a report, application, or referral, has an ID, a current stage, a created date, a history of who updated it and when, an assigned staff member, attachments, and one external contact who receives notifications. Depending on the client, that contact could be a resident, a contact person, or a referring physician.

These are common across all three clients, and there is no reason to expect the fourth client to be different. Because of that, they are stored as normal database columns and only need to be built once.

The flexible part contains the information that is different for each client, such as the pothole category, registry number, urgency level, or clinical notes. These fields are not hard-coded. Instead, they are defined in each client's settings, and the platform uses those settings to build the forms, queues, and reports automatically. For example, nobody has to build a referral form specifically for the clinic. The platform creates it using the clinic's field settings.

### How the flexible fields are stored

Each record stores its client-specific fields in a single JSON document instead of adding lots of database columns or storing each field as a separate row.

The main reason is performance. All three clients need reports, such as monthly totals by category and neighbourhood, totals by funding round, or referrals by specialty. If every field was stored as a separate row, the system would need to rebuild each record from many rows before creating those reports. That becomes slower as the amount of data grows, especially for Client A, which handles around 200 reports every day.

By storing the values together, the platform can read the whole record in one operation.

To keep reporting fast, each field setting also records whether the field can be filtered, sorted, or grouped. The platform then creates indexes only for those fields. This means the indexes match each client's configuration. If a client adds a new filter, the platform automatically creates the index it needs without any developer making code changes.

### What a field setting includes

A field setting contains much more than just a name and data type. It also stores information that allows different client requirements to be handled through configuration instead of custom code.

**Sensitivity.** 

Each field has a sensitivity level, and each user role is allowed to access certain levels.

This is how the clinic's privacy requirements are handled. Reception staff can see the patient's name, phone number, and appointment details, but not the clinical notes. The clinical notes field is simply marked as sensitive, and the reception role is not given permission to view that level. The application doesn't need any clinic-specific code to make this work.

Building Part B sharpened what "handled through configuration" means here, and it is less than I first wrote. A sensitivity level on a field is a *declaration*. Part B carries it from the definition through to the form description and stops, because there is no role in Part B to check it against. Field-level privacy is two things — a label on the field, which is configuration, and a rule about which roles may read which levels, which is a second settings table. Only the first half fits on a field. Getting the declaration in early still matters, for the reason in question 9: adding it after forms, exports, and reports exist means revisiting all three.

**Filterable and sortable.** 

Each field records whether it can be used for filtering or sorting. This tells the platform which fields should appear as filter options in that client's work queues and which fields need database indexes.

**Reporting dimension.**

Fields can also be marked as reporting fields. These are the fields management uses to group and summarise data, such as neighbourhood, category, or specialty. Because this is configured through settings, reporting screens don't need to be custom-built for each client.

These three flags are the ones that decide which indexes exist, so Part B reads them: `describeIndexes` takes a definition and returns only the fields that earn an index, with the reason each one earned it. Client C's referral queue indexes specialty and urgency and nothing else — clinical notes is free text nobody filters on, and it stays unindexed. Change the definition and the index list changes with it, which is the whole claim in one function.

I added that function for a reason worth stating: I first added the three flags on their own, and they sat in the definition with nothing reading them. A flag no code consumes is a comment with extra steps. It cannot be wrong, so it cannot be evidence either.

**Validation.**

Each field also stores its validation rules, such as whether it is required, minimum or maximum values, and expected formats like a registry number or national ID.

Every rule here is about one field on its own. That is a real limit, not a simplification, and question 8 is where it lands.

### The six tables that define a client

Fields are only one of six things a client defines. Onboarding a client means filling in all six, and nothing beyond them.

| What the client defines | Example from the briefs |
| --- | --- |
| Fields | Registry number, urgency, neighbourhood |
| States and permitted moves | Received to Triaged to Scheduled |
| Roles | What a triage nurse may move and what they may see |
| Notification rules | Trigger, channel, template, recipient |
| Queues | Filter by specialty, sort by urgency then arrival time |
| Reports | Group by category, count per month |

### The field type list

The platform provides a fixed set of field types. Adding a new field is a configuration change. Adding a new field *type* is development work, so the list has to be broad enough to cover a new client without touching code.

I did not settle this list by reasoning about it. I wrote the three clients' definitions in Part B and took the list that fell out. It is ten types:

| | | |
| --- | --- | --- |
| short text | long text | number |
| date | email address | phone number |
| single choice | multiple choice | file upload |
| yes/no | | |

Writing the definitions changed the list twice, in both directions.

**One type I had not planned for.** All three clients need a plain yes/no: a resident asking for a callback, an organisation declaring it has been funded before, a patient consenting to records being shared. I had been treating this as a single choice with two options. It isn't — the answer is a boolean in the record, and treating it as a choice means every client re-declaring the same two options and every form drawing a dropdown for a checkbox.

**Three types I planned for and never used.** I expected to need money, address, and date range. None survived contact with the three briefs:

- **Money** became `number` with a range. Client B's requested amount is 1,000–500,000; Client A's estimated cost is 0–1,000,000. A number with `min` and `max` covers both.
- **Address** became `text` with a length limit. Client A's street address is free text that a person reads.
- **Date range** became two `date` fields — Client B's project start and project end.

The first two are honest simplifications with a cost I can name. A money type would carry a currency and fix the rounding rule in one place instead of leaving both to whoever writes the definition. An address type would let reports group by city, which `text` cannot.

The third is not a simplification. It is a gap, and Part B is where I found it — see question 8.

> **Draft — rework in your own voice.** This section now claims the list is empirical rather than theorised, which is a stronger answer but only if you can say it as your own. The three bullets are the ones worth being able to defend cold.

### What has to be true for onboarding to require no new code

Four conditions have to hold, and together they are the real answer to the question.

**No client's name appears anywhere in the application code.**

A client's name should never appear in the application code. This can be checked automatically rather than by reading through the code. For example, if searching for words like "clinic" or "foundation" finds anything outside test data, it means some behaviour has been hard-coded instead of being stored in configuration. If that's the case, adding a new client will always require development work.

This is the one condition Part B settles rather than argues. Searching the library for the three clients' names, or for any of their field names, returns nothing. The three definitions go through one code path.

**All three existing clients must be expressible in the model with nothing left over.**

Before trusting the design for future clients, it should work for the three clients we already know. If Client C needs a special exception to make it work, then the model isn't complete. That means future clients are also likely to need exceptions. This is the most useful test because it can be done before any new client is onboarded.

Part B tests this at field level for all three clients, including the sample records built to be awkward. Nothing was left over, with one exception I did not expect and could not configure my way past — Client B's project start and end dates, which is question 8.

**Onboarding must be the import of a single configuration document.**

A new client should be defined in a single configuration file. That file can be reviewed before it goes live, stored in version control, and used as a starting point for similar clients.

If setting up a client means clicking through lots of screens instead, the process becomes slower, less consistent, and more likely to introduce mistakes.

Two things about this that only became clear once I had written such a file three times. The first is that "reviewed before it goes live" is doing more work in that sentence than it looks. Nothing checks the document itself — a choice field with no options, a minimum above its maximum, a field type that doesn't exist. The library validates records against a definition and trusts the definition completely. On a platform where non-developers author definitions, a bad definition is at least as likely as a bad record, and a meta-schema over the definition format is the first thing I would add. The second is that a definition is easier to read than the settings screen it replaces, which is most of why I would delay that screen — see question 9.

**Definitions must be versioned, and each record must remember the version it was created under.**

Client settings will change over time while records are still active. Because of that, configuration should be versioned, and every record should store the version it was created with.

For example, adding a new field in March shouldn't change the meaning of records created in February. Likewise, renaming a workflow stage today shouldn't affect reports generated from last year's data.

In Part B the version is a required part of a definition rather than an optional extra, and validating a record reports the version it was checked against, so the caller has something to store alongside the record. Making it required was deliberate: a version that can be left out will be left out, and the records created before anyone noticed are exactly the ones that later need it.

### The honest boundary

If a future client needs a field type that doesn't already exist, then development work is required. However, the new field type should be added as a reusable platform feature that every client can use, not as a custom feature for one client.

That's the line between improving the platform and creating client-specific code. The platform can grow over time, but it should never be customised in a way that only works for a single client.

### What Part B covers, and what it doesn't

Part B implements the first of the six tables — fields — for all three clients, in two directions: checking a submitted record against a definition, and turning the same definition into a form description and an index list. It does not implement the other five. There are no states, transitions, roles, notification rules, queues, or reports in the code.

I'm saying that plainly because the fields table is the one where "differences as data" is easiest to believe and the workflow tables are where it actually gets tested. What Part B does establish is the pattern the other five would follow: a definition is a plain document, the code that reads it holds no client knowledge, and every client goes through the same path. What it does not establish is that the pattern survives the workflow tables, which is a claim I am making from design rather than from code.

---

## 3. Where do client differences live?

### In settings tables, sitting next to the records

Client-specific differences are not environment variables and not separate code branches. They are data the application reads at runtime, and in the running platform they live as normal records in database tables, alongside the client's own data. The application reads these settings just like it reads any other data.

Part B ships its definitions as JSON files, because there is no database in the exercise. That difference matters less than it looks, and it is worth being precise about why. The library takes a definition as an argument and never goes looking for one — it does not read a file, an environment variable, or a path. Whether a definition arrives from a table, a file, or an API is a question for the caller, not for the code that uses it. Storing them in tables is what makes them editable, auditable, and versionable per client; it isn't what makes the code client-agnostic.

The reason to be clear about that distinction is that it decides who can change a definition. In a file, only someone with a deploy. In a table, whoever the roles allow — which is the whole answer to question 1.

Every settings table includes a client ID, just like the record tables. If a client has its own dedicated installation, that client ID will always be the same, but it is still included and used in every database query. This allows the same code to work whether a client has its own installation or shares one with other clients. As a result, the way a client is deployed never changes how the application is built.

Each record only stores its current workflow stage. The stage name, the stages it can move to next, and which user roles are allowed to make those changes are all stored in the client's settings. The platform reads these settings whenever it needs them instead of hard-coding the workflow into the application.

### The two tables that hold the workflow

The whole of "Client A's statuses are these, Client C's are those" lives in two tables.

The first lists the stages. This is Client C:

| id | label | position | is_initial | is_terminal |
| --- | --- | --- | --- | --- |
| `received` | Received | 1 | yes | no |
| `triaged` | Triaged | 2 | no | no |
| `scheduled` | Scheduled | 3 | no | no |
| `seen` | Seen | 4 | no | no |
| `closed` | Closed | 5 | no | yes |

Client A's table has the same columns and different rows: `new`, `assigned`, `in_progress`, `resolved`, `closed`. There is no Client A table and no Client C table. There is one table, holding both clients' rows.

The second lists which moves are allowed and who can make them. Again for Client C:

| from_state | to_state | label | required_role |
| --- | --- | --- | --- |
| `received` | `triaged` | Triage | `triage_nurse` |
| `triaged` | `scheduled` | Book appointment | `reception` |
| `scheduled` | `seen` | Mark seen | `specialist` |
| `seen` | `closed` | Close | `specialist` |

Client A's workflow uses the same setup, but with different values. Every workflow step requires the `department_head` role to move it forward. That's why a call centre operator can create and view reports but cannot move them to the next stage. This behaviour isn't hard-coded. It works simply because none of the workflow settings give that permission to the operator role.

### Why the id and the label are separate columns

This is what makes renaming a stage a simple configuration change instead of a development task.

The `ID` is the permanent internal value. Once it's created, it never changes. Records, workflow rules, notification rules, and reports all refer to the stage by this ID.

The `label` is just the text shown on the screen. A client can change it whenever they want. For example, if the clinic decides to rename `"Triaged"` to `"Assessed"`, only the label changes. Existing referrals still point to the same stage, workflow rules continue to work, and reports stay accurate because everything uses the permanent ID, not the displayed name.

### How it is read when the system is running

Each client only has a small number of settings, so they are loaded into memory when the application starts instead of being read from the database on every request.

The application keeps a separate copy of the settings for each client, along with a version number. When a client updates their settings, the version number changes, and only that client's settings are reloaded. The application doesn't need to restart, and other clients are not affected.

For example, when clinic staff open a referral currently in the Triaged stage:

- The application reads the current stage stored on the referral.
- It looks up that stage in the client's settings and displays the label "Triaged".
- It checks the workflow settings to see which stage can come next.
- It checks which user role is allowed to perform that action.
- If the signed-in user has the reception role, they see a "Book appointment" button.
- If they are a specialist without that permission, the button is not shown.

The whole screen is built from configuration. There is no clinic-specific workflow or referral screen hard-coded into the application.

### What must never exist in the code

The application should never contain:

- A fixed list of workflow stages.
- Code that checks for specific stage names.
- Logic that behaves differently depending on a hard-coded stage.

As soon as any of these exist, part of the workflow becomes specific to one client. That means adding or renaming a stage would require development work instead of a simple configuration change.

This can also be checked automatically. Searching the codebase for workflow stage names should only find them in test data. If they appear anywhere else, it means the configuration model has been bypassed.

### One decision that didn't end up in the definition

Worth recording, because it is the kind of thing this rule is meant to catch.

When a record arrives with a key no field defines, something has to decide what happens: warn and accept, reject, or ignore. In Part B that choice is an argument to the validation call, not a setting in the client's definition — so a client's own document does not say how strict their platform is about unexpected data.

I think that is right, and the reason is a useful test to have. The strictness depends on where the record came from, not on whose record it is: a one-off migration wants to warn and keep going, a public submission form wants to reject, an internal replay wants to ignore. Those three want different answers for the same client on the same day. A setting per client cannot express that; an argument per call can.

The test I would apply generally: **does this vary by client, or by the situation the client is in?** The first belongs in the definition. The second belongs in the call. Putting situational choices into client settings looks like flexibility and produces a settings table nobody can reason about — which is the failure mode principle 2 is guarding against.

**Stages are hidden, never deleted.**

If a client removes a workflow stage completely, any records already in that stage would lose their meaning. Instead, the stage should be marked as hidden. It can't be used for new records, but existing records continue to work correctly, and historical reports remain accurate.

**Every settings change is recorded.** 

Every settings change should record who made it, when it was made, and what changed.

This is especially important for the clinic, where audits are expected and staff may need to prove who changed a particular setting. It also provides a reliable history if a client later questions whether a setting was ever modified.

---

## 4. Keeping clients apart

### For these two clients, the separation is physical

Client A and Client C do not share the same installation. Client C has its own copy of the application and its own database. Client A has no connection details, no passwords, and no network access to Client C's system. The two environments are completely separate.

Because of this, the security guarantee is much stronger.

If both clients shared the same database, keeping their data separate would depend on every database query being written correctly and every future developer always remembering to apply the right client filters. That kind of protection depends on people never making mistakes.

With separate installations, the protection doesn't rely on the application code. There is simply no connection between the two systems. Even if someone made a mistake in Client A's code, it still couldn't access Client C's data because there is no path to reach it.

For these two clients, the guarantee isn't that the code always gets it right. The guarantee is that the systems are completely separate, so there is nothing for the code to get wrong.

### The code is still written as if they shared

Client A and Client B may share the same installation, and the way clients are deployed may change as the platform grows. Because of that, all of the data separation is built into the platform regardless of how a client is hosted. Client C also uses these same protections, even though it has its own dedicated installation.

The goal is to enforce data separation at the lowest possible level. This reduces the chance of human error and makes it much harder for someone to accidentally access the wrong client's data. Instead of relying on developers to remember the rules every time they write code, the platform is designed so those mistakes are difficult to make in the first place.

### Where the separation is enforced

**In the database.**

Every table that stores client data includes a client ID. The database also applies a rule that automatically limits every query to the client linked to that connection.

This means the application doesn't need to add a client filter to every database query and hope developers remember it each time.

The design is safe by default. If a developer forgets to include a client filter, the query returns no data instead of returning data from every client. During development, the developer sees an empty result rather than accidentally exposing another client's information in production.

**In the login session, for deciding which client.** 

The platform determines which client a request belongs to from the signed-in user's account. It never relies on information sent by the user, such as the web address, form fields, request headers, or anything else that can be changed.

Because of this, users cannot access another client's data by modifying what they send to the application. The client is always identified from their authenticated account, not from the request itself.

**At the start of the request, once.**

The client is identified when the request first arrives and stays the same throughout the entire request.

It is not passed manually from one function to another because function parameters can be forgotten, changed incorrectly, or passed with the wrong value. By keeping the client context attached to the request itself, every part of the application automatically uses the correct client without relying on developers to remember to pass it around.

### Where leaks actually happen

The main screens are usually the easiest part, and they are not where data separation usually breaks. The bigger risks come from processes that run without a logged-in user because they do not automatically know which client they belong to.

Every background process must be assigned to a specific client and run separately for each client.

**Scheduled and background tasks**

Tasks such as the clinic's four-hour check for urgent referrals that have not been reviewed, the foundation's automatic scoring, monthly reports, and old-record cleanup all run without anyone being signed in.

If a cleanup job is not limited to a specific client, it could accidentally delete another client's data.

**Exports and downloads**

Once data is exported into a spreadsheet or file, it leaves the platform and cannot be controlled anymore. Because of this, export processes are one of the biggest risks if a client filter is missing.

Every export must always be limited to the correct client.

**Search**

A shared search index creates a direct path between clients, even if the database itself is protected correctly.

Search data must be separated by client so that users can only search records belonging to their own client.

**Cached data**

Every cache key must include the client ID.

For example, a cache key called `"open referrals"` without a client identifier could return one client's data to another client as soon as they share the same installation.

**Uploaded files**

Attachments must be stored in locations that belong to a specific client. Access checks should always confirm that the person requesting the file belongs to the same client, rather than allowing access just because they know the file address.

**Notification service**

The notification service is shared and handles information from all clients, including sensitive details like patient names and appointment dates.

It should only keep the information needed to send the notification and should not permanently store the message content afterwards.

**Logs and error reporting**

Logs and monitoring tools can accidentally become another way for client data to leave the system.

For example, sending an error report containing full record details to a shared monitoring system would expose client data through a channel that is often overlooked.

Record values should not be stored in logs. Instead, logs should contain identifiers and technical details needed for troubleshooting.

**Backups**

Client C's backups come from its own database, are stored as separate files, and are never restored into an installation that contains another client's data.

This keeps backups isolated and prevents accidental mixing of client information.


### The people layer

The biggest risk of one client's data reaching another client is not always a database query. Often, it is a person who has access to both.

Support and administrator accounts that can access multiple clients are treated as the highest-risk accounts in the platform. These accounts always require two-factor authentication. Every time one of these accounts accesses a client's data, the system records who accessed it and why.

For Client C's dedicated installation, no multi-client support accounts exist at all. Support for the clinic is handled only by accounts that can access the clinic's system and nothing else.

### How this is proven instead of just assumed

Data separation that is never tested is only a design goal, not a guarantee.

Test environments should always include data from at least two different clients, never just one. This simple choice is one of the most important ways to protect separation because a missing client filter is impossible to notice when there is only one client's data.

With two clients available, mistakes become obvious. A missing filter will immediately show the wrong client's data, making the issue easier to detect.

Automated tests should sign in as a user from one client and attempt to access another client's data through every available route, including:

* Screens and pages
* Exports
* File downloads
* Search

Every attempt should return no results or be blocked. These tests should run every time the code changes, so client separation is continuously checked instead of only being considered during the initial design.

### The realistic approach

No system can guarantee perfect security forever, and any design that claims this should be treated carefully.

The goal is to reduce the number of things people need to remember and design the system so that mistakes fail safely. A mistake should result in no data being shown, rather than accidentally exposing too much data.

For Client A and Client C specifically, most of these protections are not the main guarantee. They are completely separate systems with no way to connect to each other, which provides the strongest level of separation.

---

## 5. What breaks first at 300 clients?

### The component: the background job scheduler

The first part of the system that is likely to fail is the background job scheduler. This is the part that runs repeated tasks for each client, such as the clinic's four-hour alert for urgent referrals that have not been reviewed, the foundation's automatic scoring, monthly report generation, and removing records that have reached their retention limit.

### Why this breaks first and not something else

Most parts of the system will slow down gradually as usage grows.

For example, if website traffic increases, pages may become slower and more servers can be added. If reports become larger, they may take longer to generate. These problems are visible and usually give clear signs that more capacity is needed.

The scheduler is different because it has two challenges:

1. The amount of work increases as the number of clients grows.
2. The work often has a deadline.

Every scheduled task needs to finish before the next scheduled run begins.

With only three clients, the simplest solution is usually a loop. Every few minutes, the system wakes up, checks each client one by one, runs their scheduled tasks, and goes back to sleep. This is simple, easy to understand, and works well at a small scale.

At 300 clients, the same approach becomes a problem. The scheduler is now doing 100 times more work but still running on the same schedule.

For example, if checking one client's tasks takes around two seconds, checking every client could take about ten minutes. If the scheduler is supposed to run every five minutes, it can never catch up. Each cycle starts while the previous one is still unfinished.

Two things make this worse than just being slow:

#### One client's heavy workload affects everyone after it

The loop processes clients one at a time. If Client A suddenly receives 4,000 reports in one afternoon and its processing becomes slower, every client after Client A has to wait.

If the system checks clients in the same order every time, the same clients will always be delayed.

#### Nothing appears broken

The system may not show any errors. Jobs continue running and may still report as successful.

The problem is that they start finishing later and later. The clinic's four-hour alert might arrive after five hours, then seven hours.

The system looks healthy, but an important promise is already being broken. The client will notice the delay before the development team does.

This combination is what makes the scheduler the first likely failure point:

* It grows with the number of clients.
* It has deadlines.
* It can fail silently.

Slow pages usually get reported. Late alerts often do not.

### What I would change

#### Replace the loop with a queue

The scheduler should not perform the work itself. Its job should only be to create tasks and add them to a queue.

Workers then pick up those tasks and process them in parallel.

If more capacity is needed, more workers can be added instead of relying on one large loop finishing on time.

This removes the main problem because work is no longer processed one client at a time.

#### Make sure clients get fair processing time

A shared queue creates another possible issue. A single client with a large backlog could use all available workers and delay everyone else.

The system should make sure each client gets a fair share of processing time. That way, a large spike only affects the client causing it instead of impacting everyone.

#### Schedule work only when needed

Some tasks do not need constant checking.

For example, the clinic's four-hour urgent referral alert does not need to scan every referral every few minutes. Instead, when a referral is marked urgent, the system can schedule one check for four hours later.

If someone reviews the referral before then, the scheduled task simply finds nothing to do.

This changes the workload from repeatedly scanning all clients to only running tasks when they are actually needed.

The foundation's fourteen-day follow-up email can work the same way.

#### Track delays, not only successful runs

This is an important part because the current problem can stay hidden.

Each scheduled job should record:

* When it was supposed to run.
* When it actually ran.
* How long it was delayed.

An alert should trigger if jobs start running later than expected.

Without this, the system may continue reporting everything as successful while quietly missing important deadlines.

### The cost of this approach

Building the scheduler with queues from the start requires more work than creating a simple loop.

At three clients, the queue system may feel like more than the platform needs. However, it is a safer choice because it prevents discovering the limit through a missed alert or failed deadline.

It is also much easier to build this properly from the beginning than to redesign the whole scheduling system later after every job already depends on the simple loop approach.


---

## 6. Technology choices

### Languages and where they are used

#### TypeScript for both backend and frontend

The whole platform uses TypeScript for both the backend and frontend. The reason is not only convenience — it helps keep the entire system consistent.

The platform is built around a small set of common concepts, such as:

* Field definitions
* Workflow stages
* Stage transitions
* User roles
* Notification rules

The backend uses these concepts to validate and store data, while the frontend uses them to build screens dynamically.

By defining these concepts once and sharing them between the backend and frontend, both sides always agree on what something like a "field type" or "workflow stage" means.

This is especially important because the platform does not have custom-built screens for every client. Instead, the screens are generated from settings, and these shared definitions are what keep everything connected.

#### SQL for reporting queries

Reporting queries are written using SQL directly instead of relying on a query builder.

The reports needed by clients include things like:

* Monthly totals by category
* Totals by funding round
* Average time between workflow stages

These queries are likely to need performance improvements over time, and writing SQL directly makes them easier to understand, debug, and optimise.

#### No second backend language

There may be a temptation to introduce another language for things like scoring or reporting. I would avoid that.

Adding another language means:

* More build tools to maintain
* More libraries to manage
* More skills needed when hiring developers

Keeping one backend language keeps the platform simpler.

---

### Backend

#### Node.js with NestJS

The backend uses Node.js with NestJS.

The main reason for choosing NestJS over a lighter framework is its dependency injection and request-based context handling.

The platform's security design depends on identifying the current client when a request starts and making that information available throughout the request.

The alternative would be passing the client information manually between functions. The problem with that approach is that developers can forget to pass it or accidentally pass the wrong value.

With NestJS request-scoped providers, the client context becomes part of the request itself instead of something developers need to remember manually.

This is a design requirement rather than a personal preference, which is why NestJS is preferred even though it has more structure than lighter frameworks.

#### Kysely instead of a full ORM

The platform uses Kysely as a query builder instead of a traditional ORM.

The reason is that the data model has two different parts:

* A fixed structure stored in normal database columns.
* Flexible client-specific fields stored as JSON.

Traditional ORMs usually work best when every piece of data maps directly to a fixed class structure. That does not match this design.

Kysely provides type safety for the fixed parts while allowing the flexible client fields to remain flexible.

---

### Frontend

#### React with TypeScript and Vite

The frontend uses React with TypeScript and Vite.

It is built as a single-page application rather than using Next.js.

The important thing about the frontend is that it is not a collection of custom screens. It is a renderer.

The frontend receives a client's settings and uses them to generate:

* Forms
* Work queues
* Record detail pages
* Reports

The actual reusable components are things like:

* Field components
* Generic form builder
* Generic queue view
* Generic detail view

There is no custom "clinic referral screen" or "foundation application screen".

#### Why not Next.js?

Next.js is mainly useful for:

* Server-side rendering
* Search engine optimisation

This platform is behind authentication, so neither benefit is important.

Using Next.js would introduce another server layer where client data needs to be handled, without providing anything the product actually needs.

For that reason, a React single-page application is a better fit.

---

### Database

#### PostgreSQL

PostgreSQL is one of the most important technology choices because several major design decisions depend on it.

Three PostgreSQL features are especially important.

#### JSONB with targeted indexes

JSONB makes the flexible field system possible.

Each client's custom fields are stored in a JSON document attached to the record. The platform then creates indexes only for fields that the client uses for:

* Filtering
* Sorting
* Reporting

This keeps reporting fast without creating a separate database structure for every client.

#### Row-level security

Row-level security is the foundation of the client separation model.

The database itself enforces which client data can be accessed instead of relying only on application code.

This means if a developer accidentally forgets a client filter, the database blocks the request instead of returning another client's data.

The failure is safe by default.

#### Normal relational structure

Not everything is flexible.

Things like:

* Workflow stages
* Permissions
* Roles
* Stage transitions

are naturally relational and need proper relationships and transactions.

PostgreSQL supports both sides:

* Flexible JSON-based data
* Traditional relational data

#### Database setup

The platform uses PostgreSQL 16 on Amazon RDS, with one database per client.


---

## 7. Five principles for the development itself

These principles are designed to help resolve disagreements during development. If two developers have different opinions, the team should be able to look at these rules and make a clear decision.

### 1. No client's name should appear anywhere in the code

A client's name should never appear in:

* Conditions
* Configuration branches
* Special code paths
* Comments that later become custom logic

If something works differently for one client, that difference should exist in settings, not in the code.

#### Why this matters

This is the main rule that prevents one shared platform from slowly becoming three separate systems.

It is also something that can be checked automatically instead of relying on personal judgement, which makes it a practical rule to follow.

#### The argument it solves

**"This is only one small change for the clinic. It will take five minutes."**

The answer is no — but the solution is not simply to reject the request.

The correct approach is to make it a feature that any client could use through settings, then enable it for the clinic.

It may take slightly longer today, but it prevents the platform from becoming difficult to maintain in the future.

Without this rule, the same discussion will happen repeatedly, and the decision will depend on who is under the most pressure at the time.

---

### 2. If something changes more often than we release, it should be a setting

Anything a client may want to change between releases should be configurable.

Things that rarely change can remain in code.

#### Why this matters

These clients will regularly adjust their processes, which is the main reason the platform exists.

This rule turns the idea of "making things flexible" into a simple question:

**How often will this change?**

#### The argument it solves

**"Should we make this configurable, or just hard-code it for now?"**

Instead of debating opinions, look at how often the change is expected.

For example:

* The foundation's scoring rules change several times a year, so they belong in settings.
* The way registry data is retrieved has remained stable, so it belongs in code.

This rule also prevents the opposite problem. Not everything needs to become a setting. A platform where every single detail is configurable becomes difficult for anyone to manage.

---

### 3. Safety should be built into the system, not remembered by people

Security rules should be enforced by the system itself, not depend on developers remembering them every time.

For example:

* Client data separation is enforced by the database.
* New fields are treated as sensitive by default.
* New roles have no permissions until access is explicitly granted.

#### Why this matters

One client stores patient information and has strict privacy requirements. Protection that depends on everyone always remembering the rules will eventually fail.

The system should be designed so that mistakes fail safely.

#### The argument it solves

**"I added the client filter to my query. Isn't that enough?"**

It is enough for that specific query.

The problem is the next 100 queries that will be written by different developers under different circumstances.

The question to ask is:

**If someone forgets this completely, does the mistake expose too much data or too little?**

If the answer is too much, the protection is in the wrong place.

---

### 4. Every client runs the same code, and no client gets its own custom patch

A fix should either be released to everyone or not released at all.

Clients should only differ through settings, not through custom code changes.

No client should stay on an older version of the platform.

#### Why this matters

This is one of the easiest rules to break because breaking it often feels like the fastest solution.

A client has an urgent issue, the fix looks small, and updating only their installation seems reasonable.

But after doing this several times, the platform slowly becomes multiple different codebases again — which is exactly what this design is trying to avoid.

#### The argument it solves

**"Client A needs this today. Let's patch their installation and include it properly in the next release."**

No.

The release process itself should support urgent fixes. If releasing a fix to everyone is too difficult, then the release process needs improvement.

---

### 5. The system must always be able to explain its history

The platform should never lose important history.

Examples:

* A removed workflow stage should be hidden, not deleted.
* Every settings change should record who changed it, when it happened, and the old and new values.
* Every record should keep a history of who changed it and when.
* The scoring rules used for an application should be saved with that application instead of being recalculated later.

#### Why this matters

The clinic may need to provide audit information.

The foundation automatically rejects applications without human review. If an organisation questions a rejection a year later, the system must be able to explain why that decision was made at that time.

The scoring rules may have changed several times since then, so rebuilding the answer later may not be possible.

#### The argument it solves

**"Can we just overwrite this value? Nobody checks the old one."**

Someone will eventually need the old information, and it will usually be at the exact moment when it matters most.

This principle also helps answer smaller design questions:

* Can a workflow stage be deleted?
* Should settings changes be recorded?
* Can a score be recalculated later?

The answer is always the same:

The system should preserve enough history to explain what happened in the past.


---

## 8. What didn't fit?

Yes — four areas. The first came out of writing the code and is the one I would not have predicted. The other three I can see from the briefs, and two of them share a cause.

### The common issue

The current data model works very well for a single record.

However, it does not have a good way to represent things that exist **between records**.

Both of the main problems come from this same limitation. This suggests that the model needs to support relationships between records, not just more fields inside a record.

The first problem below is a narrower version of the same shape — something true *between two fields* rather than between two records — and it is the one Part B walked into.

---

### 0. A rule that spans two fields has nowhere to live

Client B's application has a project start date and a project end date. The end must not be before the start. This is not an exotic requirement; it is the second thing anyone would check.

There is no way to say it.

Every validation rule in the model hangs off a single field, and a field's rules can only see that field's own value. The two dates validate perfectly on their own — both are real dates, both are required, both are present — and the application is still nonsense. Client C has the same shape waiting in it: if urgency is `immediate`, a clinical note should be mandatory, and *should be mandatory* is a sentence about two fields.

I did not see this until I wrote the definitions. From the outside "validation lives on the field" sounds complete, because the examples that come to mind — a national ID is nine digits, an amount is between 1,000 and 500,000 — are all single-field rules. The rules that span fields don't announce themselves. They only turn up when you sit down to write out one real client and find the sentence you want has nowhere to go.

#### How I would handle it

Two options, and I would take the second.

**Rules as data, in a small expression language.** A definition could carry a list of cross-field rules — a condition, the fields it applies to, and the message. This keeps everything in configuration and needs no code per client, but a language that can express "if urgency is immediate then clinical notes is required" is an expression evaluator, and once clients can write conditions they will want functions, then dates arithmetic, then lookups. That is a product, not a field.

**Named rules in code, selected and parameterised by configuration.** The platform provides a small set of cross-field rules — *this date is not before that one*, *this field is required when that field has this value* — and a definition picks the ones it needs and names the fields. Adding a rule is development work; using one is configuration.

The second is the same trade-off as the field type list: a fixed set of primitives, chosen so a new client needs no new code, and grown as a platform feature when one genuinely does. It also keeps the rule where it can be tested and where an error message can be written by a person rather than generated.

The honest cost is that the boundary moves. "No new code for a new client" is true for fields and false for a client that needs a cross-field rule nobody has built yet. I would rather say that plainly than widen the configuration language until it becomes a programming language nobody wants to debug.

> **Draft — rework in your own voice.** This is the most valuable thing in question 8 for a follow-up conversation, because it is a mistake with a fix rather than a gap you spotted. Worth being able to tell as a story: what you expected, what the definition wouldn't let you write, which of the two options you'd take and why.

---

### 1. Multiple reviewers writing assessments on one application

The foundation's process requires multiple reviewers to write assessments during the **Under review** stage.

This is not one assessment. Several reviewers may each write their own assessment, with:

* Their own author
* Their own timestamp
* Their own permissions
* Their own visibility rules

The current model does not support this.

A simple text field is not enough because it cannot track who wrote each assessment or control who can see it.

A list stored inside the record's JSON fields also does not solve the problem because those items would still lack their own:

* Author
* History
* Access rules

This is a real gap in the model, and the field type list is where you can see it. Every type in Part B holds one value: text, a number, a date, a choice, a list of choices. The closest thing to a repeating structure is multiple choice, and its items are strings from a fixed list — they cannot carry an author or a timestamp, let alone a rule about who may read them. There is no type an assessment could be, which is a more useful way to state the gap than saying the model "does not support" it.

#### How I would handle it

I would add support for **child records** as a core part of the settings model.

A child record would be a separate record connected to a parent record. It would have:

* Its own fields
* Its own roles
* Its own visibility rules

For example, a **Reviewer Assessment** becomes a child record type connected to a foundation application.

It would follow the same configuration approach as the rest of the platform.

This does make the settings model larger and requires careful design, especially around:

* Reporting
* Permissions
* Record history

However, the alternative would be creating a special foundation-only feature, which breaks the rule that client-specific behaviour should not live in code.

The model needs to grow instead.

---

### 2. Knowing when multiple reports belong to the same resident

Client A wants staff to see a resident's history when a new report arrives.

The challenge is that the same resident may submit reports using:

* Different phone numbers
* Different spellings of their name
* Different details over time

The current model handles the notification side correctly because each report has an external contact.

However, it does not understand that two different reports may belong to the same person.

Each record is currently treated as separate.

This is not a missing field or setting. It is a missing relationship between records.

The matching process is also not always certain. Two reports may look like they belong to the same person, but the system cannot know with complete confidence.

#### How I would handle it

I would split this into two parts.

#### First: create a separate person record

The outside person should become its own record instead of only being a field on the report.

Multiple records can then connect to the same person.

This change improves the platform for all clients:

* The foundation can see an organisation's history across funding rounds.
* The clinic can see a patient's referral history.

This belongs in the shared platform model, not in client settings.

#### Second: keep matching logic in code

The process of identifying possible matches should be handled by code because the logic is unlikely to change frequently.

The confidence level for suggesting a match can be a setting.

However, matches should never be applied automatically.

The system should only suggest possible matches, and a staff member should confirm them.

Automatically linking two different people could expose one person's history to another person, creating a privacy issue.

---

### 3. The system performing actions without a person

The foundation automatically rejects applications that score below a certain threshold.

No person reviews or approves this decision.

The current workflow model assumes every action is performed by a user with a role.

An automated rejection does not have a person or role, so the model cannot correctly represent who performed the action.

This is a smaller issue and has a simple solution.

#### How I would handle it

Workflow actions should allow either:

* A user role
* A named automation process

The record history should store which one performed the action.

For example, instead of showing:

> Rejected by nobody

The history should show:

> Rejected by the scoring process at 10:30 AM

This gives a clear audit trail, which is important because applicants may later ask why their application was rejected.

---

### What worked better than expected

It is also worth noting what looked like possible problems but actually fit the model well.

#### Clinical notes visibility

The clinic requirement where reception staff should not see clinical notes is supported by:

* Field sensitivity levels
* Role permissions

No clinic-specific code is needed. Marking clinical notes and the national ID as confidential in Client C's definition took two lines and no thought, which is the point.

I would not call it *fully* supported, though, and Part B is why. Sensitivity is a label on a field, and Part B carries that label all the way to the form description without ever being able to act on it, because the roles it would be checked against are a different settings table. The requirement is met by two mechanisms that have to agree, not by one. Neither is clinic-specific, so the answer to the question holds — but "the field is marked sensitive" is half of it, and the half that is easy.

#### Four-hour urgent referral alerts

The clinic's urgent referral alert initially looked difficult because it happens when something **does not happen**.

However, it fits the existing design.

When a referral is marked as urgent, the system schedules a delayed check for four hours later.

The same mechanism can handle the foundation's follow-up email fourteen days after approval.

Both are examples of scheduled actions triggered by an event instead of repeatedly scanning all records.


---

## 9. What would you build first?

### The rule I would use

Build the things that are expensive to change later as early as possible.

Leave the things that are easy to add later until they are actually needed.

This is different from asking what is the most visible or valuable feature.

For example, the settings admin screen is one of the most visible parts of the product, but it is also one of the easiest things to build later.

The client ID on every database table is not visible to users, but adding it later would be extremely difficult because every existing query and piece of code would need to be reviewed.

---

### First step: prove the model can support all three clients

Before building any user interface, I would build the settings model and the core record engine.

Then I would create the full configuration for all three clients, including:

* Fields
* Workflow stages
* Stage transitions
* Roles
* Notification rules
* Queues
* Reports

In practical terms, this means creating:

* The six settings tables
* A way to import settings files
* A record system that can create records, move them through stages with permission checks, and keep a full history

#### Why this comes first

The entire platform depends on one important assumption:

**All client differences can be handled through settings.**

If that assumption is wrong — for example, if Client C needs a special exception — then anything built on top of that model will need to be changed later.

Creating three complete settings files is only a few days of work, but it tests the biggest assumption in the entire project.

This is also where hidden problems will appear.

For example, the issue with multiple reviewers writing separate assessments would likely appear while creating the foundation's configuration. It may remain unnoticed if development starts by building screens first.

This step has a simple success test:

**Can all three clients be fully configured without adding custom code?**

If not, the model should be improved before building more features.

---

### Things I would build early

These are features that are much harder to add later.

#### Client ID on every table and database-level protection

Even if there is only one client at the start, every table should include the client ID and the database should enforce separation.

Adding this later would require reviewing every query and every piece of database access logic.

---

#### Field sensitivity and permissions

Every field definition should include sensitivity information from the beginning.

Even if the UI does not fully use it yet, the data model needs to support it.

Field-level permissions are easy to ignore early, but once forms, exports, and reports are already built without them, adding security later becomes much harder.

---

#### Record history and settings versioning

Every important change should be tracked from the start.

Once records exist without history, that history cannot be recreated later.

The system should know:

* Who changed something
* When it changed
* What the previous value was
* What the new value became

---

#### Background jobs using queues instead of loops

At three clients, a simple loop would work perfectly.

That is exactly why it is dangerous.

Every scheduled task built around a loop would need to be rewritten once the platform grows.

Using a queue structure from the start costs very little and avoids a future rewrite.

However, I would only build the foundation:

* Add jobs to a queue
* Process jobs from workers

I would not build advanced features yet, such as:

* Client fairness rules
* Large-scale worker management
* Job delay monitoring

Those are easy to add later with a queue system but much harder to add if everything depends on a simple loop.

---

#### Two clients in test data from the beginning

This costs almost nothing.

Testing with only one client hides security problems because missing client filters will still appear to work.

With two clients, mistakes become obvious.

---

### Things I would intentionally delay

#### Settings admin screen

For the first few months, settings should be managed through reviewed configuration files.

This may feel unusual because the admin screen looks like a core product feature.

However, the settings model will likely change a lot during the first real client.

Building the admin screen too early means rebuilding it every time the model changes.

It should be built after the structure becomes stable.

---

#### Formula editor for foundation scoring

The first version should keep the calculation logic in code while keeping the scoring values configurable.

This already supports the expected changes, such as adjusting scoring weights several times a year.

A full formula editor should only be built after seeing how the foundation actually changes their rules.

That way, the tool is designed around real needs instead of assumptions.

---

#### Historical data migration

Old data can be imported later.

The previous systems can remain available for reference during the transition.

Migration work is usually slow and complicated, but it does not help prove whether the new platform design works.

---

#### Features needed for 300 clients

Things like:

* Large-scale database migration tools
* Advanced queue fairness
* Detailed job performance monitoring

are important eventually, but they should not be designed too early.

These decisions are easier to make once real usage patterns are available.

---

#### General reporting tools

Do not build a full report builder at the start.

The current clients have specific reporting needs.

Build those exact reports first.

A general reporting system should only be considered when there is a clear need.

---

### Which client should go live first?

I would design the system around the clinic but launch the first version with the foundation.

The clinic has the most demanding requirements:

* Field-level permissions
* Strong audit requirements
* Separate installation
* Sensitive medical information

These requirements should influence the design from the beginning because adding them later would be difficult.

However, the foundation is the safer first migration because:

* It handles fewer records
* It processes around 40–60 applications per funding round instead of hundreds of daily reports
* Funding rounds provide a natural migration point
* There is less risk if something goes wrong

This gives the best combination:

* The hardest requirements shape the architecture.
* The safer client provides the first real production experience.

That allows the platform to be tested in the real world without taking unnecessary risks.

