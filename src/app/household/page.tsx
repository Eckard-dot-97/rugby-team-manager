"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type Member = { id: number; name: string; surname: string; email: string };
type Child = { id: number; name: string };
type PendingInvite = { id: number; email: string; created_at: string; expires_at: string };
type Household = {
  id: number;
  name: string;
  members: Member[];
  children: Child[];
  pending_invites: PendingInvite[];
};

export default function HouseholdPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState<{ [householdId: number]: string }>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/household");
    if (res.ok) {
      const data = await res.json();
      setHouseholds(data.households);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleInvite(householdId: number, e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const email = (inviteEmail[householdId] || "").trim();
    if (!email) return;

    setBusy(`invite-${householdId}`);
    const res = await fetch("/api/household/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ household_id: householdId, email }),
    });
    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setError(data.error || "Couldn't send the invite. Try again.");
      return;
    }

    setInviteEmail((f) => ({ ...f, [householdId]: "" }));
    load();
  }

  async function handleRevoke(inviteId: number) {
    setBusy(`revoke-${inviteId}`);
    await fetch("/api/household/revoke-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    setBusy(null);
    load();
  }

  async function handleRemove(householdId: number, userId: number) {
    if (!window.confirm("Remove this parent's access to the household's children?")) return;
    setBusy(`remove-${userId}`);
    const res = await fetch("/api/household/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ household_id: householdId, user_id: userId }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Couldn't remove that parent.");
      return;
    }
    load();
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="brand display">Team Sheet</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/dashboard" className="muted">&larr; Dashboard</Link>
          <LogoutButton />
        </div>
      </div>

      <div className="container-wide">
        <h1 className="display" style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>Household</h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Invite other parents (mom, dad, step-parents, guardians) to jointly manage the same
          children's schedules.
        </p>

        {error && <p className="error-text" style={{ marginBottom: "1rem" }}>{error}</p>}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : households.length === 0 ? (
          <p className="muted">
            You don&apos;t have a household yet — add a child from your{" "}
            <Link href="/dashboard" style={{ color: "var(--gold)" }}>dashboard</Link> to create one.
          </p>
        ) : (
          households.map((h) => (
            <div key={h.id} className="card" style={{ marginBottom: "1.5rem" }}>
              <h2 className="display" style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>
                {h.name}
              </h2>

              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--gold)" }}>Children</strong>
                <div style={{ marginTop: "0.4rem" }}>
                  {h.children.length === 0 ? (
                    <span className="muted">No children yet</span>
                  ) : (
                    h.children.map((c) => (
                      <span key={c.id} className="jersey-tag">{c.name}</span>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--gold)" }}>Parents</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  {h.members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.4rem 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span>
                        {m.name} {m.surname} <span className="muted">({m.email})</span>
                      </span>
                      {h.members.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ width: "auto", padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                          disabled={busy === `remove-${m.id}`}
                          onClick={() => handleRemove(h.id, m.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {h.pending_invites.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--gold)" }}>Pending invites</strong>
                  <div style={{ marginTop: "0.5rem" }}>
                    {h.pending_invites.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.4rem 0",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        <span className="muted">{inv.email} — awaiting response</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ width: "auto", padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                          disabled={busy === `revoke-${inv.id}`}
                          onClick={() => handleRevoke(inv.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => handleInvite(h.id, e)}
                style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}
              >
                <input
                  type="email"
                  required
                  placeholder="Invite a parent by email"
                  value={inviteEmail[h.id] || ""}
                  onChange={(e) => setInviteEmail((f) => ({ ...f, [h.id]: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: "0.65rem 0.75rem",
                    background: "var(--pitch)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    color: "var(--chalk)",
                  }}
                />
                <button
                  className="btn"
                  type="submit"
                  style={{ width: "auto" }}
                  disabled={busy === `invite-${h.id}`}
                >
                  {busy === `invite-${h.id}` ? "Sending..." : "Send invite"}
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
