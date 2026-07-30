"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="display" style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "1.5rem" }}>
          Reset your password
        </h1>

        {submitted ? (
          <div className="card">
            <p>If that email is registered, we&apos;ve sent a reset link. Check your inbox (and spam folder).</p>
            <p className="muted" style={{ marginTop: "1rem" }}>
              <Link href="/login" style={{ color: "var(--gold)" }}>Back to login</Link>
            </p>
          </div>
        ) : (
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

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>

            {error && <p className="error-text">{error}</p>}
          </form>
        )}

        <p className="muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link href="/login" style={{ color: "var(--gold)" }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
