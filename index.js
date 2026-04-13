/**
 * NAUTICA — Cloudflare Worker
 * Secure WebSocket proxy for AISstream.io
 *
 * Deploy steps:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler secret put AIS_API_KEY   (paste your AISstream key)
 *   4. wrangler deploy
 *
 * Your AIS_API_KEY is stored as a Cloudflare secret — never visible to users.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    // Health check
    if (url.pathname === '/health') {
      return corsResponse(new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // WebSocket upgrade — proxy to AISstream
    if (url.pathname === '/stream') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return corsResponse(new Response('Expected WebSocket', { status: 426 }));
      }

      const apiKey = env.AIS_API_KEY;
      if (!apiKey) {
        return corsResponse(new Response('AIS_API_KEY not configured', { status: 500 }));
      }

      // Parse bounding box from query params (sent by the frontend)
      // e.g. ?bbox=-90,-180,90,180
      const bboxParam = url.searchParams.get('bbox') || '-90,-180,90,180';
      const [minLat, minLon, maxLat, maxLon] = bboxParam.split(',').map(Number);

      // Upgrade both sides
      const [client, clientWs] = Object.values(new WebSocketPair());
      clientWs.accept();

      // Connect to AISstream
      const upstream = new WebSocket('wss://stream.aisstream.io/v0/stream');

      upstream.addEventListener('open', () => {
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [[[minLat, minLon], [maxLat, maxLon]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        };
        upstream.send(JSON.stringify(subscription));
      });

      // Forward upstream → client
      upstream.addEventListener('message', (evt) => {
        try { clientWs.send(evt.data); } catch (_) {}
      });

      upstream.addEventListener('close', () => {
        try { clientWs.close(1000, 'Upstream closed'); } catch (_) {}
      });

      upstream.addEventListener('error', () => {
        try { clientWs.close(1011, 'Upstream error'); } catch (_) {}
      });

      // Forward client → upstream (subscription updates / pings)
      clientWs.addEventListener('message', (evt) => {
        try { if (upstream.readyState === WebSocket.OPEN) upstream.send(evt.data); } catch (_) {}
      });

      clientWs.addEventListener('close', () => {
        try { upstream.close(); } catch (_) {}
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return corsResponse(new Response('Not found', { status: 404 }));
  },
};

function corsResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Upgrade, Connection');
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}