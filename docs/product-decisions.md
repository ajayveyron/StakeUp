# Pact Raven Product Decisions

## Core Product Model

Pact Raven is a commitment app with manual payment confirmation and manual proof review.

Users create a pact, contact the admin on WhatsApp for UPI payment, and wait for admin confirmation. The pact becomes active only after the admin confirms payment. Users then submit proof by the daily deadline and wait for review. Approved submissions become available for manual payout. Rejected or missed days are forfeited based on the beneficiary option chosen when the pact was created.

## Submission States

- `Due`: the user has an active committed day and has not submitted proof.
- `Under review`: the user submitted proof before the deadline; this counts as a submission for that day while review is pending.
- `Approved`: the proof passed manual review and the daily payout credit was recorded.
- `Rejected`: the proof failed manual review; the original day becomes forfeited with a visible rejection reason.
- `Missed`: the user did not submit proof before the deadline; the original day becomes forfeited.

## Manual Verification Rules

For v1, verification is manual.

Content commitments require a public post URL. Private posts, stories, inaccessible links, wrong content, deleted posts, or late submissions should be rejected with a reason.

Step commitments can use manual entry for now, with health app sync planned later. The submitted step count must meet or exceed the committed daily target.

## Payout Rules

Approved credits should not be paid out automatically every day. They should be tracked in the ledger first.

This avoids unnecessary transaction volume, transaction costs, failed payout handling, and reconciliation complexity. During the concierge beta, admin makes payouts manually over UPI and records the payout reference in Convex.

## Forfeit Destinations

Users choose one forfeit destination when creating a pact.

### Friend Beneficiary

If the user misses or gets rejected, that day's amount goes to the chosen friend manually. The friend must sign up before any payout is made.

Users who choose friend forfeits are not eligible for rewards funded by the community reward pool.

### Reward Pool

If the user misses or gets rejected, that day's amount funds rewards for consistent users and helps maintain Pact Raven.

Reward-pool eligibility should only apply to users who also route forfeits into the reward pool and meet the program rules.

## Fee Positioning

During beta, Pact Raven should not charge a platform fee.

Recommended copy:

"Pact Raven does not charge a platform fee during beta. Withdrawal provider fees may apply in the future, and we will show them before withdrawal."

Later, consider minimum withdrawal thresholds to keep payout costs under control.

## Copy Rules

- Use "Submit for review" when the user submits proof.
- Use "Approved refund" only after manual approval.
- Use "Available for manual payout" instead of implying an external bank transfer.
- Use "Forfeited to friend" or "Forfeited to reward pool" after rejection or missed days.
- Never imply private posts are acceptable proof.
