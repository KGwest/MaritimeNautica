🚢 NAUTICA — Live Ship Tracker
A frictionless, real-time global vessel tracking tool built for journalists, researchers, and anyone who needs to know what's moving on the ocean right now. Users open the site and ships appear. 
No accounts, no API keys.

🌐 Live site: maritimenautica.pages.dev

<img width="1659" height="950" alt="image" src="https://github.com/user-attachments/assets/4345ac51-9ba7-4ab1-af28-828fa305fea0" />


Features

Real-time AIS data — live vessel positions streamed via WebSocket

Color-coded by vessel type — cargo, tanker, passenger, fishing, military, sailing, and more

Directional arrows — each marker points in the vessel's heading

Click any vessel — side panel shows name, type, speed, course, heading, destination, flag, IMO, and dimensions

Vessel trail — toggle a dashed path showing recent route history

Legend filter — click any vessel type to hide/show it on the map

Region selector — focus on North Sea, Mediterranean, Persian Gulf, US coasts, and more

Download CSV — export all currently visible vessels to a spreadsheet instantly

Auto-reconnect — recovers from connection drops automatically


Architecture
Browser ──WebSocket──▶ Cloudflare Worker (proxy) ──WebSocket──▶ AISstream.io
                            (hides your API key)
   Static Frontend
   hosted on Cloudflare Pages

Frontend — pure HTML/CSS/JS hosted on Cloudflare Pages
Cloudflare Worker — proxies WebSocket connections to AISstream, keeping your API key server-side and secret


Project Structure
MaritimeNautica/
├── public/                 # All frontend files served to the browser
│   ├── index.html          # App shell, nav, all page layouts
│   ├── style.css           # Dark nautical theme
│   ├── config.js           # Region definitions + Worker URL
│   ├── vesselTypes.js      # AIS type codes → colors, labels, emojis
│   ├── tracker.js          # WebSocket client, vessel state management
│   ├── ui.js               # Leaflet map, markers, trail, side panel
│   ├── download.js         # CSV export for visible vessels
│   └── main.js             # App bootstrap, navigation, event wiring
└── worker/                 # Cloudflare Worker (API key proxy)
    ├── index.js            # Worker code — WebSocket proxy
    └── wrangler.toml       # Cloudflare Worker config

Forking & Self-Hosting
Want to run your own instance? Here's how.

Step 1 — Get a free AISstream API key
Sign up at aisstream.io — no credit card required.

Step 2 — Deploy the Cloudflare Worker
The Worker is your secure proxy. It holds your AIS API key as an encrypted secret — it never touches your code or GitHub.

bash# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Log in to Cloudflare
wrangler login

# Go into the worker folder
cd worker

# Add your AIS key as a secret (paste it when prompted)
npx wrangler secret put AIS_API_KEY

# Deploy
npx wrangler deploy
Wrangler will print your Worker URL:
https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev
Step 3 — Update config.js
Open public/config.js and replace the Worker URL on line 1:
jsconst WORKER_URL = 'https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev';
Step 4 — Deploy to Cloudflare Pages

Push your repo to GitHub
Go to dash.cloudflare.com → Workers & Pages → Create → Pages
Connect your GitHub repo
Set build settings:

Framework preset: None
Build command: (leave blank)
Build output directory: public


Click Save and Deploy

Your site is live at your-project.pages.dev — share it with anyone.

Vessel Type Colors
VesselColor🚢 Cargo#4da6e8 Blue🛢️ Tanker#f48c1a Orange🛳️ Passenger#34d87a Green🎣 Fishing#f5c842 Yellow⚡ High Speed#00cfff Cyan⚓ Military#f05050 Red⛵ Sailing#b07ef5 Purple🔧 Tug/Service#f09030 Amber🚤 Other#8899aa Gray

Customisation
WhatWhereMax vessels trackedAPP_CONFIG.maxVessels in public/config.jsTrail lengthAPP_CONFIG.trailMaxPoints in public/config.jsDefault regionChange 'north_sea' in public/main.jsAdd a regionAdd entry to REGIONS in public/config.jsChange map tilesEdit tile URL in public/ui.js

Cost
ServiceCostAISstream.io (free tier)$0Cloudflare Workers (free tier)$0Cloudflare Pages (free tier)$0
Total: free.

About AIS
Every large commercial vessel is required by law to broadcast its position using AIS — the Automatic Identification System. These signals are picked up by coastal receivers and satellites, then aggregated into a global feed. NAUTICA streams this data in real time.

Note: AIS is self-reported. Vessels can technically disable or spoof their transponders. For investigative work, always cross-reference with satellite imagery and other sources. Vessels under 300 gross tonnes are not required to carry AIS.


License
MIT — free to use, modify, and deploy.
