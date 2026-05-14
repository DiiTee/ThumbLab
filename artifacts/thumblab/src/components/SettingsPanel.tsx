import { useRef, useState, useEffect } from "react";
import { Upload, X, LogIn, LogOut, User } from "lucide-react";
import { useStore } from "../store/useStore";

const FONTS = ["Impact", "Inter", "Arial Black", "Oswald", "Montserrat", "Bebas Neue", "Roboto Condensed", "Anton"];

declare global {
  interface Window {
    puter?: {
      auth?: {
        isSignedIn: () => boolean;
        getUser: () => Promise<{ username: string; email?: string }>;
        signIn: () => Promise<void>;
        signOut: () => void;
      };
    };
  }
}

function usePuterAuth() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!window.puter?.auth) { setSignedIn(null); return; }
    try {
      const in_ = window.puter.auth.isSignedIn();
      setSignedIn(in_);
      if (in_) {
        const u = await window.puter.auth.getUser();
        setUsername(u.username || u.email || "Puter User");
      } else {
        setUsername(null);
      }
    } catch {
      setSignedIn(false);
      setUsername(null);
    }
  };

  useEffect(() => { refresh(); }, []);

  const signIn = async () => {
    if (!window.puter?.auth) return;
    setLoading(true);
    try {
      await window.puter.auth.signIn();
      await refresh();
    } catch { /* user cancelled */ } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!window.puter?.auth) return;
    setLoading(true);
    try {
      window.puter.auth.signOut();
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return { signedIn, username, loading, signIn, signOut };
}

export default function SettingsPanel() {
  const { state, dispatch } = useStore();
  const { brandSettings } = state;
  const logoRef = useRef<HTMLInputElement>(null);
  const { signedIn, username, loading, signIn, signOut } = usePuterAuth();

  const update = (k: string, v: string | boolean | null) =>
    dispatch({ type: "UPDATE_BRAND", settings: { [k]: v } as any });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => update("logoBase64", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

      {/* Puter Account */}
      <div>
        <span className="section-label">Puter Account</span>
        <div className="card mt-1 p-3 flex flex-col gap-2">
          {signedIn === null && (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Puter not available — make sure the page has loaded fully.</p>
          )}
          {signedIn === false && (
            <>
              <div className="flex items-center gap-2">
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={14} style={{ color: "var(--text-muted)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Not signed in</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Sign in to use AI generation</p>
                </div>
              </div>
              <button
                className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-2"
                onClick={signIn}
                disabled={loading}
              >
                <LogIn size={12} /> {loading ? "Signing in…" : "Sign in to Puter"}
              </button>
            </>
          )}
          {signedIn === true && (
            <>
              <div className="flex items-center gap-2">
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={14} style={{ color: "#0a0e27" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</p>
                  <p style={{ fontSize: 10, color: "var(--accent-green)" }}>● Connected</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5"
                  onClick={async () => { await signOut(); await signIn(); }}
                  disabled={loading}
                  title="Sign out and connect a different Puter account"
                >
                  <LogIn size={11} /> {loading ? "…" : "Switch Account"}
                </button>
                <button
                  className="btn-danger flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5"
                  onClick={signOut}
                  disabled={loading}
                >
                  <LogOut size={11} /> {loading ? "…" : "Disconnect"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Brand Colors */}
      <div>
        <span className="section-label">Brand Colors</span>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Primary</label>
            <div className="flex gap-2 items-center mt-1">
              <input type="color" value={brandSettings.primaryColor} onChange={e => update("primaryColor", e.target.value)}
                style={{ width: 32, height: 32, padding: 2, borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
              <input type="text" value={brandSettings.primaryColor} onChange={e => update("primaryColor", e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Secondary</label>
            <div className="flex gap-2 items-center mt-1">
              <input type="color" value={brandSettings.secondaryColor} onChange={e => update("secondaryColor", e.target.value)}
                style={{ width: 32, height: 32, padding: 2, borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
              <input type="text" value={brandSettings.secondaryColor} onChange={e => update("secondaryColor", e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Vibe */}
      <div>
        <label className="section-label">Visual Vibe</label>
        <textarea
          className="w-full px-3 py-2 text-sm resize-none mt-1"
          style={{ height: 70, fontSize: 12, lineHeight: 1.5 }}
          placeholder="e.g. Moody, high-contrast, cinematic — dark streets with neon reflections..."
          value={brandSettings.visualVibe}
          onChange={e => update("visualVibe", e.target.value)}
        />
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Injected into every Claude prompt automatically</p>
      </div>

      {/* Font */}
      <div>
        <label className="section-label">Default Brand Font</label>
        <select className="w-full px-3 py-2 text-sm mt-1" value={brandSettings.fontChoice} onChange={e => update("fontChoice", e.target.value)}>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <p style={{ fontSize: 28, fontFamily: brandSettings.fontChoice, color: "var(--accent-cyan)", marginTop: 6, lineHeight: 1 }}>THUMBLAB</p>
      </div>

      {/* Logo */}
      <div>
        <label className="section-label">Brand Logo</label>
        <div className="flex items-start gap-3 mt-1">
          {brandSettings.logoBase64 ? (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={brandSettings.logoBase64} alt="Logo" style={{ width: 64, height: 64, objectFit: "contain", background: "var(--bg-input)", borderRadius: 8, border: "1px solid var(--border-color)" }} />
              <button
                className="absolute -top-1 -right-1 btn-danger p-0.5"
                style={{ borderRadius: "50%", lineHeight: 1 }}
                onClick={() => update("logoBase64", null)}
              >
                <X size={10} />
              </button>
            </div>
          ) : null}
          <div className="flex-1">
            <button className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2" onClick={() => logoRef.current?.click()}>
              <Upload size={12} /> {brandSettings.logoBase64 ? "Replace Logo" : "Upload Logo (PNG)"}
            </button>
            <input ref={logoRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              Transparent PNG recommended. Auto-placed at 15% opacity in bottom-right.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-branding toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 13, color: "var(--text-primary)" }}>Auto-Branding</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Watermark logo after generation</p>
        </div>
        <div className={`toggle-switch ${brandSettings.autoBranding ? "on" : ""}`} onClick={() => update("autoBranding", !brandSettings.autoBranding)} />
      </div>

      {/* Author */}
      <div>
        <label className="section-label">Author Name (for SEO)</label>
        <input type="text" className="w-full px-3 py-2 text-sm mt-1" placeholder="e.g. MimiKei" value={brandSettings.authorName} onChange={e => update("authorName", e.target.value)} />
      </div>
    </div>
  );
}
