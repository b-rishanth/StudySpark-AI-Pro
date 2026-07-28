require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require("groq-sdk");

const app = express();   // <-- THIS LINE MUST BE HERE

const PORT = process.env.PORT || 8080;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

console.log("Groq API Key loaded:", !!GROQ_API_KEY);
console.log("Model:", GROQ_MODEL);

const client = new Groq({
    apiKey: GROQ_API_KEY
});


/* --------------------------- Middleware --------------------------- */
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* --------------------------- Simple in-memory rate limiter --------------------------- */
// Fixed-window limiter: N requests per IP per window. Sufficient for a single-instance
// deployment (App Runner / Elastic Beanstalk). For multi-instance scale, swap for a
// Redis-backed limiter.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 12;
const rateBuckets = new Map();

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateBuckets.set(ip, bucket);

  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      message: `You're generating notes a little too fast. Please wait ${retryAfterSec}s and try again.`,
    });
  }
  next();
}

// Periodically clear stale buckets so memory doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt + RATE_LIMIT_WINDOW_MS) rateBuckets.delete(ip);
  }
}, 5 * 60 * 1000);

/* --------------------------- Prompt template --------------------------- */
function buildPrompt(topic) {
  return `You are StudySpark AI, an expert academic tutor who produces exam-ready, beautifully structured study notes for engineering and university students (including Anna University curriculum conventions).

Generate complete study notes for the topic: "${topic}"

Respond ONLY in Markdown. Use exactly the following top-level headings, in this order, each starting with "## " followed by the emoji and title shown below. Do not omit any section — if a section is less relevant to the topic, still include it with your best relevant content.

## 📖 Summary
A concise 3-5 sentence overview of the topic.

## 🎯 Learning Objectives
A bullet list of 4-6 objectives a student should be able to do after studying this.

## ⭐ Key Concepts
A bullet list of the core concepts/terms, each with a one-line explanation (use **bold** for the term).

## 🧠 Visual Explanation
If the topic is technical/process-based, include a simple ASCII diagram or flowchart inside a fenced code block (\`\`\`) showing the flow or structure. Otherwise, describe the mental model in a short paragraph.

## 📊 Comparison Table
A Markdown table comparing relevant approaches, types, or contrasting ideas related to the topic. Use at least 2 columns and 3 rows.

## 💡 Memory Tricks
1-2 mnemonics, acronyms, or analogies to help remember the topic.

## 🌍 Real-Life Example
A short real-world scenario or analogy that illustrates the topic in practice.

## ✅ Advantages
A bullet list of benefits or strengths.

## ❌ Disadvantages
A bullet list of limitations or drawbacks.

## 🎤 Viva Questions
4-6 likely oral-exam / viva questions (questions only, no answers) a student may be asked.

## 📚 Anna University 16-Mark Notes
A detailed, exam-style long-answer structure (introduction, 3-5 sub-points with explanation, conclusion) suitable for a 16-mark university answer.

## 🧠 Quiz
4 multiple-choice questions, each with 4 options labeled A-D and the correct answer indicated at the end of that question as "**Answer: X**".

## 📄 References
2-4 suggested reference sources (textbooks, standard docs, or reputable sites) as a bullet list — described generally, not as fake links.

Keep the tone clear, encouraging, and precise. Use Markdown bold, bullet lists, and tables where helpful. Do not add any text before "## 📖 Summary" or after the References section.`;
}

/* --------------------------- Routes --------------------------- */
app.post('/api/generate', rateLimit, async (req, res) => {
  try {
    const { topic } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ message: 'Please provide a study topic.' });
    }

    if (topic.length > 500) {
      return res.status(400).json({
        message: 'Topic is too long. Please keep it under 500 characters.'
      });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        message: 'Server is missing GROQ_API_KEY. Set it in your environment variables.'
      });
    }

    const prompt = buildPrompt(topic.trim());

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 4096
    });

    const markdown = response.choices?.[0]?.message?.content || '';

    if (!markdown.trim()) {
      return res.status(502).json({
        message: 'The AI returned an empty response. Please try again.'
      });
    }

    res.json({
      markdown,
      topic: topic.trim()
    });

  } catch (err) {
    console.error("========== FULL ERROR ==========");
    console.error(err);
    console.error("===============================");

    res.status(500).json({
      message: err.message,
      stack: err.stack
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: GROQ_MODEL,
    uptime: process.uptime()
  });
});


// SPA fallback — serve index.html for any non-API GET route.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});


/* --------------------------- Global error handler --------------------------- */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});


app.listen(PORT, () => {
  console.log(`✨ StudySpark AI Pro backend running on port ${PORT}`);

  if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY is not set. /api/generate will fail until it is configured.');
  }
});