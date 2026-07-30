"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HistoryRow = {
  fixture_id: number;
  week_date: string;
  friday_training: number | null;
  game_1: number | null;
  game_2: number | null;
  game_3: number | null;
  tries: number | null;
  kicks_made: number | null;
};

type ChildStats = {
  child_id: number;
  name: string;
  total_tries: number;
  total_kicks: number;
  total_points: number;
  games_with_stats: number;
  history: HistoryRow[];
};

export default function StatsPage() {
  const [children, setChildren] = useState<ChildStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setChildren(data.children || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page">
      <div className="topbar">
        <span className="brand display">Team Sheet</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/dashboard" className="muted">Children</Link>
          <Link href="/availability" className="muted">Availability</Link>
        </div>
      </div>

      <div className="container-wide">
        <h1 className="display" style={{ fontSize: "1.6rem", marginBottom: "1.25rem" }}>
          Season stats
        </h1>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : children.length === 0 ? (
          <p className="muted">
            No children added yet. <Link href="/dashboard" style={{ color: "var(--gold)" }}>Add a child</Link> to get started.
          </p>
        ) : (
          children.map((child) => (
            <div className="card" key={child.child_id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <h2 className="display" style={{ fontSize: "1.3rem" }}>{child.name}</h2>
                <span className="muted">{child.games_with_stats} game{child.games_with_stats === 1 ? "" : "s"} recorded</span>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", margin: "1rem 0" }}>
                <div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>TRIES</div>
                  <div className="display" style={{ fontSize: "1.5rem", color: "var(--gold)" }}>{child.total_tries}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>KICKS</div>
                  <div className="display" style={{ fontSize: "1.5rem", color: "var(--gold)" }}>{child.total_kicks}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>POINTS</div>
                  <div className="display" style={{ fontSize: "1.5rem", color: "var(--gold)" }}>{child.total_points}</div>
                </div>
              </div>

              {child.history.length > 0 && (
                <table className="roster">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Fri</th>
                      <th>G1</th>
                      <th>G2</th>
                      <th>G3</th>
                      <th>Tries</th>
                      <th>Kicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {child.history.map((h) => (
                      <tr key={h.fixture_id}>
                        <td>{new Date(h.week_date).toLocaleDateString()}</td>
                        <td>{h.friday_training ? <span className="chip-yes">Yes</span> : <span className="chip-no">—</span>}</td>
                        <td>{h.game_1 ? <span className="chip-yes">Yes</span> : <span className="chip-no">—</span>}</td>
                        <td>{h.game_2 ? <span className="chip-yes">Yes</span> : <span className="chip-no">—</span>}</td>
                        <td>{h.game_3 ? <span className="chip-yes">Yes</span> : <span className="chip-no">—</span>}</td>
                        <td>{h.tries ?? "—"}</td>
                        <td>{h.kicks_made ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
