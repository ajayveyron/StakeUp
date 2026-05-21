import { ArrowRight, BadgeIndianRupee, Camera, HeartHandshake, Link2, ShieldCheck } from "lucide-react";

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
    body: "Fresh camera proof with a gesture, pose, or expression prompt. Show it, sign it, stand by it.",
  },
  {
    icon: Link2,
    title: "Content pact",
    body: "Public post link for the day. Post it where the world can see it, then sign the submission.",
  },
];

function App() {
  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Pact Raven home">
            PACT RAVEN
          </a>
          <div className="nav-links">
            <a href="#pacts">Pacts</a>
            <a href="#pricing">Pricing</a>
            <a href="#charity">Charity</a>
          </div>
        </nav>

        <div className="shape shape-ring" />
        <div className="shape shape-block" />
        <div className="shape shape-slab" />

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="stamp">India first / human reviewed / web first</p>
            <h1>Put money behind the promise.</h1>
            <p className="lede">
              Pact Raven does not motivate you. It remembers what you agreed to.
              Make a 30-day pact, show proof, sign each submission, and get
              refund credit when you keep your word.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="https://wa.me/" aria-label="Join the first Pact Raven cohort">
                Join first cohort
                <ArrowRight size={20} />
              </a>
              <a className="button secondary" href="#rules">
                See the rules
              </a>
            </div>
          </div>

          <div className="cycle-panel" aria-label="Pact cycle summary">
            <p className="panel-kicker">30 day cycle</p>
            <div className="cycle-row">
              <span>Platform fee</span>
              <strong>Rs 499</strong>
            </div>
            <div className="cycle-row">
              <span>Early nudge</span>
              <strong>Rs 299</strong>
            </div>
            <div className="cycle-row">
              <span>Proof review</span>
              <strong>Manual</strong>
            </div>
            <div className="cycle-row">
              <span>Refund rail</span>
              <strong>Razorpay</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="pacts">
        <div className="section-heading">
          <p className="stamp">The first wedge</p>
          <h2>Two pacts. Clear proof. A record you cannot casually ignore.</h2>
        </div>
        <div className="pact-grid">
          {proofTypes.map((item) => {
            const Icon = item.icon;
            return (
              <article className="pact-card" key={item.title}>
                <Icon size={34} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="split-band" id="pricing">
        <div>
          <p className="stamp">Business model</p>
          <h2>Charge per commitment cycle.</h2>
        </div>
        <div className="rule-stack" id="rules">
          <div className="rule">
            <BadgeIndianRupee size={24} />
            <p>Users buy each cycle separately. No subscription confusion while the habit loop is still being validated.</p>
          </div>
          <div className="rule">
            <ShieldCheck size={24} />
            <p>Kept days create refund credit. Rejected or missed days forfeit to charity, not Pact Raven revenue.</p>
          </div>
          <div className="rule">
            <HeartHandshake size={24} />
            <p>Start manual-review-first, then automate only the proof checks that repeat cleanly.</p>
          </div>
        </div>
      </section>

      <section className="charity-band" id="charity">
        <div className="section-heading">
          <p className="stamp">Forfeits go here</p>
          <h2>Five known destinations. Pick before the pact starts.</h2>
        </div>
        <div className="charity-strip">
          {charities.map((charity) => (
            <span key={charity}>{charity}</span>
          ))}
        </div>
      </section>

      <footer>
        <strong>PACT RAVEN</strong>
        <span>Built for the first 100 paid users.</span>
      </footer>
    </main>
  );
}

export default App;
