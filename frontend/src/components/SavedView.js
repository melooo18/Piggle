import React from "react";
import { Bookmark } from "lucide-react";
import Flashcard from "./Flashcard";

function SavedView({ savedCards, handleToggleSave }) {
  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Saved Sets</h2>
        <p>Your curated collection of important flashcards.</p>
      </div>

      {savedCards.length > 0 ? (
        <div className="flashcard-grid">
          {savedCards.map((card, index) => (
            <Flashcard
              key={`${card.question}-${index}`}
              index={index}
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
}

export default SavedView;
