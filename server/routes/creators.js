const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/creators
router.get('/', async (req, res) => {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.bio,
      c.location,
      c.website,
      c.created_at,
      COUNT(p.id) AS project_count,
      COALESCE(SUM(f.total_pledged), 0) AS total_raised
    FROM creators c
    LEFT JOIN projects p ON p.creator_id = c.id
    LEFT JOIN financials f ON f.project_id = p.id
    GROUP BY c.id
    ORDER BY c.created_at DESC;
  `;

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching creators', error);
    res.status(500).json({ error: 'Failed to fetch creators' });
  }
});

// POST /api/creators (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, bio, location, website } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Creator name is required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO creators (name, bio, location, website)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [name.trim(), bio?.trim() || null, location?.trim() || null, website?.trim() || null],
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating creator', error);
    return res.status(500).json({ error: 'Failed to create creator' });
  }
});

// GET /api/creators/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const creatorSql = `
    SELECT
      c.id,
      c.name,
      c.bio,
      c.location,
      c.website,
      c.created_at,
      COUNT(p.id) AS project_count,
      COALESCE(SUM(f.total_pledged), 0) AS total_raised
    FROM creators c
    LEFT JOIN projects p ON p.creator_id = c.id
    LEFT JOIN financials f ON f.project_id = p.id
    WHERE c.id = $1
    GROUP BY c.id;
  `;

  const projectsSql = `
    SELECT
      p.id,
      p.title,
      p.description,
      p.status,
      p.platform,
      p.url,
      p.goal_amount,
      p.currency,
      p.created_at,
      f.total_pledged,
      f.backer_count,
      f.average_pledge
    FROM projects p
    LEFT JOIN financials f ON f.project_id = p.id
    WHERE p.creator_id = $1
    ORDER BY p.created_at DESC;
  `;

  try {
    const creatorResult = await pool.query(creatorSql, [id]);
    if (creatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const projectsResult = await pool.query(projectsSql, [id]);

    return res.json({
      creator: creatorResult.rows[0],
      projects: projectsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching creator details', error);
    return res.status(500).json({ error: 'Failed to fetch creator' });
  }
});

// DELETE /api/creators/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Creator id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM backer_projects WHERE project_id IN (SELECT id FROM projects WHERE creator_id = $1)',
      [id],
    );
    await client.query(
      'DELETE FROM financials WHERE project_id IN (SELECT id FROM projects WHERE creator_id = $1)',
      [id],
    );
    await client.query('DELETE FROM projects WHERE creator_id = $1', [id]);
    const { rowCount } = await client.query('DELETE FROM creators WHERE id = $1', [id]);

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Creator not found' });
    }

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting creator', error);
    return res.status(500).json({ error: 'Failed to delete creator' });
  } finally {
    client.release();
  }
});

module.exports = router;
