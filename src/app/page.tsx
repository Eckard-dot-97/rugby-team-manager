import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      <div className="container" style={{ textAlign: "center", marginTop: "3rem" }}>
        <h1 className="display" style={{ fontSize: "2.75rem", color: "var(--gold)" }}>
          Team Sheet
        </h1>
        <p className="muted" style={{ marginTop: "0.5rem", marginBottom: "2.5rem" }}>
          Friday training. Saturday games. Sorted in one place.
        </p>

        <div className="card">
          <Link href="/signup">
            <button className="btn">Create parent account</button>
          </Link>
          <div style={{ height: "0.75rem" }} />
          <Link href="/login">
            <button className="btn btn-ghost">Parent login</button>
          </Link>
          <div style={{ height: "0.75rem" }} />
          <Link href="/coach/login">
            <button className="btn btn-ghost">Coach login</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
