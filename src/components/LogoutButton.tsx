"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="muted"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
    >
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
