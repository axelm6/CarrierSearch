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
        catch(e) { reject(new Error('non-JSON: ' + raw.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { state, name } = req.query;
  const entityType = req.query.entityType || 'carriers';
  const limit  = parseInt(req.query.limit)  || 2000;
  const offset = parseInt(req.query.offset) || 0;

  if (state) {
    try {
      let where = `phy_state='${state.toUpperCase()}' AND status_code='A'`;

      if (entityType === 'carriers') {
        where += ` AND (classdef IS NULL OR classdef='' OR (classdef NOT LIKE '%BROKER%' AND classdef NOT LIKE '%FORWARDER%'))`;
        // Must have MC authority in one of the 3 docket slots AND that slot must be active
        where += ` AND ((docket1prefix='MC' AND docket1_status_code='A') OR (docket2prefix='MC' AND docket2_status_code='A') OR (docket3prefix='MC' AND docket3_status_code='A'))`;
      } else if (entityType === 'brokers') {
        where += ` AND (classdef LIKE '%BROKER%' OR classdef LIKE '%FORWARDER%')`;
        where += ` AND ((docket1prefix='MC' AND docket1_status_code='A') OR (docket2prefix='MC' AND docket2_status_code='A') OR (docket3prefix='MC' AND docket3_status_code='A') OR (docket1prefix='FF' AND docket1_status_code='A'))`;
      }

      const url = `https://data.transportation.gov/resource/az4n-8mr2.json?$where=${encodeURIComponent(where)}&$limit=${limit}&$offset=${offset}&$order=legal_name ASC`;
      const data = await fetchJSON(url);
      const items = Array.isArray(data) ? data : [];

      const normalized = items.map(c => {
        // Pick the active MC docket number
        const mcNum = (c.docket1prefix === 'MC' && c.docket1_status_code === 'A') ? c.docket1 :
                      (c.docket2prefix === 'MC' && c.docket2_status_code === 'A') ? c.docket2 :
                      (c.docket3prefix === 'MC' && c.docket3_status_code === 'A') ? c.docket3 : '';
        return {
          dotNumber:       c.dot_number,
          legalName:       c.legal_name,
          dbaName:         c.dba_name,
          phyCity:         c.phy_city,
          phyState:        c.phy_state,
          phyStreet:       c.phy_street,
          phyZipcode:      c.phy_zip,
          telephone:       c.phone,
          email:           c.email_address,
          statusCode:      c.status_code,
          classdef:        c.classdef,
          censusTypeId:    { censusType: 'C', censusTypeDesc: 'CARRIER' },
          allowedToOperate: 'Y',
          docketNumber:    mcNum,
          docketStatus:    'A', // always active since we filter for it
          totalPowerUnits: c.power_units,
          totalDrivers:    c.total_drivers,
          companyOfficer:  c.company_officer_1,
          fleetSize:       c.fleetsize,
          carrierOperation: c.carrier_operation,
        };
      });

      res.json({ content: normalized, total: normalized.length });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }

  } else if (name) {
    const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/name/${encodeURIComponent(name)}?webKey=${WEBKEY}&size=100&start=${offset}&output=json`;
    try {
      const data = await fetchJSON(url);
      const items = Array.isArray(data) ? data : (data.content || []);
      res.json({ content: items.map(x => x.carrier || x) });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(400).json({ error: 'state or name param required' });
  }
};
