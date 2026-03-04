import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/layout/Sidebar";
import EmailResult from "../components/ui/EmailResult";
import { generateEmail } from "../utils/api";
import { Wand2, Link, User, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

const TONES = ["professional", "friendly", "direct", "creative"];

export default function Dashboard() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const quotaRef = useRef(null);

  const [form, setForm] = useState({
    prospect_url: "",
    prospect_name: "",
    prospect_role: "",
    prospect_company: "",
    prospect_about: "",
    sender_name: "",
    sender_company: "",
    sender_value_prop: "",
    tone: "professional",
    cta: "a 15-minute call",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("url"); // "url" or "manual"

  // Detect Stripe redirect with ?upgraded=true and refresh plan + quota
  useEffect(() => {
    if (router.query.upgraded === "true") {
      toast.success("🎉 Plan upgraded successfully!", { duration: 5000 });
      // Re-fetch the latest user plan from backend
      refreshUser?.();
      // Clean URL without reloading
      router.replace("/dashboard", undefined, { shallow: true });
    }
  }, [router.query.upgraded]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleGenerate = async () => {
    if (!form.sender_name || !form.sender_company || !form.sender_value_prop) {
      toast.error("Fill in your sender details first");
      return;
    }
    if (mode === "url" && !form.prospect_url) {
      toast.error("Enter a prospect URL or switch to manual");
      return;
    }
    if (mode === "manual" && !form.prospect_name) {
      toast.error("Enter prospect name");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        prospect: {
          url: mode === "url" ? form.prospect_url : null,
          name: form.prospect_name || null,
          role: form.prospect_role || null,
          company: form.prospect_company || null,
          about: form.prospect_about || null,
        },
        sender_name: form.sender_name,
        sender_company: form.sender_company,
        sender_value_prop: form.sender_value_prop,
        tone: form.tone,
        cta: form.cta,
      };

      const { data } = await generateEmail(payload);
      setResult(data);
      toast.success("Email generated!");
    } catch (err) {
      const msg = err.response?.data?.detail || "Generation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar quotaRef={quotaRef} />

      <main style={{ marginLeft: 220, flex: 1, padding: "32px 40px", maxWidth: 900 }}>
        {/* Header */}
        <div className="fade-up fade-up-1" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, color: "var(--text)", marginBottom: 6 }}>
            Generate Email
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Enter a prospect URL or fill in details manually — AI does the rest.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Left column — inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Prospect section */}
            <div className="card fade-up fade-up-2">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15 }}>Prospect</h3>
                <div className="tab-bar" style={{ width: "auto" }}>
                  <button className={`tab ${mode === "url" ? "active" : ""}`} onClick={() => setMode("url")}>URL</button>
                  <button className={`tab ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>Manual</button>
                </div>
              </div>

              {mode === "url" ? (
                <div>
                  <label className="label">LinkedIn or Company URL</label>
                  <div style={{ position: "relative" }}>
                    <Link size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 34 }}
                      placeholder="https://linkedin.com/in/johndoe"
                      value={form.prospect_url}
                      onChange={e => set("prospect_url", e.target.value)}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    We'll scrape name, role, company and recent activity automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    ["prospect_name", "Full Name", "John Smith"],
                    ["prospect_role", "Job Title", "VP of Engineering"],
                    ["prospect_company", "Company", "Stripe"],
                  ].map(([key, label, placeholder]) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input className="input" placeholder={placeholder}
                        value={form[key]} onChange={e => set(key, e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <label className="label">About them / company</label>
                    <textarea className="input" placeholder="Any context that helps personalisation..."
                      value={form.prospect_about} onChange={e => set("prospect_about", e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Sender section */}
            <div className="card fade-up fade-up-3">
              <h3 style={{ fontSize: 15, marginBottom: 16 }}>Your Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["sender_name", "Your Name", "Jane Doe"],
                  ["sender_company", "Your Company", "Acme Inc"],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input" placeholder={placeholder}
                      value={form[key]} onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label className="label">Value Proposition</label>
                  <textarea className="input"
                    placeholder="We help B2B SaaS companies reduce churn by 30% in 90 days"
                    value={form.sender_value_prop}
                    onChange={e => set("sender_value_prop", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Email settings */}
            <div className="card fade-up fade-up-4">
              <h3 style={{ fontSize: 15, marginBottom: 16 }}>Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="label">Tone</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {TONES.map(t => (
                      <button
                        key={t}
                        onClick={() => set("tone", t)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: form.tone === t ? "1px solid var(--primary)" : "1px solid var(--border)",
                          background: form.tone === t ? "rgba(212,120,74,0.12)" : "transparent",
                          color: form.tone === t ? "var(--primary)" : "var(--muted)",
                          transition: "all 0.15s",
                          textTransform: "capitalize",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Call to Action</label>
                  <input className="input" placeholder="a 15-minute call"
                    value={form.cta} onChange={e => set("cta", e.target.value)} />
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <Wand2 size={16} />}
              {loading ? "Generating..." : "Generate Email"}
            </button>
          </div>

          {/* Right column — result */}
          <div>
            {loading && (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 16px" }} />
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>
                  Scraping prospect data...
                </p>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  AI is crafting your email
                </p>
              </div>
            )}

            {!loading && !result && (
              <div className="card" style={{
                textAlign: "center",
                padding: "48px 24px",
                borderStyle: "dashed",
                borderColor: "var(--border-2)",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
                <p style={{ color: "var(--text-2)", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>
                  Your email will appear here
                </p>
                <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                  Fill in the form and click Generate
                </p>
              </div>
            )}

            {result && (
              <EmailResult
                result={result}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
