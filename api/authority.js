const https = require('https');
const WEBKEY = 'bbba768990a16586976b10e624e6e492aa9bb830';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'CarrierNet/1.0' }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('non-JSON')); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { dot } = req.query;
  if (!dot) return res.status(400).json({ error: 'dot param required' });

  try {
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${dot}?webKey=${WEBKEY}&output=json`;
    const data = await fetchJSON(url);

    // QCMobile wraps in { content: { carrier: {...} } }
    const carrier = data?.content?.carrier || data?.carrier || data;

    res.json({
      dotNumber:               carrier.dotNumber || dot,
      legalName:               carrier.legalName || '',
      commonAuthorityStatus:   carrier.commonAuthorityStatus || '',   // A=Active, I=Inactive, P=Pending
      contractAuthorityStatus: carrier.contractAuthorityStatus || '',
      brokerAuthorityStatus:   carrier.brokerAuthorityStatus || '',
      allowedToOperate:        carrier.allowedToOperate || '',
      safetyRating:            carrier.safetyRating || '',
      safetyRatingDate:        carrier.safetyRatingDate || '',
      insuranceRequired:       carrier.bipdInsuranceRequired || '',
      insuranceOnFile:         carrier.bipdInsuranceOnFile || '',
      outOfServiceDate:        carrier.outOfServiceDate || '',
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
