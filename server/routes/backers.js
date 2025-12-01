const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/backers
router.get('/', async (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      email,
      country,
      created_at
    FROM backers
    ORDER BY created_at DESC;
  `;

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching backers', error);
    res.status(500).json({ error: 'Failed to fetch backers' });
  }
});

// GET /api/backers/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const backerSql = `
    SELECT
      id,
      name,
      email,
      country,
      created_at
    FROM backers
    WHERE id = $1;
  `;

  const historySql = `
    SELECT
      p.id,
      p.title,
      p.platform,
      p.status,
      p.goal_amount,
      p.image_url,
      bp.amount_pledged,
      bp.pledged_at
    FROM backer_projects bp
    JOIN projects p ON p.id = bp.project_id
    WHERE bp.backer_id = $1
    ORDER BY bp.pledged_at DESC;
  `;

  try {
    const backerResult = await pool.query(backerSql, [id]);
    if (!backerResult.rows.length) {
      return res.status(404).json({ error: 'Backer not found' });
    }

    const historyResult = await pool.query(historySql, [id]);

    return res.json({
      backer: backerResult.rows[0],
      projects: historyResult.rows,
    });
  } catch (error) {
    console.error('Error fetching backer', error);
    return res.status(500).json({ error: 'Failed to fetch backer' });
  }
});

// DELETE /api/backers/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Backer id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM backer_projects WHERE backer_id = $1', [id]);
    const { rowCount } = await client.query('DELETE FROM backers WHERE id = $1', [id]);

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Backer not found' });
    }

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting backer', error);
    return res.status(500).json({ error: 'Failed to delete backer' });
  } finally {
    client.release();
  }
});

module.exports = router;
