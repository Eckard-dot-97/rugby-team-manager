"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Row = {
  child_id: number;
  name: string;
  friday_training: number | null;
  game_1: number | null;
  game_2: number | null;
  game_3: number | null;
};

type Fixture = {
  id: number;
  week_date: string;
};

export default function AvailabilityPage() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadFixtures() {
    const res = await fetch("/api/fixtures");
    const data = await res.json();
    if (res.ok) {
      setFixtures(data.fixtures);
      if (data.fixtures.length > 0) {
        setFixtureId((current) => current || String(data.fixtures[0].id));
      }
    }
  }

  async function loadAvailability() {
    if (!fixtureId) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/availability?fixture_id=${fixtureId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't load availability for this fixture.");
      setRows([]);
    } else {
      setRows(data.availability);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fixtureId) loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId]);

  function toggle(childId: number, field: keyof Row) {
    setRows((prev) =>
      prev.map((r) =>
        r.child_id === childId ? { ...r, [field]: r[field] ? 0 : 1 } : r
      )
    );
  }

  async function saveRow(row: Row) {
    setSavingId(row.child_id);
    setSavedId(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        child_id: row.child_id,
        fixture_id: Number(fixtureId),
        friday_training: !!row.friday_training,
        game_1: !!row.game_1,
        game_2: !!row.game_2,
        game_3: !!row.game_3,
      }),
    });
    setSavingId(null);
    if (res.ok) setSavedId(row.child_id);
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="brand display">Team Sheet</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/dashboard" className="muted">Children</Link>
          <Link href="/stats" className="muted">Stats</Link>
        </div>
      </div>

      <div className="container-wide">
        <h1 className="display" style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
          Set availability
        </h1>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="fixture_id">Fixture week</label>
            {fixtures.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No fixtures have been set up yet — check back once your coach has added one.
              </p>
            ) : (
              <select
                id="fixture_id"
                value={fixtureId}
                onChange={(e) => setFixtureId(e.target.value)}
              >
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {new Date(f.week_date).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="muted">No children found for this fixture.</p>
        ) : (
          rows.map((row) => (
            <div className="card" key={row.child_id}>
              <strong>{row.name}</strong>

              <div style={{ marginTop: "0.9rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={!!row.friday_training}
                    onChange={() => toggle(row.child_id, "friday_training")}
                  />
                  Friday training
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={!!row.game_1}
                    onChange={() => toggle(row.child_id, "game_1")}
                  />
                  Game 1
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={!!row.game_2}
                    onChange={() => toggle(row.child_id, "game_2")}
                  />
                  Game 2
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={!!row.game_3}
                    onChange={() => toggle(row.child_id, "game_3")}
                  />
                  Game 3
                </label>
              </div>

              <button
                className="btn"
                style={{ width: "auto", padding: "0.6rem 1.2rem", marginTop: "1rem" }}
                onClick={() => saveRow(row)}
                disabled={savingId === row.child_id}
              >
                {savingId === row.child_id ? "Saving..." : savedId === row.child_id ? "Saved" : "Save"}
              </button>
            </div>
          ))
        )}

        {rows.length > 0 && (
          <button
            className="btn"
            style={{ marginTop: "1.5rem" }}
            onClick={() => router.push("/stats")}
          >
            Done — view stats
          </button>
        )}
      </div>
    </div>
  );
}
