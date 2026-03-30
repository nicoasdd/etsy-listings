import type { Metadata } from "next";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etsy Craft Listing Uploader",
  description: "Upload craft listings to your Etsy shop via JSON",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <div className="flex-1">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <footer className="mx-auto max-w-3xl px-4 py-6">
          <p className="text-center text-xs text-gray-400">
            The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This
            application uses the Etsy API but is not endorsed or certified by
            Etsy, Inc.
          </p>
        </footer>
      </body>
    </html>
  );
}
