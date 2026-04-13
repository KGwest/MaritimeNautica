// config.js — App configuration

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Replace this URL with your deployed Cloudflare Worker URL.
// After running `wrangler deploy` in /worker, it will give you a URL like:
//   https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev
// ─────────────────────────────────────────────────────────────────────────────
const WORKER_URL = ‘https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev’;

// Convert wss:// or ws:// based on WORKER_URL protocol
const WORKER_WS = WORKER_URL.replace(/^https?/, match => match === ‘https’ ? ‘wss’ : ‘ws’);

const REGIONS = {
global: {
label: ‘Global’,
center: [20, 0],
zoom: 3,
bbox: ‘-90,-180,90,180’,
},
north_atlantic: {
label: ‘North Atlantic’,
center: [45, -40],
zoom: 4,
bbox: ‘20,-80,65,10’,
},
north_sea: {
label: ‘North Sea’,
center: [55, 3],
zoom: 6,
bbox: ‘50,-5,62,12’,
},
mediterranean: {
label: ‘Mediterranean’,
center: [37, 15],
zoom: 5,
bbox: ‘30,-6,47,42’,
},
persian_gulf: {
label: ‘Persian Gulf’,
center: [25, 54],
zoom: 6,
bbox: ‘22,48,30,62’,
},
southeast_asia: {
label: ‘SE Asia’,
center: [3, 104],
zoom: 5,
bbox: ‘-5,95,15,120’,
},
us_east: {
label: ‘US East Coast’,
center: [35, -75],
zoom: 5,
bbox: ‘24,-85,47,-65’,
},
us_west: {
label: ‘US West Coast’,
center: [37, -122],
zoom: 5,
bbox: ‘32,-130,50,-115’,
},
};

const APP_CONFIG = {
workerWsUrl:     WORKER_WS,
maxVessels:      600,
staleThreshold:  10 * 60 * 1000,   // 10 min
trailMaxPoints:  24,
reconnectDelay:  4000,
};