/**
 * Script to update embeddings for all existing projects
 * Run with: node scripts/update-embeddings.js
 */

const path = require('path');

// Try to load .env from multiple locations
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Verify required env vars
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('Make sure you have a .env file with DATABASE_URL defined.');
  process.exit(1);
}

if (!process.env.GOOGLE_API_KEY) {
  console.error('ERROR: GOOGLE_API_KEY is not set.');
  console.error('Make sure you have a .env file with GOOGLE_API_KEY defined.');
  process.exit(1);
}

const pool = require('../db');
const { embedProject } = require('../services/embeddings');

async function updateAllEmbeddings() {
  console.log('Starting embedding update for all projects...\n');
  
  try {
    // Get all projects with creator names
    const { rows: projects } = await pool.query(`
      SELECT p.id, p.title, p.description, p.category, c.name AS creator_name
      FROM projects p
      JOIN creators c ON p.creator_id = c.id
      ORDER BY p.id
    `);
    
    console.log(`Found ${projects.length} projects to update.\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const project of projects) {
      try {
        console.log(`[${project.id}] Processing: ${project.title}`);
        
        const embedding = await embedProject({
          title: project.title,
          description: project.description,
          category: project.category,
          creator_name: project.creator_name,
        });
        
        await pool.query(
          'UPDATE projects SET embedding = $1::jsonb WHERE id = $2',
          [JSON.stringify(embedding), project.id]
        );
        
        updated++;
        console.log(`    ✓ Updated (${embedding.length} dimensions)\n`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        failed++;
        console.error(`    ✗ Failed: ${error.message}\n`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

updateAllEmbeddings();
