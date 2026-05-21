# Pact Raven Product Decisions

## Core Product Model

Pact Raven starts as a PWA/web app, while staying inside the Expo codebase so a future native iOS/Android move is easier.

Pact Raven is a pact-slot product with payment collection handled through Razorpay and user payouts handled manually by UPI for the first cohorts. Users buy one non-refundable pact slot at a time. One pact slot unlocks one pact challenge.

Users pay:

- A non-refundable Rs 249 pact slot fee. This is revenue for access to one pact challenge.
- A separate refundable pact deposit when they start a pact. This is recorded as a deposit liability, not revenue.

Users can draft a pact before buying a slot. The pact becomes active only after the user has an unused slot and the separate deposit payment is confirmed. Starting a pact consumes one slot permanently. Users then submit proof by the daily deadline and wait for review. Approved submissions become refund credits. Rejected or missed days are forfeited to the charity selected when the pact was created.

## Initial Commitment Types

V1 starts with two commitment types only:

1. Workout commitments.
2. Content-posting commitments.

Do not add step-count commitments in v1. Step counts require native health integrations and should wait until the web-first validation loop proves demand.

## Submission States

- `Due`: the user has an active committed day and has not submitted proof.
- `Under review`: the user submitted proof before the deadline; this counts as a submission for that day while review is pending.
- `Approved`: the proof passed manual review and the daily payout credit was recorded.
- `Rejected`: the proof failed manual review; the original day becomes forfeited with a visible rejection reason.
- `Missed`: the user did not submit proof before the deadline; the original day becomes forfeited.

## Manual Verification Rules

For v1, verification is manual.

Content commitments require a public post URL. Private posts, stories, inaccessible links, wrong content, deleted posts, or late submissions should be rejected with a reason.

Workout commitments require a fresh camera snap or short capture from the web app with a physical prompt: hand gesture, facial expression, body pose, or equipment-position cue. Old gallery photos, screenshots without context, unclear proof, late proof, or proof that does not match the declared workout rule should be rejected with a reason.

## Payout Rules

Approved credits should not be paid out automatically every day. They should be tracked in the ledger first and paid manually by UPI when requested or batched by operations.

This avoids unnecessary transaction volume, transaction costs, failed payout handling, and reconciliation complexity. During the first public cohorts, payouts can be on request, weekly, or at the end of the commitment cycle, but every UPI payout reference must be recorded in the ledger.

## Forfeit Destinations

Users choose one charity destination when creating a pact. Forfeited money goes to the selected charity, not to Pact Raven as revenue.

V1 offers exactly five charity options:

1. The Akshaya Patra Foundation: child nutrition and school meals.
2. Goonj: rural development, disaster relief, and dignity-led community work.
3. Child Rights and You (CRY): child rights, education, and protection.
4. HelpAge India: elderly care and support.
5. Wildlife SOS: wildlife rescue, animal welfare, and conservation.

Rejected or missed days should be shown as `Forfeited to charity`, with the selected charity name visible in the user ledger.

## Fee Positioning

Pact Raven charges users per pact slot.

Starting price:

- Rs 249 non-refundable pact slot fee.

Recovery offer:

- Do not discount by default during the first slot test.

Recommended copy:

"Buy one pact slot for Rs 249. The slot fee is non-refundable and unlocks one pact challenge. When you start the pact, you lock a separate refundable deposit. Approved proof creates refund credit. Missed or rejected proof is forfeited to the charity you selected before starting."

## Copy Rules

- Use "Submit for review" when the user submits proof.
- Use "Approved refund credit" only after manual approval.
- Use "Manual UPI payout requested" when the user requests money back.
- Use "Refund sent" only after the UPI reference is recorded.
- Use "Forfeited to charity" after rejection or missed days.
- Use "Pact slot" for the Rs 249 non-refundable access purchase.
- Use "Refundable pact deposit" for the separate deposit liability.
- Never imply private posts are acceptable proof.
- Never imply forfeited money becomes Pact Raven revenue.
- Do not call the deposit revenue in admin/accounting copy. It is a refundable deposit liability until refunded, forfeited, or transferred to charity.
