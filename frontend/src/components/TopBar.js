import React from "react";
import { Bell, Search } from "lucide-react";

function TopBar({ user, handleBellClick }) {
  return (
    <header className="top-bar">
      <div className="search-bar">
        <Search size={16} />
        <input type="text" placeholder="Search your flashcards..." />
      </div>

      <div className="top-actions">
        <button className="nav-item" style={{ padding: "8px" }} onClick={handleBellClick}>
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <div className="avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <span>{(user.email?.[0] || "U").toUpperCase()}</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>
              {user.displayName || "User"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--neutral-500)" }}>
              Pro Student
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
