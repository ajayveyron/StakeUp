import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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

const operatorName = "Pact Raven";
const registeredAddress =
  "Hustlehub tech park, Sector 2, HSR Layout, Bengaluru, Karnataka 560068";
const businessPhone = "+91 7988810502";
const supportEmail = "support@pactraven.com";
const legalEmail = "legal@pactraven.com";
const grievanceEmail = "support@pactraven.com";
const grievanceOfficer = "Ajay Pawriya";
const gstStatus =
  "GSTIN has not been provided yet and will be added if applicable before issuing GST invoices or collecting GST.";
const launchScope =
  "Pact Raven is currently a paid beta for India-based users who are at least 18 years old.";
const charityDestinationStatus =
  "The listed charities are user-selected charity destinations, not formal Pact Raven charity partners unless Pact Raven states otherwise in writing.";
const charityTransferCadence =
  "Forfeited amounts are recorded internally and transferred to the selected charity destination in monthly batches.";
const payoutTiming =
  "Approved proof creates refund credit immediately in the app. Approved credit is available for manual UPI payout after approval, and users may submit up to two manual withdrawal requests per week.";
const payoutLimits =
  "Admin attempts prompt manual UPI transfer after a valid request, subject to correct UPI details, UPI/bank availability, fraud checks, disputes, legal restrictions, and manual review load.";

const proofTypes = [
  {
    icon: Camera,
    title: "Workout pact",
    cta: "Join waitlist",
    body: "Camera, location, daily pose.",
  },
  {
    icon: Link2,
    title: "Content pact",
    cta: "Join waitlist",
    body: "Public post link before deadline.",
  },
];

const steps = [
  {
    title: "Choose",
    body: "Pick workout or content.",
  },
  {
    title: "Lock",
    body: "Use pass. Lock deposit.",
  },
  {
    title: "Prove",
    body: "Show proof daily.",
  },
];

const moneyRules = [
  {
    icon: BadgeIndianRupee,
    title: "First pass covered",
    body: "Next Pact Pass is Rs 249.",
  },
  {
    icon: ShieldCheck,
    title: "Refund credit",
    body: "Approved proof creates credit for manual payout.",
  },
  {
    icon: HeartHandshake,
    title: "Forfeit is charity",
    body: "Missed-day money is not Pact Raven revenue.",
  },
];

const faqs = [
  {
    title: "What does Rs 249 pay for?",
    body: "One Pact Pass after your covered first pass.",
  },
  {
    title: "Can I draft before paying?",
    body: "Yes. Payment starts the pact.",
  },
  {
    title: "Is the deposit a prize pool?",
    body: "No. Users do not win another user's money.",
  },
  {
    title: "What proof counts?",
    body: "Workout: camera, location, pose. Content: public link.",
  },
  {
    title: "Where does missed-day money go?",
    body: "To the charity you chose. Not Pact Raven.",
  },
];

const workoutAnswer =
  "Pact Raven is a workout accountability app for India-based users who want a 30-day pact with a real record. You create a workout pact, lock a refundable deposit, show fresh camera, location, and pose proof, receive refund credit when proof is approved, and forfeit missed or rejected days to your chosen charity.";

const workoutSections = [
  {
    title: "How workout pacts work",
    body: [
      "Choose a workout pact, set the days and deadline, use a Pact Pass, and lock the separate refundable deposit before the pact starts.",
      "On each scheduled day, show proof before the deadline. The Raven records whether the day is under review, approved, missed, or rejected.",
      "Manual review keeps the first version strict enough for trust while the product stays web-first and operationally simple.",
    ],
  },
  {
    title: "What proof counts",
    body: [
      "Workout proof must be a fresh in-app camera capture with captured device location and the daily physical prompt shown in the app.",
      "The person, pose, equipment, place, or gesture requested by the prompt should be visible enough for manual review.",
      "Workout proof links, gallery uploads, old photos, edited proof, vague proof, copied proof, missing location, or proof from another person may be rejected.",
    ],
  },
  {
    title: "What happens to the money",
    body: [
      "Every account gets the first Pact Pass covered once. After that, each Pact Pass is Rs 249.",
      "The pact deposit is separate from the Pact Pass fee. Approved workout proof creates refund credit for manual UPI payout.",
      "Missed or rejected workout days forfeit that day's deposit credit to the charity selected before starting. Forfeits are not Pact Raven revenue.",
    ],
  },
  {
    title: "Who it is for",
    body: [
      "Pact Raven is for adults in India who already want workout consistency and want the pressure of a clear pact, proof deadline, and recorded outcome.",
      "It is not medical, fitness, legal, tax, financial, or mental health advice. Users should choose pacts that are safe and lawful for them.",
    ],
  },
] as const;

const workoutFaqs = [
  {
    title: "What is a workout accountability app?",
    body: "A workout accountability app helps a user turn a fitness intention into a tracked commitment. Pact Raven does this with a 30-day pact, daily proof, manual review, refund credit for approved days, and charity forfeits for missed or rejected days.",
  },
  {
    title: "What proof counts in Pact Raven?",
    body: "Workout proof should be a fresh in-app camera capture with captured location and the daily pose, gesture, or equipment cue visible enough for manual review.",
  },
  {
    title: "What happens if I miss a workout day?",
    body: "A missed or rejected workout day can forfeit that day's deposit credit to the charity you selected before the pact started.",
  },
  {
    title: "Is the deposit a prize pool?",
    body: "No. Users do not win another user's money. The deposit is recorded as a refundable pact deposit liability until it is refunded, forfeited to charity, or settled by admin.",
  },
  {
    title: "What does Pact Raven cost?",
    body: "The first Pact Pass is covered once per account. After that, each Pact Pass is Rs 249. The separate workout pact deposit is locked only when the pact starts.",
  },
] as const;

const lastUpdated = "May 22, 2026";
const waitlistJoinUrl =
  "https://chat.whatsapp.com/DfI1Q1AR6e9HZy4ZWaQSBT?mode=gi_t";
const siteOrigin = "https://pactraven.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistFormProps = {
  idPrefix?: string;
  className?: string;
};

async function saveWaitlistSignup(email: string) {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      source: "website",
      pagePath: window.location.pathname,
      referrer: document.referrer || undefined,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "Could not save waitlist signup.");
  }
}

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Pact Raven - Workout and content pacts",
    description: "Lock money. Show proof daily. Missed days go to charity.",
  },
  "/workout-accountability": {
    title: "Workout Accountability App For 30-Day Pacts - Pact Raven",
    description:
      "Pact Raven turns workout consistency into a 30-day pact with refundable deposit, fresh proof, manual review, refund credit, and charity forfeits.",
  },
  "/terms": {
    title: "Terms of Use - Pact Raven",
    description:
      "Terms for Pact Raven Pact Passes, deposits, proof review, forfeits, manual payouts, limits, and user responsibilities.",
  },
  "/refund-cancellation": {
    title: "Payment, Cancellation, Refund And Delivery Policy - Pact Raven",
    description:
      "Payment, cancellation, refund, delivery, manual UPI payout, Pact Pass, deposit, proof, and charity forfeit rules for Pact Raven.",
  },
  "/privacy": {
    title: "Privacy Policy - Pact Raven",
    description:
      "How Pact Raven collects and uses account, pact, payment, proof, payout, notification, support, and operations data.",
  },
  "/proof-rules": {
    title: "Proof Rules - Pact Raven",
    description:
      "Workout and content proof rules for Pact Raven pacts, including deadlines, rejection reasons, and review outcomes.",
  },
  "/support": {
    title: "Support - Pact Raven",
    description:
      "Support contacts and response expectations for Pact Raven payment, payout, proof, account, legal, privacy, and grievance requests.",
  },
  "/404": {
    title: "Page Not Found - Pact Raven",
    description: "The requested Pact Raven page was not found.",
  },
};

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
          "Pact Raven is a commitment and accountability product for users in India. Users create a pact, lock money behind it, show proof, and receive refund credit when proof is approved.",
          `Operator: ${operatorName}. Registered address: ${registeredAddress}. Business phone: ${businessPhone}. ${gstStatus}`,
          `${launchScope} Users must be legally competent to contract. Pact Raven is not intended for minors.`,
        ],
      },
      {
        title: "Pact Passes And Deposits",
        body: [
          "A Pact Pass unlocks one pact. Every account gets the first Pact Pass covered once; after that, each Pact Pass is Rs 249.",
          "A pact deposit is separate from the Pact Pass fee. The deposit is recorded internally as a refundable pact deposit liability until it is refunded, forfeited, or transferred to charity.",
          "Pact Raven is not a bank, prepaid wallet, stored-value account, escrow service, trustee, investment product, lottery, or money-transfer service. Users do not earn interest on deposits or refund credit.",
          "A draft pact does not consume a pass. A pass is consumed only when the pact starts after deposit confirmation. If a started pact ends early, the pass remains used.",
        ],
      },
      {
        title: "Proof Review",
        body: [
          "Proof is reviewed manually. Pact Raven may approve, reject, or ask for clarification depending on the pact rules and the proof shown.",
          "Approved proof creates refund credit. Missed, late, unclear, deleted, private, or rejected proof may forfeit the relevant deposit amount to the user's selected charity.",
          "Review decisions are based on the rules visible before the pact starts. Pact Raven may correct an obvious error, but approval is not automatic.",
          "Users grant Pact Raven permission to store and review submitted proof for pact operation, dispute handling, fraud prevention, and legal/accounting records.",
        ],
      },
      {
        title: "User Responsibilities",
        body: [
          "Users must provide accurate account, contact, payment, and payout information.",
          "Users must not show false proof, old proof, edited proof, proof from another person, or content that they do not have rights to share.",
          "Users must choose pacts that are safe and lawful for them. Pact Raven does not provide medical, fitness, legal, tax, financial, or mental health advice.",
          "Users are responsible for checking deadlines, proof prompts, rules, refund credit, payout requests, and recorded settlement outcomes.",
        ],
      },
      {
        title: "Limits",
        body: [
          "Pact Raven is not medical, fitness, legal, tax, financial, or mental health advice.",
          "Pact Raven is not a gambling, betting, jackpot, pooled-prize, or winner-takes-all product. Users do not win other users' money.",
          "Forfeited deposit amounts are not Pact Raven revenue. Pact Raven's clean revenue line is the Pact Pass fee after the covered first pass.",
          "Pact Raven may pause, reject, refund, settle, suspend, or close pacts where payment-provider rules, fraud risk, legal requirements, unsafe activity, or abusive behavior require it.",
        ],
      },
      {
        title: "Support And Grievances",
        body: [
          `Support email: ${supportEmail}. Legal and policy email: ${legalEmail}. Privacy and grievance email: ${grievanceEmail}.`,
          `Grievance officer: ${grievanceOfficer}. Business phone: ${businessPhone}. Registered address: ${registeredAddress}.`,
          "Consumer, payment, privacy, and legal grievances should be acknowledged within 48 hours where practical and resolved within one month where required by applicable law, subject to user cooperation, bank/provider delays, disputes, and legal constraints.",
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
      "This policy separates the Pact Pass fee from the refundable pact deposit. It also covers cancellations, manual UPI payouts, and digital service delivery.",
    sections: [
      {
        title: "Pact Pass Fee",
        body: [
          "Every account gets the first Pact Pass covered once. After that, each Pact Pass is Rs 249 unless a specific offer says otherwise.",
          "The Pact Pass fee is non-refundable once bought. It pays for access to one pact and Pact Raven's accountability, review, reminders, operations, and support.",
          "A Pact Pass unlocks one pact. Buying or receiving a pass does not start a pact by itself. The user may draft a pact before or after owning a pass.",
          "If a payment fails, is reversed, or is disputed, the related pass or pact may stay pending until the payment record is resolved.",
        ],
      },
      {
        title: "Pact Deposit",
        body: [
          "The pact deposit is a separate payment collected when the user chooses to start a pact.",
          "The deposit is not treated as Pact Raven revenue while it is refundable. It is recorded as a refundable pact deposit liability in Pact Raven's internal ledger.",
          "The pact becomes active only after the user has an unused pass and the deposit payment is confirmed.",
          "The deposit is not a wallet balance, investment, prize pool, or interest-bearing account. It is settled only as refund credit, charity payable, returned amount, or another manual settlement outcome recorded by admin.",
        ],
      },
      {
        title: "Payment Provider",
        body: [
          "Collections are expected to run through Razorpay or another approved provider. Written provider comfort for the exact refundable deposit, manual UPI payout, and charity forfeit flow is not confirmed yet.",
          "Pact Raven may change providers, pause formal checkout, limit payments to a controlled paid beta, use a manual pilot flow, or manually refund/settle payments if provider approval, compliance review, fraud controls, or operational readiness requires it.",
          "Pact Raven should not store card numbers, UPI PINs, CVV, or payment instrument credentials. Payment instrument handling belongs to the payment provider.",
          "If refunds are handled manually by Pact Raven instead of through the payment provider, users must be told before payment and must provide correct payout details.",
        ],
      },
      {
        title: "Refund Credit",
        body: [
          "Approved proof creates refund credit immediately in the app according to the pact's rules and the user's selected refund schedule.",
          "Refund credit is not instant cash. It becomes payable through the manual UPI payout process after approval and a valid payout request.",
          "Rejected, missed, late, unclear, private, deleted, or otherwise invalid proof may forfeit the related deposit amount to charity.",
        ],
      },
      {
        title: "Proof And Forfeits",
        body: [
          "Content pacts require the public post link described in the pact rules. Workout pacts require fresh proof matching the prompt and commitment.",
          "Proof may be rejected if it is late, unclear, private, deleted, inaccessible, edited, copied, from another person, or does not match the pact.",
          `Forfeited amounts are recorded as charity payable to the user's selected charity. Current choices are ${charities.join(", ")}.`,
          `${charityDestinationStatus} ${charityTransferCadence}`,
          "Forfeited amounts are not Pact Raven revenue. Users should not assume they will receive a donation receipt, 80G certificate, or tax deduction unless Pact Raven explicitly confirms that arrangement in writing.",
        ],
      },
      {
        title: "Manual UPI Payouts",
        body: [
          "User payouts are manual UPI transfers for the first cohorts. Pact Raven does not send user payouts back through Razorpay in this flow.",
          "Users may request payout of available refund credit from the app. Admin records the UPI reference after payment is made.",
          payoutTiming,
          payoutLimits,
          "Payout requests may be rejected, paused, or corrected if the UPI ID is invalid, mismatched, suspicious, disputed, or legally restricted.",
        ],
      },
      {
        title: "Early End",
        body: [
          "A user may end a pact early, but the consumed Pact Pass remains used and any paid pass fee remains non-refundable.",
          "If the user ends a pact early, the remaining unsettled deposit is forfeited to the user's selected charity destination. Any already-approved refund credit remains subject to the manual payout policy unless fraud, dispute, or legal review requires a different settlement.",
        ],
      },
      {
        title: "Cancellations",
        body: [
          "A draft pact may be abandoned before it starts. Abandoning a draft does not consume a pass.",
          "A paid Pact Pass is not cancelled or refunded. It remains available until it is used for a pact, unless the account is closed for fraud, abuse, or legal reasons.",
          "A deposit payment that has not been matched to an active pact should be reviewed manually and either applied to the pact or returned according to the support record.",
          "Cancellation charges, if any are introduced later, must be disclosed before payment and must not be one-sided.",
        ],
      },
      {
        title: "Digital Delivery",
        body: [
          "Pact Raven is a digital service. No physical product is shipped.",
          "A paid Pact Pass is credited after successful payment verification. A pact starts after an unused pass is available and the separate deposit payment is confirmed.",
          "Proof review, refund credit, payout requests, notifications, and support are delivered digitally.",
        ],
      },
      {
        title: "Support And Grievances",
        body: [
          `Support email: ${supportEmail}. Legal and policy email: ${legalEmail}. Privacy and grievance email: ${grievanceEmail}.`,
          `Grievance officer: ${grievanceOfficer}. Business phone: ${businessPhone}. Registered address: ${registeredAddress}. ${gstStatus}`,
          "Payment, payout, proof, and account support requests should be acknowledged within 48 hours where practical and resolved within one month where required by applicable law.",
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
          "Account data such as name, email, phone number, WhatsApp number, sign-in identifiers, and profile details.",
          "Pact data such as goals, schedule, deadline, deposit amount, selected charity, proof prompts, proof submissions, workout proof location, review decisions, payout requests, and support notes.",
          "Payment metadata such as Razorpay order IDs, payment IDs, payment purpose, amount, currency, status, and timestamps. Pact Raven should not store card numbers, UPI PINs, CVV, or payment instrument credentials.",
          "Manual payout data such as UPI IDs, payee names, UPI reference IDs, payout notes, amount, currency, and payout status.",
          "Device, browser, security, and audit data such as timestamps, IP-derived metadata, logs, fraud signals, and app diagnostics where needed to operate and protect the service.",
        ],
      },
      {
        title: "How We Use Data",
        body: [
          "To create accounts, draft pacts, start pacts, verify payments, review proof, calculate refund credit, record forfeits, process manual UPI payouts, prevent fraud, provide support, and maintain accounting records.",
          "To send transactional notifications about payments, pact reminders, proof review, refund credit, payout requests, early-end settlements, and account operations by in-app, email, WhatsApp, or similar channels.",
          "To improve pact rules, review quality, operations, support, and safety.",
          "To comply with law, payment-provider requirements, tax/accounting duties, fraud investigations, disputes, and enforceable legal requests.",
        ],
      },
      {
        title: "Sharing",
        body: [
          "Data may be shared with payment providers, authentication providers, hosting and database providers, email, WhatsApp, or notification providers, admin tools, and professional advisors where needed to operate Pact Raven.",
          "Payment data is shared with Razorpay to process collections. User payouts are currently handled manually by UPI and recorded internally.",
          "Data may be shared if required by law, regulation, court order, payment-provider investigation, fraud review, tax/accounting requirement, or user dispute.",
          "Some providers may process data outside India where permitted by Indian law and their own processing terms.",
        ],
      },
      {
        title: "Consent, Rights, And Grievances",
        body: [
          "Pact, payment, ledger, proof review, payout, tax, and dispute records may be retained as long as needed for operations, legal compliance, accounting, fraud prevention, and dispute handling.",
          "Users may request access, correction, updating, deletion of eligible personal data, withdrawal of consent, and nomination rights where applicable. Some records may need to be retained where law, accounting, payment reconciliation, fraud prevention, or dispute handling requires it.",
          "By using Pact Raven, users consent to the collection and use of data needed to provide the service, process payments, review proof, maintain records, and handle payouts.",
          `Privacy and grievance requests should be sent to ${grievanceEmail}. Grievance officer: ${grievanceOfficer}. Business phone: ${businessPhone}. Registered address: ${registeredAddress}. ${gstStatus}`,
          "Withdrawing consent may limit or stop Pact Raven's ability to operate a pact, verify proof, process payments, handle payouts, or maintain required records.",
        ],
      },
      {
        title: "Children",
        body: [
          "Pact Raven is not intended for minors. Users must be at least 18 years old and legally competent to contract.",
          "If Pact Raven learns that a minor has used the service, the account and pact should be reviewed, suspended, refunded, or closed according to legal and payment-provider requirements.",
        ],
      },
      {
        title: "Security",
        body: [
          "Pact Raven uses third-party infrastructure and reasonable operational safeguards to protect account, payment, proof, and payout records.",
          "No online system is perfectly secure. Users should not share sensitive proof beyond what the pact requires.",
        ],
      },
    ],
  },
  "/proof-rules": {
    title: "Proof Rules",
    kicker: "Proof review",
    intro:
      "These rules explain what proof should show, when it must be shown, and why proof can be approved or rejected.",
    sections: [
      {
        title: "Deadline",
        body: [
          "Proof must be shown on the scheduled date before the daily deadline shown in the app.",
          "Late proof may be rejected even if the activity happened. The record depends on timely proof, not memory.",
        ],
      },
      {
        title: "Workout Proof",
        body: [
          "Workout proof must be a fresh in-app camera capture with captured device location and the daily prompt shown in the app.",
          "The person, pose, equipment, place, or gesture requested by the prompt should be visible enough for manual review.",
          "Workout proof links, gallery uploads, old photos, edited proof, vague proof, copied proof, missing location, or proof from another person may be rejected.",
        ],
      },
      {
        title: "Content Proof",
        body: [
          "Content pacts require a public post link matching the pact rules.",
          "Private, deleted, inaccessible, reposted, or unrelated content may be rejected.",
          "The user is responsible for keeping the post accessible until review is complete.",
        ],
      },
      {
        title: "Review Outcome",
        body: [
          "Approved proof creates refund credit according to the pact's refund schedule.",
          "Missed, late, unclear, private, deleted, or rejected proof may forfeit that day's deposit credit to the selected charity.",
        ],
      },
    ],
  },
  "/support": {
    title: "Support",
    kicker: "Contact",
    intro:
      "Use these contacts for account, payment, payout, proof, legal, privacy, and grievance requests.",
    sections: [
      {
        title: "Support Contacts",
        body: [
          `Support email: ${supportEmail}.`,
          `Legal and policy email: ${legalEmail}.`,
          `Privacy and grievance email: ${grievanceEmail}.`,
          `Grievance officer: ${grievanceOfficer}.`,
          `Business phone: ${businessPhone}.`,
        ],
      },
      {
        title: "Response Window",
        body: [
          "Payment, payout, proof, and account support requests should be acknowledged within 48 hours where practical and resolved within one month where required by applicable law.",
          `${payoutTiming} ${payoutLimits}`,
          "Grievance requests should include the account email, pact or payment reference, issue summary, and requested correction where relevant.",
        ],
      },
      {
        title: "Launch Details",
        body: [
          `${launchScope} Operator: ${operatorName}. Registered address: ${registeredAddress}. ${gstStatus}`,
          `${charityDestinationStatus} ${charityTransferCadence}`,
          "Users should not share sensitive proof beyond what the pact requires.",
        ],
      },
    ],
  },
} as const;

type LegalPath = keyof typeof legalPages;

function isLegalPath(pathname: string): pathname is LegalPath {
  return pathname in legalPages;
}

function normalizedPathname(pathname: string) {
  const withoutHtml = pathname.endsWith(".html")
    ? pathname.slice(0, -".html".length)
    : pathname;
  return withoutHtml.replace(/\/$/, "") || "/";
}

function WaitlistForm({ idPrefix, className }: WaitlistFormProps) {
  const generatedId = useId();
  const inputId = `${idPrefix ?? "waitlist"}-${generatedId}`;
  const messageId = `${inputId}-message`;
  const redirectTimerRef = useRef<number | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    "Join the waitlist. Then join the launch group.",
  );
  const [status, setStatus] = useState<
    "idle" | "submitting" | "error" | "success"
  >("idle");

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email.");
      return;
    }

    try {
      setStatus("submitting");
      setMessage("Saving your email.");
      await saveWaitlistSignup(normalizedEmail);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save waitlist signup.",
      );
      return;
    }

    setEmail(normalizedEmail);
    setStatus("success");
    setMessage("You are on the waitlist. Opening WhatsApp.");

    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }
    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign(waitlistJoinUrl);
    }, 850);
  }

  return (
    <form
      className={["waitlist-form", className].filter(Boolean).join(" ")}
      id="waitlist"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={status === "submitting"}
    >
      <label htmlFor={inputId}>Email</label>
      <div className="waitlist-row">
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage("Join the waitlist. Then join the launch group.");
            }
          }}
          aria-describedby={messageId}
          aria-invalid={status === "error"}
          disabled={status === "submitting"}
        />
        <button
          className="button primary"
          type="submit"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Saving" : "Join waitlist"}
          <ArrowRight size={20} />
        </button>
      </div>
      <p className={`waitlist-message ${status}`} id={messageId} role="status">
        {message}
      </p>
    </form>
  );
}

function App() {
  const pathname = normalizedPathname(window.location.pathname);
  useEffect(() => {
    const meta = routeMeta[pathname] ?? {
      title: "Page Not Found - Pact Raven",
      description: "The requested Pact Raven page was not found.",
    };
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", meta.title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", meta.description);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute(
        "href",
        `${siteOrigin}${pathname === "/" ? "" : pathname}`,
      );
  }, [pathname]);

  if (isLegalPath(pathname)) {
    return <LegalPage path={pathname} />;
  }
  if (pathname === "/workout-accountability") {
    return <WorkoutAccountabilityPage />;
  }
  if (pathname === "/404") {
    return <NotFoundPage />;
  }
  if (pathname !== "/") {
    return <NotFoundPage />;
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
            <a href="/workout-accountability">Workout accountability</a>
            <a href="/proof-rules">Proof rules</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="stamp">30-day pact / daily proof</p>
            <h1>Lock money. Show proof. Build refund credit.</h1>
            <p className="lede">
              Approved days create refund credit. Missed days go to charity.
            </p>
            <WaitlistForm className="hero-waitlist" idPrefix="hero" />
          </div>

          <div className="promise-panel" aria-label="Pact summary">
            <p className="panel-kicker">The record</p>
            <div className="promise-line">
              <span>Daily</span>
              <strong>Proof</strong>
            </div>
            <div className="promise-line">
              <span>Approved</span>
              <strong>Credit</strong>
            </div>
            <div className="promise-line">
              <span>Missed</span>
              <strong>Charity</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="how">
        <div className="section-heading">
          <p className="stamp">How it works</p>
          <h2>Three steps.</h2>
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
          <h2>Pick the proof you can show daily.</h2>
        </div>
        <div className="pact-grid">
          {proofTypes.map((item) => {
            const Icon = item.icon;
            return (
              <article className="pact-card" key={item.title}>
                <Icon size={34} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <a href="#waitlist">
                  {item.cta}
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
          <h2>Simple before payment.</h2>
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
          <p className="stamp">If a day is missed or rejected</p>
          <h2>Missed days go where you chose.</h2>
        </div>
        <p className="charity-note">
          Forfeited deposit money is recorded for charity, not Pact Raven
          revenue.
        </p>
        <div className="charity-strip">
          {charities.map((charity) => (
            <span key={charity}>{charity}</span>
          ))}
        </div>
      </section>

      <section className="policy-band" id="faq">
        <div className="section-heading">
          <p className="stamp">FAQ</p>
          <h2>Before you sign.</h2>
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
          <a className="button primary" href="#waitlist">
            Join waitlist
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
          <span>Lock money. Show proof.</span>
        </div>
        <nav className="footer-links" aria-label="Footer links">
          <a href="/workout-accountability">Workout accountability</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund-cancellation">Payments and refunds</a>
          <a href="/proof-rules">Proof rules</a>
          <a href="/support">Support</a>
        </nav>
      </footer>
    </main>
  );
}

function WorkoutAccountabilityPage() {
  return (
    <main className="legal-shell answer-shell">
      <nav className="legal-nav" aria-label="Workout accountability navigation">
        <a className="brand" href="/" aria-label="Pact Raven home">
          PACT RAVEN
        </a>
        <a className="legal-back" href="/">
          <ArrowLeft size={18} />
          Home
        </a>
      </nav>

      <article className="legal-page answer-page">
        <p className="stamp">Workout accountability</p>
        <h1>Workout accountability app for 30-day pacts</h1>
        <p className="legal-updated">Last updated: {lastUpdated}</p>
        <p className="legal-intro">{workoutAnswer}</p>

        <div className="answer-actions">
          <WaitlistForm className="answer-waitlist" idPrefix="workout" />
          <a className="button secondary" href="/proof-rules">
            Read proof rules
          </a>
        </div>

        {workoutSections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className="legal-section" id="faq">
          <h2>FAQ</h2>
          <div className="answer-faq-list">
            {workoutFaqs.map((faq) => (
              <article key={faq.title}>
                <h3>{faq.title}</h3>
                <p>{faq.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="answer-final-cta" aria-label="Join the waitlist">
          <h2>Start with the proof you can show.</h2>
          <p>
            The workout pact begins after an unused Pact Pass is available and
            the separate deposit is confirmed.
          </p>
          <div className="answer-actions">
            <a className="button primary" href="#waitlist">
              Join waitlist
              <ArrowRight size={20} />
            </a>
            <a className="button dark" href="/refund-cancellation">
              Read payment policy
            </a>
          </div>
        </section>
      </article>

      <footer>
        <div>
          <strong>PACT RAVEN</strong>
          <span>Lock money. Show proof.</span>
        </div>
        <nav className="footer-links" aria-label="Footer links">
          <a href="/proof-rules">Proof rules</a>
          <a href="/refund-cancellation">Payments and refunds</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/support">Support</a>
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
        <nav className="footer-links" aria-label="Footer links">
          <a href="/workout-accountability">Workout accountability</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund-cancellation">Payments and refunds</a>
          <a href="/proof-rules">Proof rules</a>
          <a href="/support">Support</a>
        </nav>
      </footer>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav" aria-label="Legal navigation">
        <a className="brand" href="/" aria-label="Pact Raven home">
          PACT RAVEN
        </a>
      </nav>
      <article className="legal-page">
        <p className="stamp">404</p>
        <h1>Page not found</h1>
        <p className="legal-intro">
          This page is not part of the Pact Raven record.
        </p>
        <a className="button primary" href="/">
          Return home
          <ArrowRight size={20} />
        </a>
      </article>
    </main>
  );
}

export default App;
