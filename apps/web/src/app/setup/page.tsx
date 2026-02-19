"use client";

import { useState } from "react";

export default function SetupPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/login";
      } else {
        const data = await res.json();
        setError(data.message || "Setup failed");
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
        <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "var(--color-text-primary)" }}>
          AI Studio
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Set your access password
        </p>
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
            minLength={8}
          />
          <label className="block text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded mb-4 outline-none"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            required
            minLength={8}
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
            {loading ? "Setting up..." : "Create Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
