import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        if (!form.name) { toast.error("Enter your name"); setLoading(false); return; }
        await register(form.email, form.password, form.name);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 24,
    }}>
      {/* Background decoration */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(212,120,74,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="fade-up" style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48,
            background: "var(--primary)",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Mail size={22} color="white" />
          </div>
          <h1 style={{ fontSize: 26, color: "var(--text)", marginBottom: 6 }}>MailCraft AI</h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {isLogin ? "Sign in to your account" : "Create your free account"}
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="tab-bar" style={{ marginBottom: 24 }}>
            <button className={`tab ${isLogin ? "active" : ""}`} onClick={() => setIsLogin(true)}>Sign In</button>
            <button className={`tab ${!isLogin ? "active" : ""}`} onClick={() => setIsLogin(false)}>Sign Up</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!isLogin && (
              <div>
                <label className="label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input className="input" style={{ paddingLeft: 34 }}
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    onKeyDown={handleKey}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input className="input" style={{ paddingLeft: 34 }}
                  type="email" placeholder="jane@company.com"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input className="input" style={{ paddingLeft: 34 }}
                  type="password" placeholder="••••••••"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 8 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <ArrowRight size={16} />}
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </div>

          {!isLogin && (
            <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
              Free plan includes 5 emails/month. No credit card required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
