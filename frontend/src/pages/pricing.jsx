import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { createCheckout } from "../utils/api";
import { Check, Zap, Building2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    plan: "free",
    icon: Zap,
    emails: "5 emails/month",
    features: ["Single email generation", "URL scraping", "3 tone options", "Email history"],
    cta: "Current Plan",
    disabled: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    plan: "pro",
    icon: Sparkles,
    emails: "500 emails/month",
    features: ["Everything in Free", "Bulk CSV upload", "Priority generation", "CSV export", "All tone options"],
    cta: "Upgrade to Pro",
    highlight: true,
    disabled: false,
  },
  {
    name: "Business",
    price: "$99",
    period: "per month",
    plan: "business",
    icon: Building2,
    emails: "Unlimited emails",
    features: ["Everything in Pro", "Unlimited generation", "API access", "Team seats (5)", "Dedicated support"],
    cta: "Upgrade to Business",
    disabled: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (plan) => {
    if (plan === "free") return;
    setLoading(plan);
    try {
      const { data } = await createCheckout({
        plan,
        success_url: window.location.origin + "/dashboard?upgraded=true",
        cancel_url: window.location.origin + "/pricing",
      });
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create checkout session");
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 40px" }}>
        <div className="fade-up fade-up-1" style={{ textAlign: "center", marginBottom: 48, maxWidth: 540, margin: "0 auto 48px" }}>
          <h1 style={{ fontSize: 32, marginBottom: 10 }}>Simple Pricing</h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
          {PLANS.map(({ name, price, period, plan, icon: Icon, emails, features, cta, highlight, disabled }, i) => (
            <div
              key={plan}
              className={`card fade-up fade-up-${i + 2}`}
              style={{
                position: "relative",
                border: highlight ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: highlight ? "rgba(212,120,74,0.04)" : "var(--surface)",
              }}
            >
              {highlight && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "var(--primary)", color: "white",
                  fontSize: 11, fontWeight: 600, padding: "3px 14px",
                  borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: highlight ? "var(--primary)" : "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={15} color={highlight ? "white" : "var(--muted)"} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
                </div>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "var(--text)" }}>
                    {price}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}> / {period}</span>
                </div>
                <p style={{ color: "var(--primary)", fontSize: 13, fontWeight: 500, marginTop: 4 }}>{emails}</p>
              </div>

              <div className="divider" />

              <ul style={{ listStyle: "none", marginBottom: 24 }}>
                {features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
                    <Check size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`btn btn-full ${highlight ? "btn-primary" : "btn-ghost"}`}
                onClick={() => handleUpgrade(plan)}
                disabled={disabled || loading === plan}
              >
                {loading === plan ? <span className="spinner" /> : null}
                {loading === plan ? "Redirecting..." : cta}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 32 }}>
          Payments are processed securely by Stripe. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
