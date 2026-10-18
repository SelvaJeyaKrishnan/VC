"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Radio, LogIn } from "lucide-react";

export function HostLogin() {
  const searchParams = useSearchParams();
  const [configuration, setConfiguration] = useState<{ loading: boolean; missing: string[] }>({
    loading: true,
    missing: [],
  });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/configuration", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Configuration lookup failed (${response.status}).`);
        const body = (await response.json()) as { missing?: unknown };
        if (!Array.isArray(body.missing) || !body.missing.every((key) => typeof key === "string")) {
          throw new Error("Configuration endpoint returned invalid data.");
        }
        if (active) setConfiguration({ loading: false, missing: body.missing as string[] });
      })
      .catch((error: unknown) => {
        console.error("Unable to check host authentication configuration:", error);
        if (active) {
          setConfiguration({
            loading: false,
            missing: ["Unable to verify authentication configuration. Check server logs."],
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const authError = searchParams.get("error");
  const signInEnabled = !configuration.loading && configuration.missing.length === 0;
  const authErrorMessage =
    authError === "AccessDenied"
      ? "This Google account was not accepted for host access. Use the verified account configured as AUTHORIZED_HOST_EMAIL."
      : authError
        ? "Google sign-in could not complete. Check the Render service logs and OAuth redirect URI configuration."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0b0e] p-5 text-[#f3f4f6]">
      <section className="w-full max-w-md rounded-2xl border border-[#242a36] bg-[#13161c] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c0915a] text-[#0a0b0e]">
          <Radio className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-xl font-bold text-white">OneGuest Studio</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">Host sign-in is required to manage studios and recordings.</p>
        {authErrorMessage && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-200">
            {authErrorMessage}
          </p>
        )}
        {configuration.loading ? (
          <p className="mt-6 text-sm text-[#8c94a4]">Checking Google sign-in configuration…</p>
        ) : signInEnabled ? (
          <button
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] px-5 py-3 text-sm font-bold text-[#0a0b0e] transition-colors hover:bg-[#cf9f67]"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            type="button"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </button>
        ) : (
          <div role="alert" className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs leading-relaxed text-amber-100">
            Google host sign-in is unavailable. Configure these Render environment variables: {configuration.missing.join(", ")}.
          </div>
        )}
      </section>
    </main>
  );
}
