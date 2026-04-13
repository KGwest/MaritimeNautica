// ui.js — Leaflet map + marker/panel management

class MapUI {
constructor() {
this.map          = null;
this.markers      = new Map();
this.trailLayers  = new Map();
this.selectedMmsi = null;
this.activeTrail  = null;
this.typeFilter   = new Set();
this.typeCounts   = {};
this._legendBuilt = false;
this._mapInited   = false;
}

init() {
if (this._mapInited) return;
this._mapInited = true;

```
const savedRegion = localStorage.getItem('nautica_region') || 'global';
const region = REGIONS[savedRegion] ?? REGIONS.global;

this.map = L.map('map', {
  center: region.center,
  zoom:   region.zoom,
  zoomControl: true,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(this.map);

this._buildLegend();
```

}

flyToRegion(regionKey) {
const r = REGIONS[regionKey];
if (!r || !this.map) return;
this.map.flyTo(r.center, r.zoom, { duration: 1.2 });
}

// ── Vessel upsert ─────────────────────────────────────────────────────────

upsertVessel(vessel) {
if (!vessel.lat || !vessel.lng) return;
const mmsi  = vessel.mmsi;
const info  = getVesselInfo(vessel.shipType);
const color = info.color;
const hdg   = vessel.hdg < 360 ? vessel.hdg : (vessel.cog ?? 0);
const icon  = this._makeIcon(color, hdg, vessel.sog ?? 0);

```
// Update type counts
const prevKey = this.markers.get(mmsi)?._typeKey;
if (prevKey && prevKey !== info.key) this.typeCounts[prevKey] = Math.max(0, (this.typeCounts[prevKey] ?? 1) - 1);
if (!prevKey || prevKey !== info.key) this.typeCounts[info.key] = (this.typeCounts[info.key] ?? 0) + 1;

if (this.markers.has(mmsi)) {
  const m = this.markers.get(mmsi);
  m.setLatLng([vessel.lat, vessel.lng]);
  m.setIcon(icon);
  m._typeKey = info.key;
} else {
  const m = L.marker([vessel.lat, vessel.lng], { icon, zIndexOffset: 100 });
  m._typeKey = info.key;
  m._mmsi    = mmsi;
  m.on('click', () => this._onMarkerClick(mmsi));

  if (!this.typeFilter.has(info.key)) m.addTo(this.map);
  this.markers.set(mmsi, m);
}

if (mmsi === this.selectedMmsi) {
  this._updateTrailLine(mmsi);
  this._renderPanel(vessel);
}

this._updateLegendCounts();
```

}

removeVessel(mmsi) {
this.markers.get(mmsi)?.remove();
this.markers.delete(mmsi);
this.trailLayers.get(mmsi)?.remove();
this.trailLayers.delete(mmsi);
if (mmsi === this.selectedMmsi) { this.selectedMmsi = null; closePanel(); }
this._updateLegendCounts();
}

updateStatic(vessel) {
if (vessel.mmsi === this.selectedMmsi) this._renderPanel(vessel);
}

clearAll() {
for (const m of this.markers.values()) m.remove();
this.markers.clear();
for (const l of this.trailLayers.values()) l.remove();
this.trailLayers.clear();
this.typeCounts = {};
this.selectedMmsi = null;
closePanel();
this._updateLegendCounts();
}

// ── Icon ──────────────────────────────────────────────────────────────────

_makeIcon(color, heading, sog) {
const sz = sog > 15 ? 14 : sog > 4 ? 12 : 10;
const half = (sz + 6) / 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz+6}" height="${sz+6}" viewBox="0 0 16 16"> <polygon points="8,1 12.5,14 8,11 3.5,14" fill="${color}" fill-opacity="0.92" transform="rotate(${heading},8,8)"/> </svg>`;
return L.divIcon({
html: `<div class="ship-marker-wrapper" style="color:${color}">${svg}</div>`,
iconSize:   [sz + 6, sz + 6],
iconAnchor: [half, half],
className:  ‘’,
});
}

// ── Trail ─────────────────────────────────────────────────────────────────

_updateTrailLine(mmsi) {
const trail = tracker.getTrail(mmsi);
if (trail.length < 2) return;
const vessel = tracker.getVessel(mmsi);
const color  = vessel ? getVesselColor(vessel.shipType) : ‘#ffffff’;
const lls    = trail.map(p => [p.lat, p.lng]);
if (this.trailLayers.has(mmsi)) {
this.trailLayers.get(mmsi).setLatLngs(lls);
} else {
const line = L.polyline(lls, { color, weight: 1.5, opacity: 0.45, dashArray: ‘4 6’ }).addTo(this.map);
this.trailLayers.set(mmsi, line);
}
}

toggleTrail(mmsi) {
if (this.trailLayers.has(mmsi)) {
this.trailLayers.get(mmsi).remove();
this.trailLayers.delete(mmsi);
this.activeTrail = null;
return false;
}
this._updateTrailLine(mmsi);
this.activeTrail = mmsi;
return true;
}

// ── Click / panel ─────────────────────────────────────────────────────────

_onMarkerClick(mmsi) {
this.selectedMmsi = mmsi;
const v = tracker.getVessel(mmsi);
if (!v) return;
this._renderPanel(v);
openPanel();
this.map.panTo([v.lat, v.lng], { animate: true, duration: 0.5 });
}

_renderPanel(vessel) {
const info  = getVesselInfo(vessel.shipType);
const color = info.color;
const sog   = vessel.sog ?? 0;
const speedPct = Math.min(100, (sog / 30) * 100);
const trailOn  = this.trailLayers.has(vessel.mmsi);
const navLabels = [
‘Under way’,‘At anchor’,‘Not under command’,‘Restricted manoeuvrability’,
‘Constrained by draught’,‘Moored’,‘Aground’,‘Fishing’,‘Sailing (engine off)’,
‘—’,’—’,’—’,’—’,’—’,‘AIS-SART’,‘Not defined’,
];
const navStatus = navLabels[vessel.navStatus ?? 15] ?? ‘—’;

```
const titleEl = document.getElementById('panel-title');
if (titleEl) titleEl.textContent = vessel.name || `MMSI ${vessel.mmsi}`;

const content = document.getElementById('panel-content');
if (!content) return;

content.innerHTML = `
  <div class="vessel-header">
    <div class="vessel-type-badge" style="background:${color}1a;border:1px solid ${color}44">
      <span>${info.emoji}</span>
    </div>
    <div>
      <div class="vessel-name">${vessel.name || `MMSI ${vessel.mmsi}`}</div>
      <div class="vessel-type-name" style="color:${color}">${info.label.toUpperCase()}</div>
      <div class="vessel-mmsi">MMSI: ${vessel.mmsi}${vessel.flag ? '  ' + vessel.flag : ''}</div>
    </div>
  </div>

  <div class="detail-section">
    <div class="detail-section-title">NAVIGATION</div>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-key">SPEED</div>
        <div class="detail-val">${sog.toFixed(1)} <small>kn</small></div>
        <div class="speed-bar-wrap"><div class="speed-bar-fill" style="width:${speedPct}%"></div></div>
      </div>
      <div class="detail-item">
        <div class="detail-key">COURSE</div>
        <div class="detail-val">${vessel.cog != null ? vessel.cog.toFixed(1) + '°' : '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-key">HEADING</div>
        <div class="detail-val">${vessel.hdg < 360 ? vessel.hdg + '°' : '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-key">STATUS</div>
        <div class="detail-val" style="font-size:11px">${navStatus}</div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-key">POSITION</div>
        <div class="detail-val" style="font-size:12px">${vessel.lat.toFixed(5)}°, ${vessel.lng.toFixed(5)}°</div>
      </div>
    </div>
  </div>

  ${vessel.destination || vessel.callsign || vessel.imo ? `
  <div class="detail-section">
    <div class="detail-section-title">VOYAGE</div>
    <div class="detail-grid">
      ${vessel.destination ? `<div class="detail-item full-width"><div class="detail-key">DESTINATION</div><div class="detail-val">${vessel.destination}</div></div>` : ''}
      ${vessel.callsign    ? `<div class="detail-item"><div class="detail-key">CALLSIGN</div><div class="detail-val">${vessel.callsign}</div></div>` : ''}
      ${vessel.imo         ? `<div class="detail-item"><div class="detail-key">IMO</div><div class="detail-val">${vessel.imo}</div></div>` : ''}
    </div>
  </div>` : ''}

  ${vessel.length || vessel.draught ? `
  <div class="detail-section">
    <div class="detail-section-title">DIMENSIONS</div>
    <div class="detail-grid">
      ${vessel.length  ? `<div class="detail-item"><div class="detail-key">LENGTH</div><div class="detail-val">${vessel.length} <small>m</small></div></div>` : ''}
      ${vessel.width   ? `<div class="detail-item"><div class="detail-key">BEAM</div><div class="detail-val">${vessel.width} <small>m</small></div></div>` : ''}
      ${vessel.draught ? `<div class="detail-item"><div class="detail-key">DRAUGHT</div><div class="detail-val">${vessel.draught} <small>m</small></div></div>` : ''}
    </div>
  </div>` : ''}

  <div class="trail-toggle" id="trail-btn">
    <span class="trail-toggle-label">SHOW TRAIL</span>
    <div class="toggle-switch ${trailOn ? 'on' : ''}" id="trail-sw"></div>
  </div>
`;

document.getElementById('trail-btn')?.addEventListener('click', () => {
  const on = mapUI.toggleTrail(vessel.mmsi);
  document.getElementById('trail-sw')?.classList.toggle('on', on);
});
```

}

// ── Legend ────────────────────────────────────────────────────────────────

_buildLegend() {
if (this._legendBuilt) return;
this._legendBuilt = true;
const c = document.getElementById(‘legend-items’);
if (!c) return;
for (const [key, info] of Object.entries(VESSEL_TYPES)) {
if (key === ‘unknown’) continue;
const el = document.createElement(‘div’);
el.className = ‘legend-item’;
el.dataset.type = key;
el.innerHTML = ` <div class="legend-dot" style="background:${info.color};box-shadow:0 0 5px ${info.color}66"></div> <span class="legend-label">${info.label}</span> <span class="legend-count" id="lc-${key}">0</span>`;
el.addEventListener(‘click’, () => this._toggleFilter(key, el));
c.appendChild(el);
}

```
// Also build vessel type table on How It Works page
const vttGrid = document.getElementById('vtt-grid');
if (vttGrid) {
  for (const [key, info] of Object.entries(VESSEL_TYPES)) {
    if (key === 'unknown') continue;
    vttGrid.innerHTML += `
      <div class="vtt-item">
        <div class="vtt-swatch" style="background:${info.color};box-shadow:0 0 5px ${info.color}66"></div>
        <span class="vtt-label">${info.emoji} ${info.label}</span>
      </div>`;
  }
}
```

}

_updateLegendCounts() {
for (const key of Object.keys(VESSEL_TYPES)) {
const el = document.getElementById(`lc-${key}`);
if (el) el.textContent = this.typeCounts[key] ?? 0;
}
}

_toggleFilter(key, itemEl) {
if (this.typeFilter.has(key)) {
this.typeFilter.delete(key);
itemEl.classList.remove(‘filtered’);
for (const [, m] of this.markers) {
if (m._typeKey === key) m.addTo(this.map);
}
} else {
this.typeFilter.add(key);
itemEl.classList.add(‘filtered’);
for (const [, m] of this.markers) {
if (m._typeKey === key) m.remove();
}
}
}
}

// Panel helpers
function openPanel()  { document.getElementById(‘side-panel’)?.classList.remove(‘panel-closed’); }
function closePanel() {
document.getElementById(‘side-panel’)?.classList.add(‘panel-closed’);
const t = document.getElementById(‘panel-title’);
if (t) t.textContent = ‘SELECT A VESSEL’;
const c = document.getElementById(‘panel-content’);
if (c) c.innerHTML = `<div class="panel-empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 3L5 33h30L20 3z" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" fill="none"/><circle cx="20" cy="32" r="2" fill="rgba(255,255,255,0.12)"/></svg><p>Click any vessel on the map to inspect it</p></div>`;
}

const mapUI = new MapUI();