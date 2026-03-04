import { useEffect, useState } from "react";
import { getQuota } from "../../utils/api";
import { Zap } from "lucide-react";

export default function QuotaBadge() {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    getQuota().then(r => setQuota(r.data)).catch(() => { });
  }, []);

  if (!quota) return null;

  const pct = quota.limit === 999999 ? 100 : Math.round((quota.used / quota.limit) * 100);
  const isWarning = pct >= 80 && quota.limit !== 999999;
  const isFull = quota.used >= quota.limit && quota.limit !== 999999;

  return (
    <div className="card card-sm" style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>
          <Zap size={13} style={{ color: "var(--primary)" }} />
          Monthly Usage
        </span>
        <span className={`badge ${isFull ? "badge-error" : isWarning ? "badge-orange" : "badge-muted"}`}
          style={isFull ? { background: "rgba(224,82,82,0.15)", color: "var(--error)", borderColor: "rgba(224,82,82,0.25)" } : {}}>
          {quota.plan}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>{quota.used}</span>
        <span style={{ color: "var(--muted)" }}>
          {quota.limit === 999999 ? "∞" : quota.limit} emails
        </span>
      </div>
      {quota.limit !== 999999 && (
        <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(pct, 100)}%`,
            background: isFull ? "var(--error)" : isWarning ? "var(--primary)" : "var(--primary-d)",
            borderRadius: 4,
            transition: "width 0.4s ease",
          }} />
        </div>
      )}
    </div>
  );
}
