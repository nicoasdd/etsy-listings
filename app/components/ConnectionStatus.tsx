"use client";

import { useEffect, useState, useCallback } from "react";
import type { ConnectionStatus as ConnectionStatusType } from "@/lib/types/app";

interface ConnectionStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

export default function ConnectionStatus({ onStatusChange }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatusType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = (await res.json()) as ConnectionStatusType;
      setStatus(data);
      onStatusChange?.(data.connected);
    } catch {
      setStatus({ connected: false, needs_reauth: false });
      onStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDisconnect = async () => {
    await fetch("/api/auth/disconnect", { method: "POST" });
    await fetchStatus();
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse text-gray-400">
          Checking connection...
        </div>
      </div>
    );
  }

  if (!status || !status.connected) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Etsy Connection
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {status?.needs_reauth
                ? "Your session has expired. Please reconnect."
                : "Connect your Etsy shop to start uploading listings."}
            </p>
          </div>
          <a
            href="/api/auth/connect"
            className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Connect to Etsy
          </a>
        </div>
      </div>
    );
  }

  const expiresDate = status.expires_at
    ? new Date(status.expires_at * 1000)
    : null;
  const isExpired = expiresDate ? expiresDate < new Date() : false;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Etsy Connection
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-800">
              Connected to {status.shop_name}
            </span>
          </div>
          {expiresDate && (
            <p className="mt-1 text-xs text-gray-500">
              Token {isExpired ? "expired" : "expires"}{" "}
              {expiresDate.toLocaleString()}
              {isExpired && " — will auto-refresh on next upload"}
            </p>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
