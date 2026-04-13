# 🚢 NAUTICA — Live Ship Tracker

A frictionless, real-time global vessel tracking app. Users open the site and ships appear — no accounts, no API keys, no friction. Built for journalists, researchers, and anyone tracking maritime activity.

-----

## Architecture

```
Browser ──WebSocket──▶ Cloudflare Worker (proxy) ──WebSocket──▶ AISstream.io
                            (hides your API key)
   Static Frontend
   hosted on Railway
```

- **Frontend** — pure HTML/CSS/JS, served by Express on Railway
- **Cloudflare Worker** — proxies WebSocket connections to AISstream, keeping your API key server-side and secret

-----

## Project Structure

```
nautica/
├── server.js           # Express static server (Railway)
├── package.json
├── public/             # All frontend files
│   ├── index.html
│   ├── style.css
│   ├── config.js       # ← Put your Worker URL here
│   ├── vesselTypes.js
│   ├── tracker.js
│   ├── ui.js
│   └── main.js
└── worker/             # Cloudflare Worker
    ├── index.js
    └── wrangler.toml
```

-----

## Step 1 — Get an AISstream API Key

1. Go to [aisstream.io](https://aisstream.io) and sign up for a free account
1. Copy your API key from the dashboard

-----

## Step 2 — Deploy the Cloudflare Worker

The Worker is your secure proxy. It holds your AIS API key as a secret.

```bash
# Install Wrangler CLI (Cloudflare's deploy tool)
npm install -g wrangler

# Log in to Cloudflare
wrangler login

# Go to the worker folder
cd worker

# Add your AIS key as a secret (you'll be prompted to paste it)
wrangler secret put AIS_API_KEY

# Deploy the worker
wrangler deploy
```

After deploying, Wrangler will print your Worker URL, something like:

```
https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev
```

**Copy that URL** — you’ll need it in the next step.

-----

## Step 3 — Update config.js

Open `public/config.js` and replace the placeholder:

```js
// Change this line:
const WORKER_URL = 'https://nautica-ais-proxy.YOUR-SUBDOMAIN.workers.dev';

// To your actual Worker URL, e.g.:
const WORKER_URL = 'https://nautica-ais-proxy.jsmith.workers.dev';
```

-----

## Step 4 — Deploy to Railway

1. Push this repo to GitHub:

```bash
git init
git add .
git commit -m "feat: initial NAUTICA deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nautica.git
git push -u origin main
```

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
1. Select your `nautica` repository
1. Railway auto-detects Node.js and runs `npm start`
1. In **Settings → Networking**, generate a public domain

Your site is live! Share the Railway URL with anyone — they get live ship data instantly.

-----

## Local Development

```bash
# Install dependencies
npm install

# Run the frontend server
npm start
# → http://localhost:3000

# In a separate terminal, run the worker locally
cd worker
wrangler dev
# → ws://localhost:8787/stream
```

For local dev, temporarily change `WORKER_URL` in `config.js` to `http://localhost:8787`.

-----

## Vessel Type Colors

|Vessel       |Color           |
|-------------|----------------|
|🚢 Cargo      |`#4da6e8` Blue  |
|🛢️ Tanker     |`#f48c1a` Orange|
|🛳️ Passenger  |`#34d87a` Green |
|🎣 Fishing    |`#f5c842` Yellow|
|⚡ High Speed |`#00cfff` Cyan  |
|⚓ Military   |`#f05050` Red   |
|⛵ Sailing    |`#b07ef5` Purple|
|🔧 Tug/Service|`#f09030` Amber |
|🚤 Other      |`#8899aa` Gray  |

-----

## Customisation

|What               |Where                                            |
|-------------------|-------------------------------------------------|
|Max vessels tracked|`APP_CONFIG.maxVessels` in `public/config.js`    |
|Trail length       |`APP_CONFIG.trailMaxPoints` in `public/config.js`|
|Add a region       |Add entry to `REGIONS` in `public/config.js`     |
|Change map tiles   |Edit tile URL in `public/ui.js`                  |

-----


## License

MIT — use, modify, and deploy freely.
