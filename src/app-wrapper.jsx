import { useState, useEffect } from "react";
import { api } from "./api.js";
import App, { AuthGate } from "./pipeline-code.jsx";
import AdminDashboard from "./admin-dashboard.jsx";

const ROLES = [
  { key: "client", label: "Client Workspace", icon: "🏢", desc: "Lead gen, CRM, campaigns, AI tools", color: "#c4f04d" },
  { key: "admin", label: "Platform Admin", icon: "🛡️", desc: "All orgs, agencies, billing, system", color: "#4d9ef0" },
];

export default function AppWrapper() {
  const [role, setRole] = useState("client");
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user's actual role from JWT
  useEffect(() => {
    async function checkRole() {
      try {
        const result = await api.me();
        console.log("User role check result:", result);
        
        if (result?.user) {
          const userRoleFromDB = result.user.role || 'org_member';
          setUserRole(userRoleFromDB);
          console.log("User role set to:", userRoleFromDB);
          
          // If user is admin, show admin by default
          if (userRoleFromDB === 'platform_admin') {
            setRole('admin');
            console.log("Switching to admin view");
          }
        }
      } catch (err) {
        console.error("Failed to check user role:", err);
      } finally {
        setLoading(false);
      }
    }
    checkRole();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7a8e", fontFamily: "'DM Sans', sans-serif" }}>
        Loading...
      </div>
    );
  }

  // Filter roles based on user's actual role
  const availableRoles = userRole === 'platform_admin' 
    ? ROLES 
    : ROLES.filter(r => r.key === 'client');

  return (
    <AuthGate>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f" }}>
        {/* Role Switcher Bar (only show if user is admin) */}
        {availableRoles.length > 1 && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
            background: "#06060a", borderBottom: "1px solid #1e1e2e",
            flexShrink: 0, zIndex: 100
          }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#4d9ef0", marginRight: 8, letterSpacing: "0.05em" }}>CONSULTIX</span>
            <span style={{ fontSize: 9, color: "#4a4a5e", marginRight: 12 }}>PLATFORM</span>
            <div style={{ display: "flex", gap: 4 }}>
              {availableRoles.map(r => (
                <button 
                  key={r.key} 
                  onClick={() => setRole(r.key)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                    background: role === r.key ? r.color + "15" : "transparent",
                    border: `1px solid ${role === r.key ? r.color + "44" : "transparent"}`,
                    color: role === r.key ? r.color : "#7a7a8e",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                    transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: "#4a4a5e", fontFamily: "'JetBrains Mono', monospace" }}>
              {ROLES.find(r => r.key === role)?.desc}
            </span>
          </div>
        )}
        
        {/* Dashboard Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {role === "admin" && <AdminDashboard />}
          {role === "client" && <App />}
        </div>
      </div>
    </AuthGate>
  );
}
