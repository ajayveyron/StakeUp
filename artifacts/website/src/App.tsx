import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  Camera,
  HeartHandshake,
  Link2,
  ShieldCheck,
} from "lucide-react";

const charities = [
  "Akshaya Patra",
  "Goonj",
  "CRY",
  "HelpAge India",
  "Wildlife SOS",
];

const proofTypes = [
  {
    icon: Camera,
    title: "Workout pact",
    body: "Train on the days you promised. Submit fresh proof with the daily pose or gesture prompt before your deadline.",
  },
  {
    icon: Link2,
    title: "Content pact",
    body: "Publish the post, keep it public, and submit the link before the day closes. Deleted or private posts do not count.",
  },
];

const steps = [
  {
    title: "Choose the pact",
    body: "Pick workout consistency or daily content posting. Set the schedule, deadline, deposit, and charity before you start.",
  },
  {
    title: "Buy one slot",
    body: "Rs 249 buys one non-refundable pact slot. A draft pact does not use it. Starting a pact does.",
  },
  {
    title: "Lock the deposit",
    body: "Pay the separate deposit when you are ready to start. This money sits against the pact rules, not as a prize pool.",
  },
  {
    title: "Show proof",
    body: "Approved proof creates refund credit. Missed or rejected days forfeit the matching amount to your selected charity.",
  },
];

const moneyRules = [
  {
    icon: BadgeIndianRupee,
    title: "No subscription",
    body: "Pay for one slot when you want one pact. Buy another slot only when you want another challenge.",
  },
  {
    icon: ShieldCheck,
    title: "Deposit comes back only when earned",
    body: "Kept days create refund credit after manual review. Payouts are manual UPI for the first cohorts.",
  },
  {
    icon: HeartHandshake,
    title: "Missed-day money is not our upside",
    body: "Forfeited deposit amounts are recorded for the selected charity. Pact Raven revenue is the slot fee.",
  },
];

const faqs = [
  {
    title: "Can I draft before paying?",
    body: "Yes. Draft the pact first. Your slot is consumed only when the pact starts after deposit confirmation.",
  },
  {
    title: "Can I end early?",
    body: "Yes, but the used slot remains used. The remaining deposit goes to manual settlement review.",
  },
  {
    title: "When do I get money back?",
    body: "Approved proof creates refund credit. You request payout in the app, then admin pays through UPI and records the reference.",
  },
];

const lastUpdated = "May 21, 2026";
const appUrl = "https://app.pactraven.com";

const legalPages = {
  "/terms": {
    title: "Terms of Use",
    kicker: "Legal terms",
    intro:
      "These terms explain how Pact Raven works, what users agree to when they create a pact, and how payment, proof review, forfeits, and manual payouts are handled.",
    sections: [
      {
        title: "Who We Are",
        body: [
          "Pact Raven is a commitment and accountability product for users in India. Users create a pact, lock money behind it, submit proof, and receive refund credit when proof is approved.",
          "Legal entity, registered address, GST details, and final support contacts must be confirmed before paid public launch. The details shown on payment receipts and checkout records will identify the operating entity.",
        ],
      },
      {
        title: "Pact Slots And Deposits",
        body: [
          "A pact slot is a non-refundable access purchase. One pact slot unlocks one pact challenge.",
          "A pact deposit is separate from the pact slot fee. The deposit is held against the pact rules and is recorded internally as a refundable pact deposit liability until it is refunded, forfeited, or transferred to charity.",
          "A draft pact does not consume a slot. A slot is consumed only when the pact starts after deposit confirmation. If a started pact ends early, the slot remains used.",
        ],
      },
      {
        title: "Proof Review",
        body: [
          "Proof is reviewed manually. Pact Raven may approve, reject, or ask for clarification depending on the pact rules and the proof submitted.",
          "Approved proof creates refund credit. Missed, late, unclear, deleted, private, or rejected proof may forfeit the relevant deposit amount to the user's selected charity.",
          "Review decisions are based on the rules visible before the pact starts. Pact Raven may correct an obvious error, but approval is not automatic.",
        ],
      },
      {
        title: "User Responsibilities",
        body: [
          "Users must provide accurate account, contact, payment, and payout information.",
          "Users must not submit false proof, old proof, edited proof, proof from another person, or content that they do not have rights to share.",
          "Users are responsible for checking deadlines, proof prompts, rules, refund credit, payout requests, and recorded settlement outcomes.",
        ],
      },
      {
        title: "Limits",
        body: [
          "Pact Raven is not medical, fitness, legal, tax, financial, or mental health advice.",
          "Pact Raven is not a gambling, betting, jackpot, pooled-prize, or winner-takes-all product. Users do not win other users' money.",
          "Forfeited deposit amounts are not Pact Raven revenue. Pact Raven's clean revenue line is the pact slot fee.",
        ],
      },
      {
        title: "Changes",
        body: [
          "Pact Raven may update these terms as the product, payment provider, payout process, or legal requirements change.",
          "Material changes should be reflected before new payments are accepted. Existing pacts should continue under the rules accepted when they started unless a required legal or safety change applies.",
        ],
      },
    ],
  },
  "/refund-cancellation": {
    title: "Payment, Cancellation, Refund And Delivery Policy",
    kicker: "Payments",
    intro:
      "This policy separates the non-refundable pact slot fee from the refundable pact deposit. It also covers cancellations, manual UPI payouts, and digital service delivery.",
    sections: [
      {
        title: "Pact Slot Fee",
        body: [
          "The pact slot fee is Rs 249 for one pact slot unless a specific offer says otherwise.",
          "The pact slot fee is non-refundable once bought. It pays for access to one pact challenge and Pact Raven's accountability, review, reminders, operations, and support.",
          "Buying a slot does not start a pact by itself. The user may draft a pact before or after owning a slot.",
        ],
      },
      {
        title: "Pact Deposit",
        body: [
          "The pact deposit is a separate payment collected when the user chooses to start a pact.",
          "The deposit is not treated as Pact Raven revenue while it is refundable. It is recorded as a refundable pact deposit liability in Pact Raven's internal ledger.",
          "The pact becomes active only after the user has an unused slot and the deposit payment is confirmed.",
        ],
      },
      {
        title: "Refund Credit",
        body: [
          "Approved proof creates refund credit according to the pact's rules and daily refund schedule.",
          "Refund credit is not instant cash. It becomes payable after manual review and is paid through the manual UPI payout process.",
          "Rejected, missed, late, unclear, private, deleted, or otherwise invalid proof may forfeit the related deposit amount to charity.",
        ],
      },
      {
        title: "Proof And Forfeits",
        body: [
          "Content pacts require the public post link described in the pact rules. Workout pacts require fresh proof matching the prompt and commitment.",
          "Proof may be rejected if it is late, unclear, private, deleted, inaccessible, edited, copied, from another person, or does not match the pact.",
          `Forfeited amounts are recorded as charity payable to the user's selected charity. Current choices are ${charities.join(", ")}.`,
          "Forfeited amounts are not Pact Raven revenue. Users should not assume they will receive an 80G certificate or tax deduction unless Pact Raven explicitly confirms that arrangement in writing.",
        ],
      },
      {
        title: "Manual UPI Payouts",
        body: [
          "User payouts are manual UPI transfers for the first cohorts. Pact Raven does not send user payouts back through Razorpay in this flow.",
          "Users may request payout of available refund credit from the app. Admin records the UPI reference after payment is made.",
          "Payouts may be processed in batches. The target processing window is 7 business days after a valid payout request, subject to correct UPI details, bank/UPI availability, fraud checks, disputes, and manual review load.",
        ],
      },
      {
        title: "Early End",
        body: [
          "A user may end a pact early, but the consumed pact slot remains used and the slot fee remains non-refundable.",
          "The remaining deposit moves to admin settlement review. Admin records the refund and forfeit split based on the pact rules, proof history, and circumstances.",
        ],
      },
      {
        title: "Cancellations",
        body: [
          "A draft pact may be abandoned before it starts. Abandoning a draft does not consume a slot.",
          "A paid pact slot is not cancelled or refunded. It remains available until it is used for a pact, unless the account is closed for fraud, abuse, or legal reasons.",
          "A deposit payment that has not been matched to an active pact should be reviewed manually and either applied to the pact or returned according to the support record.",
        ],
      },
      {
        title: "Digital Delivery",
        body: [
          "Pact Raven is a digital service. No physical product is shipped.",
          "A paid pact slot is credited after successful payment verification. A pact starts after an unused slot is available and the separate deposit payment is confirmed.",
          "Proof review, refund credit, payout requests, notifications, and support are delivered digitally.",
        ],
      },
      {
        title: "Support And Grievances",
        body: [
          "Support email: support@pactraven.com. Legal and policy email: legal@pactraven.com. Privacy and grievance email: grievance@pactraven.com.",
          "Payment, payout, proof, and account support requests should receive an initial response within 3 business days.",
          "Legal entity, registered address, GSTIN, and phone number must be inserted before paid public launch.",
        ],
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    kicker: "Privacy",
    intro:
      "This policy explains the data Pact Raven collects to run pacts, verify proof, process payments, and handle manual payouts.",
    sections: [
      {
        title: "Information We Collect",
        body: [
          "Account data such as name, email, phone number, sign-in identifiers, and profile details.",
          "Pact data such as goals, schedule, deadline, deposit amount, selected charity, proof prompts, proof submissions, review decisions, payout requests, and support notes.",
          "Payment metadata such as Razorpay order IDs, payment IDs, payment purpose, amount, currency, status, and timestamps. Pact Raven should not store card numbers, UPI PINs, CVV, or payment instrument credentials.",
          "Manual payout data such as UPI reference IDs, payout notes, amount, currency, and payout status.",
        ],
      },
      {
        title: "How We Use Data",
        body: [
          "To create accounts, draft pacts, start pacts, verify payments, review proof, calculate refund credit, record forfeits, process manual UPI payouts, prevent fraud, provide support, and maintain accounting records.",
          "To send transactional notifications about payments, proof review, refund credit, payout requests, early-end settlements, and account operations.",
          "To improve pact rules, review quality, operations, support, and safety.",
        ],
      },
      {
        title: "Sharing",
        body: [
          "Data may be shared with payment providers, authentication providers, hosting and database providers, email or notification providers, admin tools, and professional advisors where needed to operate Pact Raven.",
          "Payment data is shared with Razorpay to process collections. User payouts are currently handled manually by UPI and recorded internally.",
          "Data may be shared if required by law, regulation, court order, payment-provider investigation, fraud review, tax/accounting requirement, or user dispute.",
        ],
      },
      {
        title: "Retention, Rights, And Grievances",
        body: [
          "Pact, payment, ledger, proof review, payout, tax, and dispute records may be retained as long as needed for operations, legal compliance, accounting, fraud prevention, and dispute handling.",
          "Users may request access, correction, or deletion of eligible personal data. Some records may need to be retained where law, accounting, payment reconciliation, fraud prevention, or dispute handling requires it.",
          "By using Pact Raven, users consent to the collection and use of data needed to provide the service, process payments, review proof, maintain records, and handle payouts.",
          "Privacy and grievance requests should be sent to grievance@pactraven.com. Legal entity, registered address, GSTIN, and phone number must be inserted before paid public launch.",
        ],
      },
      {
        title: "Security",
        body: [
          "Pact Raven uses third-party infrastructure and reasonable operational safeguards to protect account, payment, proof, and payout records.",
          "No online system is perfectly secure. Users should not submit sensitive proof beyond what the pact requires.",
        ],
      },
    ],
  },
} as const;

type LegalPath = keyof typeof legalPages;

function isLegalPath(pathname: string): pathname is LegalPath {
  return pathname in legalPages;
}

function App() {
  const pathname = window.location.pathname;
  if (isLegalPath(pathname)) {
    return <LegalPage path={pathname} />;
  }

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Pact Raven home">
            PACT RAVEN
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#pacts">Choose pact</a>
            <a href="#money">Money rules</a>
            <a href="#charity">Charity</a>
          </div>
        </nav>

        <div className="shape shape-ring" />
        <div className="shape shape-block" />
        <div className="shape shape-slab" />

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="stamp">Workout and content pacts / India first</p>
            <h1>Make a pact you cannot casually break.</h1>
            <p className="lede">
              Choose a 30-day challenge, buy one pact slot, lock a refundable
              deposit, and submit proof. Kept days unlock refund credit. Missed
              days forfeit to the charity you chose.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={appUrl} aria-label="Open Pact Raven app">
                Start a pact
                <ArrowRight size={20} />
              </a>
              <a className="button secondary" href="#how">
                How it works
              </a>
            </div>
          </div>

          <div className="promise-panel" aria-label="Pact summary">
            <p className="panel-kicker">What you sign</p>
            <div className="promise-line">
              <span>I will</span>
              <strong>Show proof daily</strong>
            </div>
            <div className="promise-line">
              <span>If kept</span>
              <strong>Refund credit</strong>
            </div>
            <div className="promise-line">
              <span>If missed</span>
              <strong>Charity forfeit</strong>
            </div>
            <a className="panel-link" href={appUrl}>
              Open the app
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="band" id="how">
        <div className="section-heading">
          <p className="stamp">How it works</p>
          <h2>Start only when you are ready to stand by the record.</h2>
        </div>
        <div className="step-list">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-band" id="pacts">
        <div className="section-heading">
          <p className="stamp">Choose your pact</p>
          <h2>Two first challenges. One clear proof rule.</h2>
        </div>
        <div className="pact-grid">
          {proofTypes.map((item) => {
            const Icon = item.icon;
            return (
              <article className="pact-card" key={item.title}>
                <Icon size={34} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <a href={appUrl}>
                  Start this pact
                  <ArrowRight size={18} />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="band money-band" id="money">
        <div className="section-heading">
          <p className="stamp">Money rules</p>
          <h2>Simple enough to read before paying.</h2>
        </div>
        <div className="money-grid">
          {moneyRules.map((rule) => {
            const Icon = rule.icon;
            return (
              <article className="money-card" key={rule.title}>
                <Icon size={28} />
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="charity-band" id="charity">
        <div className="section-heading">
          <p className="stamp">If the pact is not kept</p>
          <h2>Missed-day money goes to the charity you selected.</h2>
        </div>
        <p className="charity-note">
          You pick the destination before the pact starts. Pact Raven does not
          treat forfeited deposit money as revenue.
        </p>
        <div className="charity-strip">
          {charities.map((charity) => (
            <span key={charity}>{charity}</span>
          ))}
        </div>
      </section>

      <section className="policy-band" id="questions">
        <div className="section-heading">
          <p className="stamp">Before you pay</p>
          <h2>Know the slot, deposit, proof, and payout rules.</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <article key={faq.title}>
              <h3>{faq.title}</h3>
              <p>{faq.body}</p>
            </article>
          ))}
        </div>
        <div className="policy-cta">
          <a className="button primary" href={appUrl}>
            Start a pact
            <ArrowRight size={20} />
          </a>
          <a className="button dark" href="/refund-cancellation">
            Read payment policy
          </a>
        </div>
      </section>

      <footer>
        <div>
          <strong>PACT RAVEN</strong>
          <span>Make the pact. Keep the record.</span>
        </div>
        <nav className="footer-links" aria-label="Legal links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund-cancellation">Payments and refunds</a>
        </nav>
      </footer>
    </main>
  );
}

function LegalPage({ path }: { path: LegalPath }) {
  const page = legalPages[path];

  return (
    <main className="legal-shell">
      <nav className="legal-nav" aria-label="Legal navigation">
        <a className="brand" href="/" aria-label="Pact Raven home">
          PACT RAVEN
        </a>
        <a className="legal-back" href="/">
          <ArrowLeft size={18} />
          Home
        </a>
      </nav>

      <article className="legal-page">
        <p className="stamp">{page.kicker}</p>
        <h1>{page.title}</h1>
        <p className="legal-updated">Last updated: {lastUpdated}</p>
        <p className="legal-intro">{page.intro}</p>

        <div className="legal-review-note">
          This page is an operational draft for Pact Raven's current v1 flow. It
          should be reviewed by a qualified lawyer and CA before wider public
          launch or any material payment-policy change.
        </div>

        {page.sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <footer>
        <div>
          <strong>PACT RAVEN</strong>
          <span>Legal and policy pages</span>
        </div>
        <nav className="footer-links" aria-label="Legal links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund-cancellation">Payments and refunds</a>
        </nav>
      </footer>
    </main>
  );
}

export default App;
