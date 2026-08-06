"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

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
  position_played: string | null;
  tries: number | null;
  kicks_made: number | null;
};

type Fixture = {
  id: number;
  week_date: string;
  game_1_label: string;
  game_2_label: string;
  game_3_label: string;
  competition: string | null;
  opponent: string | null;
  venue: string | null;
  kickoff_time: string | null;
  referee_name: string | null;
  referee_bs_no: string | null;
};

type ClubSettings = {
  club_name: string;
  team_age_group: string;
  coach_1_name: string;
  coach_1_bs_no: string;
  coach_2_name: string;
  coach_2_bs_no: string;
  coach_3_name: string;
  coach_3_bs_no: string;
  team_manager_name: string;
  team_manager_email: string;
  team_manager_cell: string;
  team_manager_bs_no: string;
};

const EMPTY_CLUB_SETTINGS: ClubSettings = {
  club_name: "",
  team_age_group: "",
  coach_1_name: "",
  coach_1_bs_no: "",
  coach_2_name: "",
  coach_2_bs_no: "",
  coach_3_name: "",
  coach_3_bs_no: "",
  team_manager_name: "",
  team_manager_email: "",
  team_manager_cell: "",
  team_manager_bs_no: "",
};

type FixtureMeta = {
  competition: string;
  opponent: string;
  venue: string;
  kickoff_time: string;
  referee_name: string;
  referee_bs_no: string;
};

const EMPTY_FIXTURE_META: FixtureMeta = {
  competition: "",
  opponent: "",
  venue: "",
  kickoff_time: "",
  referee_name: "",
  referee_bs_no: "",
};

type TeamSlot = {
  jersey_number: number;
  position: string;
  child_id: number | null;
  child_name: string | null;
};

type AvailableChild = {
  child_id: number;
  name: string;
  positions: string[];
  already_played_positions: string[];
};

type SquadPositionGroup = {
  position: string;
  children: {
    child_id: number;
    name: string;
    game_1: number | null;
    game_2: number | null;
    game_3: number | null;
  }[];
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

  // Team builder
  const [teamGameNumber, setTeamGameNumber] = useState<"1" | "2" | "3">("1");
  const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);
  const [availableChildren, setAvailableChildren] = useState<AvailableChild[]>([]);
  const [squadByPosition, setSquadByPosition] = useState<SquadPositionGroup[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [showSquad, setShowSquad] = useState(false);

  // Club settings
  const [clubSettings, setClubSettings] = useState<ClubSettings>(EMPTY_CLUB_SETTINGS);
  const [showClubSettings, setShowClubSettings] = useState(false);
  const [savingClubSettings, setSavingClubSettings] = useState(false);
  const [clubSettingsMessage, setClubSettingsMessage] = useState("");

  // Per-fixture match details
  const [fixtureMeta, setFixtureMeta] = useState<FixtureMeta>(EMPTY_FIXTURE_META);
  const [showFixtureMeta, setShowFixtureMeta] = useState(false);
  const [savingFixtureMeta, setSavingFixtureMeta] = useState(false);
  const [fixtureMetaMessage, setFixtureMetaMessage] = useState("");

  function updateFixtureMeta(fixture?: Fixture) {
    setFixtureMeta({
      competition: fixture?.competition || "",
      opponent: fixture?.opponent || "",
      venue: fixture?.venue || "",
      kickoff_time: fixture?.kickoff_time || "",
      referee_name: fixture?.referee_name || "",
      referee_bs_no: fixture?.referee_bs_no || "",
    });
  }

  async function loadFixtures(selectId?: number) {
    const res = await fetch("/api/fixtures");
    const data = await res.json();
    if (res.ok) {
      setFixtures(data.fixtures);

      const nextFixture = selectId
        ? data.fixtures.find((fixture: Fixture) => fixture.id === selectId)
        : data.fixtures.find((fixture: Fixture) => String(fixture.id) === fixtureId) || data.fixtures[0];

      if (nextFixture) {
        updateFixtureMeta(nextFixture);
      }

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

  async function loadClubSettings() {
    const res = await fetch("/api/coach/club-settings");
    const data = await res.json();
    if (res.ok && data.settings) {
      setClubSettings({ ...EMPTY_CLUB_SETTINGS, ...data.settings });
    }
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      const res = await fetch("/api/fixtures");
      const data = await res.json();

      if (!active || !res.ok) return;

      setFixtures(data.fixtures);
      if (data.fixtures.length > 0) {
        setFixtureId((current) => current || String(data.fixtures[0].id));
      }
    })();

    void (async () => {
      await loadClubSettings();
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!fixtureId) return;

    const id = fixtureId;
    const timeout = setTimeout(() => {
      void loadRoster(id);
    }, 0);

    return () => clearTimeout(timeout);
  }, [fixtureId]);

  function handleFixtureSelection(nextFixtureId: string) {
    setFixtureId(nextFixtureId);

    const fixture = fixtures.find((f) => String(f.id) === nextFixtureId);
    updateFixtureMeta(fixture);
  }

  async function handleSaveClubSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingClubSettings(true);
    setClubSettingsMessage("");

    const res = await fetch("/api/coach/club-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clubSettings),
    });
    setSavingClubSettings(false);

    if (!res.ok) {
      setClubSettingsMessage("Couldn't save club settings.");
      return;
    }
    setClubSettingsMessage("Club settings saved.");
  }

  async function handleSaveFixtureMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingFixtureMeta(true);
    setFixtureMetaMessage("");

    const res = await fetch("/api/coach/fixtures", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(fixtureId), ...fixtureMeta }),
    });
    setSavingFixtureMeta(false);

    if (!res.ok) {
      setFixtureMetaMessage("Couldn't save match details.");
      return;
    }
    setFixtureMetaMessage("Match details saved.");
    loadFixtures(Number(fixtureId));
  }

  async function loadTeam(id: string, gameNumber: string) {
    if (!id) return;
    setTeamLoading(true);
    const res = await fetch(`/api/coach/team?fixture_id=${id}&game_number=${gameNumber}`);
    const data = await res.json();
    if (res.ok) {
      setTeamSlots(data.slots);
      setAvailableChildren(data.available_children);
      setSquadByPosition(data.squad_by_position);
    }
    setTeamLoading(false);
  }

  useEffect(() => {
    if (!fixtureId) return;

    const timeoutId = window.setTimeout(() => {
      void loadTeam(fixtureId, teamGameNumber);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fixtureId, teamGameNumber]);

  async function handleGenerateTeam() {
    setGenerating(true);
    setTeamMessage("");
    setError("");

    const res = await fetch("/api/coach/generate-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixture_id: Number(fixtureId), game_number: Number(teamGameNumber) }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error || "Couldn't generate a team.");
      return;
    }

    setTeamMessage(`Filled ${data.filled} of ${data.total} positions.`);
    loadTeam(fixtureId, teamGameNumber);
  }

  function handleSlotChildChange(jerseyNumber: number, childId: string) {
    setTeamSlots((prev) =>
      prev.map((s) =>
        s.jersey_number === jerseyNumber
          ? {
              ...s,
              child_id: childId ? Number(childId) : null,
              child_name: childId ? availableChildren.find((c) => c.child_id === Number(childId))?.name ?? null : null,
            }
          : s
      )
    );
  }

  async function handleSaveTeam() {
    setSavingTeam(true);
    setTeamMessage("");
    setError("");

    const res = await fetch("/api/coach/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fixture_id: Number(fixtureId),
        game_number: Number(teamGameNumber),
        assignments: teamSlots.map((s) => ({ jersey_number: s.jersey_number, child_id: s.child_id })),
      }),
    });
    setSavingTeam(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save the team.");
      return;
    }

    setTeamMessage("Team saved.");
  }

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
        <LogoutButton />
      </div>

      <div className="container-wide">
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0.5rem 1rem" }}
            onClick={() => setShowClubSettings((s) => !s)}
          >
            {showClubSettings ? "Hide club settings" : "Club settings"}
          </button>

          {showClubSettings && (
            <form onSubmit={handleSaveClubSettings} style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                <div className="field">
                  <label htmlFor="club_name">Club name</label>
                  <input id="club_name" value={clubSettings.club_name} onChange={(e) => setClubSettings((c) => ({ ...c, club_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="team_age_group">Team / age group</label>
                  <input id="team_age_group" value={clubSettings.team_age_group} onChange={(e) => setClubSettings((c) => ({ ...c, team_age_group: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_1_name">Coach 1 name</label>
                  <input id="coach_1_name" value={clubSettings.coach_1_name} onChange={(e) => setClubSettings((c) => ({ ...c, coach_1_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_1_bs_no">Coach 1 BokSmart no.</label>
                  <input id="coach_1_bs_no" value={clubSettings.coach_1_bs_no} onChange={(e) => setClubSettings((c) => ({ ...c, coach_1_bs_no: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_2_name">Coach 2 name</label>
                  <input id="coach_2_name" value={clubSettings.coach_2_name} onChange={(e) => setClubSettings((c) => ({ ...c, coach_2_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_2_bs_no">Coach 2 BokSmart no.</label>
                  <input id="coach_2_bs_no" value={clubSettings.coach_2_bs_no} onChange={(e) => setClubSettings((c) => ({ ...c, coach_2_bs_no: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_3_name">Coach 3 name</label>
                  <input id="coach_3_name" value={clubSettings.coach_3_name} onChange={(e) => setClubSettings((c) => ({ ...c, coach_3_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="coach_3_bs_no">Coach 3 BokSmart no.</label>
                  <input id="coach_3_bs_no" value={clubSettings.coach_3_bs_no} onChange={(e) => setClubSettings((c) => ({ ...c, coach_3_bs_no: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="team_manager_name">Team manager name</label>
                  <input id="team_manager_name" value={clubSettings.team_manager_name} onChange={(e) => setClubSettings((c) => ({ ...c, team_manager_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="team_manager_bs_no">Team manager BokSmart no.</label>
                  <input id="team_manager_bs_no" value={clubSettings.team_manager_bs_no} onChange={(e) => setClubSettings((c) => ({ ...c, team_manager_bs_no: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="team_manager_email">Team manager email</label>
                  <input id="team_manager_email" type="email" value={clubSettings.team_manager_email} onChange={(e) => setClubSettings((c) => ({ ...c, team_manager_email: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="team_manager_cell">Team manager cell</label>
                  <input id="team_manager_cell" value={clubSettings.team_manager_cell} onChange={(e) => setClubSettings((c) => ({ ...c, team_manager_cell: e.target.value }))} />
                </div>
              </div>
              <button className="btn" style={{ width: "auto", padding: "0.65rem 1.2rem" }} type="submit" disabled={savingClubSettings}>
                {savingClubSettings ? "Saving..." : "Save club settings"}
              </button>
              {clubSettingsMessage && <p className="muted" style={{ marginTop: "0.5rem" }}>{clubSettingsMessage}</p>}
            </form>
          )}
        </div>

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

          {fixtureId && (
            <>
              <button
                className="btn btn-ghost"
                style={{ width: "auto", padding: "0.5rem 1rem", marginTop: "1.25rem" }}
                onClick={() => setShowFixtureMeta((s) => !s)}
              >
                {showFixtureMeta ? "Hide match details" : "Match details (competition, venue, referee)"}
              </button>

              {showFixtureMeta && (
                <form onSubmit={handleSaveFixtureMeta} style={{ marginTop: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                    <div className="field">
                      <label htmlFor="competition">Competition</label>
                      <input id="competition" value={fixtureMeta.competition} onChange={(e) => setFixtureMeta((f) => ({ ...f, competition: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="opponent">Opponent</label>
                      <input id="opponent" value={fixtureMeta.opponent} onChange={(e) => setFixtureMeta((f) => ({ ...f, opponent: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="venue">Venue</label>
                      <input id="venue" value={fixtureMeta.venue} onChange={(e) => setFixtureMeta((f) => ({ ...f, venue: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="kickoff_time">Kick-off time</label>
                      <input id="kickoff_time" placeholder="e.g. 09:00" value={fixtureMeta.kickoff_time} onChange={(e) => setFixtureMeta((f) => ({ ...f, kickoff_time: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="referee_name">Referee name</label>
                      <input id="referee_name" value={fixtureMeta.referee_name} onChange={(e) => setFixtureMeta((f) => ({ ...f, referee_name: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="referee_bs_no">Referee BokSmart no.</label>
                      <input id="referee_bs_no" value={fixtureMeta.referee_bs_no} onChange={(e) => setFixtureMeta((f) => ({ ...f, referee_bs_no: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn" style={{ width: "auto", padding: "0.65rem 1.2rem" }} type="submit" disabled={savingFixtureMeta}>
                    {savingFixtureMeta ? "Saving..." : "Save match details"}
                  </button>
                  {fixtureMetaMessage && <p className="muted" style={{ marginTop: "0.5rem" }}>{fixtureMetaMessage}</p>}
                </form>
              )}
            </>
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
                  <th>Played</th>
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
                    <td>{row.position_played ?? "—"}</td>
                    <td>{row.tries ?? "—"}</td>
                    <td>{row.kicks_made ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            <h2 className="display" style={{ fontSize: "1.3rem" }}>Team builder</h2>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {(["1", "2", "3"] as const).map((g) => (
                <button
                  key={g}
                  className={teamGameNumber === g ? "btn" : "btn btn-ghost"}
                  style={{ width: "auto", padding: "0.5rem 1rem" }}
                  onClick={() => setTeamGameNumber(g)}
                >
                  Game {g}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0.5rem 1rem", marginTop: "1rem" }}
            onClick={() => setShowSquad((s) => !s)}
          >
            {showSquad ? "Hide squad by position" : "Show squad by position"}
          </button>

          {showSquad && (
            <div style={{ marginTop: "1rem", overflowX: "auto" }}>
              <table className="roster">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Available children</th>
                  </tr>
                </thead>
                <tbody>
                  {squadByPosition.map((group) => (
                    <tr key={group.position}>
                      <td>{group.position}</td>
                      <td>
                        {group.children.length === 0
                          ? "—"
                          : group.children.map((c) => {
                              const games = [
                                c.game_1 ? "G1" : null,
                                c.game_2 ? "G2" : null,
                                c.game_3 ? "G3" : null,
                              ].filter(Boolean);
                              return (
                                <span key={c.child_id} className="jersey-tag">
                                  {c.name} ({games.length > 0 ? games.join(" ") : "unavailable"})
                                </span>
                              );
                            })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn"
            style={{ width: "auto", padding: "0.65rem 1.2rem", marginTop: "1.25rem" }}
            onClick={handleGenerateTeam}
            disabled={generating || !fixtureId}
          >
            {generating ? "Generating..." : "Generate team"}
          </button>

          {teamMessage && <p className="muted" style={{ marginTop: "0.75rem" }}>{teamMessage}</p>}

          {teamLoading ? (
            <p className="muted" style={{ marginTop: "1rem" }}>Loading...</p>
          ) : (
            <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
              <table className="roster">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Position</th>
                    <th>Player</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSlots.map((slot) => (
                    <tr key={slot.jersey_number}>
                      <td>{slot.jersey_number}</td>
                      <td>{slot.position}</td>
                      <td>
                        <select
                          value={slot.child_id ?? ""}
                            onChange={(e) => handleSlotChildChange(slot.jersey_number, e.target.value)}
                          >
                           <option value="">— empty —</option>

                          {availableChildren
                            .filter((c) => c.positions.includes(slot.position))
                            .map((c) => (
                              <option key={c.child_id} value={c.child_id}>
                              {c.name}
                              {c.already_played_positions?.includes(slot.position)
                                ? " (played this position already)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn"
            style={{ width: "auto", padding: "0.65rem 1.2rem", marginTop: "1.25rem" }}
            onClick={handleSaveTeam}
            disabled={savingTeam || teamSlots.length === 0}
          >
            {savingTeam ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
