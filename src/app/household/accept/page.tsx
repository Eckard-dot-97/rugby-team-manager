"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type AcceptResult =
  | { state: "loading" }
  | { state: "error"; message: string; invitedEmail?: string }
  | { state: "requires_auth"; invitedEmail: string }
  | { state: "success"; householdName: string; children: string[] };

function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [result, setResult] = useState<AcceptResult>({ state: "loading" });

  useEffect(() => {
    if (!token) {
      setResult({ state: "error", message: "This invite link is missing its token." });
      return;
    }

    fetch("/api/household/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.requires_auth) {
          setResult({ state: "requires_auth", invitedEmail: data.invited_email });
        } else if (res.ok) {
          setResult({
            state: "success",
            householdName: data.household_name,
            children: data.children || [],
          });
        } else {
          setResult({ state: "error", message: data.error, invitedEmail: data.invited_email });
        }
      })
      .catch(() => {
        setResult({ state: "error", message: "Couldn't reach the server. Try again." });
      });
  }, [token]);

  if (result.state === "loading") {
    return <p className="muted">Checking your invite...</p>;
  }

  if (result.state === "requires_auth") {
    const redirect = encodeURIComponent(`/household/accept?token=${token}`);
    const email = encodeURIComponent(result.invitedEmail);
    return (
      <div className="card">
        <p style={{ marginBottom: "1.25rem" }}>
          You&apos;ve been invited to join a household as{" "}
          <strong>{result.invitedEmail}</strong>. Sign up or log in with that email to accept.
        </p>
        <Link
          href={`/signup?redirect=${redirect}&email=${email}`}
          className="btn"
          style={{ display: "block", textAlign: "center", marginBottom: "0.75rem" }}
        >
          Create an account
        </Link>
        <Link
          href={`/login?redirect=${redirect}&email=${email}`}
          className="btn-ghost"
          style={{ display: "block", textAlign: "center", padding: "0.7rem 1.4rem", borderRadius: "6px" }}
        >
          I already have an account
        </Link>
      </div>
    );
  }

  if (result.state === "error") {
    return (
      <div className="card">
        <p className="error-text">{result.message}</p>
        {result.invitedEmail && (
          <p className="muted" style={{ marginTop: "1rem" }}>
            This invite was sent to <strong>{result.invitedEmail}</strong>. If you&apos;re logged in
            as a different account, log out and try again.
            <div style={{ marginTop: "0.75rem" }}>
              <LogoutButton />
            </div>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <p style={{ marginBottom: "0.75rem" }}>
        You&apos;ve joined <strong>{result.householdName}</strong>.
      </p>
      {result.children.length > 0 && (
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          You can now manage: {result.children.join(", ")}
        </p>
      )}
      <Link href="/dashboard" className="btn" style={{ display: "block", textAlign: "center" }}>
        Go to your dashboard
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="display" style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "1.5rem" }}>
          Household invite
        </h1>
        <Suspense fallback={<p className="muted">Loading...</p>}>
          <AcceptInviteInner />
        </Suspense>
      </div>
    </div>
  );
}
