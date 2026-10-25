const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- tiny JSON-file store ----------
let db = { questions: [] };

function load() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    db = {
      questions: [
        {
          id: crypto.randomUUID(),
          title: "How do I run this project locally?",
          body: "I just cloned the repo. What are the steps to start the Q&A board?",
          author: "Welcome Bot",
          tags: ["help", "getting-started"],
          votes: 1,
          createdAt: new Date().toISOString(),
          answers: [
            {
              id: crypto.randomUUID(),
              body: "Run `npm install` and then `npm start`, then open http://localhost:3000.",
              author: "Welcome Bot",
              votes: 2,
              accepted: true,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };
    save();
  }
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Could not save data:", err.message);
  }
}

// ---------- helpers ----------
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

function summary(q) {
  return {
    id: q.id,
    title: q.title,
    body: q.body,
    author: q.author,
    tags: q.tags,
    votes: q.votes,
    createdAt: q.createdAt,
    answerCount: q.answers.length,
    solved: q.answers.some((a) => a.accepted),
  };
}

function findQuestion(req, res) {
  const q = db.questions.find((x) => x.id === req.params.id);
  if (!q) res.status(404).json({ error: "Question not found" });
  return q;
}

// ---------- API ----------
// List / search questions
app.get("/api/questions", (req, res) => {
  const search = clean(req.query.q, 100).toLowerCase();
  const tag = clean(req.query.tag, 30).toLowerCase();
  const sort = req.query.sort === "votes" ? "votes" : "new";

  let list = db.questions.filter((q) => {
    const matchesSearch =
      !search ||
      q.title.toLowerCase().includes(search) ||
      q.body.toLowerCase().includes(search);
    const matchesTag = !tag || q.tags.includes(tag);
    return matchesSearch && matchesTag;
  });

  list.sort((a, b) =>
    sort === "votes"
      ? b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json(list.map(summary));
});

// Create a question
app.post("/api/questions", (req, res) => {
  const title = clean(req.body.title, 150);
  const body = clean(req.body.body, 5000);
  const author = clean(req.body.author, 40) || "Anonymous";
  const tags = [
    ...new Set(
      String(req.body.tags ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean)
    ),
  ].slice(0, 5);

  if (title.length < 5) return res.status(400).json({ error: "Title must be at least 5 characters." });
  if (body.length < 10) return res.status(400).json({ error: "Details must be at least 10 characters." });

  const q = {
    id: crypto.randomUUID(),
    title,
    body,
    author,
    tags,
    votes: 0,
    createdAt: new Date().toISOString(),
    answers: [],
  };
  db.questions.push(q);
  save();
  res.status(201).json(summary(q));
});

// Get one question with its answers
app.get("/api/questions/:id", (req, res) => {
  const q = findQuestion(req, res);
  if (!q) return;
  const answers = [...q.answers].sort(
    (a, b) => Number(b.accepted) - Number(a.accepted) || b.votes - a.votes
  );
  res.json({ ...summary(q), answers });
});

// Post an answer
app.post("/api/questions/:id/answers", (req, res) => {
  const q = findQuestion(req, res);
  if (!q) return;
  const body = clean(req.body.body, 5000);
  const author = clean(req.body.author, 40) || "Anonymous";
  if (body.length < 2) return res.status(400).json({ error: "Answer cannot be empty." });

  const a = {
    id: crypto.randomUUID(),
    body,
    author,
    votes: 0,
    accepted: false,
    createdAt: new Date().toISOString(),
  };
  q.answers.push(a);
  save();
  res.status(201).json(a);
});

// Vote on a question (delta = 1 or -1)
app.post("/api/questions/:id/vote", (req, res) => {
  const q = findQuestion(req, res);
  if (!q) return;
  q.votes += req.body.delta === -1 ? -1 : 1;
  save();
  res.json({ votes: q.votes });
});

// Vote on an answer
app.post("/api/questions/:id/answers/:aid/vote", (req, res) => {
  const q = findQuestion(req, res);
  if (!q) return;
  const a = q.answers.find((x) => x.id === req.params.aid);
  if (!a) return res.status(404).json({ error: "Answer not found" });
  a.votes += req.body.delta === -1 ? -1 : 1;
  save();
  res.json({ votes: a.votes });
});

// Accept an answer (only one per question)
app.post("/api/questions/:id/answers/:aid/accept", (req, res) => {
  const q = findQuestion(req, res);
  if (!q) return;
  const a = q.answers.find((x) => x.id === req.params.aid);
  if (!a) return res.status(404).json({ error: "Answer not found" });
  const wasAccepted = a.accepted;
  q.answers.forEach((x) => (x.accepted = false));
  a.accepted = !wasAccepted;
  save();
  res.json({ accepted: a.accepted });
});

// Health check (useful for hosting platforms)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

load();
app.listen(PORT, () => console.log(`Q&A board running on http://localhost:${PORT}`));
