exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
 
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };
 
  let query;
  try {
    const body = JSON.parse(event.body || '{}');
    query = body.query;
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
 
  if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query' }) };
 
  // Essai sur plusieurs serveurs Overpass en cas d'échec
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
 
  let lastError = '';
  for (const server of servers) {
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Stravalibi/1.0 (stravalibi.netlify.app)'
        },
        body: 'data=' + encodeURIComponent(query)
      });
 
      if (!res.ok) {
        lastError = `HTTP ${res.status} from ${server}`;
        continue;
      }
 
      const text = await res.text();
      // Vérifier que c'est bien du JSON valide
      JSON.parse(text);
      return { statusCode: 200, headers, body: text };
 
    } catch(e) {
      lastError = e.message;
      continue;
    }
  }
 
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: 'Tous les serveurs Overpass sont indisponibles: ' + lastError })
  };
};
