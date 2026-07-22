import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import "./app.css";

// Supabase sends the password-reset link back to /login with a recovery token
// in the URL hash; supabase-js turns that into a session automatically. We
// detect it once on load so we can show the "set a new password" form instead
// of bouncing the user straight into the app.
const isRecovery = () =>
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");

export default function Login() {
  // "signin" | "signup" | "reset" (request a link) | "newpassword" (set it)
  const [mode, setMode] = useState(() => (isRecovery() ? "newpassword" : "signin"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: null, msg: "" });
  const [busy, setBusy] = useState(false);
  // True after a failed sign-in specifically because the email isn't confirmed,
  // so we can offer to resend the confirmation.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Already signed in? Go to the app — unless we're mid password-reset, where a
  // recovery session exists but the user still needs to choose a new password.
  useEffect(() => {
    if (user && mode !== "newpassword") navigate("/app", { replace: true });
  }, [user, mode, navigate]);

  const resendConfirmation = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setStatus(
      error
        ? { type: "error", msg: error.message }
        : { type: "success", msg: "Confirmation email sent — check your inbox." }
    );
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ type: null, msg: "" });
    setNeedsConfirm(false);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      setStatus(
        error
          ? { type: "error", msg: error.message }
          : {
              type: "success",
              msg: "If that email has an account, a reset link is on its way.",
            }
      );
      setBusy(false);
      return;
    }

    if (mode === "newpassword") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus({ type: "error", msg: error.message });
      } else {
        setStatus({ type: "success", msg: "Password updated. Taking you in…" });
        // Clear the recovery hash so a refresh doesn't re-enter this mode.
        window.history.replaceState(null, "", "/login");
        navigate("/app", { replace: true });
      }
      setBusy(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setStatus({ type: "error", msg: error.message });
      } else {
        // If email confirmations are on, there is no session yet.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/app", { replace: true });
        } else {
          setStatus({
            type: "success",
            msg: "Account created. Check your email to confirm, then sign in.",
          });
          setMode("signin");
        }
      }
      setBusy(false);
      return;
    }

    // Sign in.
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      // A brand-new signup that hasn't confirmed yet is the most common
      // stumble — name it and offer a one-click resend instead of the raw
      // "Email not confirmed" string.
      const unconfirmed =
        error.code === "email_not_confirmed" ||
        /not confirmed/i.test(error.message);
      if (unconfirmed) {
        setNeedsConfirm(true);
        setStatus({
          type: "error",
          msg: "Your email isn't confirmed yet. Check your inbox, or resend below.",
        });
      } else {
        setStatus({ type: "error", msg: error.message });
      }
    } else {
      navigate("/app", { replace: true });
    }
    setBusy(false);
  };

  const titles = {
    signin: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
    newpassword: "Choose a new password",
  };
  const subs = {
    signin: "Sign in to see your address-specific plant plan.",
    signup: "Start your precise, address-level garden plan.",
    reset: "We'll email you a link to set a new password.",
    newpassword: "Enter a new password for your account.",
  };
  const buttons = {
    signin: "Sign in",
    signup: "Create account",
    reset: "Send reset link",
    newpassword: "Update password",
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span>🌿</span> PlantRight
        </Link>
        <h1 className="auth-title">{titles[mode]}</h1>
        <p className="auth-sub">{subs[mode]}</p>

        <form onSubmit={submit} className="auth-form">
          {mode !== "newpassword" && (
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              {mode === "newpassword" ? "New password" : "Password"}
              <input
                type="password"
                required
                minLength={6}
                value={password}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
          )}

          {mode === "signin" && (
            <button
              type="button"
              className="auth-forgot"
              onClick={() => {
                setStatus({ type: null, msg: "" });
                setNeedsConfirm(false);
                setMode("reset");
              }}
            >
              Forgot your password?
            </button>
          )}

          {status.msg && (
            <div className={`auth-alert ${status.type}`}>{status.msg}</div>
          )}

          {needsConfirm && (
            <button
              type="button"
              className="auth-resend"
              onClick={resendConfirmation}
              disabled={busy}
            >
              Resend confirmation email
            </button>
          )}

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? "Please wait…" : buttons[mode]}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signin" && (
            <>
              New to PlantRight?{" "}
              <button onClick={() => setMode("signup")}>Create an account</button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")}>Sign in</button>
            </>
          )}
          {(mode === "reset" || mode === "newpassword") && (
            <button onClick={() => setMode("signin")}>← Back to sign in</button>
          )}
        </p>
      </div>
    </div>
  );
}
