import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import "./app.css";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: null, msg: "" });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Already signed in? Go straight to the app.
  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ type: null, msg: "" });

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
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus({ type: "error", msg: error.message });
      } else {
        navigate("/app", { replace: true });
      }
    }
    setBusy(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span>🌿</span> PlantRight
        </Link>
        <h1 className="auth-title">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="auth-sub">
          {mode === "signin"
            ? "Sign in to see your address-specific plant plan."
            : "Start your precise, address-level garden plan."}
        </p>

        <form onSubmit={submit} className="auth-form">
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
          <label>
            Password
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

          {status.msg && (
            <div className={`auth-alert ${status.type}`}>{status.msg}</div>
          )}

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signin" ? (
            <>
              New to PlantRight?{" "}
              <button onClick={() => setMode("signup")}>Create an account</button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
