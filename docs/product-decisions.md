# StakeUp Product Decisions

## Core Product Model

StakeUp is a commitment wallet with manual proof review.

Users create a stake, deposit money, submit proof by the daily deadline, and wait for review. Approved submissions move that day's refund into the user's in-app wallet. Rejected or missed days are forfeited based on the beneficiary option chosen when the stake was created.

## Submission States

- `Due`: the user has an active committed day and has not submitted proof.
- `Under review`: the user submitted proof before the deadline; this counts as a submission for that day while review is pending.
- `Approved`: the proof passed manual review and the daily refund was added to the user's wallet.
- `Rejected`: the proof failed manual review; the original day becomes forfeited with a visible rejection reason.
- `Missed`: the user did not submit proof before the deadline; the original day becomes forfeited.

## Manual Verification Rules

For v1, verification is manual.

Content commitments require a public post URL. Private posts, stories, inaccessible links, wrong content, deleted posts, or late submissions should be rejected with a reason.

Step commitments can use manual entry for now, with health app sync planned later. The submitted step count must meet or exceed the committed daily target.

## Wallet Rules

Approved refunds should not be paid out automatically every day. They should be credited to an in-app wallet first.

This avoids unnecessary transaction volume, transaction costs, failed payout handling, and reconciliation complexity. Users can withdraw from the wallet manually, subject to payment provider limits and future withdrawal rules.

## Forfeit Destinations

Users choose one forfeit destination when creating a stake.

### Friend Beneficiary

If the user misses or gets rejected, that day's amount goes to the chosen friend's StakeUp wallet. The friend must sign up to receive and withdraw it.

Users who choose friend forfeits are not eligible for rewards funded by the community reward pool.

### Reward Pool

If the user misses or gets rejected, that day's amount funds rewards for consistent users and helps maintain StakeUp.

Reward-pool eligibility should only apply to users who also route forfeits into the reward pool and meet the program rules.

## Fee Positioning

During beta, StakeUp should not charge a platform fee.

Recommended copy:

"StakeUp does not charge a platform fee during beta. Withdrawal provider fees may apply in the future, and we will show them before withdrawal."

Later, consider minimum withdrawal thresholds to keep payout costs under control.

## Copy Rules

- Use "Submit for review" when the user submits proof.
- Use "Approved refund" only after manual approval.
- Use "Added to wallet" instead of implying an external bank transfer.
- Use "Forfeited to friend" or "Forfeited to reward pool" after rejection or missed days.
- Never imply private posts are acceptable proof.
