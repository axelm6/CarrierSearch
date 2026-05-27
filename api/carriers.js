const https = require('https');
const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CarrierNet/1.0' } }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('non-JSON: ' + raw.slice(0, 80))); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { name } = req.query;
  const size  = parseInt(req.query.size)  || 100;
  const start = parseInt(req.query.start) || 0;
  if (!name) return res.status(400).json({ error: 'name param required' });

  const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/name/${encodeURIComponent(name)}?webKey=${WEBKEY}&size=${size}&start=${start}&output=json`;
  try {
    const data = await fetchJSON(url);
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.content)) items = data.content;
    res.json({ content: items.map(x => (x && x.carrier) ? x.carrier : x) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
