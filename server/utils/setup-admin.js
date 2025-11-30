/**
 * Setup admin account helper script
 * Run with: node server/setup-admin.js
 * 
 * This will create an admin account in the database.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db');

const ADMIN_LOGIN = 'username'; // Change this
const ADMIN_PASSWORD = 'password'; // Change this
const ADMIN_NAME = 'Admin';

async function setupAdmin() {
  console.log('Setting up admin account...\n');

  try {
    // Create admins table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        login VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Admins table ready');

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('✓ Password hashed');

    // Insert or update admin
    const result = await pool.query(`
      INSERT INTO admins (login, password_hash, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (login) 
      DO UPDATE SET password_hash = $2, name = $3
      RETURNING id, login, name
    `, [ADMIN_LOGIN, passwordHash, ADMIN_NAME]);

    console.log('✓ Admin account created/updated');
    console.log('\n--- Admin Credentials ---');
    console.log(`Login: ${ADMIN_LOGIN}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('-------------------------\n');
    console.log('⚠️  Remember to change the password in production!\n');

    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();
