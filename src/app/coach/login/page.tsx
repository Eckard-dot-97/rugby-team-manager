"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CoachLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expected_role: "coach" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push("/coach/dashboard");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="display" style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "1.5rem" }}>
          Coach login
        </h1>

        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in as coach"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link href="/forgot-password" style={{ color: "var(--gold)" }}>Forgot password?</Link>
        </p>
        <p className="muted" style={{ textAlign: "center", marginTop: "0.5rem" }}>
          Coach accounts are set up by the club admin, not self-signup.
        </p>
        <p className="muted" style={{ textAlign: "center", marginTop: "0.5rem" }}>
          Parent? <Link href="/login" style={{ color: "var(--gold)" }}>Parent login</Link>
        </p>
      </div>
    </div>
  );
}
