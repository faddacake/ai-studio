"use client";

import { useState } from "react";

export default function LoginPage() {
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
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/workflows";
      } else {
        const data = await res.json();
        setError(data.message || "Invalid password");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
      <div className="w-full max-w-sm p-8 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: "var(--color-text-primary)" }}>
          AI Studio
        </h1>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded mb-4 outline-none"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            autoFocus
            required
          />
          {error && (
            <p className="text-sm mb-4" style={{ color: "var(--color-error)" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded font-medium transition-colors"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
