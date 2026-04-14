// Netlify Function: échange le code OAuth contre un token Strava
// et uploade le fichier GPX

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://fantastic-starlight-813567.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    const { code, gpxData, activityName, activityType, startDate } = JSON.parse(event.body);

    // 1. Échanger le code contre un access token
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token exchange failed', detail: tokenData }),
      };
    }

    const accessToken = tokenData.access_token;

    // 2. Upload le fichier GPX sur Strava
    const formData = new FormData();
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    formData.append('file', blob, 'stravalibi.gpx');
    formData.append('data_type', 'gpx');
    formData.append('name', activityName || 'Activité Stravalibi');
    formData.append('activity_type', activityType || 'run');
    formData.append('start_date_local', startDate);

    const uploadRes = await fetch('https://www.strava.com/api/v3/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (uploadData.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Upload failed', detail: uploadData }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadId: uploadData.id,
        activityId: uploadData.activity_id,
        status: uploadData.status,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
