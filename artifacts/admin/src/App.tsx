import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  Check,
  CircleDollarSign,
  Database,
  IndianRupee,
  Loader2,
  Plus,
  RefreshCw,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type BetaOverview = {
  today: string;
  isSeeded: boolean;
  totals: {
    paidReceived: number;
    refundEarned: number;
    refundPaid: number;
    pendingRefund: number;
    forfeited: number;
    remainingPotentialRefund: number;
    remainingSubmissions: number;
    approvedSubmissions: number;
    missedSubmissions: number;
    pendingSubmissions: number;
    activeUsers: number;
    activeCommitments: number;
  };
  commitments: CommitmentRow[];
  upcoming: Array<{
    commitmentId: Id<"betaCommitments">;
    date: string;
    title: string;
    amountPerSubmission: number;
    currency: string;
    user: {
      id: Id<"betaUsers">;
      name: string;
    };
  }>;
  recentLedger: LedgerRow[];
};

type CommitmentRow = {
  id: Id<"betaCommitments">;
  slug: string;
  title: string;
  category: "fasting" | "exercise" | "content" | "custom";
  status: "active" | "paused" | "completed" | "deleted";
  frequencyLabel: string;
  frequencyPerWeek: number;
  daysOfWeek: number[];
  plannedSubmissions: number;
  scheduledSubmissions: number;
  amountPerSubmission: number;
  totalAmount: number;
  currency: string;
  cycleStartDate: string;
  cycleEndDate: string;
  nextDueDate?: string;
  remainingSubmissions: number;
  remainingPotentialRefund: number;
  notes?: string;
  user: {
    id: Id<"betaUsers">;
    name: string;
    slug?: string;
    email?: string;
    phone?: string;
  };
  counts: {
    submitted: number;
    approved: number;
    missed: number;
    skipped: number;
  };
  totals: {
    paidReceived: number;
    refundEarned: number;
    refundPaid: number;
    forfeited: number;
    adjustments: number;
    pendingRefund: number;
  };
  recentSubmissions: Array<{
    id: Id<"betaSubmissions">;
    date: string;
    status: "submitted" | "approved" | "missed" | "skipped";
    proofUrl?: string;
    note?: string;
  }>;
};

type LedgerRow = {
  id: Id<"betaLedgerEntries">;
  type:
    | "payment_received"
    | "refund_earned"
    | "refund_paid"
    | "forfeited"
    | "adjustment";
  amount: number;
  currency: string;
  occurredAt?: string;
  createdAt: string;
  externalReference?: string;
  note?: string;
  user: {
    id: Id<"betaUsers">;
    name: string;
  };
  commitment?: {
    id: Id<"betaCommitments">;
    title: string;
  };
};

type RowForm = {
  submissionDate: string;
  submissionNote: string;
  proofUrl: string;
  paymentAmount: string;
  paymentDate: string;
  paymentReference: string;
  paymentNote: string;
  refundAmount: string;
  refundDate: string;
  refundReference: string;
  refundNote: string;
};

type AppProps = {
  userButton: ReactNode;
};

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

function ledgerLabel(type: LedgerRow["type"]) {
  switch (type) {
    case "payment_received":
      return "Payment received";
    case "refund_earned":
      return "Refund earned";
    case "refund_paid":
      return "Refund paid";
    case "forfeited":
      return "Forfeited";
    case "adjustment":
      return "Adjustment";
  }
}

function defaultForm(row: CommitmentRow, today: string): RowForm {
  const refundAmount =
    row.totals.pendingRefund > 0
      ? String(row.totals.pendingRefund)
      : String(row.amountPerSubmission);

  return {
    submissionDate: row.nextDueDate ?? today,
    submissionNote: "",
    proofUrl: "",
    paymentAmount: String(row.totalAmount),
    paymentDate: today,
    paymentReference: "",
    paymentNote: "",
    refundAmount,
    refundDate: today,
    refundReference: "",
    refundNote: "",
  };
}

function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="setup-screen">
      <section className="setup-panel compact">
        <Loader2 className="spin" size={24} />
        <p>{label}</p>
      </section>
    </main>
  );
}

function AccessBlocked({ userButton }: AppProps) {
  return (
    <main className="setup-screen">
      <section className="setup-panel compact">
        <div className="top-user">{userButton}</div>
        <p className="eyebrow">Pact Raven Admin</p>
        <h1>Admin access required</h1>
        <p>The signed-in account is not in Convex `ADMIN_EMAILS`.</p>
      </section>
    </main>
  );
}

export function App({ userButton }: AppProps) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const seedInitialBetaCohort = useMutation(api.betaOps.seedInitialBetaCohort);
  const recordSubmission = useMutation(api.betaOps.recordSubmission);
  const recordPaymentReceived = useMutation(api.betaOps.recordPaymentReceived);
  const recordRefundPaid = useMutation(api.betaOps.recordRefundPaid);

  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, RowForm>>({});

  useEffect(() => {
    if (!isAuthenticated || profileStatus !== "idle") return;

    let cancelled = false;
    setProfileStatus("loading");
    upsertCurrentUser()
      .then(() => {
        if (!cancelled) setProfileStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setProfileStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profileStatus, upsertCurrentUser]);

  const currentUser = useQuery(
    api.users.current,
    profileStatus === "ready" ? {} : "skip",
  );
  const overview = useQuery(
    api.betaOps.overview,
    currentUser?.role === "admin" ? {} : "skip",
  ) as BetaOverview | undefined;

  if (authLoading || profileStatus === "idle" || profileStatus === "loading") {
    return <LoadingScreen label="Preparing admin session" />;
  }

  if (profileStatus === "error") {
    return <LoadingScreen label="Could not prepare admin profile" />;
  }

  if (currentUser === undefined)
    return <LoadingScreen label="Loading profile" />;
  if (currentUser.role !== "admin")
    return <AccessBlocked userButton={userButton} />;
  if (!overview) return <LoadingScreen label="Loading dashboard" />;
  const loadedOverview = overview;

  function rowForm(row: CommitmentRow) {
    return forms[row.id] ?? defaultForm(row, loadedOverview.today);
  }

  function updateForm(row: CommitmentRow, patch: Partial<RowForm>) {
    setForms((current) => ({
      ...current,
      [row.id]: {
        ...rowForm(row),
        ...patch,
      },
    }));
  }

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

  async function seedCohort() {
    await runAction("seed", () => seedInitialBetaCohort({}));
  }

  async function submit(row: CommitmentRow, status: "approved" | "missed") {
    const form = rowForm(row);
    await runAction(`${row.id}:${status}`, () =>
      recordSubmission({
        commitmentId: row.id,
        date: form.submissionDate,
        status,
        proofUrl: form.proofUrl.trim() || undefined,
        note: form.submissionNote.trim() || undefined,
      }),
    );
  }

  async function payment(row: CommitmentRow) {
    const form = rowForm(row);
    await runAction(`${row.id}:payment`, () =>
      recordPaymentReceived({
        commitmentId: row.id,
        amount: Number(form.paymentAmount),
        occurredAt: form.paymentDate,
        externalReference: form.paymentReference.trim() || undefined,
        note: form.paymentNote.trim() || undefined,
      }),
    );
  }

  async function refund(row: CommitmentRow) {
    const form = rowForm(row);
    await runAction(`${row.id}:refund`, () =>
      recordRefundPaid({
        commitmentId: row.id,
        amount: Number(form.refundAmount),
        occurredAt: form.refundDate,
        externalReference: form.refundReference.trim() || undefined,
        note: form.refundNote.trim() || undefined,
      }),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Pact Raven Admin</p>
          <h1>Beta Ops</h1>
        </div>
        <div className="header-actions">
          {notice ? <span className="notice">{notice}</span> : null}
          {userButton}
        </div>
      </header>

      {!loadedOverview.isSeeded ? (
        <section className="empty-state">
          <Database size={30} />
          <h2>Seed beta cohort</h2>
          <button
            className="primary-button"
            disabled={busyId === "seed"}
            onClick={seedCohort}
            type="button"
          >
            {busyId === "seed" ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            Seed 3 users
          </button>
        </section>
      ) : (
        <>
          <section className="stats-grid" aria-label="Beta totals">
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Paid received"
              value={formatCurrency(loadedOverview.totals.paidReceived)}
              tone="good"
            />
            <StatCard
              icon={<WalletCards size={20} />}
              label="Refund paid"
              value={formatCurrency(loadedOverview.totals.refundPaid)}
            />
            <StatCard
              icon={<CircleDollarSign size={20} />}
              label="Pending refund"
              value={formatCurrency(loadedOverview.totals.pendingRefund)}
              tone={
                loadedOverview.totals.pendingRefund > 0 ? "warn" : "neutral"
              }
            />
            <StatCard
              icon={<CalendarClock size={20} />}
              label="Remaining submissions"
              value={String(loadedOverview.totals.remainingSubmissions)}
            />
          </section>

          <section className="dashboard-grid">
            <div className="panel wide">
              <div className="panel-heading">
                <div>
                  <h2>Commitments</h2>
                  <p>
                    {loadedOverview.totals.activeUsers} users,{" "}
                    {loadedOverview.totals.activeCommitments} commitments
                  </p>
                </div>
                <button
                  className="secondary-button"
                  disabled={busyId === "seed"}
                  onClick={seedCohort}
                  title="Sync initial beta records"
                  type="button"
                >
                  <RefreshCw size={15} />
                  Sync seed
                </button>
              </div>
              <div className="commitment-list">
                {loadedOverview.commitments.map((row) => {
                  const form = rowForm(row);
                  return (
                    <article className="commitment-row" key={row.id}>
                      <div className="row-main">
                        <div className="avatar">
                          <UserRound size={18} />
                        </div>
                        <div>
                          <h3>
                            {row.user.name} · {row.title}
                          </h3>
                          <p>
                            {row.frequencyLabel} ·{" "}
                            {formatCurrency(row.amountPerSubmission)} each ·{" "}
                            {formatDate(row.nextDueDate)}
                          </p>
                        </div>
                      </div>

                      <div className="money-grid">
                        <span>
                          Paid
                          <strong>
                            {formatCurrency(row.totals.paidReceived)}
                          </strong>
                        </span>
                        <span>
                          Earned
                          <strong>
                            {formatCurrency(row.totals.refundEarned)}
                          </strong>
                        </span>
                        <span>
                          Refunded
                          <strong>
                            {formatCurrency(row.totals.refundPaid)}
                          </strong>
                        </span>
                        <span>
                          Pending
                          <strong>
                            {formatCurrency(row.totals.pendingRefund)}
                          </strong>
                        </span>
                        <span>
                          Left
                          <strong>{row.remainingSubmissions}</strong>
                        </span>
                      </div>

                      <div className="action-grid">
                        <label>
                          Submission date
                          <input
                            type="date"
                            value={form.submissionDate}
                            onChange={(event) =>
                              updateForm(row, {
                                submissionDate: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Proof URL
                          <input
                            value={form.proofUrl}
                            onChange={(event) =>
                              updateForm(row, { proofUrl: event.target.value })
                            }
                            placeholder="https://..."
                          />
                        </label>
                        <label>
                          Submission note
                          <input
                            value={form.submissionNote}
                            onChange={(event) =>
                              updateForm(row, {
                                submissionNote: event.target.value,
                              })
                            }
                            placeholder="Optional"
                          />
                        </label>
                        <div className="button-row">
                          <button
                            className="success-button"
                            disabled={busyId === `${row.id}:approved`}
                            onClick={() => submit(row, "approved")}
                            type="button"
                          >
                            <Check size={15} />
                            Approved
                          </button>
                          <button
                            className="danger-button"
                            disabled={busyId === `${row.id}:missed`}
                            onClick={() => submit(row, "missed")}
                            type="button"
                          >
                            <X size={15} />
                            Missed
                          </button>
                        </div>
                      </div>

                      <div className="action-grid compact-actions">
                        <label>
                          Payment
                          <input
                            inputMode="decimal"
                            value={form.paymentAmount}
                            onChange={(event) =>
                              updateForm(row, {
                                paymentAmount: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Payment date
                          <input
                            type="date"
                            value={form.paymentDate}
                            onChange={(event) =>
                              updateForm(row, {
                                paymentDate: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Payment ref
                          <input
                            value={form.paymentReference}
                            onChange={(event) =>
                              updateForm(row, {
                                paymentReference: event.target.value,
                              })
                            }
                            placeholder="UPI/ref"
                          />
                        </label>
                        <button
                          className="secondary-button action-button"
                          disabled={busyId === `${row.id}:payment`}
                          onClick={() => payment(row)}
                          type="button"
                        >
                          <IndianRupee size={15} />
                          Log payment
                        </button>
                      </div>

                      <div className="action-grid compact-actions">
                        <label>
                          Refund
                          <input
                            inputMode="decimal"
                            value={form.refundAmount}
                            onChange={(event) =>
                              updateForm(row, {
                                refundAmount: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Refund date
                          <input
                            type="date"
                            value={form.refundDate}
                            onChange={(event) =>
                              updateForm(row, {
                                refundDate: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Refund ref
                          <input
                            value={form.refundReference}
                            onChange={(event) =>
                              updateForm(row, {
                                refundReference: event.target.value,
                              })
                            }
                            placeholder="UPI/ref"
                          />
                        </label>
                        <button
                          className="secondary-button action-button"
                          disabled={busyId === `${row.id}:refund`}
                          onClick={() => refund(row)}
                          type="button"
                        >
                          <WalletCards size={15} />
                          Log refund
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="side-column">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Next Due</h2>
                </div>
                <div className="mini-list">
                  {loadedOverview.upcoming.slice(0, 8).map((item) => (
                    <div
                      className="mini-row"
                      key={`${item.commitmentId}:${item.date}`}
                    >
                      <span>{formatDate(item.date)}</span>
                      <strong>
                        {item.user.name} · {item.title}
                      </strong>
                      <small>
                        {formatCurrency(
                          item.amountPerSubmission,
                          item.currency,
                        )}
                      </small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <h2>Ledger</h2>
                </div>
                <div className="ledger-list">
                  {loadedOverview.recentLedger.slice(0, 12).map((entry) => (
                    <div className={`ledger-row ${entry.type}`} key={entry.id}>
                      <div>
                        <strong>{ledgerLabel(entry.type)}</strong>
                        <span>
                          {entry.user.name}
                          {entry.commitment
                            ? ` · ${entry.commitment.title}`
                            : ""}
                        </span>
                      </div>
                      <div>
                        <strong>
                          {formatCurrency(entry.amount, entry.currency)}
                        </strong>
                        <span>{formatDate(entry.occurredAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
