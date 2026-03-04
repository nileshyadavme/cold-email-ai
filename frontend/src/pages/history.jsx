import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { getHistory } from "../utils/api";
import { Copy, Check, Clock } from "lucide-react";
import toast from "react-hot-toast";

function HistoryItem({ item }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${item.subject}\n\n${item.body}`);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.prospect_name}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.prospect_company}</span>
            <span className="badge badge-muted" style={{ marginLeft: "auto" }}>{item.tone_used}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📌 {item.subject}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); copy(); }} style={{ marginLeft: 12, flexShrink: 0 }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      {expanded && (
        <div>
          <div className="divider" />
          <div className="email-preview" style={{ fontSize: 12 }}>
            {item.body}
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} />
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory(50).then(r => setEmails(r.data.emails)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const rows = [["Prospect", "Company", "Subject", "Body", "Tone", "Date"]];
    emails.forEach(e => rows.push([e.prospect_name, e.prospect_company, e.subject, e.body.replace(/\n/g, " "), e.tone_used, e.created_at]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cold_emails.csv";
    a.click();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 40px", maxWidth: 800 }}>
        <div className="fade-up fade-up-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28 }}>History</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>{emails.length} emails generated</p>
          </div>
          {emails.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
          )}
        </div>

        {loading && <div style={{ color: "var(--muted)" }}>Loading...</div>}

        {!loading && emails.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <p style={{ color: "var(--text-2)", fontSize: 15 }}>No emails yet</p>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Generate your first email on the Dashboard</p>
          </div>
        )}

        {emails.map((email, i) => <HistoryItem key={email.id || i} item={email} />)}
      </main>
    </div>
  );
}
