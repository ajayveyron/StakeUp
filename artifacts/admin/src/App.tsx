import { SignOutButton, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  IndianRupee,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const api = anyApi;
type Id<TableName extends string> = string & { readonly __tableName?: TableName };

type ProofLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
};

type AdminUser = {
  id: Id<"users">;
  label: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  displayName?: string;
};

type AdminSession = {
  email?: string;
  displayName?: string;
  imageUrl?: string;
  role: "user" | "admin";
};

type RateMetric = {
  value: number | null;
  numerator: number;
  denominator: number;
};

type AmountMetric = {
  amount: number;
  currency: string;
};

type MetricSummary = {
  usersCreatingPact: RateMetric;
  draftToDepositPaid: RateMetric;
  averageDepositAmount: AmountMetric & { count: number };
  activePacts: number;
  proofSubmissionRate: RateMetric;
  proofApprovalRate: RateMetric;
  pactCompletionRate: RateMetric;
  earlyQuitRate: RateMetric;
  repeatPactRate: RateMetric;
  refundRequestRate: RateMetric;
  depositLiabilityLocked: AmountMetric;
  forfeitedToCharity: AmountMetric;
  pendingPayoutAmount: AmountMetric;
  medianReviewMinutes: number | null;
};

type AdminOverview = {
  metrics: {
    allTime: MetricSummary;
    last30Days: MetricSummary;
  };
  slotPurchases: Array<{
    id: Id<"pactSlotPurchases">;
    amount: number;
    currency: string;
    razorpayOrderId?: string;
    createdAt: string;
    user: AdminUser;
  }>;
  pendingPayments: Array<{
    commitment: {
      id: Id<"commitments">;
      name: string;
      goalType: "content" | "workout";
      startDate: string;
      endDate: string;
      pactAmount: number;
      currency: string;
      createdAt: string;
    };
    user: AdminUser;
  }>;
  todayCheckIns: Array<{
    date: string;
    status: "due" | "under_review" | "approved" | "rejected" | "missed";
    submittedAt?: string;
    checkInId?: Id<"checkIns">;
    proofUrl?: string;
    proofPrompt?: string;
    proofLocation?: ProofLocation;
    submissionStatement?: string;
    stepCount?: number;
    commitment: {
      id: Id<"commitments">;
      name: string;
      goalType: "content" | "workout";
      targetPerDay: number;
      currency: string;
      refundPerDay: number;
    };
    user: AdminUser;
  }>;
  pendingReviews: Array<{
    checkIn: {
      id: Id<"checkIns">;
      date: string;
      proofUrl?: string;
      proofPrompt?: string;
      proofLocation?: ProofLocation;
      submissionStatement?: string;
      stepCount?: number;
      submittedAt: string;
      status: "under_review";
    };
    commitment: {
      id: Id<"commitments">;
      name: string;
      goalType: "content" | "workout";
      targetPerDay: number;
      currency: string;
      refundPerDay: number;
    };
    user: Omit<AdminUser, "label">;
  }>;
  payoutRequests: Array<{
    id: Id<"manualPayoutRequests">;
    amount: number;
    currency: string;
    upiId?: string;
    payeeName?: string;
    createdAt: string;
    note?: string;
    user: AdminUser;
  }>;
  earlyEndSettlements: Array<{
    id: Id<"earlyEndSettlementRequests">;
    reason?: string;
    requestedAt: string;
    commitment: {
      id: Id<"commitments">;
      name: string;
      pactAmount: number;
      currency: string;
    };
    user: AdminUser;
  }>;
  payoutBalances: Array<{
    user: AdminUser;
    currency: string;
    amount: number;
  }>;
  recentLedger: Array<{
    id: Id<"walletLedgerEntries">;
    type:
      | "deposit_confirmed"
      | "approved_refund"
      | "forfeited"
      | "manual_payout"
      | "charity_transfer";
    amount: number;
    currency: string;
    destination: "user" | "charity" | "razorpay";
    externalReference?: string;
    note?: string;
    createdAt: string;
    user: Pick<AdminUser, "id" | "label" | "email">;
    commitment?: {
      id: Id<"commitments">;
      name: string;
    };
  }>;
};

type RangeKey = "allTime" | "last30Days";
type TabKey =
  | "overview"
  | "deposits"
  | "today"
  | "reviews"
  | "refunds"
  | "settlements"
  | "ledger";

type AppProps = {
  userButton: ReactNode;
};

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "deposits", label: "Deposits" },
  { key: "today", label: "Today" },
  { key: "reviews", label: "Reviews" },
  { key: "refunds", label: "Refunds" },
  { key: "settlements", label: "Settle" },
  { key: "ledger", label: "Ledger" },
];

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatDate(date?: string) {
  if (!date) return "None";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "None";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPercent(metric: RateMetric) {
  if (metric.value === null) return "N/A";
  return `${Math.round(metric.value * 100)}%`;
}

function ratioLabel(metric: RateMetric) {
  return `${metric.numerator}/${metric.denominator}`;
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "N/A";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function ageLabel(value?: string) {
  if (!value) return "N/A";
  const minutes = Math.max(0, (Date.now() - new Date(value).getTime()) / 60000);
  return formatDuration(minutes);
}

function userLabel(user: Partial<AdminUser>) {
  return user.displayName ?? user.email ?? user.phone ?? user.whatsappNumber ?? "Unknown user";
}

function userContact(user: Partial<AdminUser>) {
  return user.whatsappNumber ?? user.phone ?? user.email ?? "No contact";
}

function ledgerLabel(type: AdminOverview["recentLedger"][number]["type"]) {
  switch (type) {
    case "deposit_confirmed":
      return "Deposit";
    case "approved_refund":
      return "Refund credit";
    case "forfeited":
      return "Forfeited";
    case "manual_payout":
      return "Payout";
    case "charity_transfer":
      return "Charity transfer";
  }
}

function statusLabel(status: string) {
  if (status === "under_review") return "Under review";
  return status.replace(/_/g, " ");
}

function proofDetails(args: {
  goalType: "content" | "workout";
  proofUrl?: string;
  proofPrompt?: string;
  proofLocation?: ProofLocation;
  submissionStatement?: string;
  stepCount?: number;
}) {
  const details: string[] = [];
  if (args.proofPrompt) details.push(`prompt: ${args.proofPrompt}`);
  if (args.submissionStatement) details.push(`signed: ${args.submissionStatement}`);
  if (args.proofLocation && args.goalType === "workout") {
    const accuracy =
      typeof args.proofLocation.accuracy === "number"
        ? ` +/-${Math.round(args.proofLocation.accuracy)}m`
        : "";
    details.push(
      `location: ${args.proofLocation.latitude.toFixed(5)}, ${args.proofLocation.longitude.toFixed(5)}${accuracy}`,
    );
  }
  if (args.stepCount !== undefined) {
    details.push(`${args.stepCount.toLocaleString("en-IN")} legacy steps`);
  }
  return details;
}

function isImageUrl(value?: string) {
  if (!value) return false;
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value) || value.includes("convex.cloud");
}

function SessionActions() {
  return (
    <div className="auth-actions">
      <button className="secondary-button" onClick={() => window.location.reload()} type="button">
        Retry
      </button>
      <SignOutButton>
        <button className="primary-button" type="button">
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}

function LoadingScreen({
  label,
  showSessionActions = false,
  userButton,
}: {
  label: string;
  showSessionActions?: boolean;
  userButton?: ReactNode;
}) {
  return (
    <main className="setup-screen">
      <section className="setup-panel compact">
        {userButton ? <div className="top-user">{userButton}</div> : null}
        <Loader2 className="spin" size={24} />
        <p>{label}</p>
        {showSessionActions ? <SessionActions /> : null}
      </section>
    </main>
  );
}

function AccessBlocked({ userButton }: AppProps) {
  return (
    <main className="setup-screen">
      <section className="setup-panel compact">
        <div className="top-user">{userButton}</div>
        <LockKeyhole size={26} />
        <p className="eyebrow">Pact Raven Admin</p>
        <h1>Admin access required</h1>
        <p>The signed-in account is not listed in Convex ADMIN_EMAILS.</p>
      </section>
    </main>
  );
}

function AuthIssue({
  detail,
  userButton,
}: AppProps & {
  detail: string;
}) {
  return (
    <main className="setup-screen">
      <section className="setup-panel compact">
        <div className="top-user">{userButton}</div>
        <AlertTriangle size={26} />
        <p className="eyebrow">Pact Raven Admin</p>
        <h1>Session did not finish</h1>
        <p>{detail}</p>
        <SessionActions />
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  meta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meta?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {meta ? <span>{meta}</span> : null}
    </article>
  );
}

function QueueCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "neutral" | "warn" | "bad";
}) {
  return (
    <article className={`queue-card ${tone}`}>
      <div className="queue-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "text";
  type?: "date" | "text";
}) {
  return (
    <label>
      {label}
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function ProofBlock({
  goalType,
  proofUrl,
  proofPrompt,
  proofLocation,
  submissionStatement,
  stepCount,
}: {
  goalType: "content" | "workout";
  proofUrl?: string;
  proofPrompt?: string;
  proofLocation?: ProofLocation;
  submissionStatement?: string;
  stepCount?: number;
}) {
  const details = proofDetails({
    goalType,
    proofUrl,
    proofPrompt,
    proofLocation,
    submissionStatement,
    stepCount,
  });

  return (
    <div className="proof-block">
      {proofUrl ? (
        isImageUrl(proofUrl) ? (
          <a href={proofUrl} rel="noreferrer" target="_blank">
            <img alt="Submitted proof" src={proofUrl} />
          </a>
        ) : (
          <a href={proofUrl} rel="noreferrer" target="_blank">
            {proofUrl}
          </a>
        )
      ) : (
        <span>{goalType === "workout" ? "Waiting for camera proof" : "Waiting for post link"}</span>
      )}
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function App({ userButton }: AppProps) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useClerkAuth();
  const confirmPayment = useMutation(api.reviews.confirmPayment);
  const recordManualPayout = useMutation(api.reviews.recordManualPayout);
  const resolveEarlyEndSettlement = useMutation(api.reviews.resolveEarlyEndSettlement);
  const approve = useMutation(api.reviews.approve);
  const reject = useMutation(api.reviews.reject);

  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<RangeKey>("allTime");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [payoutNotes, setPayoutNotes] = useState<Record<string, string>>({});
  const [settlementRefunds, setSettlementRefunds] = useState<Record<string, string>>({});
  const [settlementForfeits, setSettlementForfeits] = useState<Record<string, string>>({});
  const [authWaitExpired, setAuthWaitExpired] = useState(false);
  const [profileWaitExpired, setProfileWaitExpired] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setAuthWaitExpired(false);
      return;
    }

    const id = window.setTimeout(() => setAuthWaitExpired(true), 9000);
    return () => window.clearTimeout(id);
  }, [authLoading]);

  const adminSession = useQuery(
    api.users.adminSession,
    isAuthenticated ? {} : "skip",
  ) as AdminSession | undefined;
  const loadingAdminSession = isAuthenticated && adminSession === undefined;

  useEffect(() => {
    if (!loadingAdminSession) {
      setProfileWaitExpired(false);
      return;
    }

    const id = window.setTimeout(() => setProfileWaitExpired(true), 9000);
    return () => window.clearTimeout(id);
  }, [loadingAdminSession]);

  const overview = useQuery(
    api.reviews.adminOverview,
    adminSession?.role === "admin" ? {} : "skip",
  ) as AdminOverview | undefined;

  const oldestPendingProofAge = useMemo(() => {
    if (!overview || overview.pendingReviews.length === 0) return "N/A";
    const oldest = [...overview.pendingReviews].sort((a, b) =>
      a.checkIn.submittedAt.localeCompare(b.checkIn.submittedAt),
    )[0];
    return ageLabel(oldest.checkIn.submittedAt);
  }, [overview]);

  if (authLoading && !authWaitExpired) {
    return (
      <LoadingScreen
        label="Preparing admin session"
        showSessionActions
        userButton={userButton}
      />
    );
  }

  if (authLoading) {
    return (
      <AuthIssue
        detail="Clerk is signed in, but Convex has not confirmed the session token yet."
        userButton={userButton}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthIssue
        detail={
          clerkLoaded && clerkSignedIn
            ? "Clerk is signed in, but Convex did not accept this session token."
            : "The admin session is no longer signed in."
        }
        userButton={userButton}
      />
    );
  }

  if (loadingAdminSession) {
    if (profileWaitExpired) {
      return (
        <AuthIssue
          detail="Convex accepted the session, but the admin session query did not finish."
          userButton={userButton}
        />
      );
    }

    return (
      <LoadingScreen
        label="Preparing admin profile"
        showSessionActions
        userButton={userButton}
      />
    );
  }

  if (adminSession?.role !== "admin") return <AccessBlocked userButton={userButton} />;
  if (!overview) {
    return <LoadingScreen label="Loading dashboard" showSessionActions userButton={userButton} />;
  }

  const metrics = overview.metrics[range];
  const tabCounts: Record<TabKey, number> = {
    overview: 0,
    deposits: overview.pendingPayments.length + overview.slotPurchases.length,
    today: overview.todayCheckIns.length,
    reviews: overview.pendingReviews.length,
    refunds: overview.payoutRequests.length + overview.payoutBalances.length,
    settlements: overview.earlyEndSettlements.length,
    ledger: overview.recentLedger.length,
  };

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setNotice(null);
    try {
      await action();
      setNotice("Saved");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmPayment(commitmentId: Id<"commitments">) {
    await runAction(`deposit:${commitmentId}`, () =>
      confirmPayment({
        commitmentId,
        reference: references[commitmentId]?.trim() || undefined,
        note: notes[commitmentId]?.trim() || undefined,
      }),
    );
    setReferences((current) => ({ ...current, [commitmentId]: "" }));
    setNotes((current) => ({ ...current, [commitmentId]: "" }));
  }

  async function handleApprove(checkInId: Id<"checkIns">) {
    await runAction(`approve:${checkInId}`, () => approve({ checkInId }));
  }

  async function handleReject(checkInId: Id<"checkIns">) {
    const reason = reasons[checkInId]?.trim();
    if (!reason) {
      setNotice("Add a rejection reason first");
      return;
    }
    await runAction(`reject:${checkInId}`, () => reject({ checkInId, reason }));
    setReasons((current) => ({ ...current, [checkInId]: "" }));
  }

  async function handlePayout(args: {
    userId: Id<"users">;
    amount: number;
    currency: string;
    requestId?: Id<"manualPayoutRequests">;
  }) {
    const key = args.requestId ?? `${args.userId}:${args.currency}`;
    await runAction(`payout:${key}`, () =>
      recordManualPayout({
        userId: args.userId,
        amount: args.amount,
        currency: args.currency,
        requestId: args.requestId,
        reference: payoutRefs[key]?.trim() || undefined,
        note: payoutNotes[key]?.trim() || undefined,
      }),
    );
    setPayoutRefs((current) => ({ ...current, [key]: "" }));
    setPayoutNotes((current) => ({ ...current, [key]: "" }));
  }

  async function handleSettlement(requestId: Id<"earlyEndSettlementRequests">) {
    await runAction(`settlement:${requestId}`, () =>
      resolveEarlyEndSettlement({
        requestId,
        refundAmount: Number(settlementRefunds[requestId] || 0),
        forfeitAmount: Number(settlementForfeits[requestId] || 0),
        reference: references[requestId]?.trim() || undefined,
        note: notes[requestId]?.trim() || undefined,
      }),
    );
    setSettlementRefunds((current) => ({ ...current, [requestId]: "" }));
    setSettlementForfeits((current) => ({ ...current, [requestId]: "" }));
    setReferences((current) => ({ ...current, [requestId]: "" }));
    setNotes((current) => ({ ...current, [requestId]: "" }));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Pact Raven Admin</p>
          <h1>Ops</h1>
        </div>
        <div className="header-actions">
          {notice ? <span className="notice">{notice}</span> : null}
          {userButton}
        </div>
      </header>

      <section className="control-row" aria-label="Dashboard controls">
        <div className="range-switch" role="tablist" aria-label="Metric range">
          <button className={range === "allTime" ? "selected" : ""} onClick={() => setRange("allTime")} type="button">
            All-time
          </button>
          <button className={range === "last30Days" ? "selected" : ""} onClick={() => setRange("last30Days")} type="button">
            30d
          </button>
        </div>
        <nav className="tab-row" aria-label="Admin sections">
          {TABS.map((item) => (
            <button
              className={tab === item.key ? "selected" : ""}
              key={item.key}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
              {tabCounts[item.key] > 0 ? <span>{tabCounts[item.key]}</span> : null}
            </button>
          ))}
        </nav>
      </section>

      {tab === "overview" ? (
        <section className="stack">
          <div className="metrics-grid">
            <MetricCard label="Users creating pact" value={formatPercent(metrics.usersCreatingPact)} meta={ratioLabel(metrics.usersCreatingPact)} />
            <MetricCard label="Draft to deposit paid" value={formatPercent(metrics.draftToDepositPaid)} meta={ratioLabel(metrics.draftToDepositPaid)} />
            <MetricCard label="Avg deposit amount" value={formatCurrency(metrics.averageDepositAmount.amount, metrics.averageDepositAmount.currency)} meta={`${metrics.averageDepositAmount.count} deposits`} />
            <MetricCard label="Active pacts" value={String(metrics.activePacts)} meta="live now" />
            <MetricCard label="Proof submission rate" value={formatPercent(metrics.proofSubmissionRate)} meta={ratioLabel(metrics.proofSubmissionRate)} />
            <MetricCard label="Proof approval rate" value={formatPercent(metrics.proofApprovalRate)} meta={ratioLabel(metrics.proofApprovalRate)} />
            <MetricCard label="Pact completion rate" value={formatPercent(metrics.pactCompletionRate)} meta={ratioLabel(metrics.pactCompletionRate)} />
            <MetricCard label="Early quit rate" value={formatPercent(metrics.earlyQuitRate)} meta={ratioLabel(metrics.earlyQuitRate)} tone={metrics.earlyQuitRate.value && metrics.earlyQuitRate.value > 0 ? "warn" : "neutral"} />
            <MetricCard label="Repeat pact rate" value={formatPercent(metrics.repeatPactRate)} meta={ratioLabel(metrics.repeatPactRate)} />
            <MetricCard label="Refund request rate" value={formatPercent(metrics.refundRequestRate)} meta={ratioLabel(metrics.refundRequestRate)} />
            <MetricCard label="Deposit liability locked" value={formatCurrency(metrics.depositLiabilityLocked.amount, metrics.depositLiabilityLocked.currency)} />
            <MetricCard label="Forfeited to charity" value={formatCurrency(metrics.forfeitedToCharity.amount, metrics.forfeitedToCharity.currency)} />
            <MetricCard label="Pending payout amount" value={formatCurrency(metrics.pendingPayoutAmount.amount, metrics.pendingPayoutAmount.currency)} tone={metrics.pendingPayoutAmount.amount > 0 ? "warn" : "neutral"} />
            <MetricCard label="Median review time" value={formatDuration(metrics.medianReviewMinutes)} />
          </div>

          <div className="queue-grid">
            <QueueCard icon={<CreditCard size={18} />} label="Pending deposits" value={String(overview.pendingPayments.length)} tone={overview.pendingPayments.length > 0 ? "warn" : "neutral"} />
            <QueueCard icon={<ShieldCheck size={18} />} label="Pending proof reviews" value={String(overview.pendingReviews.length)} tone={overview.pendingReviews.length > 0 ? "warn" : "neutral"} />
            <QueueCard icon={<Clock3 size={18} />} label="Oldest pending proof" value={oldestPendingProofAge} tone={oldestPendingProofAge === "N/A" ? "neutral" : "bad"} />
            <QueueCard icon={<WalletCards size={18} />} label="Pending payouts" value={String(overview.payoutRequests.length + overview.payoutBalances.length)} tone={overview.payoutRequests.length + overview.payoutBalances.length > 0 ? "warn" : "neutral"} />
            <QueueCard icon={<AlertTriangle size={18} />} label="Early-end settlements" value={String(overview.earlyEndSettlements.length)} tone={overview.earlyEndSettlements.length > 0 ? "warn" : "neutral"} />
          </div>
        </section>
      ) : null}

      {tab === "deposits" ? (
        <section className="stack">
          {overview.slotPurchases.length === 0 && overview.pendingPayments.length === 0 ? (
            <EmptyState icon={<CreditCard size={26} />} title="No pending deposits" body="Pending slot payments and pact deposits will appear here." />
          ) : null}
          {overview.slotPurchases.map((row) => (
            <article className="ops-card" key={row.id}>
              <CardHeader icon={<CreditCard size={18} />} title={row.user.label} meta={row.razorpayOrderId ?? formatDateTime(row.createdAt)} amount={formatCurrency(row.amount, row.currency)} />
              <p>Pending Pact Pass payment. Inspect the Razorpay order if payment verification did not return.</p>
            </article>
          ))}
          {overview.pendingPayments.map((row) => {
            const id = row.commitment.id;
            return (
              <article className="ops-card" key={id}>
                <CardHeader icon={<IndianRupee size={18} />} title={row.commitment.name} meta={`${row.user.label} - ${formatDate(row.commitment.startDate)}`} amount={formatCurrency(row.commitment.pactAmount, row.commitment.currency)} />
                <div className="form-grid">
                  <TextField label="Payment reference" onChange={(value) => setReferences((current) => ({ ...current, [id]: value }))} placeholder="Razorpay/UPI id" value={references[id] ?? ""} />
                  <TextField label="Internal note" onChange={(value) => setNotes((current) => ({ ...current, [id]: value }))} placeholder="Optional" value={notes[id] ?? ""} />
                  <button className="primary-button" disabled={busyId === `deposit:${id}`} onClick={() => handleConfirmPayment(id)} type="button">
                    <Check size={15} />
                    Confirm deposit
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "today" ? (
        <section className="stack">
          {overview.todayCheckIns.length === 0 ? (
            <EmptyState icon={<CalendarClock size={26} />} title="No proof due today" body="Scheduled proof days for active pacts will appear here." />
          ) : (
            overview.todayCheckIns.map((row) => (
              <article className={`ops-card status-${row.status}`} key={`${row.commitment.id}:${row.date}`}>
                <CardHeader icon={<CalendarClock size={18} />} title={row.commitment.name} meta={`${row.user.label} - ${formatDate(row.date)}`} amount={statusLabel(row.status)} />
                <ProofBlock goalType={row.commitment.goalType} proofLocation={row.proofLocation} proofPrompt={row.proofPrompt} proofUrl={row.proofUrl} stepCount={row.stepCount} submissionStatement={row.submissionStatement} />
              </article>
            ))
          )}
        </section>
      ) : null}

      {tab === "reviews" ? (
        <section className="stack">
          {overview.pendingReviews.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={26} />} title="No proof waiting" body="Submitted proof appears here before it is approved or rejected." />
          ) : (
            overview.pendingReviews.map((row) => {
              const id = row.checkIn.id;
              return (
                <article className="ops-card review-card" key={id}>
                  <CardHeader icon={<ShieldCheck size={18} />} title={row.commitment.name} meta={`${userLabel(row.user)} - ${formatDate(row.checkIn.date)}`} amount={formatCurrency(row.commitment.refundPerDay, row.commitment.currency)} />
                  <p>{userContact(row.user)} - submitted {formatDateTime(row.checkIn.submittedAt)}</p>
                  <ProofBlock goalType={row.commitment.goalType} proofLocation={row.checkIn.proofLocation} proofPrompt={row.checkIn.proofPrompt} proofUrl={row.checkIn.proofUrl} stepCount={row.checkIn.stepCount} submissionStatement={row.checkIn.submissionStatement} />
                  <div className="form-grid review-actions">
                    <TextField label="Rejection reason" onChange={(value) => setReasons((current) => ({ ...current, [id]: value }))} placeholder="Required if rejecting" value={reasons[id] ?? ""} />
                    <button className="success-button" disabled={busyId === `approve:${id}`} onClick={() => handleApprove(id)} type="button">
                      <Check size={15} />
                      Approve
                    </button>
                    <button className="danger-button" disabled={busyId === `reject:${id}`} onClick={() => handleReject(id)} type="button">
                      <X size={15} />
                      Reject
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "refunds" ? (
        <section className="stack">
          {overview.payoutRequests.length === 0 && overview.payoutBalances.length === 0 ? (
            <EmptyState icon={<WalletCards size={26} />} title="No refund payouts pending" body="Approved refund credit and user payout requests appear here." />
          ) : null}
          {overview.payoutRequests.map((row) => {
            const key = row.id;
            return (
              <article className="ops-card" key={row.id}>
                <CardHeader icon={<WalletCards size={18} />} title={`${row.user.label} requested payout`} meta={`${row.payeeName ?? "UPI"} - ${row.upiId ?? "No UPI"}`} amount={formatCurrency(row.amount, row.currency)} />
                <div className="form-grid">
                  <TextField label="Payout reference" onChange={(value) => setPayoutRefs((current) => ({ ...current, [key]: value }))} placeholder="UPI transaction id" value={payoutRefs[key] ?? ""} />
                  <TextField label="Payout note" onChange={(value) => setPayoutNotes((current) => ({ ...current, [key]: value }))} placeholder="Optional" value={payoutNotes[key] ?? ""} />
                  <button className="primary-button" disabled={busyId === `payout:${key}`} onClick={() => handlePayout({ userId: row.user.id, amount: row.amount, currency: row.currency, requestId: row.id })} type="button">
                    <Check size={15} />
                    Record payout
                  </button>
                </div>
              </article>
            );
          })}
          {overview.payoutBalances.map((row) => {
            const key = `${row.user.id}:${row.currency}`;
            return (
              <article className="ops-card" key={key}>
                <CardHeader icon={<WalletCards size={18} />} title={row.user.label} meta="Approved refund credit without request" amount={formatCurrency(row.amount, row.currency)} />
                <div className="form-grid">
                  <TextField label="Payout reference" onChange={(value) => setPayoutRefs((current) => ({ ...current, [key]: value }))} placeholder="UPI transaction id" value={payoutRefs[key] ?? ""} />
                  <TextField label="Payout note" onChange={(value) => setPayoutNotes((current) => ({ ...current, [key]: value }))} placeholder="Optional" value={payoutNotes[key] ?? ""} />
                  <button className="secondary-button" disabled={busyId === `payout:${key}`} onClick={() => handlePayout({ userId: row.user.id, amount: row.amount, currency: row.currency })} type="button">
                    <Check size={15} />
                    Record payout
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "settlements" ? (
        <section className="stack">
          {overview.earlyEndSettlements.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={26} />} title="No early-end settlements" body="Pacts ended early will wait here until refund and forfeit amounts are recorded." />
          ) : (
            overview.earlyEndSettlements.map((row) => {
              const id = row.id;
              return (
                <article className="ops-card" key={id}>
                  <CardHeader icon={<AlertTriangle size={18} />} title={row.commitment.name} meta={`${row.user.label} - ${formatDateTime(row.requestedAt)}`} amount={formatCurrency(row.commitment.pactAmount, row.commitment.currency)} />
                  {row.reason ? <p>{row.reason}</p> : null}
                  <div className="form-grid settlement-grid">
                    <TextField inputMode="decimal" label="Refund amount" onChange={(value) => setSettlementRefunds((current) => ({ ...current, [id]: value }))} value={settlementRefunds[id] ?? ""} />
                    <TextField inputMode="decimal" label="Forfeit amount" onChange={(value) => setSettlementForfeits((current) => ({ ...current, [id]: value }))} value={settlementForfeits[id] ?? ""} />
                    <TextField label="Reference" onChange={(value) => setReferences((current) => ({ ...current, [id]: value }))} placeholder="Optional" value={references[id] ?? ""} />
                    <TextField label="Note" onChange={(value) => setNotes((current) => ({ ...current, [id]: value }))} placeholder="Optional" value={notes[id] ?? ""} />
                    <button className="primary-button" disabled={busyId === `settlement:${id}`} onClick={() => handleSettlement(id)} type="button">
                      <Check size={15} />
                      Resolve
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "ledger" ? (
        <section className="ledger-list">
          {overview.recentLedger.map((entry) => (
            <article className={`ledger-row ${entry.type}`} key={entry.id}>
              <div>
                <strong>{ledgerLabel(entry.type)}</strong>
                <span>
                  {entry.user.label}
                  {entry.commitment ? ` - ${entry.commitment.name}` : ""}
                </span>
                {entry.note ? <small>{entry.note}</small> : null}
              </div>
              <div>
                <strong>{formatCurrency(entry.amount, entry.currency)}</strong>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function CardHeader({
  icon,
  title,
  meta,
  amount,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  amount: string;
}) {
  return (
    <div className="card-header">
      <div className="card-title-row">
        <div className="card-icon">{icon}</div>
        <div>
          <h2>{title}</h2>
          <span>{meta}</span>
        </div>
      </div>
      <strong>{amount}</strong>
    </div>
  );
}
