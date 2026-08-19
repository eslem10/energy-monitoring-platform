import React from "react";

export function SidebarDrawer({ isOpen, onClose, activeTab, onSelectTab, theme, onToggleTheme }) {
  if (!isOpen) return null;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-icon">⌂</div>
              <div>
                <h1>Smart House</h1>
                <p>Energy Monitoring</p>
              </div>
            </div>
            <button className="close-btn" style={{ width: "34px", height: "34px", fontSize: "16px" }} onClick={onClose}>✕</button>
          </div>

          <div className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("dashboard");
                onClose();
              }}
            >
              <span className="icon">📊</span> Main Dashboard
            </button>

            <button
              className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("reports");
                onClose();
              }}
            >
              <span className="icon">📄</span> Reports & Exports
            </button>

            <button
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("settings");
                onClose();
              }}
            >
              <span className="icon">⚙️</span> Settings & Budget
            </button>

            <button
              className={`nav-item ${activeTab === "diagnostics" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("diagnostics");
                onClose();
              }}
            >
              <span className="icon">📡</span> Network Diagnostics
            </button>

            <button
              className={`nav-item ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("notifications");
                onClose();
              }}
            >
              <span className="icon">!</span> Notifications
            </button>

            <button
              className={`nav-item ${activeTab === "assistant" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("assistant");
                onClose();
              }}
            >
              <span className="icon">🤖</span> AI Assistant
            </button>

            <button
              className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("profile");
                onClose();
              }}
            >
              <span className="icon">@</span> Profile
            </button>

            <button
              className={`nav-item ${activeTab === "invoice" ? "active" : ""}`}
              onClick={() => {
                onSelectTab("invoice");
                onClose();
              }}
            >
              <span className="icon">PDF</span> Facture STEG
            </button>

            <button
              className="nav-item"
              onClick={() => {
                onToggleTheme();
              }}
              style={{ marginTop: "12px", border: "1px solid var(--line)" }}
            >
              <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span> {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <p style={{ margin: "0 0 4px", fontWeight: 800 }}>Smart House v1.5</p>
          <p style={{ margin: 0, opacity: 0.8 }}>Budget & Alert Threshold Active</p>
        </div>
      </div>
    </div>
  );
}
