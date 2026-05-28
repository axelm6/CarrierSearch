const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'CarrierNet/1.0' }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('non-JSON: ' + raw.slice(0, 120))); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { state, name, debug } = req.query;
  const limit  = parseInt(req.query.limit)  || 1000;
  const offset = parseInt(req.query.offset) || 0;

  if (state) {
    try {
      // Active carriers in state — no ent_type filter yet, just status + state
      // classdef contains "AUTHORIZED FOR HIRE" etc — we filter brokers client-side
      const where = encodeURIComponent(`phy_state='${state.toUpperCase()}' AND status_code='A'`);
      const url = `https://data.transportation.gov/resource/az4n-8mr2.json?$where=${where}&$limit=${limit}&$offset=${offset}&$order=legal_name ASC`;

      const data = await fetchJSON(url);
      const items = Array.isArray(data) ? data : [];

      const normalized = items.map(c => ({
        dotNumber:     c.dot_number,
        legalName:     c.legal_name,
        dbaName:       c.dba_name,
        phyStreet:     c.phy_street,
        phyCity:       c.phy_city,
        phyState:      c.phy_state,
        phyZipcode:    c.phy_zip,
        telephone:     c.phone,
        statusCode:    c.status_code,          // 'A' = active
        classdef:      c.classdef,             // e.g. "AUTHORIZED FOR HIRE"
        carrierOp:     c.carrier_operation,    // A=interstate
        censusTypeId:  { censusType: 'C', censusTypeDesc: 'CARRIER' },
        allowedToOperate: 'Y',
        docketNumber:  c.docket1 || '',
        totalPowerUnits: c.power_units,
        totalDrivers:  c.total_drivers,
      }));

      res.json({ content: normalized, total: normalized.length });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }

  } else if (name) {
    // Fallback: FMCSA keyword search
    const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/name/${encodeURIComponent(name)}?webKey=${WEBKEY}&size=100&start=${offset}&output=json`;
    try {
      const data = await fetchJSON(url);
      let items = Array.isArray(data) ? data : (data.content || []);
      res.json({ content: items.map(x => x.carrier || x) });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }

  } else {
    res.status(400).json({ error: 'state or name param required' });
  }
};
