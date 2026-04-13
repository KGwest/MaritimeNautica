// main.js — App bootstrap, navigation, event wiring

(function () {
‘use strict’;

// ── Page router ────────────────────────────────────────────────────────────
const pages   = document.querySelectorAll(’.page’);
const navLinks = document.querySelectorAll(’[data-page]’);
let currentPage = ‘home’;
let mapStarted  = false;

function showPage(id) {
if (id === currentPage) return;
currentPage = id;

```
pages.forEach(p => p.classList.remove('active'));
const target = document.getElementById(`page-${id}`);
if (target) target.classList.add('active');

// Update nav link active state
document.querySelectorAll('.nav-link').forEach(l => {
  l.classList.toggle('active', l.dataset.page === id);
});

// Init map on first visit to map page
if (id === 'map' && !mapStarted) {
  mapStarted = true;
  const savedRegion = localStorage.getItem('nautica_region') || 'global';
  mapUI.init();
  tracker.connect(savedRegion);
  document.getElementById('region-select').value = savedRegion;
}

// Close mobile menu
document.getElementById('mobile-menu')?.classList.remove('open');
document.body.style.overflow = id === 'home' ? 'hidden' : '';
```

}

// Wire all [data-page] links and buttons
document.addEventListener(‘click’, (e) => {
const el = e.target.closest(’[data-page]’);
if (el) {
e.preventDefault();
showPage(el.dataset.page);
}
});

// Show home on load
showPage(‘home’);

// ── Hamburger ──────────────────────────────────────────────────────────────
document.getElementById(‘hamburger’)?.addEventListener(‘click’, () => {
document.getElementById(‘mobile-menu’)?.classList.toggle(‘open’);
});

// ── Region select ──────────────────────────────────────────────────────────
document.getElementById(‘region-select’)?.addEventListener(‘change’, (e) => {
const region = e.target.value;
localStorage.setItem(‘nautica_region’, region);
mapUI.clearAll();
mapUI.flyToRegion(region);
tracker.changeRegion(region);
});

// ── Legend toggle ──────────────────────────────────────────────────────────
document.getElementById(‘toggle-legend-btn’)?.addEventListener(‘click’, () => {
document.getElementById(‘legend’)?.classList.toggle(‘hidden’);
});

// ── Panel close ────────────────────────────────────────────────────────────
document.getElementById(‘panel-close’)?.addEventListener(‘click’, () => {
closePanel();
if (mapUI.activeTrail) {
mapUI.trailLayers.get(mapUI.activeTrail)?.remove();
mapUI.trailLayers.delete(mapUI.activeTrail);
mapUI.activeTrail = null;
}
mapUI.selectedMmsi = null;
});

// ── Tracker events ─────────────────────────────────────────────────────────
tracker.addEventListener(‘statusChange’, ({ detail }) => {
const pip  = document.getElementById(‘nav-pip’);
const text = document.getElementById(‘nav-status-text’);
if (!pip || !text) return;

```
const labels = {
  online:       'LIVE',
  connecting:   'CONNECTING',
  reconnecting: 'RECONNECTING',
  error:        'ERROR',
  offline:      'OFFLINE',
};

pip.className  = 'status-pip ' + detail.status;
text.className = 'status-text ' + detail.status;
text.textContent = labels[detail.status] ?? detail.status.toUpperCase();

const toastMap = {
  online:       ['Connected — vessels loading', 'success'],
  reconnecting: ['Connection lost, retrying…',   'warn'],
  error:        ['WebSocket error',               'error'],
};
if (toastMap[detail.status]) showToast(...toastMap[detail.status]);
```

});

tracker.addEventListener(‘vesselUpdate’, ({ detail }) => {
mapUI.upsertVessel(detail.vessel);
});

tracker.addEventListener(‘vesselStatic’, ({ detail }) => {
mapUI.updateStatic(detail.vessel);
});

tracker.addEventListener(‘vesselRemoved’, ({ detail }) => {
mapUI.removeVessel(detail.mmsi);
});

tracker.addEventListener(‘statsUpdate’, ({ detail }) => {
const vc = document.getElementById(‘vessel-count’);
const uc = document.getElementById(‘update-count’);
if (vc) vc.textContent = detail.count.toLocaleString();
if (uc) uc.textContent = detail.updates.toLocaleString();
});

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
window.showToast = function (msg, type = ‘info’) {
const el = document.getElementById(‘toast’);
if (!el) return;
el.textContent = msg;
el.className = `visible ${type}`;
clearTimeout(toastTimer);
toastTimer = setTimeout(() => el.classList.remove(‘visible’), 3500);
};

})();