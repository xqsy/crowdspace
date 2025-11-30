const express = require('express');
const pool = require('../db');
const { embedText, embedProject } = require('../services/embeddings');

const router = express.Router();

function dot(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function cosineSimilarity(a, b) {
  const denominator = norm(a) * norm(b);
  if (!denominator) {
    return 0;
  }
  return dot(a, b) / denominator;
}

// GET /api/search?query=...
router.get('/', async (req, res) => {
  const { query, status, platform, category } = req.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query parameter is required' });
  }

  const queryText = query.trim();

  try {
    const queryEmbedding = await embedText(queryText);

    const values = [];
    const where = [];

    if (status) {
      values.push(status);
      where.push(`p.status = $${values.length}`);
    }

    if (platform) {
      values.push(platform);
      where.push(`p.platform = $${values.length}`);
    }

    if (category) {
      values.push(category);
      where.push(`p.category = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT
        p.id,
        p.creator_id,
        p.title,
        p.description,
        p.category,
        p.platform,
        p.status,
        p.url,
        p.launch_date,
        p.end_date,
        p.goal_amount,
        p.currency,
        p.created_at,
        p.embedding,
        c.name AS creator_name,
        f.total_pledged,
        f.backer_count,
        f.average_pledge
      FROM projects p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN financials f ON f.project_id = p.id
      ${whereClause}
    `;

    const { rows } = await pool.query(sql, values);

    const projectsWithScores = [];

    for (const row of rows) {
      let embedding = row.embedding;

      // If embedding is stored as JSONB, pg usually parses it into JS automatically,
      // but we also handle the case where it's a JSON string.
      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch (e) {
          embedding = null;
        }
      }

      if (!embedding) {
        // Generate embedding using structured project format
        embedding = await embedProject({
          title: row.title,
          description: row.description,
          category: row.category,
          creator_name: row.creator_name,
        });
        row.embedding = embedding;

        // Store as proper JSON in jsonb column
        await pool.query('UPDATE projects SET embedding = $1::jsonb WHERE id = $2', [
          JSON.stringify(embedding),
          row.id,
        ]);
      }

      if (Array.isArray(embedding)) {
        const score = cosineSimilarity(queryEmbedding, embedding);
        projectsWithScores.push({ ...row, score });
      }
    }

    projectsWithScores.sort((a, b) => b.score - a.score);

    // Keep only the most relevant results.
    const MAX_RESULTS = 3;
    const MIN_SCORE = 0.15; // ignore almost-unrelated projects

    let limited = projectsWithScores.filter((project, index) => {
      if (index >= MAX_RESULTS) return false;
      return typeof project.score === 'number' && project.score >= MIN_SCORE;
    });

    // If everything is below threshold, still return top N so the UI is not empty.
    if (!limited.length) {
      limited = projectsWithScores.slice(0, MAX_RESULTS);
    }

    return res.json(limited);
  } catch (error) {
    console.error('Error in search endpoint', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
