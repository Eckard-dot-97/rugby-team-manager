"use client";

import { useEffect, useState } from "react";

type RosterRow = {
  child_id: number;
  child_name: string;
  position_1: string;
  position_2: string;
  position_3: string;
  parent_name: string;
  parent_surname: string;
  cell_number: string;
  friday_training: number | null;
  game_1: number | null;
  game_2: number | null;
  game_3: number | null;
  tries: number | null;
  kicks_made: number | null;
};

type Fixture = {
  id: number;
  week_date: string;
  game_1_label: string;
  game_2_label: string;
  game_3_label: string;
};

function Yes({ value }: { value: number | null }) {
  return value ? <span className="chip-yes">Yes</span> : <span className="chip-no">No</span>;
}

export default function CoachDashboard() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState<string>("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // New fixture form
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewFixture, setShowNewFixture] = useState(false);

  async function loadFixtures(selectId?: number) {
    const res = await fetch("/api/fixtures");
    const data = await res.json();
    if (res.ok) {
      setFixtures(data.fixtures);
      if (selectId) {
        setFixtureId(String(selectId));
      } else if (data.fixtures.length > 0) {
        setFixtureId((current) => current || String(data.fixtures[0].id));
      }
    }
  }

  async function loadRoster(id: string) {
    if (!id) {
      setRoster([]);
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/coach/roster?fixture_id=${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't load the roster for this fixture.");
      setRoster([]);
    } else {
      setRoster(data.roster);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function initFixtures() {
      await loadFixtures();
    }

    void initFixtures();
  }, []);

  useEffect(() => {
    if (!fixtureId) return;

    async function initRoster() {
      await loadRoster(fixtureId);
    }

    void initRoster();
  }, [fixtureId]);

  async function handleCreateFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    setCreating(true);
    setError("");

    const res = await fetch("/api/coach/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_date: newDate }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Couldn't create the fixture.");
      return;
    }

    setNewDate("");
    setShowNewFixture(false);
    await loadFixtures(data.id);
  }

  async function handleExport() {
    setExporting(true);
    const res = await fetch(`/api/export?fixture_id=${fixtureId}`);
    if (!res.ok) {
      setError("Export failed. Try again.");
      setExporting(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `availability-fixture-${fixtureId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");
    setError("");

    const formData = new FormData();
    formData.append("fixture_id", fixtureId);
    formData.append("file", file);

    const res = await fetch("/api/coach/upload-results", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setUploading(false);
    e.target.value = "";

    if (!res.ok) {
      setError(data.error || "Upload failed. Try again.");
      return;
    }

    setUploadMessage(`Updated stats for ${data.updated} player${data.updated === 1 ? "" : "s"}.`);
    loadRoster(fixtureId);
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="brand display">Team Sheet — Coach</span>
      </div>

      <div className="container-wide">
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: "12rem" }}>
              <label htmlFor="fixture_id">Fixture week</label>
              {fixtures.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No fixtures yet — create one below.</p>
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
            <button
              className="btn btn-ghost"
              style={{ width: "auto", padding: "0.65rem 1.2rem" }}
              onClick={() => setShowNewFixture((s) => !s)}
            >
              {showNewFixture ? "Cancel" : "New fixture"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "auto", padding: "0.65rem 1.2rem" }}
              onClick={handleExport}
              disabled={exporting || roster.length === 0}
            >
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
            <label className="btn btn-ghost" style={{ width: "auto", padding: "0.65rem 1.2rem", cursor: "pointer" }}>
              {uploading ? "Uploading..." : "Upload results"}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Fill in Tries and Kicks Made on the exported sheet, then upload it here to update stats.
          </p>

          {showNewFixture && (
            <form onSubmit={handleCreateFixture} style={{ marginTop: "1.25rem", display: "flex", gap: "0.6rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="new_date">Week starting (Friday)</label>
                <input
                  id="new_date"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <button className="btn" style={{ width: "auto", padding: "0.65rem 1.2rem" }} type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create fixture"}
              </button>
            </form>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        {uploadMessage && <p className="muted">{uploadMessage}</p>}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : roster.length === 0 ? (
          <p className="muted">No children found for this fixture.</p>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="roster">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Positions</th>
                  <th>Parent</th>
                  <th>Cell</th>
                  <th>Fri</th>
                  <th>G1</th>
                  <th>G2</th>
                  <th>G3</th>
                  <th>Tries</th>
                  <th>Kicks</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.child_id}>
                    <td>{row.child_name}</td>
                    <td>
                      {row.position_1}, {row.position_2}, {row.position_3}
                    </td>
                    <td>{row.parent_name} {row.parent_surname}</td>
                    <td>{row.cell_number}</td>
                    <td><Yes value={row.friday_training} /></td>
                    <td><Yes value={row.game_1} /></td>
                    <td><Yes value={row.game_2} /></td>
                    <td><Yes value={row.game_3} /></td>
                    <td>{row.tries ?? "—"}</td>
                    <td>{row.kicks_made ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
