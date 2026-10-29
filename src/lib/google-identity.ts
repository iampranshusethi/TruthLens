"use client";

/**
 * Google Identity Services: Google's own sign-in button (decisions.md D35).
 * Unlike the redirect flow, Google shows the site's own address rather than
 * the auth server's, and the user never leaves TruthLens.
 */

type CredentialResponse = { credential: string };

type GoogleId = {
  initialize(options: {
    client_id: string;
    callback: (r: CredentialResponse) => void;
    nonce: string;
    auto_select?: boolean;
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
    context?: "signin" | "signup" | "use";
  }): void;
  renderButton(
    el: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ): void;
  cancel(): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let loading: Promise<GoogleId> | null = null;

export function loadGoogleIdentity(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("gsi")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * A one-time nonce: Google signs the hashed value into its ID token, and
 * Supabase checks the raw value against it, so a stolen token can't be replayed.
 */
export async function createNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}
