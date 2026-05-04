import React from "react";
import { Brain, ChevronRight, History, Trash2 } from "lucide-react";

function HistoryView({
  studyHistory,
  openHistoryItem,
  deleteHistoryItem,
  clearHistory,
}) {
  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Study History</h2>
        <p>Review your previous generation sessions and saved materials.</p>
      </div>

      {studyHistory.length > 0 ? (
        <>
          <div className="history-toolbar">
            <button className="btn btn-secondary" onClick={clearHistory}>
              Clear All History
            </button>
          </div>
          <div className="history-list">
            {studyHistory.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => openHistoryItem(item)}
              >
                <div className="history-icon">
                  <Brain size={20} />
                </div>
                <div className="history-info">
                  <h4>{item.title}</h4>
                  <span>
                    {item.date} • {item.cards.length} cards
                  </span>
                </div>
                <button
                  className="history-delete-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteHistoryItem(item.id);
                  }}
                  title="Delete study history item"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className="history-arrow" />
              </div>
            ))}
          </div>
        </>
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
}

export default HistoryView;
