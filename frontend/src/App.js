import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Bell, Moon, Sun } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { auth } from "./firebase";
import { loadUserLibrary, saveUserLibrary } from "./services/userLibrary";
import Login from "./Login";
import DashboardView from "./components/DashboardView";
import HistoryView from "./components/HistoryView";
import SavedView from "./components/SavedView";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const THEME_STORAGE_KEY = "piggle_theme";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySyncing, setLibrarySyncing] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || "dark"
  );
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [inputMethod, setInputMethod] = useState("type");
  const [fileName, setFileName] = useState("");
  const [savedCards, setSavedCards] = useState([]);
  const [studyHistory, setStudyHistory] = useState([]);
  const [lastRequest, setLastRequest] = useState(null);
  const didLoadLibraryRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLibrary() {
      if (!user?.uid) {
        didLoadLibraryRef.current = false;
        setSavedCards([]);
        setStudyHistory([]);
        setLibraryLoading(false);
        return;
      }

      setLibraryLoading(true);

      try {
        const library = await loadUserLibrary(user.uid);

        if (!cancelled) {
          setSavedCards(library.savedCards);
          setStudyHistory(library.studyHistory);
          didLoadLibraryRef.current = true;
        }
      } catch (err) {
        console.error("Failed to load cloud library:", err);

        if (!cancelled) {
          setError(
            "We couldn't load your saved library from the cloud right now. You can still keep studying."
          );
          didLoadLibraryRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      }
    }

    hydrateLibrary();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !didLoadLibraryRef.current) {
      return;
    }

    let cancelled = false;
    setLibrarySyncing(true);

    const timeoutId = setTimeout(async () => {
      try {
        await saveUserLibrary(user.uid, { savedCards, studyHistory });
      } catch (err) {
        console.error("Failed to sync cloud library:", err);

        if (!cancelled) {
          setError(
            "Your latest changes couldn't be synced to the cloud. We'll try again on your next update."
          );
        }
      } finally {
        if (!cancelled) {
          setLibrarySyncing(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [savedCards, studyHistory, user]);

  const handleToggleSave = (card) => {
    setSavedCards((prev) => {
      const exists = prev.find((currentCard) => currentCard.question === card.question);

      if (exists) {
        return prev.filter((currentCard) => currentCard.question !== card.question);
      }

      return [...prev, card];
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isText =
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md");

    if (!isPdf && !isText) {
      setError("Currently only .pdf, .txt and .md files are supported.");
      return;
    }

    setFileName(file.name);
    setLoading(true);

    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let index = 1; index <= pdf.numPages; index += 1) {
          const page = await pdf.getPage(index);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          fullText += `${pageText}\n`;
        }

        setNotes(fullText);
      } else {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          setNotes(readerEvent.target.result);
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCards([]);
      setNotes("");
      setSessionTitle("");
      setError("");
      setSavedCards([]);
      setStudyHistory([]);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleGenerate = async () => {
    const trimmedNotes = notes.trim();

    if (!trimmedNotes) {
      return;
    }

    const requestPayload = {
      text: trimmedNotes,
      model: selectedModel,
      topic: sessionTitle.trim(),
    };
    setLastRequest(requestPayload);
    setLoading(true);
    setError("");
    setCards([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setCards(data.cards);

      const newEntry = {
        id: Date.now(),
        title:
          sessionTitle.trim() ||
          `${trimmedNotes.slice(0, 30)}${trimmedNotes.length > 30 ? "..." : ""}`,
        date: new Date().toLocaleString(),
        cards: data.cards,
        source: trimmedNotes,
      };

      setStudyHistory((prev) => [newEntry, ...prev]);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "We couldn't reach the flashcard service. Check your deployment URLs or try again in a moment."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const retryGenerate = () => {
    if (!lastRequest?.text?.trim()) {
      return;
    }

    setNotes(lastRequest.text);
    setSelectedModel(lastRequest.model);
    handleGenerate();
  };

  const openHistoryItem = (item) => {
    setCards(item.cards);
    setNotes(item.source);
    setSessionTitle(item.title);
    setActiveTab("dashboard");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            inputMethod={inputMethod}
            setInputMethod={setInputMethod}
            notes={notes}
            setNotes={setNotes}
            fileName={fileName}
            setFileName={setFileName}
            loading={loading}
            error={error}
            cards={cards}
            handleGenerate={handleGenerate}
            handleFileUpload={handleFileUpload}
            handleToggleSave={handleToggleSave}
            savedCards={savedCards}
            sessionTitle={sessionTitle}
            setSessionTitle={setSessionTitle}
            retryGenerate={lastRequest ? retryGenerate : null}
          />
        );
      case "history":
        return (
          <HistoryView studyHistory={studyHistory} openHistoryItem={openHistoryItem} />
        );
      case "saved":
        return (
          <SavedView savedCards={savedCards} handleToggleSave={handleToggleSave} />
        );
      case "settings":
        return (
          <SettingsView
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            theme={theme}
            setTheme={setTheme}
            librarySyncing={librarySyncing}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading || libraryLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner spinner--lg" />
        <p>{authLoading ? "Initializing Piggle..." : "Loading your cloud library..."}</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      {showNotif && (
        <div className="notification-toast animate-in">
          <Bell size={16} />
          <span>No new notifications at this time.</span>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleSignOut={handleSignOut}
      />

      <main className="main-area">
        <TopBar user={user} handleBellClick={handleBellClick} />

        <div className="content-scroll">
          <div className="content-container">{renderContent()}</div>
        </div>
      </main>

      <button
        className="floating-theme-toggle"
        onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
}

export default App;
