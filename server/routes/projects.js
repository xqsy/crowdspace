const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { embedProject } = require('../services/embeddings');

const router = express.Router();

// Helper to sanitize filename
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// GET /api/projects
// Optional query params: status, platform, category, q (simple ILIKE search)
router.get('/', async (req, res) => {
  const { status, platform, category, q, limit } = req.query;

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

  if (q) {
    values.push(`%${q}%`);
    where.push(`(p.title ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let limitValue = 50;
  if (typeof limit === 'string') {
    const parsed = parseInt(limit, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 50) {
      limitValue = parsed;
    }
  }
  values.push(limitValue);

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
      p.image_url,
      c.name AS creator_name,
      f.total_pledged,
      f.backer_count,
      f.average_pledge
    FROM projects p
    JOIN creators c ON p.creator_id = c.id
    LEFT JOIN financials f ON f.project_id = p.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${values.length};
  `;

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching projects', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects (admin only)
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const body = req.body || {};
  
  // Parse form data - FormData sends everything as strings
  const creator_id = body.creator_id;
  const title = body.title;
  const description = body.description;
  const category = body.category;
  const platform = body.platform;
  const status = body.status;
  const url = body.url;
  const launch_date = body.launch_date && body.launch_date !== '' ? body.launch_date : null;
  const end_date = body.end_date && body.end_date !== '' ? body.end_date : null;
  const currency = body.currency && body.currency !== '' ? body.currency : 'USD';
  
  // Parse numeric fields - handle empty strings
  const goal_amount = body.goal_amount && body.goal_amount !== '' ? Number(body.goal_amount) : null;
  const total_pledged = body.total_pledged && body.total_pledged !== '' ? Number(body.total_pledged) : 0;
  const backer_count = body.backer_count && body.backer_count !== '' ? Number(body.backer_count) : 0;

  // Store temp file info - will rename after successful creation
  const tempFile = req.file ? req.file.path : null;

  // Calculate average_pledge from total_pledged and backer_count (rounded to 1 decimal)
  const avgPledgeRaw = backer_count > 0 ? total_pledged / backer_count : null;
  const avgPledge = Number.isFinite(avgPledgeRaw) ? Math.round(avgPledgeRaw * 10) / 10 : null;

  // Helper to cleanup temp file on validation error
  const cleanupTempFile = () => {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
    }
  };

  if (!creator_id) {
    cleanupTempFile();
    return res.status(400).json({ error: 'creator_id is required' });
  }
  if (!title || !title.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'title is required' });
  }
  if (!description || !description.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'description is required' });
  }
  if (!platform || !['kickstarter', 'indiegogo', 'gofundme'].includes(platform)) {
    cleanupTempFile();
    return res.status(400).json({ error: 'platform must be kickstarter, indiegogo, or gofundme' });
  }
  if (!status || !['going', 'completed', 'upcoming'].includes(status)) {
    cleanupTempFile();
    return res.status(400).json({ error: 'status must be going, completed, or upcoming' });
  }
  if (!url || !url.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'url is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First insert without image_url
    const projectInsert = await client.query(
      `INSERT INTO projects (
        creator_id, title, description, category, platform, status, url, launch_date, end_date, goal_amount, currency
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;`,
      [
        creator_id,
        title.trim(),
        description.trim(),
        category?.trim() || null,
        platform,
        status,
        url.trim(),
        launch_date || null,
        end_date || null,
        goal_amount ?? null,
        currency,
      ],
    );

    const project = projectInsert.rows[0];
    let finalImageUrl = null;

    // If we have an uploaded file, rename it with project title and ID
    if (tempFile) {
      const ext = path.extname(tempFile);
      const sanitizedTitle = sanitizeFilename(title.trim());
      const newFilename = `${sanitizedTitle}-${project.id}${ext}`;
      const newPath = path.join(path.dirname(tempFile), newFilename);
      
      fs.renameSync(tempFile, newPath);
      finalImageUrl = `/assets/creators/${newFilename}`;
      
      // Update project with image URL
      await client.query(
        `UPDATE projects SET image_url = $1 WHERE id = $2`,
        [finalImageUrl, project.id]
      );
      project.image_url = finalImageUrl;
    }

    await client.query(
      `INSERT INTO financials (project_id, total_pledged, backer_count, average_pledge)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id) DO UPDATE
       SET total_pledged = EXCLUDED.total_pledged,
           backer_count = EXCLUDED.backer_count,
           average_pledge = EXCLUDED.average_pledge,
           last_updated = NOW();`,
      [project.id, total_pledged ?? 0, backer_count ?? 0, avgPledge],
    );

    await client.query('COMMIT');
    
    // Generate embedding for the new project (async, non-blocking)
    // Get creator name first
    pool.query('SELECT name FROM creators WHERE id = $1', [creator_id])
      .then(({ rows }) => {
        const creator_name = rows[0]?.name || '';
        return embedProject({
          title: title.trim(),
          description: description.trim(),
          category: category?.trim() || '',
          creator_name,
        });
      })
      .then(embedding => {
        return pool.query(
          'UPDATE projects SET embedding = $1::jsonb WHERE id = $2',
          [JSON.stringify(embedding), project.id]
        );
      })
      .then(() => {})
      .catch(err => {
        console.error(`Failed to generate embedding for project ${project.id}:`, err.message);
      });

    return res.status(201).json(project);
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Delete uploaded file if project creation failed
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp file:', cleanupErr);
      }
    }
    
    console.error('Error creating project', error);
    return res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const projectSql = `
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
      p.image_url,
      c.name AS creator_name,
      f.total_pledged,
      f.backer_count,
      f.average_pledge
    FROM projects p
    JOIN creators c ON p.creator_id = c.id
    LEFT JOIN financials f ON f.project_id = p.id
    WHERE p.id = $1;
  `;

  const backersSql = `
    SELECT
      b.id,
      b.name,
      b.country,
      bp.amount_pledged,
      bp.pledged_at
    FROM backer_projects bp
    JOIN backers b ON b.id = bp.backer_id
    WHERE bp.project_id = $1
    ORDER BY bp.amount_pledged DESC;
  `;

  try {
    const projectResult = await pool.query(projectSql, [id]);
    if (!projectResult.rows.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const backersResult = await pool.query(backersSql, [id]);

    return res.json({
      project: projectResult.rows[0],
      backers: backersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching project detail', error);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id (admin only)
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  
  // Parse form data - FormData sends everything as strings
  const title = body.title;
  const description = body.description;
  const category = body.category;
  const platform = body.platform;
  const status = body.status;
  const url = body.url;
  const launch_date = body.launch_date && body.launch_date !== '' ? body.launch_date : null;
  const end_date = body.end_date && body.end_date !== '' ? body.end_date : null;
  const goal_amount = body.goal_amount && body.goal_amount !== '' ? Number(body.goal_amount) : null;

  // Store temp file info
  const tempFile = req.file ? req.file.path : null;

  // Helper to cleanup temp file on validation error
  const cleanupTempFile = () => {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
    }
  };

  if (!id) {
    cleanupTempFile();
    return res.status(400).json({ error: 'Project id is required' });
  }
  if (!title || !title.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!description || !description.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'Description is required' });
  }
  if (!platform || !['kickstarter', 'indiegogo', 'gofundme'].includes(platform)) {
    cleanupTempFile();
    return res.status(400).json({ error: 'Valid platform is required' });
  }
  if (!status || !['going', 'completed', 'upcoming'].includes(status)) {
    cleanupTempFile();
    return res.status(400).json({ error: 'Valid status is required' });
  }
  if (!url || !url.trim()) {
    cleanupTempFile();
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Get current project to check for existing image
    const currentProject = await pool.query('SELECT image_url FROM projects WHERE id = $1', [id]);
    if (!currentProject.rows.length) {
      cleanupTempFile();
      return res.status(404).json({ error: 'Project not found' });
    }
    const oldImageUrl = currentProject.rows[0].image_url;

    let newImageUrl = oldImageUrl; // Keep existing by default

    // Handle new image upload
    if (tempFile) {
      const ext = path.extname(tempFile);
      const sanitizedTitle = sanitizeFilename(title.trim());
      const newFilename = `${sanitizedTitle}-${id}${ext}`;
      const newPath = path.join(path.dirname(tempFile), newFilename);
      
      // Delete old image if exists and different from new
      if (oldImageUrl) {
        const oldImagePath = path.join(__dirname, '../../public', oldImageUrl);
        if (fs.existsSync(oldImagePath) && oldImagePath !== newPath) {
          try { fs.unlinkSync(oldImagePath); } catch (e) { /* ignore */ }
        }
      }
      
      fs.renameSync(tempFile, newPath);
      newImageUrl = `/assets/creators/${newFilename}`;
    }

    const result = await pool.query(
      `UPDATE projects SET
        title = $1,
        description = $2,
        category = $3,
        platform = $4,
        status = $5,
        url = $6,
        launch_date = $7,
        end_date = $8,
        goal_amount = $9,
        image_url = $10
      WHERE id = $11
      RETURNING *`,
      [
        title.trim(),
        description.trim(),
        category?.trim() || null,
        platform,
        status,
        url.trim(),
        launch_date,
        end_date,
        goal_amount,
        newImageUrl,
        id
      ]
    );

    // Regenerate embedding with updated data
    const project = result.rows[0];
    pool.query('SELECT name FROM creators WHERE id = $1', [project.creator_id])
      .then(({ rows }) => {
        const creator_name = rows[0]?.name || '';
        return embedProject({
          title: project.title,
          description: project.description,
          category: project.category || '',
          creator_name,
        });
      })
      .then(embedding => {
        return pool.query(
          'UPDATE projects SET embedding = $1::jsonb WHERE id = $2',
          [JSON.stringify(embedding), project.id]
        );
      })
      .catch(err => {
        console.error(`Failed to regenerate embedding for project ${project.id}:`, err.message);
      });

    return res.json(project);
  } catch (error) {
    cleanupTempFile();
    console.error('Error updating project', error);
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Project id is required' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting project', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
