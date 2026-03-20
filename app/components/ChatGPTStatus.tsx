"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChatGPTConnectionStatus } from "@/lib/types/chatgpt";

interface ChatGPTStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

export default function ChatGPTStatus({ onStatusChange }: ChatGPTStatusProps) {
  const [status, setStatus] = useState<ChatGPTConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/chatgpt/status");
      const data = (await res.json()) as ChatGPTConnectionStatus;
      setStatus(data);
      onStatusChange?.(data.connected);
      if (data.pending) {
        setShowPasteInput(true);
      }
    } catch {
      setStatus({ connected: false, needs_reauth: false, pending: false });
      onStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setExchangeError(null);
    try {
      const res = await fetch("/api/chatgpt/connect", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setExchangeError(data.error || "Failed to start connection.");
        return;
      }

      window.open(data.authorization_url, "_blank");
      setShowPasteInput(true);
      await fetchStatus();
    } catch {
      setExchangeError("Failed to start the connection flow. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const handleExchange = async () => {
    if (!callbackUrl.trim()) return;

    setExchanging(true);
    setExchangeError(null);

    try {
      const res = await fetch("/api/chatgpt/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_url: callbackUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setExchangeError(data.error || "Failed to complete connection.");
        return;
      }

      setShowPasteInput(false);
      setCallbackUrl("");
      await fetchStatus();
    } catch {
      setExchangeError("Failed to exchange the authorization code. Please try again.");
    } finally {
      setExchanging(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/chatgpt/disconnect", { method: "POST" });
      setShowPasteInput(false);
      setCallbackUrl("");
      setExchangeError(null);
      await fetchStatus();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    await handleDisconnect();
    await handleConnect();
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse text-gray-400">
          Checking ChatGPT connection...
        </div>
      </div>
    );
  }

  if (status?.connected) {
    const expiresDate = status.expires_at
      ? new Date(status.expires_at * 1000)
      : null;
    const isExpired = expiresDate ? expiresDate < new Date() : false;

    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              ChatGPT Connection
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span className="text-sm font-medium text-purple-800">
                Connected{status.user_email ? ` — ${status.user_email}` : ""}
              </span>
            </div>
            {expiresDate && (
              <p className="mt-1 text-xs text-gray-500">
                Token {isExpired ? "expired" : "expires"}{" "}
                {expiresDate.toLocaleString()}
                {isExpired && " — will auto-refresh on next request"}
              </p>
            )}
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

  if (status?.needs_reauth) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              ChatGPT Connection
            </h2>
            <p className="mt-1 text-sm text-amber-700">
              Your ChatGPT session has expired. Please reconnect to continue using AI features.
            </p>
          </div>
          <button
            onClick={handleReconnect}
            className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        ChatGPT Connection
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Connect your ChatGPT Pro or Plus account to use AI features.
      </p>

      {!showPasteInput ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="mt-4 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          {connecting ? "Starting..." : "Connect ChatGPT"}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Step 1:</strong> A new tab opened with the OpenAI sign-in page. Sign in and grant access.
            </p>
            <p className="mt-1 text-sm text-blue-800">
              <strong>Step 2:</strong> After granting access, you&apos;ll be redirected to a page that may show an error (this is expected).
            </p>
            <p className="mt-1 text-sm text-blue-800">
              <strong>Step 3:</strong> Copy the <strong>full URL</strong> from your browser&apos;s address bar and paste it below.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="Paste the callback URL here..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={handleExchange}
              disabled={exchanging || !callbackUrl.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {exchanging ? "Connecting..." : "Complete Connection"}
            </button>
          </div>

          <button
            onClick={() => {
              setShowPasteInput(false);
              setCallbackUrl("");
              setExchangeError(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {exchangeError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{exchangeError}</p>
        </div>
      )}
    </div>
  );
}
