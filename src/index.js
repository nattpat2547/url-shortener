const express = require('express');
const path = require('path');
const fs = require('fs');
const { customAlphabet } = require('nanoid');

const randomCode = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);
const redis = require('./redis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Read student ID
let studentId = 'NOT_SET';
try {
  const studentIdPath =
    process.env.STUDENT_ID_FILE || path.join(__dirname, '../student_id.txt');

  if (fs.existsSync(studentIdPath)) {
    studentId = fs.readFileSync(studentIdPath, 'utf-8').trim();
  }
} catch (err) {
  console.error('Failed to read student ID:', err.message);
}

// Read build time
let buildTime = 'NOT_SET';
try {
  const buildTimePath =
    process.env.BUILD_TIME_FILE || path.join(__dirname, '../build_time.txt');

  if (fs.existsSync(buildTimePath)) {
    buildTime = fs.readFileSync(buildTimePath, 'utf-8').trim();
  } else if (process.env.BUILD_TIME) {
    buildTime = process.env.BUILD_TIME;
  }
} catch (err) {
  console.error('Failed to read build time:', err.message);
  buildTime = process.env.BUILD_TIME || 'NOT_SET';
}

const api = express.Router();

// 🔗 Create short URL
api.post('/shorten', async (req, res) => {
  const { url, customCode } = req.body;

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // ✅ FIX: รองรับทั้ง customCode + random
  const code = (customCode || randomCode(6)).toLowerCase();

  await redis.set(code, url);

  return res.status(200).json({
    code,
    short: `/${code}`
  });
});

// 📋 List all URLs
api.get('/urls', async (req, res) => {
  const entries = await redis.list();
  return res.status(200).json(entries);
});

// 🗑 Delete
api.delete('/:code', async (req, res) => {
  const deleted = await redis.del(req.params.code);

  if (!deleted) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json({ deleted: req.params.code });
});

// 🔄 Toggle enable/disable
api.patch('/:code/toggle', async (req, res) => {
  const code = req.params.code;
  const result = await redis.toggle(code);

  if (result === null) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json({
    code,
    enabled: result,
  });
});

// ❤️ Health check
api.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// ℹ️ Info
api.get('/info', (req, res) => {
  return res.status(200).json({
    studentId,
    buildTime,
  });
});

app.use('/api', api);
app.use('/ui', express.static(path.join(__dirname, '../www')));

// 🚀 Redirect
app.get('/:code', async (req, res) => {
  const code = req.params.code;

  const url = await redis.get(code);

  if (!url) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    if (typeof redis.incrementClick === 'function') {
      await redis.incrementClick(code);
    }
  } catch (err) {
    console.error('incrementClick failed:', err.message);
  }

  return res.redirect(302, url);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;