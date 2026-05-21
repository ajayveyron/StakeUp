# Pact Raven Product Decisions

## Core Product Model

Pact Raven starts as a PWA/web app, while staying inside the Expo codebase so a future native iOS/Android move is easier.

Pact Raven is a commitment-cycle product with payment collection and refunds handled through Razorpay. Users buy one commitment cycle at a time, such as a 30-day workout cycle or a 30-day content-posting cycle. To start a new cycle in the same month or a later month, the user buys another cycle.

Users pay:

- A non-refundable platform fee per commitment cycle.
- A refundable commitment deposit that is returned when they prove consistency.

The pact becomes active only after payment is confirmed. Users then submit proof by the daily deadline and wait for review. Approved submissions become refund credits. Rejected or missed days are forfeited to the charity selected when the pact was created.

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

Approved credits should not be paid out automatically every day. They should be tracked in the ledger first and refunded or disbursed through Razorpay based on the chosen payout cadence.

This avoids unnecessary transaction volume, transaction costs, failed payout handling, and reconciliation complexity. During the first public cohorts, refunds can be weekly or at the end of the commitment cycle, but every Razorpay refund/disbursement reference must be recorded in the ledger.

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

Pact Raven charges users per commitment cycle.

Starting price:

- Rs 499 platform fee per commitment cycle.

Recovery offer:

- If a user completes onboarding but does not start/pay, offer a Rs 200 discount for the next 6 hours.
- Discounted price: Rs 299 platform fee for that commitment cycle.

Recommended copy:

"Start your 30-day commitment cycle for Rs 499. Your commitment deposit is refundable when your proof is approved. If you miss or your proof is rejected, that day's amount goes to the charity you selected before starting."

## Copy Rules

- Use "Submit for review" when the user submits proof.
- Use "Approved refund credit" only after manual approval.
- Use "Refund processing" only after the Razorpay refund/disbursement has been initiated.
- Use "Forfeited to charity" after rejection or missed days.
- Never imply private posts are acceptable proof.
- Never imply forfeited money becomes Pact Raven revenue.
