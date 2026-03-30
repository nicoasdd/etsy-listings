"use client";

import { useEffect, useState, useCallback } from "react";
import type { Cults3DConnectionStatus } from "@/lib/types/cults3d";

interface Cults3DStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

export default function Cults3DStatus({ onStatusChange }: Cults3DStatusProps) {
  const [status, setStatus] = useState<Cults3DConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cults3d/status");
      const data = (await res.json()) as Cults3DConnectionStatus;
      setStatus(data);
      onStatusChange?.(data.connected);
    } catch {
      setStatus({ connected: false });
      onStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    if (!username.trim() || !apiKey.trim()) return;

    setConnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/cults3d/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect to Cults3D.");
        return;
      }

      setStatus({ connected: true, nick: data.nick });
      onStatusChange?.(true);
      setUsername("");
      setApiKey("");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/cults3d/disconnect", { method: "POST" });
      setStatus({ connected: false });
      onStatusChange?.(false);
      setError(null);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse text-gray-400">
          Checking Cults3D connection...
        </div>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Cults3D Connection
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-blue-800">
                Connected as {status.nick}
              </span>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Cults3D Connection
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Connect your Cults3D account to create 3D printing marketplace listings.
        Generate an API key at{" "}
        <a
          href="https://cults3d.com/en/api/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          cults3d.com/en/api/keys
        </a>
      </p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Cults3D username"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnect();
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting || !username.trim() || !apiKey.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect to Cults3D"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
