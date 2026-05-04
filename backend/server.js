require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 25000;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX_REQUESTS =
  Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20;

const allowedOrigins = (process.env.FRONTEND_URL || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

const requestCounts = new Map();

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins.includes(origin.replace(/\/$/, ""));
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const current = requestCounts.get(ip);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment and try again.",
    });
  }

  current.count += 1;
  return next();
}

function validateGeneratePayload(req, res, next) {
  const { text, model, topic } = req.body ?? {};

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Please provide study text." });
  }

  if (text.length > 20_000) {
    return res.status(400).json({
      error: "Study text is too long. Please keep it under 20,000 characters.",
    });
  }

  if (model && typeof model !== "string") {
    return res.status(400).json({ error: "Model must be a string." });
  }

  if (topic && typeof topic !== "string") {
    return res.status(400).json({ error: "Topic must be a string." });
  }

  return next();
}

function buildFlashcardInstructions(topic) {
  const topicInstruction =
    topic && topic.trim().length > 0
      ? `Focus the flashcards on the topic "${topic.trim()}". Use the user's material only to generate questions and answers that are directly relevant to that topic.`
      : "Infer the main topic from the user's material and keep every flashcard tightly focused on that topic.";

  return [
    "You are a study aid.",
    "Generate between 30 and 40 flashcards as a JSON array of objects.",
    "Each object must have a 'question' and 'answer' key.",
    topicInstruction,
    "Make the questions Higher-Order Thinking Skills (HOTS) focused.",
    "Prioritize analysis, application, evaluation, comparison, inference, problem-solving, and explanation over simple memorization.",
    "Use clear, specific prompts that encourage critical thinking about the topic.",
    "Keep answers concise, accurate, and grounded in the provided material.",
    "Output ONLY the raw JSON array. Do not include markdown or backticks.",
  ].join(" ");
}

function extractCardsFromContent(rawContent) {
  const cleaned = rawContent.replace(/```json\s*|```\s*/gi, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (_primaryError) {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

    if (!arrayMatch) {
      throw new Error("No JSON array found in model response.");
    }

    return JSON.parse(arrayMatch[0]);
  }
}

function normalizeCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("AI did not return a valid flashcard list.");
  }

  const normalized = cards.filter(
    (card) =>
      card &&
      typeof card.question === "string" &&
      typeof card.answer === "string"
  );

  if (normalized.length === 0) {
    throw new Error("AI did not return a valid flashcard list.");
  }

  return normalized;
}

async function withTimeout(requestFactory) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await requestFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestOpenRouterFlashcards(text, model, topic) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_KEY_MISSING");
  }

  return withTimeout(async (signal) => {
    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: buildFlashcardInstructions(topic),
            },
            {
              role: "user",
              content: text,
            },
          ],
        }),
        signal,
      }
    );

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error("OpenRouter error:", errBody);

      if (aiResponse.status === 402) {
        throw new Error("OPENROUTER_CREDITS");
      }

      throw new Error("OPENROUTER_UNAVAILABLE");
    }

    const data = await aiResponse.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("EMPTY_RESPONSE");
    }

    return normalizeCards(extractCardsFromContent(raw));
  });
}

async function requestGeminiFlashcards(text, topic) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_KEY_MISSING");
  }

  return withTimeout(async (signal) => {
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: buildFlashcardInstructions(topic),
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
        }),
        signal,
      }
    );

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error("Gemini error:", errBody);
      throw new Error("GEMINI_UNAVAILABLE");
    }

    const data = await aiResponse.json();
    const raw =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!raw) {
      throw new Error("EMPTY_RESPONSE");
    }

    return normalizeCards(extractCardsFromContent(raw));
  });
}

async function requestFlashcards(text, model, topic) {
  const providerErrors = [];

  try {
    const cards = await requestOpenRouterFlashcards(text, model, topic);
    return { cards, provider: "openrouter" };
  } catch (err) {
    providerErrors.push(err.message);

    if (
      ![
        "OPENROUTER_CREDITS",
        "OPENROUTER_UNAVAILABLE",
        "OPENROUTER_KEY_MISSING",
      ].includes(err.message)
    ) {
      throw err;
    }
  }

  try {
    const cards = await requestGeminiFlashcards(text, topic);
    return { cards, provider: "gemini" };
  } catch (err) {
    providerErrors.push(err.message);

    if (err.message === "GEMINI_KEY_MISSING") {
      throw new Error(
        "The server has no available AI provider. Configure OpenRouter credits or add GEMINI_API_KEY."
      );
    }

    if (err.message === "GEMINI_UNAVAILABLE") {
      throw new Error(
        "All configured AI providers are currently unavailable. Please try again later."
      );
    }

    throw err;
  } finally {
    if (providerErrors.length > 0) {
      console.log("Provider fallback trail:", providerErrors.join(" -> "));
    }
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked for this origin."));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.send("Smart Study Assistant API is running.");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasOpenRouterKey: Boolean(OPENROUTER_API_KEY),
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    allowedOrigins,
  });
});

app.post(
  "/api/generate-flashcards",
  rateLimit,
  validateGeneratePayload,
  async (req, res) => {
    const { text, model: requestedModel, topic } = req.body;
    const modelToUse = requestedModel || "google/gemini-2.0-flash-001";

    try {
      console.log(`Generating flashcards using model: ${modelToUse}`);
      const { cards, provider } = await requestFlashcards(
        text.trim(),
        modelToUse,
        topic?.trim() || ""
      );

      return res.json({ cards, provider });
    } catch (err) {
      console.error("Server error:", err);

      if (err.name === "AbortError") {
        return res.status(504).json({
          error: "The AI request timed out. Please try again in a moment.",
        });
      }

      if (
        err.message === "EMPTY_RESPONSE" ||
        err.message === "No JSON array found in model response." ||
        err.message === "AI did not return a valid flashcard list."
      ) {
        return res.status(500).json({
          error: "The AI returned an unexpected response. Please try again.",
        });
      }

      if (
        err.message ===
          "The server has no available AI provider. Configure OpenRouter credits or add GEMINI_API_KEY." ||
        err.message ===
          "All configured AI providers are currently unavailable. Please try again later."
      ) {
        return res.status(502).json({ error: err.message });
      }

      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

app.use((err, _req, res, _next) => {
  if (err.message === "CORS blocked for this origin.") {
    return res.status(403).json({
      error:
        "This website is not allowed to contact the API. Check FRONTEND_URL.",
    });
  }

  console.error("Unhandled server error:", err);
  return res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
