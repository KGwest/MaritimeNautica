// tracker.js — WebSocket client connecting to the CF Worker proxy

class VesselTracker extends EventTarget {
  constructor() {
    super();
    this.ws          = null;
    this.vessels     = new Map();
    this.trails      = new Map();
    this.currentRegion = null;
    this.connected   = false;
    this.reconnectTimer = null;
    this.updateCount = 0;
    this._staleTimer = null;
    this._intentionalClose = false;
  }

  connect(regionKey) {
    this._intentionalClose = false;
    this.currentRegion = regionKey;
    this._openSocket(regionKey);
  }

  changeRegion(regionKey) {
    this._intentionalClose = true;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    // Clear vessels from old region
    for (const mmsi of this.vessels.keys()) {
      this._emit('vesselRemoved', { mmsi });
    }
    this.vessels.clear();
    this.trails.clear();
    this.updateCount = 0;
    this._emit('statsUpdate', { count: 0, updates: 0 });

    setTimeout(() => this.connect(regionKey), 200);
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this._staleTimer);
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    this.connected = false;
    this._emit('statusChange', { status: 'offline' });
  }

  _openSocket(regionKey) {
    this._emit('statusChange', { status: 'connecting' });

    const region = REGIONS[regionKey] ?? REGIONS.global;
    const url    = `${APP_CONFIG.workerWsUrl}/stream?bbox=${encodeURIComponent(region.bbox)}`;

    const ws = new WebSocket(url);
    this.ws  = ws;

    ws.onopen = () => {
      this.connected = true;
      this._emit('statusChange', { status: 'online' });
      this._startStaleCheck();
    };

    ws.onmessage = (evt) => {
      try { this._handleMessage(JSON.parse(evt.data)); } catch (_) {}
    };

    ws.onerror = () => {
      this._emit('statusChange', { status: 'error' });
    };

    ws.onclose = () => {
      this.connected = false;
      if (this._intentionalClose) return;
      this._emit('statusChange', { status: 'reconnecting' });
      this.reconnectTimer = setTimeout(() => this._openSocket(this.currentRegion), APP_CONFIG.reconnectDelay);
    };
  }

  _handleMessage(msg) {
    if (msg.MessageType === 'PositionReport') this._handlePosition(msg);
    else if (msg.MessageType === 'ShipStaticData') this._handleStatic(msg);
  }

  _handlePosition(msg) {
    const meta = msg.MetaData;
    const pos  = msg.Message?.PositionReport;
    if (!pos || !meta) return;

    const mmsi = String(meta.MMSI);
    const lat  = pos.Latitude;
    const lng  = pos.Longitude;
    if (!lat && !lng) return;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const existing = this.vessels.get(mmsi) ?? {
      mmsi, name: meta.ShipName?.trim() || `MMSI ${mmsi}`,
      shipType: null, callsign: null, destination: null,
      length: null, width: null, draught: null, flag: null, imo: null,
    };

    const vessel = {
      ...existing, lat, lng,
      cog: pos.Cog  ?? 0,
      sog: pos.Sog  ?? 0,
      hdg: pos.TrueHeading ?? pos.Cog ?? 0,
      navStatus: pos.NavigationalStatus ?? 0,
      lastUpdate: Date.now(),
    };

    this.vessels.set(mmsi, vessel);
    this._appendTrail(mmsi, lat, lng);
    this.updateCount++;

    this._emit('vesselUpdate', { mmsi, vessel });
    this._emit('statsUpdate', { count: this.vessels.size, updates: this.updateCount });
  }

  _handleStatic(msg) {
    const meta = msg.MetaData;
    const s    = msg.Message?.ShipStaticData;
    if (!s || !meta) return;

    const mmsi = String(meta.MMSI);
    const existing = this.vessels.get(mmsi);

    const patch = {
      name:        s.Name?.trim() || meta.ShipName?.trim() || existing?.name || `MMSI ${mmsi}`,
      shipType:    s.Type   ?? existing?.shipType ?? null,
      callsign:    s.CallSign?.trim() || existing?.callsign || null,
      destination: s.Destination?.trim() || existing?.destination || null,
      imo:         s.ImoNumber || existing?.imo || null,
      flag:        mmsiToFlag(mmsi),
      draught:     s.MaximumStaticDraught ?? existing?.draught ?? null,
      length:      (s.Dimension?.A != null && s.Dimension?.B != null)
                     ? s.Dimension.A + s.Dimension.B : existing?.length ?? null,
      width:       (s.Dimension?.C != null && s.Dimension?.D != null)
                     ? s.Dimension.C + s.Dimension.D : existing?.width ?? null,
    };

    const updated = existing ? { ...existing, ...patch } : { mmsi, lat: null, lng: null, ...patch };
    this.vessels.set(mmsi, updated);
    this._emit('vesselStatic', { mmsi, vessel: updated });
  }

  _appendTrail(mmsi, lat, lng) {
    if (!this.trails.has(mmsi)) this.trails.set(mmsi, []);
    const t = this.trails.get(mmsi);
    t.push({ lat, lng, ts: Date.now() });
    if (t.length > APP_CONFIG.trailMaxPoints) t.shift();
  }

  getTrail(mmsi) { return this.trails.get(String(mmsi)) ?? []; }
  getVessel(mmsi) { return this.vessels.get(String(mmsi)); }

  _startStaleCheck() {
    clearInterval(this._staleTimer);
    this._staleTimer = setInterval(() => {
      const cutoff = Date.now() - APP_CONFIG.staleThreshold * 2;
      for (const [mmsi, v] of this.vessels) {
        if (v.lastUpdate && v.lastUpdate < cutoff) {
          this.vessels.delete(mmsi);
          this.trails.delete(mmsi);
          this._emit('vesselRemoved', { mmsi });
        }
      }
    }, 60_000);
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// ── MMSI → flag emoji ──────────────────────────────────────────────────────
function mmsiToFlag(mmsi) {
  const mid = String(mmsi).substring(0, 3);
  const map = {
    '211':'🇩🇪','218':'🇩🇪','219':'🇩🇰','220':'🇩🇰','224':'🇪🇸','225':'🇪🇸',
    '226':'🇫🇷','227':'🇫🇷','228':'🇫🇷','230':'🇫🇮','232':'🇬🇧','233':'🇬🇧',
    '234':'🇬🇧','235':'🇬🇧','237':'🇬🇷','238':'🇭🇷','244':'🇳🇱','245':'🇳🇱',
    '246':'🇳🇱','247':'🇮🇹','248':'🇲🇹','249':'🇲🇹','250':'🇮🇪','257':'🇳🇴',
    '258':'🇳🇴','259':'🇳🇴','261':'🇵🇱','265':'🇸🇪','266':'🇸🇪','271':'🇹🇷',
    '272':'🇺🇦','273':'🇷🇺','275':'🇱🇻','276':'🇪🇪','277':'🇱🇹',
    '303':'🇺🇸','338':'🇺🇸','366':'🇺🇸','367':'🇺🇸','368':'🇺🇸','369':'🇺🇸',
    '316':'🇨🇦','345':'🇲🇽',
    '351':'🇵🇦','352':'🇵🇦','353':'🇵🇦','354':'🇵🇦','355':'🇵🇦',
    '412':'🇨🇳','413':'🇨🇳','414':'🇨🇳',
    '431':'🇯🇵','432':'🇯🇵',
    '440':'🇰🇷','441':'🇰🇷',
    '477':'🇭🇰','525':'🇮🇩','533':'🇲🇾','548':'🇵🇭',
    '563':'🇸🇬','564':'🇸🇬','565':'🇸🇬','566':'🇸🇬',
    '574':'🇻🇳','636':'🇱🇷','657':'🇿🇦',
  };
  return map[mid] ?? '🏳️';
}

const tracker = new VesselTracker();
