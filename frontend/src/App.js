// ─────────────────────────────────────────────────────────
//  Smart Study Assistant — Redesigned App.js (React)
// ─────────────────────────────────────────────────────────
import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import * as pdfjsLib from 'pdfjs-dist';

import Login from "./Login";
import "./App.css";


// ── Icons ──
import {
  LayoutDashboard,
  History,
  Bookmark,
  Settings,
  LogOut,
  Search,
  Bell,
  Sparkles,
  Brain,
  ChevronRight,
  MousePointerClick,
  Plus,
  BookOpen,
  Upload,
  FileText,
  X,
  Sun,
  Moon
} from "lucide-react";

// Set worker path for PDF.js (v5.x uses .mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Flashcard Component ──
function Flashcard({ question, answer, index, onSave, isSaved }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="modern-card-container animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
      <div
        className={`modern-card-inner ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front */}
        <div className="modern-card-front">
          <div className="card-badge badge-q">Question</div>
          <div className="card-content">{question}</div>
          <div className="card-footer">
            <MousePointerClick size={14} />
            <span>Click to flip</span>
          </div>
        </div>

        {/* Back */}
        <div className="modern-card-back">
          <div className="card-badge badge-a">Answer</div>
          <div className="card-content">{answer}</div>
          <div className="card-footer">
            <MousePointerClick size={14} />
            <span>Click to return</span>
          </div>
        </div>
      </div>

      <button
        className={`card-save-btn ${isSaved ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
      >
        <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

// ── Loading Skeleton ──
function CardSkeleton() {
  return (
    <div className="skeleton skeleton-card"></div>
  );
}

// ── Main App Dashboard ──
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [inputMethod, setInputMethod] = useState("type"); // 'type' or 'upload'
  const [fileName, setFileName] = useState("");
  const [savedCards, setSavedCards] = useState(() => {
    return JSON.parse(localStorage.getItem("saved_cards") || "[]");
  });

  useEffect(() => {
    localStorage.setItem("saved_cards", JSON.stringify(savedCards));
  }, [savedCards]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleSave = (card) => {
    setSavedCards(prev => {
      const exists = prev.find(c => c.question === card.question);
      if (exists) {
        return prev.filter(c => c.question !== card.question);
      }
      return [...prev, card];
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");

    if (!isPdf && !isText) {
      setError("Currently only .pdf, .txt and .md files are supported.");
      return;
    }

    setFileName(file.name);
    setLoading(true); // Show loading while parsing large PDFs

    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }

        setNotes(fullText);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setNotes(event.target.result);
        };
        reader.readAsText(file);
      }
      setError("");
    } catch (err) {
      console.error("File processing error:", err);
      setError("Failed to process file. Please ensure it is not corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCards([]);
      setNotes("");
      setError("");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleGenerate = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setError("");
    setCards([]);

    try {
      const res = await fetch("http://localhost:5000/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notes, model: selectedModel }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setCards(data.cards);

      // Save to local history
      const history = JSON.parse(localStorage.getItem("study_history") || "[]");
      const newEntry = {
        id: Date.now(),
        title: notes.slice(0, 30) + (notes.length > 30 ? "..." : ""),
        date: new Date().toLocaleString(),
        cards: data.cards,
        source: notes
      };
      localStorage.setItem("study_history", JSON.stringify([newEntry, ...history]));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="page-header">
              <h2>Piggle Dashboard</h2>
              <p>Ai Generated high-quality flashcards from your study material in seconds.</p>
            </div>

            <section className="redesign-input-card">
              <div className="input-toggle-row">
                <button
                  className={`toggle-btn ${inputMethod === "type" ? "active" : ""}`}
                  onClick={() => setInputMethod("type")}
                >
                  <FileText size={16} />
                  Type Notes
                </button>
                <button
                  className={`toggle-btn ${inputMethod === "upload" ? "active" : ""}`}
                  onClick={() => setInputMethod("upload")}
                >
                  <Upload size={16} />
                  Upload File
                </button>
              </div>

              {inputMethod === "type" ? (
                <>
                  <label htmlFor="notes">Study Material</label>
                  <textarea
                    id="notes"
                    className="redesign-textarea"
                    placeholder="Paste your lecture notes, book chapters, or articles here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </>
              ) : (
                <div className="upload-zone">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden-input"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md"
                  />
                  {fileName ? (
                    <div className="file-selected">
                      <div className="file-info">
                        <FileText size={24} className="text-primary" />
                        <div>
                          <p className="file-name">{fileName}</p>
                          <p className="file-status">File ready for generation</p>
                        </div>
                      </div>
                      <button className="clear-file" onClick={() => { setFileName(""); setNotes(""); }}>
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-upload" className="upload-label">
                      <div className="upload-icon">
                        <Upload size={32} />
                      </div>
                      <p>Click to upload or drag and drop</p>
                      <span>Supports .pdf, .txt, .md (Max 10MB)</span>
                    </label>
                  )}
                </div>
              )}

              <div className="action-row">
                <button
                  className="btn btn-primary"
                  disabled={loading || !notes.trim()}
                  onClick={handleGenerate}
                >
                  {loading ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Sparkles size={16} />}
                  {loading ? "Generating..." : "Generate Cards"}
                </button>
              </div>
            </section>

            {error && (
              <div className="error-banner" style={{ marginBottom: '32px' }}>
                <span>{error}</span>
              </div>
            )}

            <div className="page-header" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600' }}>
                {cards.length > 0 ? "Generated Flashcards" : "Your Session"}
              </h3>
            </div>

            {loading ? (
              <div className="flashcard-grid">
                {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : cards.length > 0 ? (
              <div className="flashcard-grid">
                {cards.map((card, i) => (
                  <Flashcard
                    key={i}
                    index={i}
                    question={card.question}
                    answer={card.answer}
                    onSave={() => handleToggleSave(card)}
                    isSaved={savedCards.some(c => c.question === card.question)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-redesign animate-in">
                <div className="empty-illustration">
                  <BookOpen size={48} />
                </div>
                <h3>Start Learning</h3>
                <p>Add some study material above to generate your first flashcard set.</p>
              </div>
            )}
          </>
        );

      case "history":
        const history = JSON.parse(localStorage.getItem("study_history") || "[]");
        return (
          <div className="animate-in">
            <div className="page-header">
              <h2>Study History</h2>
              <p>Review your previous generation sessions and saved materials.</p>
            </div>

            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item" onClick={() => {
                    setCards(item.cards);
                    setNotes(item.source);
                    setActiveTab("dashboard");
                  }}>
                    <div className="history-icon">
                      <Brain size={20} />
                    </div>
                    <div className="history-info">
                      <h4>{item.title}</h4>
                      <span>{item.date} • {item.cards.length} cards</span>
                    </div>
                    <ChevronRight size={18} className="history-arrow" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-redesign">
                <div className="empty-illustration">
                  <History size={48} />
                </div>
                <h3>No History Yet</h3>
                <p>Your generated flashcard sets will appear here for easy access.</p>
              </div>
            )}
          </div>
        );

      case "saved":
        return (
          <div className="animate-in">
            <div className="page-header">
              <h2>Saved Sets</h2>
              <p>Your curated collection of important flashcards.</p>
            </div>

            {savedCards.length > 0 ? (
              <div className="flashcard-grid">
                {savedCards.map((card, i) => (
                  <Flashcard
                    key={i}
                    index={i}
                    question={card.question}
                    answer={card.answer}
                    onSave={() => handleToggleSave(card)}
                    isSaved={true}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-redesign">
                <div className="empty-illustration">
                  <Bookmark size={48} />
                </div>
                <h3>No saved cards</h3>
                <p>Bookmark individual cards from the dashboard to see them here.</p>
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div className="animate-in">
            <div className="page-header">
              <h2>Settings</h2>
              <p>Manage your account preferences and application theme.</p>
            </div>
            <div className="redesign-input-card">
              <div className="settings-row">
                <div>
                  <h4 style={{ marginBottom: '4px' }}>AI Model</h4>
                  <p style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                    Currently using: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                      {selectedModel.split("/")[1].toUpperCase()}
                    </span>
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedModel(prev =>
                    prev === "google/gemini-2.0-flash-001"
                      ? "google/gemini-pro"
                      : "google/gemini-2.0-flash-001"
                  )}
                >
                  Switch Model
                </button>
              </div>
              <div className="settings-divider" />
              <div className="settings-row">
                <div>
                  <h4 style={{ marginBottom: '4px' }}>Theme</h4>
                  <p style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                    Current mode: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{theme === "dark" ? "Dark" : "Light"}</span>
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
                >
                  Toggle {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner spinner--lg" />
        <p>Initializing Pj.AI...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }


  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {showNotif && (
        <div className="notification-toast animate-in">
          <Bell size={16} />
          <span>No new notifications at this time.</span>
        </div>
      )}
      {/* Sidebar Navigation */}
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

      {/* Main Area */}
      <main className="main-area">
        {/* Top Global Bar */}
        <header className="top-bar">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="Search your flashcards..." />
          </div>

          <div className="top-actions">
            <button className="nav-item" style={{ padding: '8px' }} onClick={handleBellClick}>
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{user.displayName || "User"}</span>
                <span style={{ fontSize: '11px', color: 'var(--neutral-500)' }}>Pro Student</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="content-scroll">
          <div className="content-container">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Floating Theme Toggle */}
      <button
        className="floating-theme-toggle"
        onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
}

export default App;
