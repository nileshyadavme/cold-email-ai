import Link from "next/link";
import { useRouter } from "next/router";
import { Mail, History, Users, CreditCard, LogOut, Zap, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import QuotaBadge from "../ui/QuotaBadge";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Generate", icon: Mail },
  { href: "/bulk", label: "Bulk", icon: Users },
  { href: "/history", label: "History", icon: History },
  { href: "/pricing", label: "Upgrade", icon: CreditCard },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: "var(--primary)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              MailCraft
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              AI
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--text)" : "var(--muted)",
                background: active ? "var(--surface-2)" : "transparent",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--text-2)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--muted)"; }}
              >
                <Icon size={15} style={{ color: active ? "var(--primary)" : "inherit" }} />
                {label}
                {label === "Upgrade" && (
                  <span className="badge badge-orange" style={{ marginLeft: "auto", fontSize: 9, padding: "2px 6px" }}>
                    Pro
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quota */}
      <div style={{ padding: "0 10px 10px" }}>
        <QuotaBadge key={user?.plan} />
      </div>

      {/* User */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
