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

    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/health') {
      return corsResponse(new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    if (url.pathname === '/stream') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return corsResponse(new Response('Expected WebSocket', { status: 426 }));
      }

      const apiKey = env.AIS_API_KEY;
      if (!apiKey) {
        return corsResponse(new Response('AIS_API_KEY not configured', { status: 500 }));
      }

      const bboxParam = url.searchParams.get('bbox') || '-90,-180,90,180';
      const parts = bboxParam.split(',').map(Number);
      const minLat = parts[0];
      const minLon = parts[1];
      const maxLat = parts[2];
      const maxLon = parts[3];

      const [client, clientWs] = Object.values(new WebSocketPair());
      clientWs.accept();

      const upstream = new WebSocket('wss://stream.aisstream.io/v0/stream');

      upstream.addEventListener('open', () => {
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [[[minLat, minLon], [maxLat, maxLon]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        };
        upstream.send(JSON.stringify(subscription));
      });

      upstream.addEventListener('message', (evt) => {
        try {
          // Handle both text and binary messages from AISstream
          if (typeof evt.data === 'string') {
            clientWs.send(evt.data);
          } else {
            // Binary — convert to text
            const reader = new Response(evt.data).text();
            reader.then((text) => {
              try { clientWs.send(text); } catch (_) {}
            });
          }
        } catch (_) {}
      });

      upstream.addEventListener('close', () => {
        try { clientWs.close(1000, 'Upstream closed'); } catch (_) {}
      });

      upstream.addEventListener('error', () => {
        try { clientWs.close(1011, 'Upstream error'); } catch (_) {}
      });

      clientWs.addEventListener('message', (evt) => {
        try {
          if (upstream.readyState === WebSocket.OPEN) upstream.send(evt.data);
        } catch (_) {}
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