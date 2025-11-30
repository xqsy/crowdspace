const https = require('https');

/**
 * Format project data into a structured text for embedding
 * @param {Object} project - Project data
 * @param {string} project.title - Project title
 * @param {string} project.description - Project description
 * @param {string} project.category - Project category/tag
 * @param {string} project.creator_name - Creator name
 * @returns {string} Formatted text for embedding
 */
function formatProjectText({ title, description, category, creator_name }) {
  const parts = [];
  
  if (title) {
    parts.push(`Title: ${title.trim()}`);
  }
  
  if (creator_name) {
    parts.push(`Creator: ${creator_name.trim()}`);
  }
  
  if (category) {
    parts.push(`Category: ${category.trim()}`);
  }
  
  if (description) {
    // Truncate description if too long (keep first 500 chars)
    const desc = description.trim();
    parts.push(`Description: ${desc.length > 500 ? desc.substring(0, 500) + '...' : desc}`);
  }
  
  return parts.join('. ');
}

/**
 * Call Google's embedding API
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function embedText(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const modelName = process.env.GEMMA_EMBEDDING_MODEL || 'text-embedding-004';

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const body = JSON.stringify({
    model: `models/${modelName}`,
    content: {
      parts: [{ text: text.trim() }],
    },
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${encodeURIComponent(modelName)}:embedContent?key=${encodeURIComponent(apiKey)}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const data = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (chunk) => {
        chunks += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(chunks);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Embedding request failed with status ${res.statusCode}: ${chunks}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const embedding = data && data.embedding && data.embedding.values;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response');
  }

  return embedding;
}

/**
 * Generate embedding for a project
 * @param {Object} project - Project data with title, description, category, creator_name
 * @returns {Promise<number[]>} Embedding vector
 */
async function embedProject(project) {
  const text = formatProjectText(project);
  
  if (!text) {
    throw new Error('Project must have at least a title or description');
  }
  
  return embedText(text);
}

module.exports = {
  embedText,
  embedProject,
  formatProjectText,
};
