const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app    = express();
const PORT   = 3000;
const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';
const FMCSA  = 'https://mobile.fmcsa.dot.gov/qc/services';

app.use(express.static(path.join(__dirname)));

// Proxy: /api/carriers/name/:name
app.get('/api/carriers/name/:name', async (req, res) => {
  const { name } = req.params;
  const { size = 50, start = 0 } = req.query;
  const url = `${FMCSA}/carriers/name/${encodeURIComponent(name)}?webKey=${WEBKEY}&size=${size}&start=${start}&output=json`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();

    // FMCSA returns either:
    //   { content: [ { carrier: {...} }, ... ] }   — name search
    //   { content: [ {...}, ... ] }                 — flat array (some endpoints)
    // Normalize to always return { content: [ flat carrier objects ] }
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.content)) {
      items = data.content;
    }
    // Unwrap nested "carrier" key if present
    const normalized = items.map(item => item.carrier ? item.carrier : item);
    res.json({ content: normalized });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy: /api/carriers/:dot  (single carrier lookup)
app.get('/api/carriers/:dot', async (req, res) => {
  const url = `${FMCSA}/carriers/${req.params.dot}?webKey=${WEBKEY}&output=json`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅  CarrierNet is running!');
  console.log(`  🌐  Open http://localhost:${PORT} in your browser`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
