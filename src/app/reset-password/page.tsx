"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't reset your password. Try again.");
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card">
        <p>This reset link is missing its token. Request a new one from the forgot password page.</p>
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/forgot-password" style={{ color: "var(--gold)" }}>Request a new link</Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card">
        <p>Your password has been reset. Redirecting you to log in...</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="confirm_password">Confirm new password</label>
        <input
          id="confirm_password"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Resetting..." : "Reset password"}
      </button>

      {error && <p className="error-text">{error}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="display" style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "1.5rem" }}>
          Set a new password
        </h1>
        <Suspense fallback={<p className="muted">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
