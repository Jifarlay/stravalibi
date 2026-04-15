exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const city = event.queryStringParameters?.q || '';
  if (!city) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing q' }) };

  // Essai 1: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Stravalibi/1.0 (stravalibi.netlify.app)', 'Accept-Language': 'fr,en' } }
    );
    const data = await res.json();
    if (data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name }) };
    }
  } catch(e) {}

  // Essai 2: Photon
  try {
    const res2 = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&lang=fr`);
    const data2 = await res2.json();
    if (data2.features?.length) {
      const [lon, lat] = data2.features[0].geometry.coordinates;
      return { statusCode: 200, headers, body: JSON.stringify({ lat, lon, name: city }) };
    }
  } catch(e) {}

  return { statusCode: 404, headers, body: JSON.stringify({ error: `Ville "${city}" introuvable` }) };
};
