import React from "react";
import { BookOpen, FileText, Sparkles, Upload, X } from "lucide-react";
import Flashcard from "./Flashcard";
import CardSkeleton from "./CardSkeleton";

function DashboardView({
  inputMethod,
  setInputMethod,
  notes,
  setNotes,
  fileName,
  setFileName,
  loading,
  error,
  cards,
  handleGenerate,
  handleFileUpload,
  handleToggleSave,
  savedCards,
  sessionTitle,
  setSessionTitle,
  retryGenerate,
}) {
  return (
    <>
      <div className="page-header">
        <h2>Piggle Dashboard</h2>
        <p>AI-generated high-quality flashcards from your study material in seconds.</p>
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

        <label htmlFor="session-title">Topic / Set Title</label>
        <input
          id="session-title"
          className="redesign-textarea"
          style={{ minHeight: "unset", height: "48px", marginBottom: "16px" }}
          placeholder="Optional topic or title, like Photosynthesis or World War II"
          value={sessionTitle}
          onChange={(event) => setSessionTitle(event.target.value)}
        />

        {inputMethod === "type" ? (
          <>
            <label htmlFor="notes">Study Material</label>
            <textarea
              id="notes"
              className="redesign-textarea"
              placeholder="Paste your lecture notes, book chapters, or articles here..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
                <button
                  className="clear-file"
                  onClick={() => {
                    setFileName("");
                    setNotes("");
                  }}
                >
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
            {loading ? (
              <div className="spinner" style={{ width: "14px", height: "14px" }} />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? "Generating..." : "Generate Cards"}
          </button>
        </div>
      </section>

      {error && (
        <div className="error-banner" style={{ marginBottom: "32px" }}>
          <span>{error}</span>
          {retryGenerate && (
            <button className="btn btn-secondary" onClick={retryGenerate}>
              Try Again
            </button>
          )}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "600" }}>
          {cards.length > 0 ? "Generated Flashcards" : "Your Session"}
        </h3>
      </div>

      {loading ? (
        <div className="flashcard-grid">
          {[...Array(6)].map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : cards.length > 0 ? (
        <div className="flashcard-grid">
          {cards.map((card, index) => (
            <Flashcard
              key={`${card.question}-${index}`}
              index={index}
              question={card.question}
              answer={card.answer}
              onSave={() => handleToggleSave(card)}
              isSaved={savedCards.some((savedCard) => savedCard.question === card.question)}
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
}

export default DashboardView;
