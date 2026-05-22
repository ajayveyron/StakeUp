# Pact Raven Legal Sweep - 2026-05-22

This is a product and copy readiness sweep, not a lawyer signoff. The current posture can support a narrow paid beta in India if payment collection is controlled, but it is not ready for wider paid public traffic until the launch blockers below are closed.

## Sources Checked

- Department of Consumer Affairs / WIPO Lex copy of the Consumer Protection (E-Commerce) Rules, 2020: legal name, address, contact, grievance redressal, refund/payment disclosure expectations.
- MeitY Digital Personal Data Protection Act, 2023: consent, data fiduciary duties, business contact for privacy questions, grievance redressal, children's data constraints.
- RBI Guidelines on Regulation of Payment Aggregators and Payment Gateways: PA/PG roles, merchant policy disclosure, customer complaint/refund handling, payment-instrument data restrictions.
- Razorpay Terms and Conditions: merchant obligations to publish terms/refund policies, comply with payment aggregator guidelines, avoid illegal/prohibited transaction flows, maintain records, and avoid storing payment instrument credentials.

Reference URLs:

- https://www.wipo.int/wipolex/en/legislation/details/23198
- https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf
- https://www.rbi.org.in/scripts/RTGS_Notification.aspx?Id=11822
- https://razorpay.com/terms/

## Required Public Surfaces

Pact Raven should keep these public pages live and linked from the website footer and in-app profile:

- Terms of Use: `/terms`
- Privacy Policy: `/privacy`
- Payment, Cancellation, Refund and Delivery Policy: `/refund-cancellation`
- Proof Rules: `/proof-rules`
- Support and Grievance Contact: `/support`

The app should also link Terms, Payment Policy, and Proof Rules at payment time. The payment ledger now records the policy version accepted before checkout.

## Current Launch Details

- Operator/legal name provided for current policies: Pact Raven.
- Registered address: Hustlehub tech park, Sector 2, HSR Layout, Bengaluru, Karnataka 560068.
- Business phone: +91 7988810502.
- Support email: support@pactraven.com.
- Legal email: legal@pactraven.com.
- Privacy/grievance email: support@pactraven.com.
- Interim grievance officer: Ajay Pawriya.
- GSTIN: not provided yet; add if applicable before issuing GST invoices or collecting GST.
- Launch scope: paid beta, India-only, 18+ only, web/PWA paid flow.
- Pact Pass price after covered first pass: Rs 249.
- Deposit amounts: variable by user/pact.
- Refund credit: created immediately in the app after proof approval, according to the user's chosen schedule.
- Manual UPI withdrawals: up to two requests per week; admin attempts prompt transfer after a valid request, subject to bank/UPI availability, correct UPI details, fraud checks, disputes, legal restrictions, and manual review load.
- Early-end rule: remaining unsettled deposit forfeits to the user's selected charity destination; already-approved refund credit remains subject to payout rules unless fraud, dispute, or legal review requires a different settlement.
- Charity handling: current five destinations are user-selected destinations, not formal Pact Raven partners unless stated otherwise; forfeits transfer monthly; no donation receipt, 80G certificate, or tax deduction promise yet.

## Launch Blockers

1. Get CA/lawyer review of the deposit model:
   the product collects a refundable pact deposit, later refund credit, and charity forfeits. Keep calling it a refundable pact deposit liability, not revenue, wallet, investment, escrow, or trustee-held funds unless the legal structure changes.
2. Get written payment-provider comfort for the exact flow:
   Pact Pass fee, separate refundable deposit, manual UPI refund payouts, charity forfeits, and batching.
3. Confirm GST position:
   whether GST registration/invoices are required for Pact Pass fees, what details must appear on receipts, and whether any GSTIN must be added to policies before collection.
4. Create a charity settlement SOP:
   charity ledger, transfer cadence, reconciliation, proof of transfer, selected-charity records, failed-transfer handling, and no 80G/tax-deduction promise unless explicitly arranged.
5. Create a grievance SOP:
   acknowledge consumer/privacy/payment grievances within 48 hours where practical, target resolution within one month where required, and keep evidence of the thread and final outcome.
6. Keep proof-review evidence:
   pact rules shown before start, proof prompts, submitted proof, captured location for workout proof, timestamps, review decision, reviewer, rejection reason, and settlement outcome.

## Copy Guardrails

Use:

- pact, proof, record, refund credit, refundable pact deposit, Pact Pass, manual UPI payout, forfeited to charity
- approved proof creates refund credit
- missed or rejected days forfeit to the selected charity
- forfeits are not Pact Raven revenue

Avoid:

- bet, gambling, jackpot, pool, winnings, cash reward, lottery
- wallet, stored balance, interest, investment, yield
- escrow, trust, trustee-held unless counsel changes the structure
- instant cash, guaranteed refund, guaranteed result
- private posts are valid proof
- tax deduction or 80G certificate unless confirmed in writing

## Files Updated

- `artifacts/website/src/App.tsx`: expanded legal page content, last-updated date, support/grievance timing, payment-provider caveats, privacy/data-rights sections, minors/health limits, and safer hero/money copy.
- `artifacts/website/*.html`: expanded static legal HTML for Terms, Privacy, Payments/Refunds, Proof Rules, and Support so crawlers/no-JS views do not show stale short policy text.
- `artifacts/mobile/app/commitment/[id].tsx`: added payment-time material terms, proof rules link, and clearer early-end settlement copy.
- `artifacts/mobile/app/commitment/new.tsx`: made the pact review copy explicit about refund credit and charity forfeits.
- `artifacts/mobile/app/(tabs)/profile/index.tsx`: added Support and grievances link.
- `convex/paymentsInternal.ts`: records Terms, Payment Policy, and Proof Rules version `2026-05-22` in Pact Pass and deposit ledger notes.
- `api/og.ts`, `artifacts/website/api/og.ts`, `artifacts/mobile/scripts/export-web.js`, `README.md`, `docs/design-guidelines.md`, and `docs/product-decisions.md`: tightened public/product wording away from slot, wallet, challenge, and earnings framing.

## Residual Risk

The highest-risk area is still money custody and conditional settlement. The copy now avoids the worst regulated terms and user expectations, but the business model still needs provider and counsel confirmation before scale.
