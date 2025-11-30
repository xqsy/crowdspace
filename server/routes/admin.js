const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, login, password_hash, name FROM admins WHERE login = $1',
      [login.toLowerCase().trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    const admin = result.rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    // Set session
    req.session.isAdmin = true;
    req.session.adminId = admin.id;
    req.session.adminLogin = admin.login;
    req.session.adminName = admin.name;

    return res.json({
      success: true,
      admin: {
        id: admin.id,
        login: admin.login,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// GET /api/admin/status - check if currently logged in as admin
router.get('/status', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({
      isAdmin: true,
      admin: {
        id: req.session.adminId,
        login: req.session.adminLogin,
        name: req.session.adminName,
      },
    });
  }
  return res.json({ isAdmin: false });
});

// GET /api/admin/backers - list all backers (admin only)
router.get('/backers', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.email,
        b.country,
        b.created_at,
        COALESCE(SUM(bp.amount_pledged), 0) as total_pledged,
        COUNT(bp.project_id) as projects_backed,
        STRING_AGG(DISTINCT p.title, ', ') as project_names
      FROM backers b
      LEFT JOIN backer_projects bp ON b.id = bp.backer_id
      LEFT JOIN projects p ON bp.project_id = p.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backers:', error);
    return res.status(500).json({ error: 'Failed to fetch backers' });
  }
});

// POST /api/admin/backers - create new backer (admin only)
router.post('/backers', requireAdmin, async (req, res) => {
  const { name, email, country } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO backers (name, email, country) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email?.trim() || null, country?.trim() || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating backer:', error);
    return res.status(500).json({ error: 'Failed to create backer' });
  }
});

// PUT /api/admin/backers/:id - update backer (admin only)
router.put('/backers/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, country } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE backers SET name = $1, email = $2, country = $3 WHERE id = $4 RETURNING *',
      [name.trim(), email?.trim() || null, country?.trim() || null, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Backer not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating backer:', error);
    return res.status(500).json({ error: 'Failed to update backer' });
  }
});

// DELETE /api/admin/backers/:id - delete backer (admin only)
router.delete('/backers/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM backer_projects WHERE backer_id = $1', [id]);
    const result = await client.query('DELETE FROM backers WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Backer not found' });
    }

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting backer:', error);
    return res.status(500).json({ error: 'Failed to delete backer' });
  } finally {
    client.release();
  }
});

// GET /api/admin/projects/:id/backers - get project backers for editing (admin only)
router.get('/projects/:id/backers', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        bp.backer_id,
        bp.amount_pledged,
        bp.pledged_at,
        b.name,
        b.email,
        b.country
      FROM backer_projects bp
      JOIN backers b ON b.id = bp.backer_id
      WHERE bp.project_id = $1
      ORDER BY bp.pledged_at DESC
    `, [id]);

    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project backers:', error);
    return res.status(500).json({ error: 'Failed to fetch project backers' });
  }
});

// PUT /api/admin/projects/:id/backers - update project backers (admin only)
router.put('/projects/:id/backers', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { backers } = req.body; // Array of { backer_id, amount_pledged }

  if (!Array.isArray(backers)) {
    return res.status(400).json({ error: 'Backers array is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current financials and backer totals BEFORE changes
    const currentFinancialsResult = await client.query(
      'SELECT COALESCE(total_pledged, 0) as total_pledged, COALESCE(backer_count, 0) as backer_count FROM financials WHERE project_id = $1',
      [id]
    );
    const currentFinancials = currentFinancialsResult.rows[0] || { total_pledged: 0, backer_count: 0 };
    
    // Get the sum of current backer_projects amounts (recent backers only)
    const oldBackerSumResult = await client.query(
      'SELECT COALESCE(SUM(amount_pledged), 0) as old_sum FROM backer_projects WHERE project_id = $1',
      [id]
    );
    const oldBackerSum = Number(oldBackerSumResult.rows[0].old_sum);

    // Delete existing backers for this project
    await client.query('DELETE FROM backer_projects WHERE project_id = $1', [id]);

    // Insert new/updated backers
    for (const backer of backers) {
      if (backer.backer_id && backer.amount_pledged > 0) {
        await client.query(
          'INSERT INTO backer_projects (backer_id, project_id, amount_pledged) VALUES ($1, $2, $3)',
          [backer.backer_id, id, backer.amount_pledged]
        );
      }
    }

    // Calculate new backer sum
    const newBackerSumResult = await client.query(
      'SELECT COALESCE(SUM(amount_pledged), 0) as new_sum, COUNT(*) as backer_count FROM backer_projects WHERE project_id = $1',
      [id]
    );
    const newBackerSum = Number(newBackerSumResult.rows[0].new_sum);
    const newBackerCount = Number(newBackerSumResult.rows[0].backer_count);

    // Calculate the difference and add to existing total
    // This preserves any funding that wasn't from recent backers
    const difference = newBackerSum - oldBackerSum;
    const newTotalPledged = Number(currentFinancials.total_pledged) + difference;
    
    // Use the larger of current backer count or new backer count
    // (in case there were more backers counted before that aren't in backer_projects)
    const totalBackerCount = Math.max(Number(currentFinancials.backer_count), newBackerCount);
    
    const avgPledge = totalBackerCount > 0 
      ? (newTotalPledged / totalBackerCount).toFixed(2)
      : null;

    await client.query(`
      UPDATE financials 
      SET total_pledged = $1, backer_count = $2, average_pledge = $3
      WHERE project_id = $4
    `, [newTotalPledged, totalBackerCount, avgPledge, id]);

    await client.query('COMMIT');

    // Return updated backers list
    const updatedResult = await pool.query(`
      SELECT 
        bp.backer_id,
        bp.amount_pledged,
        bp.pledged_at,
        b.name,
        b.email,
        b.country
      FROM backer_projects bp
      JOIN backers b ON b.id = bp.backer_id
      WHERE bp.project_id = $1
      ORDER BY bp.pledged_at DESC
    `, [id]);

    return res.json(updatedResult.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating project backers:', error);
    return res.status(500).json({ error: 'Failed to update project backers' });
  } finally {
    client.release();
  }
});

module.exports = router;
