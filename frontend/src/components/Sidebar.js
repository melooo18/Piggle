import React from "react";
import { Bookmark, Brain, History, LayoutDashboard, LogOut, Settings } from "lucide-react";

function Sidebar({ activeTab, setActiveTab, handleSignOut }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-box">
          <Brain size={20} fill="currentColor" />
        </div>
        <h1>Piggle</h1>
      </div>

      <div className="nav-group">
        <div className="nav-label">Main</div>
        <div
          className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </div>
        <div
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={18} />
          Study History
        </div>
        <div
          className={`nav-item ${activeTab === "saved" ? "active" : ""}`}
          onClick={() => setActiveTab("saved")}
        >
          <Bookmark size={18} />
          Saved Sets
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">System</div>
        <div
          className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={18} />
          Settings
        </div>
        <div className="nav-item" onClick={handleSignOut}>
          <LogOut size={18} />
          Sign Out
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
