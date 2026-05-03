require("dotenv").config();
const express = require("express");
const cors = require("cors");
// const admin = require("firebase-admin"); // Uncomment when Firestore is needed

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL,
  })
);
app.use(express.json());

// Firebase / Firestore Setup (commented out)
// To enable Firestore persistence:
// 1. Download your service account key from Firebase Console
// 2. Save it as backend/serviceAccountKey.json
// 3. Uncomment the block below and the saveFlashcardSet call in the route
//
// admin.initializeApp({
//   credential: admin.credential.cert(require("./serviceAccountKey.json")),
// });
//
// const db = admin.firestore();
//
// async function saveFlashcardSet(cards) {
//   const docRef = await db.collection("flashcard_history").add({
//     cards,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   });
//   return docRef.id;
// }

app.post("/api/generate-flashcards", async (req, res) => {
  const { text, model: requestedModel } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Please provide study text." });
  }

  const modelToUse = requestedModel || "google/gemini-2.0-flash-001";

  try {
    console.log(`Generating flashcards using model: ${modelToUse}`);

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content:
                "You are a study aid. Extract 10 key concepts from the user's text and format them as a JSON array of objects. Each object must have a 'question' and 'answer' key. Output ONLY the raw JSON array. Do not include markdown or backticks.",
            },
            {
              role: "user",
              content: text,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error("OpenRouter error:", errBody);
      return res
        .status(502)
        .json({ error: "Failed to reach the AI service." });
    }

    const data = await aiResponse.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      return res.status(502).json({ error: "Empty response from the AI." });
    }

    let cards;
    try {
      const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
      cards = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr.message, "\nRaw:", raw);
      return res.status(500).json({
        error: "The AI returned malformed JSON. Please try again.",
      });
    }

    // saveFlashcardSet(cards).catch((err) =>
    //   console.error("Firestore save error:", err.message)
    // );

    return res.json({ cards });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/", (_req, res) => res.send("Smart Study Assistant API is running."));

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
