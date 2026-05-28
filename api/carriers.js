const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CarrierNet/1.0'
      }
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

  const { state, name } = req.query;
  const limit  = parseInt(req.query.limit)  || 1000;
  const offset = parseInt(req.query.offset) || 0;

  let url;

  if (state) {
    // Query the DOT Open Data Portal — full 4.4M carrier database, free, no key needed
    // Filter: active carriers (status_code=A) that are carriers not brokers (ent_type=C), in the given state
    const where = encodeURIComponent(`phy_state='${state.toUpperCase()}' AND status_code='A' AND ent_type='C'`);
    url = `https://data.transportation.gov/resource/az4n-8mr2.json?$where=${where}&$limit=${limit}&$offset=${offset}&$order=legal_name ASC`;
  } else if (name) {
    // Fallback: FMCSA keyword search (legacy)
    const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';
    url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/name/${encodeURIComponent(name)}?webKey=${WEBKEY}&size=100&start=${offset}&output=json`;
    try {
      const data = await fetchJSON(url);
      let items = Array.isArray(data) ? data : (data.content || []);
      return res.json({ content: items.map(x => x.carrier || x) });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.status(400).json({ error: 'state or name param required' });
  }

  try {
    const data = await fetchJSON(url);
    // DOT API returns array directly
    const items = Array.isArray(data) ? data : [];

    // Normalize field names to match what the frontend expects
    const normalized = items.map(c => ({
      dotNumber:              c.dot_number,
      legalName:              c.legal_name,
      dbaName:                c.dba_name,
      phyStreet:              c.phy_street,
      phyCity:                c.phy_city,
      phyState:               c.phy_state,
      phyZipcode:             c.phy_zip,
      phyCountry:             c.phy_country || 'US',
      telephone:              c.phone,
      statusCode:             c.status_code,
      // ent_type C = carrier, so mark censusTypeId accordingly
      censusTypeId:           { censusType: c.ent_type, censusTypeDesc: c.ent_type === 'C' ? 'CARRIER' : c.ent_type },
      allowedToOperate:       c.status_code === 'A' ? 'Y' : 'N',
      commonAuthorityStatus:  c.carrier_operation === 'A' ? 'A' : null,
      docketNumber:           c.docket1 || '',
      totalPowerUnits:        c.power_units,
      totalDrivers:           c.total_drivers,
    }));

    res.json({ content: normalized, total: normalized.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
