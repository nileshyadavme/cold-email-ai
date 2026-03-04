import { useState } from "react";
import { Copy, Check, RefreshCw, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

export default function EmailResult({ result, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  if (!result) return null;

  const fullEmail = `Subject: ${result.subject}\n\n${result.body}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card fade-up" style={{ borderColor: "var(--primary-d)", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="badge badge-green">Generated</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              for {result.prospect_name} · {result.prospect_company}
            </span>
          </div>
          <h3 style={{ fontSize: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "var(--text)" }}>
            Your Cold Email
          </h3>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowReasoning(!showReasoning)}
            title="Show AI reasoning"
          >
            <Lightbulb size={14} />
            Why
          </button>
          {onRegenerate && (
            <button className="btn btn-ghost btn-sm" onClick={onRegenerate}>
              <RefreshCw size={14} />
              Redo
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* AI Reasoning */}
      {showReasoning && result.reasoning && (
        <div style={{
          background: "rgba(212,120,74,0.08)",
          border: "1px solid rgba(212,120,74,0.2)",
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: "var(--text-2)",
          lineHeight: 1.6,
        }}>
          <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI Reasoning
          </span>
          <p style={{ marginTop: 4 }}>{result.reasoning}</p>
        </div>
      )}

      {/* Email */}
      <div className="email-preview">
        <div className="email-subject">📌 Subject: {result.subject}</div>
        {result.body}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <span className="badge badge-muted">{result.tone_used}</span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          {result.generated_at ? new Date(result.generated_at).toLocaleTimeString() : ""}
        </span>
      </div>
    </div>
  );
}
