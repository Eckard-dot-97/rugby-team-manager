"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expected_role: "parent" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push(redirect);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card card-accent card-shadow" onSubmit={handleSubmit}>
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
          {loading ? "Logging in..." : "Log in"}
        </button>

        {error && <p className="error-text">{error}</p>}
      </form>

      <p className="muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <Link href="/forgot-password" style={{ color: "var(--gold)" }}>Forgot password?</Link>
      </p>
      <p className="muted" style={{ textAlign: "center", marginTop: "0.5rem" }}>
        Need an account?{" "}
        <Link
          href={redirect !== "/dashboard" ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"}
          style={{ color: "var(--gold)" }}
        >
          Sign up
        </Link>
      </p>
      <p className="muted" style={{ textAlign: "center", marginTop: "0.5rem" }}>
        Coaching staff? <Link href="/coach/login" style={{ color: "var(--gold)" }}>Coach login</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="page">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <BrandMark size={44} />
          </div>
          <h1 className="display" style={{ fontSize: "1.7rem" }}>
            Parent login
          </h1>
        </div>
        <Suspense fallback={<p className="muted">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
