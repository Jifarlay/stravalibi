exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let lat, lon, radius;
  try {
    const body = JSON.parse(event.body || '{}');
    lat = body.lat;
    lon = body.lon;
    radius = Math.min(body.radius || 1500, 4000); // max 4km
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  if (!lat || !lon) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing lat/lon' }) };

  // Requête très légère — seulement les voies principales piétonnes
  const query = `[out:json][timeout:15];way["highway"~"^(footway|path|residential|tertiary|secondary|primary|unclassified|pedestrian)$"]["area"!="yes"](around:${radius},${lat},${lon});out body;>;out skel qt;`;

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  const fetchWithTimeout = (url, options, ms) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal })
      .finally(() => clearTimeout(timer));
  };

  for (const server of servers) {
    try {
      const res = await fetchWithTimeout(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      }, 7000); // 7s max par serveur

      if (!res.ok) continue;

      const text = await res.text();
      JSON.parse(text); // valider JSON
      return { statusCode: 200, headers, body: text };

    } catch(e) {
      continue; // essayer le suivant
    }
  }

  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({ error: 'Service temporairement indisponible. Réessaie dans quelques secondes.' })
  };
};
