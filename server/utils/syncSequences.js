const pool = require('../db');

const SEQUENCES = [
  { table: 'creators', sequence: 'creators_id_seq' },
  { table: 'projects', sequence: 'projects_id_seq' },
  { table: 'financials', sequence: 'financials_id_seq' },
  { table: 'backers', sequence: 'backers_id_seq' },
  { table: 'backer_projects', sequence: 'backer_projects_id_seq' },
];

async function syncSequences() {
  for (const { table, sequence } of SEQUENCES) {
    const query = `
      SELECT setval('${sequence}', COALESCE((SELECT MAX(id) FROM ${table}), 0), true);
    `;
    await pool.query(query);
  }
}

module.exports = { syncSequences };
