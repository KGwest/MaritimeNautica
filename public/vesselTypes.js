const VESSEL_TYPES = {
  cargo:     { label: 'Cargo',       color: '#4da6e8', emoji: '🚢', codes: [70,71,72,73,74,75,76,77,78,79] },
  tanker:    { label: 'Tanker',      color: '#f48c1a', emoji: '🛢️', codes: [80,81,82,83,84,85,86,87,88,89] },
  passenger: { label: 'Passenger',   color: '#34d87a', emoji: '🛳️', codes: [60,61,62,63,64,65,66,67,68,69] },
  fishing:   { label: 'Fishing',     color: '#f5c842', emoji: '🎣', codes: [30] },
  highspeed: { label: 'High Speed',  color: '#00cfff', emoji: '⚡', codes: [40,41,42,43,44,45,46,47,48,49] },
  military:  { label: 'Military',    color: '#f05050', emoji: '⚓', codes: [35,55] },
  sailing:   { label: 'Sailing',     color: '#b07ef5', emoji: '⛵', codes: [36,37] },
  tug:       { label: 'Tug/Service', color: '#f09030', emoji: '🔧', codes: [21,31,32,50,51,52,53,54,56,57,58,59] },
  other:     { label: 'Other',       color: '#8899aa', emoji: '🚤', codes: [] },
  unknown:   { label: 'Unknown',     color: '#445566', emoji: '❓', codes: [0] },
};
const TYPE_CODE_MAP = {};
for (const [key, info] of Object.entries(VESSEL_TYPES)) {
  for (const code of info.codes) TYPE_CODE_MAP[code] = key;
}
function getVesselTypeKey(shipType) {
  if (!shipType) return 'unknown';
  const exact = TYPE_CODE_MAP[shipType];
  if (exact) return exact;
  if (shipType >= 70 && shipType <= 79) return 'cargo';
  if (shipType >= 80 && shipType <= 89) return 'tanker';
  if (shipType >= 60 && shipType <= 69) return 'passenger';
  if (shipType >= 40 && shipType <= 49) return 'highspeed';
  if (shipType >= 50 && shipType <= 59) return 'tug';
  return 'other';
}
function getVesselColor(shipType) {
  return VESSEL_TYPES[getVesselTypeKey(shipType)]?.color ?? VESSEL_TYPES.unknown.color;
}
function getVesselInfo(shipType) {
  const key = getVesselTypeKey(shipType);
  return { key, ...VESSEL_TYPES[key] };
}
