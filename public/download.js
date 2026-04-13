// download.js — Export visible vessels to CSV/Excel

function downloadVessels() {
  const vessels = Array.from(tracker.vessels.values()).filter(function(v) {
    return v.lat && v.lng;
  });

  if (vessels.length === 0) {
    showToast('No vessels to download yet', 'warn');
    return;
  }

  // Filter out hidden types
  const filtered = vessels.filter(function(v) {
    const info = getVesselInfo(v.shipType);
    return !mapUI.typeFilter.has(info.key);
  });

  if (filtered.length === 0) {
    showToast('No vessels visible — check your filters', 'warn');
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const region = document.getElementById('region-select');
  const regionName = region ? region.options[region.selectedIndex].text.replace(/[^a-zA-Z0-9]/g, '_') : 'global';

  const rows = [];

  // Header row
  rows.push([
    'Vessel Name',
    'MMSI',
    'Type',
    'Flag',
    'Latitude',
    'Longitude',
    'Speed (kn)',
    'Course (deg)',
    'Heading (deg)',
    'Nav Status',
    'Destination',
    'Callsign',
    'IMO',
    'Length (m)',
    'Beam (m)',
    'Draught (m)',
    'Captured At',
  ]);

  const navLabels = [
    'Under way', 'At anchor', 'Not under command', 'Restricted manoeuvrability',
    'Constrained by draught', 'Moored', 'Aground', 'Fishing', 'Sailing (engine off)',
    '-', '-', '-', '-', '-', 'AIS-SART', 'Not defined',
  ];

  filtered.forEach(function(v) {
    const info = getVesselInfo(v.shipType);
    rows.push([
      v.name || '',
      v.mmsi || '',
      info.label || '',
      v.flag || '',
      v.lat != null ? v.lat.toFixed(6) : '',
      v.lng != null ? v.lng.toFixed(6) : '',
      v.sog != null ? v.sog.toFixed(1) : '',
      v.cog != null ? v.cog.toFixed(1) : '',
      v.hdg < 360 ? v.hdg : '',
      navLabels[v.navStatus || 15] || '',
      v.destination || '',
      v.callsign || '',
      v.imo || '',
      v.length || '',
      v.width || '',
      v.draught || '',
      now.toUTCString(),
    ]);
  });

  // Build CSV string
  const csv = rows.map(function(row) {
    return row.map(function(cell) {
      const val = String(cell).replace(/"/g, '""');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? '"' + val + '"' : val;
    }).join(',');
  }).join('\r\n');

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = 'nautica_' + regionName + '_' + timestamp + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Downloaded ' + filtered.length + ' vessels', 'success');
}
