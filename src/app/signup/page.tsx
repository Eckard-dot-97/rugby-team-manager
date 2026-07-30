"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    surname: "",
    cell_number: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="display" style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "1.5rem" }}>
          Create your account
        </h1>

        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">First name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="surname">Surname</label>
            <input
              id="surname"
              required
              value={form.surname}
              onChange={(e) => update("surname", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="cell_number">Cell number</label>
            <input
              id="cell_number"
              type="tel"
              required
              value={form.cell_number}
              onChange={(e) => update("cell_number", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--gold)" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
