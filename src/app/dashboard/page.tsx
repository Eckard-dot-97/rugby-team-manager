"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { POSITIONS, type Position } from "@/lib/positions";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

type Child = {
  id: number;
  name: string;
  date_of_birth: string | null;
  school: string | null;
  position_1: string;
  position_2: string;
  position_3: string;
  household_id: number | null;
  co_parents: { id: number; name: string; surname: string }[];
};

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    date_of_birth: string;
    school: string;
    position_1: Position;
    position_2: Position;
    position_3: Position;
  }>({
    name: "",
    date_of_birth: "",
    school: "",
    position_1: POSITIONS[0],
    position_2: POSITIONS[1],
    position_3: POSITIONS[2],
  });

  // Only populated if the parent belongs to more than one household — in
  // that case the API asks us to say which one the new child goes in.
  const [householdChoices, setHouseholdChoices] = useState<{ id: number; name: string | null }[]>([]);
  const [chosenHouseholdId, setChosenHouseholdId] = useState<number | "">("");

  const [busyChildId, setBusyChildId] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{ [childId: number]: number | "" }>({});

  async function loadChildren() {
    setLoading(true);
    const res = await fetch("/api/children");
    if (res.ok) {
      const data = await res.json();
      setChildren(data.children);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadChildren();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Warn (but don't block) if a child with this name already exists for
    // this parent — siblings can share a first name, so this is a
    // confirmation, not a hard stop.
    const isDuplicate = children.some(
      (child) => child.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      const proceed = window.confirm(
        `You already have a child named "${form.name}". Add another anyway?`
      );
      if (!proceed) return;
    }

    setSubmitting(true);

    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        household_id: chosenHouseholdId || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Belongs to more than one household — show a picker and let them
      // resubmit once they've chosen.
      if (res.status === 409 && data.households) {
        setHouseholdChoices(data.households);
        setError(data.error || "Choose which household this child belongs to, then submit again.");
        setSubmitting(false);
        return;
      }
      setError(data.error || "Couldn't add child. Try again.");
      setSubmitting(false);
      return;
    }

    setForm({
      name: "",
      date_of_birth: "",
      school: "",
      position_1: POSITIONS[0],
      position_2: POSITIONS[1],
      position_3: POSITIONS[2],
    });
    setHouseholdChoices([]);
    setChosenHouseholdId("");
    setSubmitting(false);
    loadChildren();
  }

  async function handleDeleteChild(child: Child) {
    if (!window.confirm(`Delete "${child.name}"? This removes their availability and stats history too.`)) {
      return;
    }
    setError("");
    setBusyChildId(child.id);
    const res = await fetch("/api/children/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: child.id }),
    });
    const data = await res.json();
    setBusyChildId(null);
    if (!res.ok) {
      setError(data.error || "Couldn't delete that child.");
      return;
    }
    loadChildren();
  }

  async function handleMergeChild(child: Child) {
    const targetId = mergeTarget[child.id];
    if (!targetId) return;
    const target = children.find((c) => c.id === targetId);
    if (!target) return;

    if (
      !window.confirm(
        `Merge "${child.name}" into "${target.name}"? "${child.name}" will be removed and their availability/stats history moved onto "${target.name}". This can't be undone.`
      )
    ) {
      return;
    }

    setError("");
    setBusyChildId(child.id);
    const res = await fetch("/api/children/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep_id: targetId, remove_id: child.id }),
    });
    const data = await res.json();
    setBusyChildId(null);
    if (!res.ok) {
      setError(data.error || "Couldn't merge those children.");
      return;
    }
    setMergeTarget((f) => ({ ...f, [child.id]: "" }));
    loadChildren();
  }

  return (
    <div className="page">
      <div className="topbar">
        <BrandMark />
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/household" className="muted">Household</Link>
          <Link href="/stats" className="muted">Stats</Link>
          <Link href="/availability" className="muted">Set availability &rarr;</Link>
          <LogoutButton />
        </div>
      </div>

      <div className="container-wide">
        <h1 className="display" style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>Your children</h1>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : children.length === 0 ? (
          <p className="muted">No children added yet — add one below.</p>
        ) : (
          <div className="card card-accent card-shadow">
            {children.map((child) => (
              <div key={child.id} style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem" }}>
                <span className="avatar" aria-hidden="true" style={{ marginTop: "0.15rem" }}>
                  {initialsOf(child.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{child.name}</strong>
                {child.date_of_birth && <div>Date of Birth: {child.date_of_birth}</div>}
                {child.school && <div>School: {child.school}</div>}
                <div style={{ marginTop: "0.4rem" }}>
                  <span className="jersey-tag">{child.position_1}</span>
                  <span className="jersey-tag">{child.position_2}</span>
                  <span className="jersey-tag">{child.position_3}</span>
                </div>
                {child.co_parents.length > 1 && (
                  <div className="muted" style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
                    Managed by: {child.co_parents.map((p) => `${p.name} ${p.surname}`).join(", ")}
                  </div>
                )}

                <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: "auto", padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                    disabled={busyChildId === child.id}
                    onClick={() => handleDeleteChild(child)}
                  >
                    Delete
                  </button>

                  {children.length > 1 && (
                    <>
                      <select
                        aria-label={`Merge ${child.name} into...`}
                        value={mergeTarget[child.id] || ""}
                        onChange={(e) =>
                          setMergeTarget((f) => ({ ...f, [child.id]: Number(e.target.value) || "" }))
                        }
                        style={{
                          padding: "0.3rem 0.5rem",
                          fontSize: "0.8rem",
                          background: "var(--pitch)",
                          border: "1px solid var(--line)",
                          borderRadius: "6px",
                          color: "var(--chalk)",
                        }}
                      >
                        <option value="">Merge into duplicate...</option>
                        {children
                          .filter((c) => c.id !== child.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ width: "auto", padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                        disabled={busyChildId === child.id || !mergeTarget[child.id]}
                        onClick={() => handleMergeChild(child)}
                      >
                        Merge
                      </button>
                    </>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Want another parent (mom, dad, step-parent) to help manage a child&apos;s schedule too?{" "}
          <Link href="/household" style={{ color: "var(--gold)" }}>Invite them via Household &rarr;</Link>
        </p>

        <h2 className="display" style={{ fontSize: "1.3rem", margin: "2rem 0 1rem" }}>Add a child</h2>

        <form className="card card-accent card-shadow" onSubmit={handleAddChild}>
          <div className="field">
            <label htmlFor="child_name">Child&apos;s name</label>
            <input
              id="child_name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="date_of_birth">Date of Birth</label>
            <input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="school">School</label>
            <input
              id="school"
              type="text"
              value={form.school}
              onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="position_1">Position 1</label>
            <select
              id="position_1"
              value={form.position_1}
              onChange={(e) => setForm((f) => ({ ...f, position_1: e.target.value as Position }))}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="position_2">Position 2</label>
            <select
              id="position_2"
              value={form.position_2}
              onChange={(e) => setForm((f) => ({ ...f, position_2: e.target.value as Position }))}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="position_3">Position 3</label>
            <select
              id="position_3"
              value={form.position_3}
              onChange={(e) => setForm((f) => ({ ...f, position_3: e.target.value as Position }))}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {householdChoices.length > 0 && (
            <div className="field">
              <label htmlFor="household_id">Which household is this child part of?</label>
              <select
                id="household_id"
                required
                value={chosenHouseholdId}
                onChange={(e) => setChosenHouseholdId(Number(e.target.value))}
              >
                <option value="" disabled>Choose a household</option>
                {householdChoices.map((h) => (
                  <option key={h.id} value={h.id}>{h.name || `Household #${h.id}`}</option>
                ))}
              </select>
            </div>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add child"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
