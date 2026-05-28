import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

const waitlistJoinUrl =
  "https://chat.whatsapp.com/DfI1Q1AR6e9HZy4ZWaQSBT?mode=gi_t";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const charities = [
  "Akshaya Patra",
  "Goonj",
  "CRY",
  "HelpAge India",
  "Wildlife SOS",
];

type WaitlistFormProps = {
  idPrefix: string;
  variant: "primary" | "secondary";
};

async function saveWaitlistSignup(email: string) {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      source: "website-sticker-cobalt",
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

function WaitlistForm({ idPrefix, variant }: WaitlistFormProps) {
  const generatedId = useId();
  const inputId = `${idPrefix}-${generatedId}`;
  const messageId = `${inputId}-message`;
  const redirectTimerRef = useRef<number | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "error" | "success"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!emailPattern.test(normalized)) {
      setStatus("error");
      setMessage("Enter a valid email.");
      return;
    }
    try {
      setStatus("submitting");
      setMessage("Saving your email…");
      await saveWaitlistSignup(normalized);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not save signup.",
      );
      return;
    }
    setEmail(normalized);
    setStatus("success");
    setMessage("On the list. Opening WhatsApp…");
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }
    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign(waitlistJoinUrl);
    }, 850);
  }

  const wrapperClass = variant === "primary" ? "sc-form-row" : "sc-form-row sc-form-secondary";

  return (
    <form
      className={wrapperClass}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={status === "submitting"}
    >
      <label htmlFor={inputId} className="sc-sr-only">
        Email
      </label>
      <div className="sc-input-wrap">
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage("");
            }
          }}
          aria-describedby={messageId}
          aria-invalid={status === "error"}
          disabled={status === "submitting"}
          className="sc-input"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="sc-submit"
      >
        <span>{status === "submitting" ? "Saving…" : variant === "primary" ? "Open ledger" : "Lock me in"}</span>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M4 10 L 16 10 M 11 5 L 16 10 L 11 15"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      <p
        className={`sc-form-message sc-form-message-${status}`}
        id={messageId}
        role="status"
      >
        {message || "First Pact Pass free · WhatsApp launch group on signup"}
      </p>
    </form>
  );
}

function PhoneMockup() {
  return (
    <div className="sc-phone-stage" aria-hidden="true">
      <div className="sc-phone">
        <div className="sc-phone-island" />
        <div className="sc-phone-screen">
          <div className="sc-status-bar">
            <span className="sc-status-time">9:41</span>
            <div className="sc-status-icons">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="1" y="6" width="2" height="3" fill="#0A0A0A" />
                <rect x="4" y="4" width="2" height="5" fill="#0A0A0A" />
                <rect x="7" y="2" width="2" height="7" fill="#0A0A0A" />
                <rect x="10" y="0" width="2" height="9" fill="#0A0A0A" />
              </svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M2 4 Q 7 0, 12 4" stroke="#0A0A0A" strokeWidth="1.4" fill="none" />
                <path d="M4 6 Q 7 3, 10 6" stroke="#0A0A0A" strokeWidth="1.4" fill="none" />
                <circle cx="7" cy="8" r="1" fill="#0A0A0A" />
              </svg>
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="#0A0A0A" />
                <rect x="2" y="2" width="14" height="6" rx="1" fill="#0A0A0A" />
                <rect x="19" y="3" width="2" height="4" rx="0.5" fill="#0A0A0A" />
              </svg>
            </div>
          </div>

          <div className="sc-summary-card">
            <div className="sc-summary-top">
              <span className="sc-summary-label">REFUND CREDIT</span>
              <span className="sc-summary-badge">+₹66 today</span>
            </div>
            <div className="sc-summary-amounts">
              <span className="sc-summary-amount">₹792</span>
              <span className="sc-summary-of">of ₹2,000</span>
            </div>
            <div className="sc-summary-bar">
              <div className="sc-summary-bar-fill" />
            </div>
          </div>

          <div className="sc-ledger-label">
            <span>LAST 4 DAYS</span>
            <span className="sc-ledger-link">See all →</span>
          </div>

          <div className="sc-ledger-rows">
            <LedgerRow status="approved" title="Day 12 · 30s plank" meta="approved · 18:42" amount="+₹66" />
            <LedgerRow status="approved" title="Day 11 · run · 2km" meta="approved · 06:31" amount="+₹66" />
            <LedgerRow status="missed" title="Day 10 · missed" meta="→ Akshaya Patra" amount="→ ₹66" />
            <LedgerRow status="approved" title="Day 9 · pushups" meta="approved · 21:08" amount="+₹66" last />
          </div>

          <div className="sc-withdraw">
            <span>Withdraw ₹792 to UPI</span>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 9 L 15 9 M 10 4 L 15 9 L 10 14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      </div>
      <div className="sc-phone-sticker">
        <span>YOUR</span>
        <span>LEDGER</span>
      </div>
    </div>
  );
}

function LedgerRow({
  status,
  title,
  meta,
  amount,
  last,
}: {
  status: "approved" | "missed";
  title: string;
  meta: string;
  amount: string;
  last?: boolean;
}) {
  return (
    <div className={`sc-ledger-row${last ? " sc-ledger-row-last" : ""}`}>
      <div className="sc-ledger-row-left">
        <div className={`sc-ledger-icon sc-ledger-icon-${status}`}>
          {status === "approved" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 7 L 6 11 L 12 3"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M3 3 L 11 11 M 11 3 L 3 11"
                stroke="#0A0A0A"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}
        </div>
        <div className="sc-ledger-row-text">
          <span className="sc-ledger-title">{title}</span>
          <span className="sc-ledger-meta">{meta}</span>
        </div>
      </div>
      <span
        className={`sc-ledger-amount${status === "missed" ? " sc-ledger-amount-missed" : ""}`}
      >
        {amount}
      </span>
    </div>
  );
}

const EXPLAINER_TOTAL_DAYS = 30;
const EXPLAINER_PER_DAY = 66;
const EXPLAINER_MISSED_DAYS = new Set([3, 8, 14, 19, 24, 28]);
const EXPLAINER_TICK_MS = 220;

type ExplainerPhase = "filling" | "complete" | "transfer" | "rest";

function PactExplainer() {
  const containerRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [day, setDay] = useState(0);
  const [phase, setPhase] = useState<ExplainerPhase>("filling");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      setDay(EXPLAINER_TOTAL_DAYS);
      setPhase("transfer");
      return;
    }
    let timer: number | undefined;
    if (phase === "filling") {
      if (day < EXPLAINER_TOTAL_DAYS) {
        timer = window.setTimeout(() => setDay((d) => d + 1), EXPLAINER_TICK_MS);
      } else {
        timer = window.setTimeout(() => setPhase("complete"), 700);
      }
    } else if (phase === "complete") {
      timer = window.setTimeout(() => setPhase("transfer"), 1500);
    } else if (phase === "transfer") {
      timer = window.setTimeout(() => setPhase("rest"), 2600);
    } else if (phase === "rest") {
      timer = window.setTimeout(() => {
        setDay(0);
        setPhase("filling");
      }, 3200);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [active, phase, day, reduceMotion, runId]);

  const { completedSoFar, missedSoFar } = useMemo(() => {
    let ok = 0;
    let miss = 0;
    for (let i = 1; i <= day; i++) {
      if (EXPLAINER_MISSED_DAYS.has(i)) miss++;
      else ok++;
    }
    return { completedSoFar: ok, missedSoFar: miss };
  }, [day]);

  const refundAmt = completedSoFar * EXPLAINER_PER_DAY;
  const forfeitAmt = missedSoFar * EXPLAINER_PER_DAY;
  const transferring = phase === "transfer" || phase === "rest";

  function replay() {
    setDay(0);
    setPhase("filling");
    setRunId((r) => r + 1);
  }

  return (
    <section ref={containerRef} className="sc-section" id="explainer">
      <div className="sc-section-head">
        <h2 className="sc-h2">Watch a pact play out.</h2>
        <span className="sc-section-aside">30 days, every box decides where the money lands</span>
      </div>
      <div className="sc-explainer">
        <div className="sc-explainer-cal">
          <div className="sc-cal-header">
            <span className="sc-cal-title">YOUR PACT · 30 DAYS</span>
            <span className="sc-cal-day">
              Day {Math.min(day, EXPLAINER_TOTAL_DAYS)} / {EXPLAINER_TOTAL_DAYS}
            </span>
          </div>
          <div className="sc-cal-grid" role="img" aria-label="30-day pact progress">
            {Array.from({ length: EXPLAINER_TOTAL_DAYS }).map((_, i) => {
              const n = i + 1;
              const filled = n <= day;
              const isMiss = EXPLAINER_MISSED_DAYS.has(n);
              const cellClass = filled
                ? isMiss
                  ? "sc-cal-cell sc-cal-cell-miss"
                  : "sc-cal-cell sc-cal-cell-ok"
                : "sc-cal-cell";
              return (
                <div key={n} className={cellClass}>
                  <span className="sc-cal-num">{n}</span>
                  {filled ? (
                    <svg
                      className="sc-cal-mark"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      aria-hidden="true"
                    >
                      {isMiss ? (
                        <path
                          d="M5 5 L 17 17 M 17 5 L 5 17"
                          stroke="#C2002A"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      ) : (
                        <path
                          d="M4 11 L 9 16 L 18 6"
                          stroke="#1A4DFF"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      )}
                    </svg>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="sc-cal-legend">
            <span className="sc-cal-legend-item">
              <span className="sc-cal-dot sc-cal-dot-ok" /> Approved
            </span>
            <span className="sc-cal-legend-item">
              <span className="sc-cal-dot sc-cal-dot-miss" /> Missed
            </span>
            <button
              type="button"
              className="sc-cal-replay"
              onClick={replay}
              aria-label="Replay animation"
            >
              ↻ Replay
            </button>
          </div>
          {phase === "complete" || phase === "transfer" || phase === "rest" ? (
            <span className="sc-cal-stamp" aria-hidden="true">
              PACT COMPLETE
            </span>
          ) : null}
        </div>

        <div className="sc-explainer-pots">
          <article className={`sc-pot sc-pot-refund${transferring ? " sc-pot-sent" : ""}`}>
            <div className="sc-pot-top">
              <span className="sc-pot-label">REFUND POT</span>
              <span className="sc-pot-rate">+₹{EXPLAINER_PER_DAY}/day</span>
            </div>
            <span className="sc-pot-amt sc-pot-amt-accent">
              ₹{refundAmt.toLocaleString("en-IN")}
            </span>
            <span className="sc-pot-meta">{completedSoFar} approved days</span>
            <div className="sc-pot-bar">
              <div
                className="sc-pot-bar-fill sc-pot-bar-fill-ok"
                style={{
                  width: `${(completedSoFar / EXPLAINER_TOTAL_DAYS) * 100}%`,
                }}
              />
            </div>
            <div className={`sc-pot-arrow sc-pot-arrow-up${transferring ? " sc-pot-arrow-on" : ""}`}>
              <span>→ YOUR UPI</span>
            </div>
          </article>

          <article className={`sc-pot sc-pot-forfeit${transferring ? " sc-pot-sent" : ""}`}>
            <div className="sc-pot-top">
              <span className="sc-pot-label">FORFEIT POT</span>
              <span className="sc-pot-rate">→₹{EXPLAINER_PER_DAY}/miss</span>
            </div>
            <span className="sc-pot-amt">₹{forfeitAmt.toLocaleString("en-IN")}</span>
            <span className="sc-pot-meta">{missedSoFar} missed days</span>
            <div className="sc-pot-bar">
              <div
                className="sc-pot-bar-fill sc-pot-bar-fill-miss"
                style={{
                  width: `${(missedSoFar / EXPLAINER_TOTAL_DAYS) * 100}%`,
                }}
              />
            </div>
            <div className={`sc-pot-arrow sc-pot-arrow-down${transferring ? " sc-pot-arrow-on" : ""}`}>
              <span>→ CHARITY</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    n: "01",
    title: "Lock a deposit.",
    body: "Pick ₹1k–₹5k. Sits in escrow. Refundable on proof.",
    tone: "ink" as const,
  },
  {
    n: "02",
    title: "Show daily proof.",
    body: "One shot a day. Live camera + location, or a public post link.",
    tone: "cobalt" as const,
  },
  {
    n: "03",
    title: "Get your money back.",
    body: "Approved days credit your UPI twice a week. Missed days fund charity.",
    tone: "neutral" as const,
  },
];

const faqs = [
  {
    q: "Is this gambling?",
    a: "No. You only lose your own deposit. No one wins anyone else's money. The deposit is yours or your chosen charity's, never Pact Raven's.",
  },
  {
    q: "What does the ₹249 Pact Pass cover?",
    a: "Your first pass is free. After that, ₹249 buys you one 30-day pact: proof review, reminders, manual UPI payouts, and support. The deposit is separate.",
  },
  {
    q: "What if my proof gets rejected?",
    a: "Each day is reviewed by a human within 24 hours. You'll see the reason on the ledger and can request a re-review. Honest mistakes don't forfeit.",
  },
  {
    q: "When do approved days hit my UPI?",
    a: "Refund credit shows up in the app immediately. Withdrawals are manual UPI transfers — up to two requests a week.",
  },
  {
    q: "Can I quit early?",
    a: "Yes. Any unsettled deposit goes to your charity. Already-approved credit is still yours to withdraw.",
  },
];

export default function StickerCobalt() {
  return (
    <main className="sc-root">
      <style>{stickerCobaltCss}</style>

      <nav className="sc-nav" aria-label="Main navigation">
        <a className="sc-brand" href="/">
          <span className="sc-brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10 L8 14 L17 5"
                stroke="#1A4DFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sc-brand-name">Pact Raven</span>
        </a>
        <div className="sc-nav-links">
          <a href="#how">How</a>
          <a href="#ledger">Ledger</a>
          <a href="#faq">FAQ</a>
          <a href="#waitlist" className="sc-nav-cta">
            Join waitlist
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 7 L11 7 M 8 4 L 11 7 L 8 10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </a>
        </div>
      </nav>

      <section className="sc-hero" id="ledger">
        <PhoneMockup />
        <div className="sc-hero-copy">
          <div className="sc-eyebrow">
            <span className="sc-eyebrow-dot" />
            <span>30-DAY PACT · INDIA BETA</span>
          </div>
          <h1 className="sc-h1">
            <span>Your willpower</span>
            <span className="sc-h1-row">
              <span>has</span>
              <span className="sc-h1-accent">receipts</span>
            </span>
            <span>now.</span>
          </h1>
          <p className="sc-lede">
            Lock a deposit. Every approved day credits your UPI. Every missed
            day goes to the charity you picked. Audited, on the ledger, in your
            phone.
          </p>
          <div id="waitlist">
            <WaitlistForm idPrefix="hero" variant="primary" />
          </div>
        </div>
      </section>

      <section className="sc-section" id="how">
        <div className="sc-section-head">
          <h2 className="sc-h2">How it works.</h2>
          <span className="sc-section-aside">three steps, then thirty days</span>
        </div>
        <div className="sc-steps">
          {steps.map((step) => (
            <article key={step.n} className={`sc-step sc-step-${step.tone}`}>
              <div className="sc-step-head">
                <span className="sc-step-num">{step.n}</span>
                <StepIcon n={step.n} tone={step.tone} />
              </div>
              <h3 className="sc-step-title">{step.title}</h3>
              <p className="sc-step-body">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <PactExplainer />

      <section className="sc-section sc-section-quiet" id="proof">
        <div className="sc-section-head">
          <h2 className="sc-h2">What counts as proof.</h2>
          <span className="sc-section-aside">two formats, both reviewed by humans</span>
        </div>
        <div className="sc-proof-grid">
          <article className="sc-proof-card">
            <div className="sc-proof-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path
                  d="M5 27 Q 5 17, 11 15 Q 13 8, 19 9 L 26 12 L 30 12 a 3.5 3.5 0 0 1 3.5 3.5 v 1 a 3.5 3.5 0 0 1 -3.5 3.5 H 26 L 23 28 Z"
                  fill="#1A4DFF"
                  stroke="#0A0A0A"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M 11 15 Q 15 13, 19 15"
                  stroke="#0A0A0A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 28 14.5 H 31"
                  stroke="#0A0A0A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M 28 17.5 H 31"
                  stroke="#0A0A0A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>Workout pact</h3>
            <p>
              Fresh in-app camera capture, with your location and the day's
              prompt visible. Old photos, gallery uploads, or proof from someone
              else can be rejected.
            </p>
            <ul className="sc-proof-list">
              <li>Live camera only</li>
              <li>GPS + timestamp recorded</li>
              <li>Daily physical prompt</li>
            </ul>
          </article>
          <article className="sc-proof-card">
            <div className="sc-proof-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <rect x="3" y="10" width="30" height="20" rx="2.5" stroke="#0A0A0A" strokeWidth="2.4" fill="#FFFFFF" />
                <circle cx="18" cy="21" r="6.5" stroke="#0A0A0A" strokeWidth="2.4" fill="#1A4DFF" />
                <circle cx="18" cy="21" r="2.4" fill="#FFFFFF" />
                <rect x="12" y="5" width="12" height="5" rx="1.4" stroke="#0A0A0A" strokeWidth="2.4" fill="#FFFFFF" />
                <circle cx="28" cy="14" r="1.6" fill="#0A0A0A" />
              </svg>
            </div>
            <h3>Content pact</h3>
            <p>
              A public post link before the deadline. Twitter, Instagram,
              LinkedIn, Substack, your own blog. Private posts and edited
              timestamps don't count.
            </p>
            <ul className="sc-proof-list">
              <li>Public URL submitted in-app</li>
              <li>Stays live until reviewed</li>
              <li>Matches your declared topic</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="sc-section" id="money">
        <div className="sc-section-head">
          <h2 className="sc-h2">The money is the point.</h2>
          <span className="sc-section-aside">no prize pool, no streak guilt</span>
        </div>
        <div className="sc-money-grid">
          <article className="sc-stat-card sc-stat-card-ink">
            <span className="sc-stat-label">DEPOSIT</span>
            <span className="sc-stat-num">₹2,000</span>
            <span className="sc-stat-meta">Held in escrow. Yours, refundable.</span>
          </article>
          <article className="sc-stat-card">
            <span className="sc-stat-label">REFUND / APPROVED DAY</span>
            <span className="sc-stat-num sc-stat-num-accent">+ ₹66</span>
            <span className="sc-stat-meta">Credits your UPI. Twice-a-week withdraw.</span>
          </article>
          <article className="sc-stat-card">
            <span className="sc-stat-label">FORFEIT / MISSED DAY</span>
            <span className="sc-stat-num">→ ₹66</span>
            <span className="sc-stat-meta">Goes to the charity you picked. Not us.</span>
          </article>
        </div>
        <div className="sc-charity-strip" aria-label="Charity destinations">
          <span className="sc-charity-label">DESTINATIONS</span>
          <div className="sc-charity-chips">
            {charities.map((c) => (
              <span key={c} className="sc-charity-chip">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="sc-section sc-section-quiet" id="faq">
        <div className="sc-section-head">
          <h2 className="sc-h2">Before you lock in.</h2>
          <span className="sc-section-aside">the questions that matter</span>
        </div>
        <div className="sc-faq-grid">
          {faqs.map((f) => (
            <article key={f.q} className="sc-faq">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sc-final">
        <div className="sc-final-card">
          <span className="sc-eyebrow sc-eyebrow-light">
            <span className="sc-eyebrow-dot sc-eyebrow-dot-light" />
            <span>READY?</span>
          </span>
          <h2 className="sc-final-h2">
            <span>Stop arguing with</span>
            <span>
              <span className="sc-h1-accent">your future self.</span>
            </span>
          </h2>
          <p className="sc-final-lede">
            Lock the deposit. Let the ledger do the talking.
          </p>
          <WaitlistForm idPrefix="final" variant="secondary" />
        </div>
      </section>

      <footer className="sc-footer">
        <div className="sc-footer-left">
          <span className="sc-brand-name">Pact Raven</span>
          <span className="sc-footer-meta">Lock money. Show proof. Or fund charity.</span>
        </div>
        <nav className="sc-footer-links" aria-label="Footer links">
          <a href="/workout-accountability">Workout accountability</a>
          <a href="/proof-rules">Proof rules</a>
          <a href="/refund-cancellation">Payments &amp; refunds</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/support">Support</a>
        </nav>
      </footer>
    </main>
  );
}

function StepIcon({ n, tone }: { n: string; tone: "ink" | "cobalt" | "neutral" }) {
  const stroke = tone === "ink" ? "#F5F5F2" : "#0A0A0A";
  if (n === "01") {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="9" y="20" width="30" height="22" rx="3" fill={tone === "ink" ? "#F5F5F2" : "#0A0A0A"} />
        <path d="M 16 20 V 14 a 8 8 0 0 1 16 0 V 20" stroke={stroke} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="31" r="3" fill={tone === "ink" ? "#0A0A0A" : "#F5F5F2"} />
      </svg>
    );
  }
  if (n === "02") {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="4" y="14" width="40" height="28" rx="3" fill={tone === "cobalt" ? "#FFFFFF" : "#FFFFFF"} stroke="#0A0A0A" strokeWidth="3" />
        <circle cx="24" cy="28" r="9" fill="#0A0A0A" />
        <circle cx="24" cy="28" r="3.5" fill={tone === "cobalt" ? "#F5F5F2" : "#1A4DFF"} />
        <rect x="17" y="8" width="14" height="6" rx="2" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="3" />
      <path d="M 14 24 L 22 32 L 36 14" stroke="#1A4DFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

const stickerCobaltCss = `
.sc-root {
  background: #F5F5F2;
  color: #0A0A0A;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-feature-settings: "ss01" on, "cv11" on;
  min-height: 100vh;
  overflow-x: hidden;
}
.sc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* nav */
.sc-nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 28px clamp(20px, 4vw, 64px);
}
.sc-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #0A0A0A;
}
.sc-brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #0A0A0A;
  border-radius: 10px;
  transform: rotate(-6deg);
}
.sc-brand-name {
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: #0A0A0A;
}
.sc-nav-links {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 28px;
}
.sc-nav-links a {
  font-weight: 500;
  font-size: 14px;
  color: #5A5C66;
  text-decoration: none;
}
.sc-nav-links a:hover { color: #0A0A0A; }
.sc-nav-cta {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #1A4DFF;
  color: #FFFFFF !important;
  border: 3px solid #0A0A0A;
  border-radius: 999px;
  box-shadow: 3px 3px 0 #0A0A0A;
  font-weight: 800 !important;
  font-size: 13px !important;
  text-decoration: none;
}
.sc-nav-cta:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #0A0A0A;
}

/* hero */
.sc-hero {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 32px clamp(20px, 4vw, 64px) 80px;
  gap: 56px;
  max-width: 1440px;
  margin: 0 auto;
}
.sc-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
  padding-top: 32px;
  align-items: flex-start;
}
.sc-eyebrow {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 999px;
  transform: rotate(2deg);
  box-shadow: 4px 4px 0 #0A0A0A;
}
.sc-eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1A4DFF;
}
.sc-eyebrow span:last-child {
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #0A0A0A;
}
.sc-h1 {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-weight: 900;
  font-size: clamp(56px, 8vw, 124px);
  line-height: 0.88;
  letter-spacing: -0.045em;
  color: #0A0A0A;
  margin: 0;
}
.sc-h1-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: clamp(12px, 1.8vw, 24px);
}
.sc-h1-accent { color: #1A4DFF; }
.sc-lede {
  font-weight: 500;
  font-size: clamp(16px, 1.4vw, 20px);
  line-height: 1.5;
  color: #5A5C66;
  margin: 0;
  max-width: 560px;
}

/* form */
.sc-form-row {
  display: grid;
  grid-template-columns: 340px auto;
  grid-template-rows: auto auto;
  gap: 12px;
  width: 100%;
  max-width: 560px;
}
.sc-form-row > p.sc-form-message {
  grid-column: 1 / -1;
}
.sc-form-secondary {
  grid-template-columns: 1fr auto;
}
.sc-input-wrap {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 14px;
  box-shadow: 4px 4px 0 #0A0A0A;
}
.sc-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: inherit;
  font-weight: 500;
  font-size: 16px;
  color: #0A0A0A;
}
.sc-input::placeholder {
  color: #9CA0A8;
}
.sc-submit {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: #1A4DFF;
  color: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 14px;
  box-shadow: 4px 4px 0 #0A0A0A;
  font-family: inherit;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.05s, box-shadow 0.05s;
}
.sc-submit:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #0A0A0A;
}
.sc-submit:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #0A0A0A;
}
.sc-submit:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}
.sc-form-message {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-weight: 500;
  font-size: 13px;
  color: #5A5C66;
}
.sc-form-message::before {
  content: "✓";
  color: #1A4DFF;
  font-weight: 900;
}
.sc-form-message-error { color: #C2002A; }
.sc-form-message-error::before { content: "!"; color: #C2002A; }
.sc-form-message-success { color: #0A0A0A; }

/* phone */
.sc-phone-stage {
  position: relative;
  width: 440px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-phone {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 660px;
  background: #0A0A0A;
  border-radius: 48px;
  padding: 12px;
  box-sizing: border-box;
  box-shadow: 14px 14px 0 #0A0A0A, 0 0 0 3px #0A0A0A;
  transform: rotate(3deg);
}
.sc-phone-island {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 96px;
  height: 28px;
  background: #0A0A0A;
  border-radius: 999px;
  z-index: 10;
}
.sc-phone-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  border-radius: 38px;
  overflow: hidden;
}
.sc-status-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 6px;
  height: 48px;
  box-sizing: border-box;
}
.sc-status-time {
  font-weight: 700;
  font-size: 14px;
  color: #0A0A0A;
}
.sc-status-icons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}
.sc-summary-card {
  display: flex;
  flex-direction: column;
  margin: 8px 18px 12px;
  padding: 18px 20px;
  background: #0A0A0A;
  color: #FFFFFF;
  border-radius: 18px;
  gap: 10px;
}
.sc-summary-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.sc-summary-label {
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: #9CA0A8;
}
.sc-summary-badge {
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #1A4DFF;
}
.sc-summary-amounts {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
}
.sc-summary-amount {
  font-weight: 900;
  font-size: 44px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #FFFFFF;
}
.sc-summary-of {
  font-weight: 500;
  font-size: 13px;
  color: #9CA0A8;
}
.sc-summary-bar {
  display: flex;
  flex-direction: row;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: #2A2D36;
}
.sc-summary-bar-fill {
  width: 39.6%;
  background: #1A4DFF;
}
.sc-ledger-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 4px 22px 8px;
}
.sc-ledger-label > span:first-child {
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #5A5C66;
}
.sc-ledger-link {
  font-weight: 600;
  font-size: 11px;
  color: #1A4DFF;
}
.sc-ledger-rows {
  display: flex;
  flex-direction: column;
  padding: 0 18px;
}
.sc-ledger-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  border-bottom: 1px solid #E8E8E5;
}
.sc-ledger-row-last { border-bottom: 0; }
.sc-ledger-row-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
.sc-ledger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
.sc-ledger-icon-approved { background: #1A4DFF; }
.sc-ledger-icon-missed {
  background: #FFFFFF;
  border: 2px solid #0A0A0A;
}
.sc-ledger-row-text {
  display: flex;
  flex-direction: column;
}
.sc-ledger-title {
  font-weight: 700;
  font-size: 13px;
  color: #0A0A0A;
}
.sc-ledger-meta {
  font-weight: 500;
  font-size: 11px;
  color: #9CA0A8;
}
.sc-ledger-amount {
  font-weight: 800;
  font-size: 14px;
  color: #0A0A0A;
}
.sc-ledger-amount-missed { color: #5A5C66; }
.sc-withdraw {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 16px 22px 22px;
  padding: 16px;
  background: #1A4DFF;
  color: #FFFFFF;
  border: 2px solid #0A0A0A;
  border-radius: 16px;
  box-shadow: 0 4px 0 #0A0A0A;
  font-weight: 900;
  font-size: 16px;
}
.sc-phone-sticker {
  position: absolute;
  top: 30px;
  left: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  background: #1A4DFF;
  color: #FFFFFF;
  border: 3px solid #0A0A0A;
  box-shadow: 6px 6px 0 #0A0A0A;
  transform: rotate(-10deg);
  z-index: 5;
}
.sc-phone-sticker span {
  font-weight: 900;
  font-size: 13px;
  line-height: 1;
  letter-spacing: 0.1em;
}
.sc-phone-sticker span + span { margin-top: 2px; }

/* sections */
.sc-section {
  padding: 96px clamp(20px, 4vw, 64px);
  max-width: 1440px;
  margin: 0 auto;
}
.sc-section-quiet { background: transparent; }
.sc-section-head {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}
.sc-h2 {
  font-weight: 900;
  font-size: clamp(40px, 5vw, 72px);
  line-height: 1;
  letter-spacing: -0.035em;
  color: #0A0A0A;
  margin: 0;
}
.sc-section-aside {
  font-weight: 500;
  font-size: 14px;
  color: #5A5C66;
  letter-spacing: 0.02em;
}

/* steps */
.sc-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.sc-step {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 32px;
  border: 3px solid #0A0A0A;
  border-radius: 20px;
  box-shadow: 8px 8px 0 #0A0A0A;
  gap: 20px;
}
.sc-step-ink {
  background: #0A0A0A;
  color: #F5F5F2;
  transform: rotate(-0.6deg);
}
.sc-step-cobalt {
  background: #1A4DFF;
  color: #FFFFFF;
  transform: rotate(0.8deg);
}
.sc-step-neutral {
  background: #FFFFFF;
  color: #0A0A0A;
  transform: rotate(-0.4deg);
}
.sc-step-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
}
.sc-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  font-weight: 900;
  font-size: 28px;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
}
.sc-step-ink .sc-step-num { background: #1A4DFF; color: #FFFFFF; }
.sc-step-cobalt .sc-step-num { background: #FFFFFF; color: #1A4DFF; }
.sc-step-neutral .sc-step-num { background: #0A0A0A; color: #FFFFFF; }
.sc-step-title {
  font-weight: 900;
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0;
  color: inherit;
}
.sc-step-ink .sc-step-title { color: #F5F5F2; }
.sc-step-cobalt .sc-step-title { color: #FFFFFF; }
.sc-step-neutral .sc-step-title { color: #0A0A0A; }
.sc-step-body {
  font-weight: 500;
  font-size: 16px;
  line-height: 1.4;
  margin: 0;
  color: inherit;
}
.sc-step-ink .sc-step-body { color: #C4CCD6; }
.sc-step-cobalt .sc-step-body { color: rgba(255, 255, 255, 0.92); }
.sc-step-neutral .sc-step-body { color: #2A2D36; }

/* proof */
.sc-proof-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.sc-proof-card {
  display: flex;
  flex-direction: column;
  padding: 36px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 24px;
  box-shadow: 8px 8px 0 #0A0A0A;
  gap: 16px;
}
.sc-proof-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: #F5F5F2;
  border: 2px solid #0A0A0A;
  border-radius: 14px;
}
.sc-proof-card h3 {
  font-weight: 900;
  font-size: 28px;
  letter-spacing: -0.02em;
  margin: 0;
  color: #0A0A0A;
}
.sc-proof-card p {
  font-weight: 500;
  font-size: 16px;
  line-height: 1.5;
  color: #2A2D36;
  margin: 0;
}
.sc-proof-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sc-proof-list li {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  color: #0A0A0A;
}
.sc-proof-list li::before {
  content: "";
  display: block;
  width: 8px;
  height: 8px;
  background: #1A4DFF;
  border-radius: 2px;
}

/* money */
.sc-money-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.sc-stat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 32px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 20px;
  box-shadow: 8px 8px 0 #0A0A0A;
  gap: 10px;
}
.sc-stat-card-ink {
  background: #0A0A0A;
  color: #F5F5F2;
}
.sc-stat-label {
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: inherit;
  opacity: 0.7;
}
.sc-stat-card-ink .sc-stat-label { color: #1A4DFF; opacity: 1; }
.sc-stat-num {
  font-weight: 900;
  font-size: 72px;
  line-height: 1;
  letter-spacing: -0.04em;
  color: inherit;
}
.sc-stat-num-accent { color: #1A4DFF; }
.sc-stat-meta {
  font-weight: 500;
  font-size: 14px;
  color: inherit;
  opacity: 0.75;
}
.sc-charity-strip {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  padding: 20px 24px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 18px;
  box-shadow: 6px 6px 0 #0A0A0A;
  flex-wrap: wrap;
}
.sc-charity-label {
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #5A5C66;
}
.sc-charity-chips {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
}
.sc-charity-chip {
  padding: 8px 14px;
  background: #F5F5F2;
  border: 2px solid #0A0A0A;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: #0A0A0A;
}

/* faq */
.sc-faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.sc-faq {
  display: flex;
  flex-direction: column;
  padding: 28px 32px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 20px;
  box-shadow: 6px 6px 0 #0A0A0A;
  gap: 12px;
}
.sc-faq h3 {
  font-weight: 900;
  font-size: 22px;
  letter-spacing: -0.015em;
  color: #0A0A0A;
  margin: 0;
}
.sc-faq p {
  font-weight: 500;
  font-size: 15px;
  line-height: 1.5;
  color: #2A2D36;
  margin: 0;
}

/* final cta */
.sc-final {
  padding: 80px clamp(20px, 4vw, 64px) 96px;
  max-width: 1440px;
  margin: 0 auto;
}
.sc-final-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 72px clamp(24px, 5vw, 80px);
  background: #0A0A0A;
  color: #F5F5F2;
  border-radius: 32px;
  text-align: center;
}
.sc-eyebrow-light {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: none;
  color: #F5F5F2;
}
.sc-eyebrow-light span:last-child { color: #F5F5F2; }
.sc-eyebrow-dot-light { background: #1A4DFF; }
.sc-final-h2 {
  display: flex;
  flex-direction: column;
  font-weight: 900;
  font-size: clamp(40px, 6vw, 92px);
  line-height: 0.95;
  letter-spacing: -0.035em;
  color: #F5F5F2;
  margin: 0;
}
.sc-final-lede {
  font-weight: 500;
  font-size: 18px;
  line-height: 1.5;
  color: #9CA0A8;
  margin: 0;
  max-width: 520px;
}
.sc-final .sc-form-row {
  max-width: 560px;
}
.sc-final .sc-input-wrap {
  background: #FFFFFF;
  border-color: #0A0A0A;
}
.sc-final .sc-form-message {
  justify-content: center;
  color: #9CA0A8;
}

/* footer */
.sc-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px clamp(20px, 4vw, 64px);
  border-top: 1px solid #E2E2DD;
  flex-wrap: wrap;
}
.sc-footer-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sc-footer-meta {
  font-weight: 500;
  font-size: 12px;
  color: #5A5C66;
}
.sc-footer-links {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.sc-footer-links a {
  font-weight: 500;
  font-size: 13px;
  color: #5A5C66;
  text-decoration: none;
}
.sc-footer-links a:hover { color: #0A0A0A; }

/* responsive */
@media (max-width: 1080px) {
  .sc-hero {
    flex-direction: column;
    align-items: center;
    text-align: left;
  }
  .sc-phone-stage { width: 100%; }
  .sc-hero-copy { padding-top: 0; }
  .sc-steps { grid-template-columns: 1fr; }
  .sc-proof-grid { grid-template-columns: 1fr; }
  .sc-money-grid { grid-template-columns: 1fr; }
  .sc-faq-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .sc-nav { padding: 20px; }
  .sc-nav-links { gap: 16px; }
  .sc-nav-links a:not(.sc-nav-cta) { display: none; }
  .sc-hero { padding: 24px 20px 48px; gap: 32px; }
  .sc-h1 { font-size: clamp(48px, 12vw, 72px); }
  .sc-form-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  .sc-input-wrap, .sc-submit { width: 100%; }
  .sc-submit { justify-content: center; }
  .sc-section { padding: 56px 20px; }
  .sc-section-head { flex-direction: column; align-items: flex-start; }
  .sc-h2 { font-size: clamp(36px, 9vw, 56px); }
  .sc-charity-strip { flex-direction: column; align-items: flex-start; }
  .sc-final-card { padding: 48px 24px; }
  .sc-footer { flex-direction: column; align-items: flex-start; }
}

/* explainer */
.sc-explainer {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 32px;
  align-items: stretch;
}
.sc-explainer-cal {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  background: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 24px;
  box-shadow: 8px 8px 0 #0A0A0A;
  transform: rotate(-0.4deg);
}
.sc-cal-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.sc-cal-title {
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: #0A0A0A;
}
.sc-cal-day {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: #0A0A0A;
  color: #F5F5F2;
  border-radius: 999px;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.sc-cal-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.sc-cal-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F2;
  border: 2.5px solid #0A0A0A;
  border-radius: 12px;
  transition: background 180ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sc-cal-cell-ok {
  background: #E3EBFF;
  animation: sc-cell-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sc-cal-cell-miss {
  background: #FBE3E8;
  animation: sc-cell-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sc-cal-num {
  position: absolute;
  top: 4px;
  left: 6px;
  font-weight: 800;
  font-size: 10px;
  color: #9CA0A8;
  letter-spacing: 0.04em;
}
.sc-cal-cell-ok .sc-cal-num { color: #1A4DFF; }
.sc-cal-cell-miss .sc-cal-num { color: #C2002A; }
.sc-cal-mark { display: block; }
@keyframes sc-cell-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.sc-cal-legend {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.sc-cal-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #5A5C66;
}
.sc-cal-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  border: 2px solid #0A0A0A;
}
.sc-cal-dot-ok { background: #E3EBFF; }
.sc-cal-dot-miss { background: #FBE3E8; }
.sc-cal-replay {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  color: #0A0A0A;
  border: 2.5px solid #0A0A0A;
  border-radius: 999px;
  box-shadow: 3px 3px 0 #0A0A0A;
  font-family: inherit;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.06s, box-shadow 0.06s;
}
.sc-cal-replay:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #0A0A0A;
}
.sc-cal-replay:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #0A0A0A;
}
.sc-cal-stamp {
  position: absolute;
  top: 36%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-8deg);
  padding: 14px 28px;
  background: #1A4DFF;
  color: #FFFFFF;
  border: 3px solid #0A0A0A;
  border-radius: 14px;
  box-shadow: 6px 6px 0 #0A0A0A;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.06em;
  pointer-events: none;
  animation: sc-stamp-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes sc-stamp-in {
  0% { transform: translate(-50%, -50%) rotate(-22deg) scale(2); opacity: 0; }
  60% { transform: translate(-50%, -50%) rotate(-4deg) scale(1.08); opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(-8deg) scale(1); opacity: 1; }
}

.sc-explainer-pots {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sc-pot {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  border: 3px solid #0A0A0A;
  border-radius: 20px;
  box-shadow: 8px 8px 0 #0A0A0A;
  transition: transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 420ms ease;
}
.sc-pot-refund {
  background: #FFFFFF;
  transform: rotate(0.6deg);
}
.sc-pot-forfeit {
  background: #0A0A0A;
  color: #F5F5F2;
  transform: rotate(-0.6deg);
}
.sc-pot-top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.sc-pot-label {
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.1em;
}
.sc-pot-refund .sc-pot-label { color: #0A0A0A; }
.sc-pot-forfeit .sc-pot-label { color: #F5F5F2; }
.sc-pot-rate {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.04em;
}
.sc-pot-refund .sc-pot-rate { background: #E3EBFF; color: #1A4DFF; }
.sc-pot-forfeit .sc-pot-rate { background: rgba(255,255,255,0.12); color: #F5F5F2; }
.sc-pot-amt {
  font-weight: 900;
  font-size: clamp(36px, 4.4vw, 56px);
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}
.sc-pot-refund .sc-pot-amt { color: #0A0A0A; }
.sc-pot-amt-accent { color: #1A4DFF !important; }
.sc-pot-forfeit .sc-pot-amt { color: #FFFFFF; }
.sc-pot-meta {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.sc-pot-refund .sc-pot-meta { color: #5A5C66; }
.sc-pot-forfeit .sc-pot-meta { color: #B5B7BD; }
.sc-pot-bar {
  position: relative;
  width: 100%;
  height: 10px;
  margin-top: 4px;
  background: #F5F5F2;
  border: 2px solid #0A0A0A;
  border-radius: 999px;
  overflow: hidden;
}
.sc-pot-forfeit .sc-pot-bar { background: #1F2026; border-color: #F5F5F2; }
.sc-pot-bar-fill {
  height: 100%;
  width: 0%;
  transition: width 220ms ease-out;
}
.sc-pot-bar-fill-ok { background: #1A4DFF; }
.sc-pot-bar-fill-miss { background: #C2002A; }
.sc-pot-arrow {
  position: absolute;
  right: -10px;
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: #FFFFFF;
  color: #0A0A0A;
  border: 2.5px solid #0A0A0A;
  border-radius: 999px;
  box-shadow: 3px 3px 0 #0A0A0A;
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.08em;
  opacity: 0;
  transform: translateX(12px) scale(0.85);
  transition: opacity 360ms ease, transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  white-space: nowrap;
}
.sc-pot-arrow-up { top: 18px; background: #1A4DFF; color: #FFFFFF; }
.sc-pot-arrow-down { bottom: 18px; background: #F5F5F2; color: #0A0A0A; }
.sc-pot-arrow-on {
  opacity: 1;
  transform: translateX(0) scale(1);
}
.sc-pot-sent { box-shadow: 4px 4px 0 #0A0A0A; }
.sc-pot-refund.sc-pot-sent { transform: rotate(0.6deg) translateY(-2px); }
.sc-pot-forfeit.sc-pot-sent { transform: rotate(-0.6deg) translateY(2px); }

@media (max-width: 1080px) {
  .sc-explainer { grid-template-columns: 1fr; }
  .sc-cal-stamp { font-size: 18px; padding: 10px 22px; }
}
@media (max-width: 720px) {
  .sc-explainer-cal { padding: 20px; }
  .sc-cal-grid { gap: 6px; }
  .sc-cal-num { font-size: 9px; top: 3px; left: 4px; }
  .sc-pot { padding: 20px; }
  .sc-pot-arrow { font-size: 10px; padding: 6px 10px; right: -6px; }
}
`;
