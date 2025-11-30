const path = require('path');
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const projectsRouter = require('./routes/projects');
const searchRouter = require('./routes/search');
const creatorsRouter = require('./routes/creators');
const backersRouter = require('./routes/backers');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'crowdspace-admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Serve static frontend from /public
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/search', searchRouter);
app.use('/api/creators', creatorsRouter);
app.use('/api/backers', backersRouter);
app.use('/api/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`Crowdspace server listening on http://localhost:${PORT}`);
});
