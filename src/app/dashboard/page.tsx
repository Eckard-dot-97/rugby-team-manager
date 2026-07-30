"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { POSITIONS, type Position } from "@/lib/positions";

type Child = {
  id: number;
  name: string;
  position_1: string;
  position_2: string;
  position_3: string;
};

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    position_1: Position;
    position_2: Position;
    position_3: Position;
  }>({
    name: "",
    position_1: POSITIONS[0],
    position_2: POSITIONS[1],
    position_3: POSITIONS[2],
  });

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
    (async () => {
      await loadChildren();
    })();
  }, []);

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Couldn't add child. Try again.");
      setSubmitting(false);
      return;
    }

    setForm({ name: "", position_1: POSITIONS[0], position_2: POSITIONS[1], position_3: POSITIONS[2] });
    setSubmitting(false);
    loadChildren();
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="brand display">Team Sheet</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <link href="/stats" className="muted">Stats</link>
          <link href="/availability" className="muted">Set availability &rarr;</link>
        </div>
      </div>

      <div className="container-wide">
        <h1 className="display" style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>Your children</h1>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : children.length === 0 ? (
          <p className="muted">No children added yet — add one below.</p>
        ) : (
          <div className="card">
            {children.map((child) => (
              <div key={child.id} style={{ marginBottom: "1rem" }}>
                <strong>{child.name}</strong>
                <div style={{ marginTop: "0.4rem" }}>
                  <span className="jersey-tag">{child.position_1}</span>
                  <span className="jersey-tag">{child.position_2}</span>
                  <span className="jersey-tag">{child.position_3}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="display" style={{ fontSize: "1.3rem", margin: "2rem 0 1rem" }}>Add a child</h2>

        <form className="card" onSubmit={handleAddChild}>
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

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add child"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
