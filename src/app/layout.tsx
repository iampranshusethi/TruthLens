import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { SiteAnalytics } from "@/components/analytics";
import { AuthProvider } from "@/components/auth";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

// Fonts are self-hosted so builds never depend on reaching Google Fonts.

// Headlines and big numbers only.
const bricolage = localFont({
  variable: "--font-bricolage",
  src: "../fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  weight: "200 800",
});

// Used only for document text, so contracts read like documents.
const sourceSerif = localFont({
  variable: "--font-source-serif",
  src: "../fonts/source-serif-4-latin-wght-normal.woff2",
  weight: "200 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TruthLens: know what you're signing",
    template: "%s · TruthLens",
  },
  description:
    "Upload a rental agreement, insurance policy or contract. TruthLens explains what it means for you in plain English, with every point traced back to the exact clause.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${bricolage.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ToastProvider>
          <AuthProvider>
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
          </AuthProvider>
        </ToastProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
