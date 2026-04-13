// main.js — App bootstrap, navigation, event wiring

(function () {
  'use strict';

  var currentPage = 'home';
  var mapStarted  = false;

  function showPage(id) {
    if (id === currentPage) return;
    currentPage = id;

    var pages = document.querySelectorAll('.page');
    pages.forEach(function(p) { p.classList.remove('active'); });

    var target = document.getElementById('page-' + id);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(function(l) {
      l.classList.toggle('active', l.dataset.page === id);
    });

    if (id === 'map' && !mapStarted) {
      mapStarted = true;
      var savedRegion = localStorage.getItem('nautica_region') || 'global';
      mapUI.init();
      tracker.connect(savedRegion);
      var regionSelect = document.getElementById('region-select');
      if (regionSelect) regionSelect.value = savedRegion;
    }

    var mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.remove('open');
    document.body.style.overflow = id === 'home' ? 'hidden' : '';
  }

  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-page]');
    if (el) {
      e.preventDefault();
      showPage(el.dataset.page);
    }
  });

  showPage('home');

  var hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      var menu = document.getElementById('mobile-menu');
      if (menu) menu.classList.toggle('open');
    });
  }

  var regionSelect = document.getElementById('region-select');
  if (regionSelect) {
    regionSelect.addEventListener('change', function(e) {
      var region = e.target.value;
      localStorage.setItem('nautica_region', region);
      mapUI.clearAll();
      mapUI.flyToRegion(region);
      tracker.changeRegion(region);
    });
  }

  var legendBtn = document.getElementById('toggle-legend-btn');
  if (legendBtn) {
    legendBtn.addEventListener('click', function() {
      var legend = document.getElementById('legend');
      if (legend) legend.classList.toggle('hidden');
    });
  }

  var panelClose = document.getElementById('panel-close');
  if (panelClose) {
    panelClose.addEventListener('click', function() {
      closePanel();
      if (mapUI.activeTrail) {
        var layer = mapUI.trailLayers.get(mapUI.activeTrail);
        if (layer) layer.remove();
        mapUI.trailLayers.delete(mapUI.activeTrail);
        mapUI.activeTrail = null;
      }
      mapUI.selectedMmsi = null;
    });
  }

  tracker.addEventListener('statusChange', function(e) {
    var detail = e.detail;
    var pip  = document.getElementById('nav-pip');
    var text = document.getElementById('nav-status-text');
    if (!pip || !text) return;

    var labels = {
      online:       'LIVE',
      connecting:   'CONNECTING',
      reconnecting: 'RECONNECTING',
      error:        'ERROR',
      offline:      'OFFLINE',
    };

    pip.className  = 'status-pip ' + detail.status;
    text.className = 'status-text ' + detail.status;
    text.textContent = labels[detail.status] || detail.status.toUpperCase();

    if (detail.status === 'online') showToast('Connected - vessels loading', 'success');
    if (detail.status === 'reconnecting') showToast('Connection lost, retrying...', 'warn');
    if (detail.status === 'error') showToast('WebSocket error', 'error');
  });

  tracker.addEventListener('vesselUpdate', function(e) {
    mapUI.upsertVessel(e.detail.vessel);
  });

  tracker.addEventListener('vesselStatic', function(e) {
    mapUI.updateStatic(e.detail.vessel);
  });

  tracker.addEventListener('vesselRemoved', function(e) {
    mapUI.removeVessel(e.detail.mmsi);
  });

  tracker.addEventListener('statsUpdate', function(e) {
    var vc = document.getElementById('vessel-count');
    var uc = document.getElementById('update-count');
    if (vc) vc.textContent = e.detail.count.toLocaleString();
    if (uc) uc.textContent = e.detail.updates.toLocaleString();
  });

  var toastTimer;
  window.showToast = function(msg, type) {
    type = type || 'info';
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'visible ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { el.classList.remove('visible'); }, 3500);
  };

})();