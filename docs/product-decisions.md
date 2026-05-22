# Pact Raven Product Decisions

## Core Product Model

Pact Raven starts as a PWA/web app, while staying inside the Expo codebase so a future native iOS/Android move is easier.

Pact Raven is a Pact Pass product with payment collection expected through Razorpay or another approved provider and user payouts handled manually by UPI for the first cohorts. A Pact Pass unlocks one pact record. Razorpay approval for the exact refundable deposit, manual UPI payout, and charity forfeit flow is not yet confirmed in writing, so formal checkout can be paused or narrowed to a controlled paid beta if needed.

Users pay:

- The first Pact Pass is covered once per account. After that, each Pact Pass costs Rs 249 and is revenue for access to one pact record.
- A separate refundable pact deposit when they start a pact. This is recorded as a deposit liability, not revenue.

Users can draft a pact before buying or receiving a Pact Pass. The pact becomes active only after the user has an unused pass and the separate deposit payment is confirmed. Starting a pact consumes one pass permanently. Users then submit proof by the daily deadline and wait for review. Approved submissions become refund credits. Rejected or missed days are forfeited to the charity selected when the pact was created.

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

Workout commitments require a fresh in-app camera capture, captured device location, and the daily physical prompt: hand gesture, facial expression, body pose, or equipment-position cue. Workout proof links, gallery uploads, old photos, screenshots without context, unclear proof, late proof, missing location, or proof that does not match the declared workout rule should be rejected with a reason.

## Payout Rules

Approved credits should not be paid out automatically every day. They should be tracked in the ledger first and made available for manual UPI payout after approval.

Users may submit up to two manual withdrawal requests per week. Admin attempts prompt transfer after a valid request, subject to correct UPI details, bank/UPI availability, fraud checks, disputes, legal restrictions, and manual review load. Every payout request must capture the user's UPI ID, and every completed payout must record the UPI reference in the database ledger.

## Forfeit Destinations

Users choose one charity destination when creating a pact. Forfeited money goes to the selected charity, not to Pact Raven as revenue. These are user-selected charity destinations, not formal Pact Raven charity partners unless Pact Raven states otherwise in writing.

V1 offers exactly five charity options:

1. The Akshaya Patra Foundation: child nutrition and school meals.
2. Goonj: rural development, disaster relief, and dignity-led community work.
3. Child Rights and You (CRY): child rights, education, and protection.
4. HelpAge India: elderly care and support.
5. Wildlife SOS: wildlife rescue, animal welfare, and conservation.

Rejected or missed days should be shown as `Forfeited to charity`, with the selected charity name visible in the user ledger.

Forfeited amounts are recorded internally and transferred to the selected charity destination in monthly batches. Do not promise donation receipts, 80G certificates, or tax deductions unless that arrangement is confirmed in writing.

## Fee Positioning

Pact Raven charges users per Pact Pass after the covered first pass.

Starting price:

- First Pact Pass covered once per account.
- Rs 249 non-refundable Pact Pass fee from the second pass onward.

Recovery offer:

- Do not discount by default after the covered first pass.

Recommended copy:

"Your first Pact Pass is covered. After that, each Pact Pass is Rs 249. A Pact Pass unlocks one pact record. When you start the pact, you lock a separate refundable deposit. Approved proof creates refund credit. Missed or rejected proof is forfeited to the charity you selected before starting."

## Copy Rules

- Use "Submit for review" when the user submits proof.
- Use "Approved refund credit" only after manual approval.
- Use "Manual UPI payout requested" when the user requests money back.
- Use "Refund sent" only after the UPI reference is recorded.
- Use "Forfeited to charity" after rejection or missed days.
- Use "Pact Pass" for the access purchase that unlocks one pact.
- Use "Refundable pact deposit" for the separate deposit liability.
- Never imply private posts are acceptable proof.
- Never imply forfeited money becomes Pact Raven revenue.
- Never imply a wallet, prize pool, jackpot, escrow, trustee arrangement, investment return, stored-value account, interest, or instant cash payout.
- Do not call the deposit revenue in admin/accounting copy. It is a refundable deposit liability until refunded, forfeited, or transferred to charity.
