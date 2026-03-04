import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import { createCheckout, getProfile, getBillingPortal } from "../utils/api";
import { Check, Zap, Building2, Sparkles, Crown, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

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

const PLAN_LABELS = {
  free: { label: "Free", color: "var(--muted)" },
  pro: { label: "Pro", color: "var(--primary)" },
  business: { label: "Business", color: "#8b5cf6" },
};

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { user } = useAuth();
  const currentPlan = (user?.plan || "free").toLowerCase().split(".").pop();
  const isPaid = currentPlan !== "free";

  const handleUpgrade = async (plan) => {
    if (plan === "free" || plan === currentPlan) return;
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

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await getBillingPortal(window.location.origin + "/pricing");
      window.location.href = data.portal_url;
    } catch (err) {
      toast.error("Could not open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  const getPlanCta = (plan) => {
    if (plan === currentPlan) return "Current Plan ✓";
    return PLANS.find(p => p.plan === plan)?.cta || "Upgrade";
  };

  const isPlanDisabled = (plan) => {
    if (plan === "free") return true;
    if (plan === currentPlan) return true;
    return false;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 40px" }}>

        {/* Header */}
        <div className="fade-up fade-up-1" style={{ textAlign: "center", marginBottom: 48, maxWidth: 540, margin: "0 auto 48px" }}>
          <h1 style={{ fontSize: 32, marginBottom: 10 }}>Simple Pricing</h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Current plan banner for paid users */}
        {isPaid && (
          <div className="card fade-up fade-up-2" style={{
            maxWidth: 900,
            margin: "0 auto 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            border: "1px solid var(--primary)",
            background: "rgba(212,120,74,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Crown size={18} style={{ color: "var(--primary)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  You're on the <span style={{ color: "var(--primary)", textTransform: "capitalize" }}>{currentPlan}</span> plan
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Manage your subscription, view invoices, and update billing details
                </div>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={handlePortal}
              disabled={portalLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              {portalLoading ? <span className="spinner" /> : <ExternalLink size={13} />}
              {portalLoading ? "Opening..." : "Manage Billing"}
            </button>
          </div>
        )}

        {/* Pricing cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
          {PLANS.map(({ name, price, period, plan, icon: Icon, emails, features, highlight }, i) => {
            const isCurrentPlan = plan === currentPlan;
            return (
              <div
                key={plan}
                className={`card fade-up fade-up-${i + 3}`}
                style={{
                  position: "relative",
                  border: isCurrentPlan
                    ? "2px solid var(--primary)"
                    : highlight
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  background: isCurrentPlan
                    ? "rgba(212,120,74,0.06)"
                    : highlight
                      ? "rgba(212,120,74,0.04)"
                      : "var(--surface)",
                }}
              >
                {isCurrentPlan && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "var(--primary)", color: "white",
                    fontSize: 11, fontWeight: 600, padding: "3px 14px",
                    borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>
                    Your Current Plan
                  </div>
                )}
                {!isCurrentPlan && highlight && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "var(--surface-2)", color: "var(--text-2)",
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
                      background: isCurrentPlan || highlight ? "var(--primary)" : "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={15} color={isCurrentPlan || highlight ? "white" : "var(--muted)"} />
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
                  className={`btn btn-full ${isCurrentPlan ? "btn-ghost" : highlight ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => !isCurrentPlan && handleUpgrade(plan)}
                  disabled={isPlanDisabled(plan) || loading === plan}
                  style={{ opacity: isCurrentPlan ? 0.7 : 1 }}
                >
                  {loading === plan ? <span className="spinner" /> : null}
                  {loading === plan ? "Redirecting..." : getPlanCta(plan)}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 32 }}>
          Payments are processed securely by Stripe. Cancel anytime.
          {isPaid && (
            <> · <span
              onClick={handlePortal}
              style={{ cursor: "pointer", textDecoration: "underline", color: "var(--primary)" }}
            >
              View billing details & next renewal date
            </span></>
          )}
        </p>
      </main>
    </div>
  );
}
