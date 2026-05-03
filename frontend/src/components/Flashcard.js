import React, { useState } from "react";
import { Bookmark, MousePointerClick } from "lucide-react";

function Flashcard({ question, answer, index, onSave, isSaved }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="modern-card-container animate-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`modern-card-inner ${isFlipped ? "flipped" : ""}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="modern-card-front">
          <div className="card-badge badge-q">Question</div>
          <div className="card-content">{question}</div>
          <div className="card-footer">
            <MousePointerClick size={14} />
            <span>Click to flip</span>
          </div>
        </div>

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
        className={`card-save-btn ${isSaved ? "active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onSave();
        }}
      >
        <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export default Flashcard;
