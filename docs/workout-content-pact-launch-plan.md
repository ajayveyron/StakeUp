# Pact Raven Workout And Content Posting Launch Plan

## Decision

Start with two web-first commitment formats:

1. Content Posting Pact
2. Workout Pact

Start as a PWA/web app, but keep the implementation inside Expo so a future native iOS/Android app is easier to ship. Do not make the first public launch depend on native app-store review, HealthKit, Health Connect, or app-store payment rules.

The goal of this phase is not perfect verification. The goal is to prove that Indian users who are not close friends will pay a non-refundable fee plus a refundable commitment deposit to be held accountable.

## Core Positioning

Pact Raven is a paid accountability challenge.

The user pays:

- A non-refundable pact slot fee for accountability, review, reminders, operations, and support.
- A refundable commitment deposit that is returned when the user proves consistency.

Suggested public wording:

> Put money behind your commitment. Prove the work. Get your deposit back.

Avoid these words in public copy for now:

- Bet
- Gambling
- Wallet
- Escrow
- Jackpot
- Pool winnings
- Cash reward lottery

Use these words instead:

- Commitment challenge
- pact slot fee
- Refundable deposit
- Proof review
- manual UPI payout
- Forfeit destination
- Success credit

## Initial Audience

Start India-first.

Best-fit early users:

- Creators trying to post daily.
- Gym beginners who already paid for a gym but lack consistency.
- Students or founders who respond to social accountability.
- Urban, English/Hinglish-speaking users who already follow self-improvement content.
- People comfortable with UPI, WhatsApp, Instagram, and public proof.

Avoid mass-market positioning in the first 100 users. The first wedge is people who already understand the pain of inconsistency and are willing to pay for pressure.

## Product 1: Content Posting Pact

### Offer

30-Day Content Consistency Pact

- pact slot fee: Rs 249
- Refundable deposit: Rs 2,000
- Commitment: 1 public post per day for 30 days
- Proof: public post URL submitted before the daily deadline
- Review: manual review by Pact Raven
- Refund style: weekly or end-of-challenge manual UPI payout

### Accepted Proof

Accepted:

- Public LinkedIn post URL
- Public Instagram reel URL
- Public YouTube Shorts URL
- Public X/Twitter post URL
- Public blog/newsletter URL

Rejected:

- Private posts
- Stories that disappear
- Deleted posts
- Inaccessible links
- Posts created after the deadline
- Recycled content submitted as a new daily post
- Links that do not match the user's declared commitment

### Why This Should Be First

Content posting is the strongest first wedge because:

- Proof exists publicly.
- It fits the user's current reels distribution.
- The customer segment already understands consistency pain.
- Every user creates public proof that can indirectly market Pact Raven.
- The web app can support it without native permissions.

## Product 2: Workout Pact

### Offer

30-Day Workout Pact

- pact slot fee: Rs 249
- Refundable deposit: Rs 3,000
- Commitment: default 30-day cycle with 5 workouts per week
- Proof: mobile web camera snap/capture with physical prompt, optional location, and visible gym/home context
- Review: manual review by Pact Raven
- Refund style: weekly or end-of-challenge manual UPI payout

### Accepted Proof

Accepted:

- Gym photo/video from the same day with the daily physical prompt visible.
- Fresh camera snap or short capture taken inside the web app.
- Short post-workout selfie/video with workout context visible.
- Location attached when available.
- Home workout proof with daily prompt, such as "show 3 fingers", "thumbs up with left hand", or "stand side-on and raise one hand."

Rejected:

- Old gallery photos.
- Screenshots without context.
- AI-generated or visibly edited proof.
- Wrong-day proof.
- Proof submitted after the deadline.
- Photos that do not show enough evidence of workout completion.

### Why This Should Be Second

Workout commitments are emotionally strong and easy to understand, but verification is noisier than public content links. Keep the first workflow manual. Do not lead with step counts until HealthKit or Health Connect demand is proven.

## Pricing Strategy

### Per-Cycle Purchase

Pact Raven charges per commitment cycle. A user buys one 30-day cycle at a time. To start another cycle in the same month or in a later month, the user buys another cycle.

Starting price:

- Content Posting Pact: Rs 249 fee + Rs 2,000 deposit
- Workout Pact: Rs 249 fee + Rs 3,000 deposit

Abandoned-onboarding recovery:

- If a user completes onboarding but does not start/pay, offer Rs 50 off for the next 6 hours.
- Discounted pact slot fee: Rs 199 for that commitment cycle.

Do not hide the fee. The test is whether users will pay for accountability, not whether they will temporarily park refundable money.

### Later Tiers

After 100 paid users:

- Starter: Rs 249 fee + Rs 2,000 to Rs 3,000 deposit
- Serious: Rs 999 fee + Rs 5,000 deposit
- Founder-reviewed: Rs 1,999 fee + Rs 10,000 deposit
- Cohort/team challenge: custom fee and deposit

Do not launch a recurring plan yet. Sell one commitment cycle at a time.

## Payment And Manual Payouts

Razorpay collects money in v1, but user payouts are manual UPI transfers recorded by the operator.

Operational rules:

- Collect pact slot fee and commitment deposit through Razorpay.
- Keep the pact slot fee as revenue for the cycle.
- Track the refundable deposit as a deposit liability until approved, forfeited, or refunded.
- Record Razorpay payment IDs for collections and UPI references for manual payouts in the ledger.
- Avoid daily automatic payouts in v1; use weekly or end-of-cycle manual UPI payout batches.
- Show refund status clearly: pending review, approved refund credit, payout requested, paid by UPI.

## Funnel For First 100 Customers

### Acquisition Loop

1. Reel or post creates curiosity.
2. User comments `PACT`, `WORKOUT`, or `CONTENT`.
3. Reply publicly and DM them.
4. Move qualified users to WhatsApp.
5. Send a 5-question screening form.
6. Send Razorpay payment link or checkout.
7. Add them to the next weekly cohort.
8. Activate their pact after payment confirmation.
9. Capture proof and success story.
10. Ask for referral after day 7, day 15, and completion.

### Screening Questions

Use a short form:

1. Which pact do you want: content posting or workout?
2. What exactly will you do every day?
3. What deadline will you follow?
4. How much deposit are you comfortable putting behind it?
5. Are you okay with public/manual proof review rules?

Reject or delay users whose commitments are vague, medically risky, or hard to verify.

## Operating Model

### Weekly Cohorts

Run weekly cohorts instead of rolling enrollment.

Suggested rhythm:

- Monday: cohort starts.
- Sunday night: final onboarding deadline.
- Daily: proof due by user deadline.
- Daily morning: pending-proof reminders.
- Daily night: missed-deadline checks.
- Weekly: manual UPI payout batch and public progress recap.

Weekly cohorts create urgency and make operations easier.

### Review SLA

Early promise:

- Proof reviewed within 24 hours.
- Rejection reason is mandatory.
- Disputed proof can be appealed once.
- manual UPI payout happens weekly or at the end of the cycle.

Do not promise instant refunds or automatic approval.

### Ledger Rules

Track money as an append-only ledger:

- pact slot fee received
- Commitment deposit received
- Daily success credit approved
- Daily amount forfeited
- manual UPI payout created
- manual UPI payout completed
- Manual adjustment

The commitment deposit should not be treated as revenue while it is refundable. pact slot fee is the clean revenue line.

### Forfeit Rules

Forfeited money goes to a charity selected by the user from five available options.

V1 charity options:

1. The Akshaya Patra Foundation: child nutrition and school meals.
2. Goonj: rural development, disaster relief, and dignity-led community work.
3. Child Rights and You (CRY): child rights, education, and protection.
4. HelpAge India: elderly care and support.
5. Wildlife SOS: wildlife rescue, animal welfare, and conservation.

V1 must not route forfeited deposits to:

- Pact Raven revenue
- Friend beneficiaries
- Reward pools
- Random cash rewards
- Winner-takes-all payouts

The user ledger should show the selected charity and the forfeited amount for every missed or rejected day.

## Web-First Product Requirements

### User Side

Minimum v1 web/PWA screens:

- Landing page
- Pact selection
- Pact rules confirmation
- Razorpay payment
- Active pact dashboard
- Daily proof submission
- Submission history
- Approved/refunded/forfeited summary
- Support contact

### Admin Side

Minimum admin screens:

- Paid users
- Pending activation
- Active pacts
- Due today
- Proof under review
- Rejected/missed days
- Payout queue
- Ledger view
- Dispute notes
- Charity forfeiture queue

### Proof Submission Fields

Content pact:

- Public post URL
- Platform
- Optional note
- Submitted timestamp

Workout pact:

- Camera capture upload
- On-screen physical proof prompt
- Optional location
- Optional note
- Submitted timestamp

## Native App Decision

Do not build native before first 100 paid users.

Because the codebase stays in Expo, the future native path should be less painful. Still, native should wait until at least two of these are true:

- 100+ paid users have completed pacts.
- 30+ users specifically ask for step-count verification.
- Manual review becomes the bottleneck.
- Proof disputes exceed 5% of submissions.
- Users are repeating pacts and asking for more automation.
- Workout is clearly beating content posting in revenue or retention.

Native app v1 should be a companion verifier, not a full rebuild.

## 30-Day Launch Schedule

### Days 1-3: Setup

- Finalize rules for both pact types.
- Create payment and manual UPI payout SOP.
- Create forfeiture SOP for the five fixed charity destinations.
- Create WhatsApp onboarding scripts.
- Create proof review checklist.
- Create screening form.
- Create first 60 reels from the content calendar.

### Days 4-7: Warm-Up

- Post 2 reels per day.
- DM every commenter.
- Collect waitlist.
- Manually talk to 20 prospects.
- Recruit 10-15 users for the first cohort.

### Days 8-14: Cohort 1

- Start with 10-15 users.
- Keep support high-touch.
- Review proof daily.
- Document every objection and dispute.
- Capture day 3 and day 7 progress clips.

### Days 15-21: Cohort 2

- Open 20-25 slots.
- Keep the public pact slot fee at Rs 249.
- Test the Rs 50 abandoned-onboarding recovery discount for users who complete onboarding but do not start/pay.
- Add referral ask.
- Publish proof-of-work updates.

### Days 22-30: Cohort 3

- Open another 25-30 slots.
- Split messaging between content and workout.
- Compare conversion, completion, proof effort, and dispute rate.
- Decide which pact becomes the flagship for the next 60 days.

## Success Metrics

First 30 days:

- 100+ qualified DMs
- 40+ serious sales conversations
- 25+ paid non-friend users
- 70%+ payment-to-onboarding completion
- 80%+ daily proof submission among active users
- Less than 5% disputed reviews

First 90 days:

- 100 paid users
- 50 users paying Rs 249 pact slot fee without heavy objection
- 60%+ completion rate
- 25%+ repeat or referral rate
- Review time under 3 minutes per proof
- Clear winner between content and workout pacts

## Moat

The first moat is not code.

The moat is:

- Trustworthy proof-review operations.
- India-native payment and refund handling.
- Strong rules that prevent confusion.
- Founder-led distribution.
- Real transformation stories.
- A library of commitment templates that work.
- Operational data on what commitments people actually complete.

Later moats:

- Automated proof verification.
- Community and group accountability.
- Referee network.
- Creator partnerships.
- Employer/college/team challenges.
- AI-assisted review and reminders.

## Key Risks

### Risk: Users Think It Is Gambling

Mitigation:

- Avoid "bet" language.
- Charge a clear pact slot fee.
- Treat deposit as refundable commitment deposit.
- Let users choose from five charity forfeit destinations.
- Do not keep forfeited deposits as Pact Raven revenue.

### Risk: App Store And Payment Complexity

Mitigation:

- Stay web-first.
- Use Razorpay web checkout/payment links for early cohorts.
- Do not sell inside native apps yet.

### Risk: Proof Is Gamed

Mitigation:

- Keep deposits moderate.
- Use daily physical prompts and public links.
- Human review early.
- Reject unclear proof.
- Add API verification only after demand is proven.

### Risk: Too Much Manual Work

Mitigation:

- Weekly cohorts.
- Narrow pact types.
- Strict proof format.
- Admin checklist.
- Track review time from day one.

## Open Decisions

- Whether payout is weekly or end-of-challenge.
- Whether content posting or workout becomes the flagship offer after 30 days.
- Whether the public brand voice should be founder-led under Ajay or company-led under Pact Raven.
