import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Fingerprint, KeyRound, LogOut, Mail, Trash2, UserCog } from "lucide-react";
// Adjust this import if your Supabase client lives elsewhere.
import { supabase } from "@/integrations/supabase/client";

type PasskeyRow = {
  id: string;
  device_type: string | null;
  created_at: string;
  last_used_at: string | null;
};

// ---------- WebAuthn helpers (no extra dependency needed) ----------
function fromB64url(value: string): ArrayBuffer {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function toB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// deno-lint-ignore no-explicit-any
function toCreationOptions(o: any): PublicKeyCredentialCreationOptions {
  return {
    ...o,
    challenge: fromB64url(o.challenge),
    user: { ...o.user, id: fromB64url(o.user.id) },
    excludeCredentials: (o.excludeCredentials ?? []).map(
      (c: { id: string; type?: string; transports?: string[] }) => ({
        ...c,
        type: c.type ?? "public-key",
        id: fromB64url(c.id),
      }),
    ),
  };
}

function serializeCredential(cred: PublicKeyCredential) {
  const r = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: toB64url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: toB64url(r.clientDataJSON),
      attestationObject: toB64url(r.attestationObject),
      transports: r.getTransports?.() ?? [],
    },
  };
}

// Pull a readable message out of a supabase.functions.invoke error.
async function functionError(error: unknown, fallback: string): Promise<string> {
  try {
    // deno-lint-ignore no-explicit-any
    const ctx = (error as any)?.context;
    if (ctx?.json) {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    }
  } catch (_e) { /* ignore */ }
  return fallback;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Never";

// ---------- UI pieces ----------
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Notice({ kind, text }: { kind: "ok" | "error"; text: string }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
        kind === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}
    >
      {text}
    </p>
  );
}

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

export default function AccountSettings() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const passkeySupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadPasskeys = useCallback(async () => {
    // Table types may not be in the generated client types, hence the cast.
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (supabase as any)
      .from("passkey_credentials")
      .select("id, device_type, created_at, last_used_at")
      .order("created_at", { ascending: true });
    if (!error && data) setPasskeys(data as PasskeyRow[]);
  }, []);

  useEffect(() => {
    if (session) loadPasskeys();
  }, [session, loadPasskeys]);

  async function addPasskey() {
    setPasskeyMsg(null);
    setPasskeyBusy(true);
    try {
      const start = await supabase.functions.invoke("passkey-register", { body: { action: "start" } });
      if (start.error) throw new Error(await functionError(start.error, "Could not start passkey setup."));

      const cred = (await navigator.credentials.create({
        publicKey: toCreationOptions(start.data.options),
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("No passkey was created.");

      const done = await supabase.functions.invoke("passkey-register", {
        body: { action: "complete", credential: serializeCredential(cred) },
      });
      if (done.error) throw new Error(await functionError(done.error, "Could not save the passkey."));

      setPasskeyMsg({ kind: "ok", text: "Passkey added. You can now sign in with it." });
      await loadPasskeys();
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError") {
        setPasskeyMsg({ kind: "error", text: "Passkey setup was cancelled or timed out." });
      } else if (name === "InvalidStateError") {
        setPasskeyMsg({ kind: "error", text: "This device already has a passkey for your account." });
      } else {
        setPasskeyMsg({ kind: "error", text: (e as Error)?.message || "Could not add passkey." });
      }
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (!window.confirm("Remove this passkey? You will no longer be able to sign in with it.")) return;
    setPasskeyMsg(null);
    // deno-lint-ignore no-explicit-any
    const { error } = await (supabase as any).from("passkey_credentials").delete().eq("id", id);
    if (error) {
      setPasskeyMsg({ kind: "error", text: "Could not remove the passkey." });
      return;
    }
    setPasskeyMsg({ kind: "ok", text: "Passkey removed." });
    await loadPasskeys();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ kind: "error", text: "Passwords do not match." });
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) {
      setPwMsg({ kind: "error", text: error.message });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPwMsg({ kind: "ok", text: "Password updated." });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loadingSession) {
    return <Shell><main className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</main></Shell>;
  }

  if (!session) {
    return (
      <Shell>
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="mb-6 text-muted-foreground">Please sign in to manage your account. Sign-in is in the Watchlist section.</p>
        <a href="/#watchlist" className={primaryBtn}>Go to sign in</a>
      </main>
      </Shell>
    );
  }

  const user = session.user;

  return (
    <Shell>
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <UserCog className="h-6 w-6 text-primary" /> Account Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage how you sign in to AIDYOR.</p>
      </header>

      <Card icon={<Mail className="h-5 w-5" />} title="Account">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all text-right text-foreground">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="text-foreground">{formatDate(user.created_at)}</dd>
          </div>
        </dl>
        <button onClick={signOut} className={`${ghostBtn} mt-4`}>
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </Card>

      <Card icon={<Fingerprint className="h-5 w-5" />} title="Passkey login">
        <p className="mb-4 text-sm text-muted-foreground">
          Sign in with your fingerprint, face or screen lock instead of a password. Add a passkey on each
          device you use, from the same site address you sign in on.
        </p>

        {passkeys.length > 0 && (
          <ul className="mb-4 space-y-2">
            {passkeys.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Passkey {i + 1}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {p.device_type === "multiDevice" ? "Synced" : "This device only"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(p.created_at)} · Last used {formatDate(p.last_used_at)}
                  </p>
                </div>
                <button
                  onClick={() => removePasskey(p.id)}
                  aria-label="Remove passkey"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {passkeySupported ? (
          <button onClick={addPasskey} disabled={passkeyBusy} className={primaryBtn}>
            <Fingerprint className="h-4 w-4" />
            {passkeyBusy ? "Waiting for your device…" : passkeys.length ? "Add another passkey" : "Enable passkey login"}
          </button>
        ) : (
          <Notice kind="error" text="This browser does not support passkeys." />
        )}
        {passkeyMsg && <Notice kind={passkeyMsg.kind} text={passkeyMsg.text} />}
      </Card>

      <Card icon={<KeyRound className="h-5 w-5" />} title="Change password">
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min. 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button type="submit" disabled={pwBusy || !newPassword} className={primaryBtn}>
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </form>
        {pwMsg && <Notice kind={pwMsg.kind} text={pwMsg.text} />}
      </Card>
    </main>
    </Shell>
  );
}
