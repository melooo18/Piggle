import React from "react";

function SettingsView({
  selectedModel,
  setSelectedModel,
  theme,
  setTheme,
  librarySyncing,
}) {
  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Manage your account preferences and application theme.</p>
      </div>
      <div className="redesign-input-card">
        <div className="settings-row">
          <div>
            <h4 style={{ marginBottom: "4px" }}>AI Model</h4>
            <p style={{ fontSize: "12px", color: "var(--neutral-500)" }}>
              Currently using:{" "}
              <span style={{ color: "var(--primary)", fontWeight: "600" }}>
                {selectedModel.split("/")[1].toUpperCase()}
              </span>
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              setSelectedModel((prev) =>
                prev === "google/gemini-2.0-flash-001"
                  ? "google/gemini-pro"
                  : "google/gemini-2.0-flash-001"
              )
            }
          >
            Switch Model
          </button>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div>
            <h4 style={{ marginBottom: "4px" }}>Theme</h4>
            <p style={{ fontSize: "12px", color: "var(--neutral-500)" }}>
              Current mode:{" "}
              <span style={{ color: "var(--primary)", fontWeight: "600" }}>
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            Toggle {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div>
            <h4 style={{ marginBottom: "4px" }}>Cloud Sync</h4>
            <p style={{ fontSize: "12px", color: "var(--neutral-500)" }}>
              {librarySyncing
                ? "Syncing your study history and saved cards..."
                : "Your library is synced to Firestore for this account."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
