import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const LIBRARY_COLLECTION = "userLibraries";
const LEGACY_KEYS = {
  savedCards: "saved_cards",
  studyHistory: "study_history",
};

function getScopedStorageKey(baseKey, uid) {
  return uid ? `${baseKey}:${uid}` : null;
}

function readLegacyScopedStorage(baseKey, uid) {
  const storageKey = getScopedStorageKey(baseKey, uid);

  if (!storageKey) {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch (err) {
    console.error(`Failed to read ${baseKey} from localStorage:`, err);
    return [];
  }
}

function sanitizeCards(cards) {
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards
    .filter(
      (card) =>
        card &&
        typeof card.question === "string" &&
        typeof card.answer === "string"
    )
    .map((card) => ({
      question: card.question,
      answer: card.answer,
    }));
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (entry) =>
        entry &&
        typeof entry.id !== "undefined" &&
        typeof entry.title === "string" &&
        typeof entry.date === "string" &&
        typeof entry.source === "string"
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      source: entry.source,
      cards: sanitizeCards(entry.cards),
    }));
}

function getLegacyLibrary(uid) {
  return {
    savedCards: sanitizeCards(readLegacyScopedStorage(LEGACY_KEYS.savedCards, uid)),
    studyHistory: sanitizeHistory(
      readLegacyScopedStorage(LEGACY_KEYS.studyHistory, uid)
    ),
  };
}

export async function loadUserLibrary(uid) {
  const libraryRef = doc(db, LIBRARY_COLLECTION, uid);
  const snapshot = await getDoc(libraryRef);

  if (snapshot.exists()) {
    const data = snapshot.data();

    return {
      savedCards: sanitizeCards(data.savedCards),
      studyHistory: sanitizeHistory(data.studyHistory),
      source: "firestore",
    };
  }

  const legacyLibrary = getLegacyLibrary(uid);

  if (legacyLibrary.savedCards.length > 0 || legacyLibrary.studyHistory.length > 0) {
    await setDoc(libraryRef, {
      ...legacyLibrary,
      migratedFromLocalStorage: true,
      updatedAt: serverTimestamp(),
    });

    return { ...legacyLibrary, source: "migration" };
  }

  return {
    savedCards: [],
    studyHistory: [],
    source: "empty",
  };
}

export async function saveUserLibrary(uid, library) {
  const libraryRef = doc(db, LIBRARY_COLLECTION, uid);

  await setDoc(
    libraryRef,
    {
      savedCards: sanitizeCards(library.savedCards),
      studyHistory: sanitizeHistory(library.studyHistory),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
