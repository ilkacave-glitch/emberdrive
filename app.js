/* ============================================
   Mileage app logic
   Features:
   - Two-step start/finish flow
   - Multi-leg trips via "Add a stop"
   - Round trip checkbox
   - Pre-filled start odometer from last reading
   - Reason prompt when overriding pre-fill
   - Custom values for Purpose/From/To "Other"
   - Customs remembered and shown next time
   ============================================ */

const STORAGE_KEY = 'mileage-trips-v1';
const IN_PROGRESS_KEY = 'mileage-in-progress-v1';
const LAST_ODO_KEY = 'mileage-last-odo-v1';
const CUSTOMS_KEY = 'mileage-customs-v1';

const $ = id => document.getElementById(id);

// Default dropdown options
const DEFAULT_PURPOSES = [
  'Client visit',
  'Clinical meeting at Helensville',
  'Team meeting',
  'Employer visit',
  'Training',
  'Supervision'
];

const DEFAULT_FROMS = [
  'Glenfield (home)',
  'Helensville DHB',
  'Orewa Hub',
  'Apollo Hub',
  '12 Ross Ave',
  'Petrol Stop',
  'Client location'
];

const DEFAULT_TOS = [
  'Helensville DHB',
  'Glenfield (home)',
  'Orewa Hub',
  'Apollo Hub',
  '12 Ross Ave',
  'Petrol Stop',
  'Client location'
];

// ============================================
// State
// ============================================
let trips = migrateTrips(loadTrips());
let inProgress = loadInProgress();
let customs = loadCustoms();

// ============================================
// Element refs
// ============================================
const dateInput = $('trip-date');
const purposeInput = $('trip-purpose');
const fromInput = $('trip-from');
const toInput = $('trip-to');
const nextToInput = $('next-to');
const customPurpose = $('custom-purpose');
const customFrom = $('custom-from');
const customTo = $('custom-to');
const customNextTo = $('custom-next-to');
const odoStart = $('odo-start');
const odoEnd = $('odo-end');
const roundTripCheck = $('round-trip-check');
const reasonWrap = $('reason-wrap');
const reasonSelect = $('reason-select');
const reasonOther = $('reason-other');
const startOdoHint = $('start-odo-hint');

const distanceDisplay = $('distance-display');
const distanceValue = $('distance-value');
const distanceLabel = $('distance-label');
const finishOdoTitle = $('finish-odo-title');
const addStopForm = $('add-stop-form');

const btnStartTrip = $('btn-start-trip');
const btnFinishTrip = $('btn-finish-trip');
const btnAddStop = $('btn-add-stop');
const btnCancelTrip = $('btn-cancel-trip');

const startForm = $('start-form');
const finishForm = $('finish-form');
const tripInProgress = $('trip-in-progress');
const tipRoute = $('tip-route');
const tipLegs = $('tip-legs');
const tipStarted = $('tip-started');
const tipCurrentOdo = $('tip-current-odo');
const tipOdoLabel = $('tip-odo-label');

const toast = $('toast');
const tripsList = $('trips-list');
const tripsSummary = $('trips-summary');
const monthTotal = $('month-total');
const monthLabel = $('month-label');
const exportMonth = $('export-month');
const exportPreview = $('export-preview');
const customsList = $('customs-list');
const btnCsv = $('btn-csv');
const btnEmail = $('btn-email');
const btnClear = $('btn-clear');

// State within the add-stop flow
let addStopMode = false;  // true when we're capturing a stop (not finishing)

// ============================================
// Init
// ============================================
dateInput.value = todayISO();
populateDropdowns();
renderLogView();
updateMonthTotal();

// ============================================
// Tabs
// ============================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
  if (name === 'trips') renderTrips();
  if (name === 'export') { renderExport(); renderCustoms(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// Populate dropdowns from defaults + customs
// ============================================
function populateDropdowns() {
  fillSelect(purposeInput, DEFAULT_PURPOSES, customs.purposes);
  fillSelect(fromInput, DEFAULT_FROMS, customs.froms);
  fillSelect(toInput, DEFAULT_TOS, customs.tos);
  fillSelect(nextToInput, DEFAULT_TOS, customs.tos);
}

function fillSelect(select, defaults, customList) {
  const current = select.value;
  const allOptions = [...defaults, ...customList];
  select.innerHTML = allOptions.map(o => `<option>${escapeHtml(o)}</option>`).join('') +
    '<option>Other</option>';
  if (current && allOptions.includes(current)) {
    select.value = current;
  }
}

// ============================================
// "Other" dropdown handlers (show text field)
// ============================================
function wireOtherDropdown(select, customWrap, customInput) {
  select.addEventListener('change', () => {
    if (select.value === 'Other') {
      customWrap.hidden = false;
      customInput.value = '';
      setTimeout(() => customInput.focus(), 50);
    } else {
      customWrap.hidden = true;
    }
  });
}

wireOtherDropdown(purposeInput, $('custom-purpose-wrap'), customPurpose);
wireOtherDropdown(fromInput, $('custom-from-wrap'), customFrom);
wireOtherDropdown(toInput, $('custom-to-wrap'), customTo);
wireOtherDropdown(nextToInput, $('custom-next-to-wrap'), customNextTo);

// Returns the actual value, resolving "Other" to the custom text
function getDropdownValue(select, customInput) {
  if (select.value === 'Other') {
    return (customInput.value || '').trim();
  }
  return select.value;
}

// Returns the new custom value (if any) to remember
function getNewCustomFrom(select, customInput, defaults, customList) {
  if (select.value !== 'Other') return null;
  const v = (customInput.value || '').trim();
  if (!v) return null;
  if (defaults.includes(v) || customList.includes(v)) return null;
  return v;
}

// ============================================
// Pre-fill start odometer + reason handling
// ============================================
const lastOdo = loadLastOdo();

function prefillStartOdo() {
  if (lastOdo == null) {
    odoStart.value = '';
    startOdoHint.textContent = 'Tap the field, then tap the mic on your keyboard to speak the number';
    reasonWrap.hidden = true;
    return;
  }
  odoStart.value = String(lastOdo);
  const lastDate = loadLastOdoDate();
  if (lastDate && lastDate !== todayISO()) {
    startOdoHint.innerHTML = `Pre-filled from your last trip on <strong>${formatDateShort(lastDate)}</strong> — check it still matches the vehicle, then tap Start trip`;
  } else {
    startOdoHint.textContent = 'Pre-filled from your last trip — tap Start trip if it matches, or change it if not';
  }
  reasonWrap.hidden = true;
}

prefillStartOdo();

odoStart.addEventListener('input', () => {
  if (lastOdo == null) {
    reasonWrap.hidden = true;
    return;
  }
  const current = parseOdo(odoStart.value);
  if (!isNaN(current) && current !== lastOdo) {
    reasonWrap.hidden = false;
  } else {
    reasonWrap.hidden = true;
  }
});

reasonSelect.addEventListener('change', () => {
  reasonOther.hidden = reasonSelect.value !== 'Other';
  if (reasonSelect.value === 'Other') setTimeout(() => reasonOther.focus(), 50);
});

// ============================================
// Render the log view
// ============================================
function renderLogView() {
  if (inProgress) {
    startForm.hidden = true;
    finishForm.hidden = false;
    tripInProgress.hidden = false;

    const lastLeg = inProgress.legs[inProgress.legs.length - 1];

    if (inProgress.legs.length === 1) {
      let route = `${inProgress.legs[0].from} → ${inProgress.legs[0].to}`;
      if (inProgress.roundTrip) route += ` → ${inProgress.legs[0].from}`;
      tipRoute.textContent = route;
      tipLegs.hidden = true;
    } else {
      tipRoute.textContent = `${inProgress.legs[0].from} → ${lastLeg.to}`;
      const legsText = inProgress.legs.map((l, i) =>
        i === 0 ? `${l.from} → ${l.to} (${l.distance}km)` : `→ ${l.to} (${l.distance}km)`
      ).join('  ');
      tipLegs.textContent = legsText;
      tipLegs.hidden = false;
    }

    // Show the most recent reading
    if (inProgress.legs.length === 1 && !lastLeg.odoEnd) {
      tipOdoLabel.textContent = 'Start odo';
      tipCurrentOdo.textContent = lastLeg.odoStart.toLocaleString() + ' km';
    } else {
      const latestReading = lastLeg.odoEnd != null ? lastLeg.odoEnd : lastLeg.odoStart;
      tipOdoLabel.textContent = 'Last reading';
      tipCurrentOdo.textContent = latestReading.toLocaleString() + ' km';
    }

    const startedAt = new Date(inProgress.startedAt);
    const today = new Date();
    const sameDay = startedAt.toDateString() === today.toDateString();
    if (sameDay) {
      tipStarted.textContent = startedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
    } else {
      tipStarted.textContent = startedAt.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
        ' · ' + startedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
    }

    // Reset the finish form to "finish" mode (not add-stop)
    setFinishMode();
  } else {
    startForm.hidden = false;
    finishForm.hidden = true;
    tripInProgress.hidden = true;
    prefillStartOdo();
  }
}

function setFinishMode() {
  addStopMode = false;
  finishOdoTitle.textContent = 'End odometer';
  distanceLabel.textContent = 'Distance';
  addStopForm.hidden = true;
  btnFinishTrip.textContent = 'Finish trip';
  btnAddStop.hidden = false;
  btnAddStop.textContent = 'Add a stop instead';
}

function setAddStopMode() {
  addStopMode = true;
  finishOdoTitle.textContent = 'Odometer right now';
  distanceLabel.textContent = 'This leg';
  addStopForm.hidden = false;
  btnFinishTrip.textContent = 'Save stop and continue';
  btnAddStop.hidden = true;
}

// ============================================
// Distance preview
// ============================================
function getCurrentStartReading() {
  if (!inProgress) return null;
  const lastLeg = inProgress.legs[inProgress.legs.length - 1];
  return lastLeg.odoEnd != null ? lastLeg.odoEnd : lastLeg.odoStart;
}

function updateDistance() {
  if (!inProgress) return;
  const start = getCurrentStartReading();
  const e = parseOdo(odoEnd.value);

  if (isNaN(e)) {
    distanceValue.textContent = '—';
    distanceDisplay.classList.remove('error');
    return;
  }

  if (e < start) {
    distanceValue.textContent = 'Must be higher than ' + start.toLocaleString();
    distanceDisplay.classList.add('error');
    return;
  }

  distanceValue.textContent = Math.round(e - start) + ' km';
  distanceDisplay.classList.remove('error');
}

odoEnd.addEventListener('input', updateDistance);

// ============================================
// Start a trip
// ============================================
btnStartTrip.addEventListener('click', () => {
  const s = parseOdo(odoStart.value);

  if (isNaN(s)) {
    showToast('Please enter the start odometer reading');
    return;
  }

  const from = getDropdownValue(fromInput, customFrom);
  const to = getDropdownValue(toInput, customTo);
  const purpose = getDropdownValue(purposeInput, customPurpose);

  if (!from) { showToast('Please enter where you\'re leaving from'); return; }
  if (!to) { showToast('Please enter where you\'re going to'); return; }
  if (!purpose) { showToast('Please enter a purpose'); return; }

  // Save any new customs
  rememberCustom('purposes', getNewCustomFrom(purposeInput, customPurpose, DEFAULT_PURPOSES, customs.purposes));
  rememberCustom('froms', getNewCustomFrom(fromInput, customFrom, DEFAULT_FROMS, customs.froms));
  rememberCustom('tos', getNewCustomFrom(toInput, customTo, DEFAULT_TOS, customs.tos));

  // Capture reason if odo was overridden
  let reason = null;
  if (lastOdo != null && s !== lastOdo) {
    if (reasonSelect.value === '' || reasonSelect.value === 'Pick a reason') {
      showToast('Please pick a reason for the different reading');
      return;
    }
    reason = reasonSelect.value;
    if (reason === 'Other') {
      const t = (reasonOther.value || '').trim();
      if (!t) { showToast('Please explain the difference'); return; }
      reason = t;
    }
  }

  inProgress = {
    date: dateInput.value,
    purpose: purpose,
    roundTrip: roundTripCheck.checked,
    startedAt: new Date().toISOString(),
    legs: [{
      from: from,
      to: to,
      odoStart: s,
      odoEnd: null,
      distance: null
    }],
    odoStartReason: reason
  };

  saveInProgress();

  // Reset form fields
  odoStart.value = '';
  odoEnd.value = '';
  roundTripCheck.checked = false;
  reasonSelect.value = '';
  reasonOther.value = '';
  reasonOther.hidden = true;
  $('custom-purpose-wrap').hidden = true;
  $('custom-from-wrap').hidden = true;
  $('custom-to-wrap').hidden = true;

  populateDropdowns();
  renderLogView();
  showToast('Trip started · drive safe');
});

// ============================================
// Add a stop (intermediate leg)
// ============================================
btnAddStop.addEventListener('click', () => {
  setAddStopMode();
  odoEnd.value = '';
  distanceValue.textContent = '—';
  showToast('Enter the reading and your next destination');
});

// ============================================
// Finish trip OR save a stop
// ============================================
btnFinishTrip.addEventListener('click', () => {
  if (!inProgress) return;

  const start = getCurrentStartReading();
  const e = parseOdo(odoEnd.value);

  if (isNaN(e)) {
    showToast('Please enter the odometer reading');
    return;
  }
  if (e < start) {
    showToast('Reading must be higher than ' + start.toLocaleString());
    return;
  }

  // Close out the current open leg
  const lastLeg = inProgress.legs[inProgress.legs.length - 1];
  lastLeg.odoEnd = e;
  lastLeg.distance = Math.round(e - start);

  if (addStopMode) {
    // Adding a stop: validate next destination, create a new open leg
    const nextDest = getDropdownValue(nextToInput, customNextTo);
    if (!nextDest) {
      showToast('Please enter the next destination');
      // Revert the leg close
      lastLeg.odoEnd = null;
      lastLeg.distance = null;
      return;
    }
    rememberCustom('tos', getNewCustomFrom(nextToInput, customNextTo, DEFAULT_TOS, customs.tos));

    // New leg starts where the last one ended
    inProgress.legs.push({
      from: lastLeg.to,
      to: nextDest,
      odoStart: e,
      odoEnd: null,
      distance: null
    });
    // Round trip becomes false once you've added stops (it's not a simple round trip anymore)
    inProgress.roundTrip = false;

    saveInProgress();

    // Reset form
    odoEnd.value = '';
    distanceValue.textContent = '—';
    nextToInput.value = nextToInput.options[0].value;
    $('custom-next-to-wrap').hidden = true;
    customNextTo.value = '';

    populateDropdowns();
    setFinishMode();
    renderLogView();
    showToast('Stop saved · drive safe');
    return;
  }

  // Finishing the trip
  // If round trip is true (single leg with the tick), append a return leg
  if (inProgress.roundTrip && inProgress.legs.length === 1) {
    // Just record total distance, displayed as a round trip
    // The single leg already has the full round-trip distance
  }

  const totalDistance = inProgress.legs.reduce((sum, l) => sum + (l.distance || 0), 0);

  const trip = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    date: inProgress.date,
    purpose: inProgress.purpose,
    roundTrip: inProgress.roundTrip,
    legs: inProgress.legs,
    distance: totalDistance,
    startedAt: inProgress.startedAt,
    createdAt: new Date().toISOString(),
    odoStartReason: inProgress.odoStartReason || null
  };

  trips.push(trip);
  saveTrips();

  // Remember the final odometer as the next starting point
  saveLastOdo(e);

  inProgress = null;
  clearInProgress();

  odoEnd.value = '';
  distanceValue.textContent = '—';
  dateInput.value = todayISO();

  updateMonthTotal();
  renderLogView();
  showToast('Trip saved · ' + totalDistance + ' km');
});

// ============================================
// Cancel an in-progress trip
// ============================================
btnCancelTrip.addEventListener('click', () => {
  if (!confirm('Cancel this trip? Any readings will be lost.')) return;

  inProgress = null;
  clearInProgress();

  odoEnd.value = '';
  distanceValue.textContent = '—';

  renderLogView();
  showToast('Trip cancelled');
});

// ============================================
// Trips list
// ============================================
function renderTrips() {
  if (trips.length === 0) {
    tripsSummary.textContent = '0 trips logged';
    tripsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">~</span>
        <p class="empty-state-text">Nothing logged yet. Your first trip will land here.</p>
      </div>
    `;
    return;
  }

  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  tripsSummary.textContent = `${trips.length} trips · ${Math.round(totalKm)} km total`;

  const sorted = [...trips].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  tripsList.innerHTML = sorted.map(t => {
    const d = new Date(t.date + 'T12:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString('en-NZ', { month: 'short' }).toUpperCase();

    let routeStr;
    if (t.legs && t.legs.length > 1) {
      routeStr = `${escapeHtml(t.legs[0].from)} → ` +
        t.legs.map(l => escapeHtml(l.to)).join(' → ');
    } else if (t.roundTrip) {
      const leg = t.legs[0];
      routeStr = `${escapeHtml(leg.from)} → ${escapeHtml(leg.to)} → ${escapeHtml(leg.from)}`;
    } else {
      const leg = t.legs[0];
      routeStr = `${escapeHtml(leg.from)} → ${escapeHtml(leg.to)}`;
    }

    const reasonHtml = t.odoStartReason ?
      `<div class="trip-reason">⚠ Start odo overridden: ${escapeHtml(t.odoStartReason)}</div>` : '';

    return `
      <div class="trip-item">
        <div class="trip-date-block">
          <div class="trip-day">${day}</div>
          <div class="trip-month">${month}</div>
        </div>
        <div class="trip-info">
          <div class="trip-route">${routeStr}</div>
          <div class="trip-purpose">${escapeHtml(t.purpose)}${t.legs && t.legs.length > 1 ? ` · ${t.legs.length} stops` : ''}</div>
          ${reasonHtml}
        </div>
        <div class="trip-distance">${t.distance}<span class="trip-distance-unit">km</span></div>
        <button class="trip-delete" data-id="${t.id}" aria-label="Delete trip">×</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.trip-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTrip(btn.dataset.id));
  });
}

function deleteTrip(id) {
  if (!confirm('Delete this trip?')) return;
  trips = trips.filter(t => t.id !== id);
  saveTrips();
  updateMonthTotal();
  renderTrips();
}

// ============================================
// Month total
// ============================================
function updateMonthTotal() {
  const now = new Date();
  const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const thisMonth = trips.filter(t => t.date.startsWith(monthKey));
  const total = thisMonth.reduce((sum, t) => sum + t.distance, 0);
  monthTotal.innerHTML = Math.round(total) + '<span class="km-unit">km</span>';
  monthLabel.textContent = now.toLocaleDateString('en-NZ', { month: 'long' });
}

// ============================================
// Export
// ============================================
function renderExport() {
  const monthsSet = new Set();
  const now = new Date();
  monthsSet.add(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
  trips.forEach(t => monthsSet.add(t.date.slice(0, 7)));

  const months = [...monthsSet].sort().reverse();
  exportMonth.innerHTML = months.map(m => {
    const [y, mo] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
    const label = d.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
    return `<option value="${m}">${label}</option>`;
  }).join('');

  updateExportPreview();
  exportMonth.onchange = updateExportPreview;
}

function updateExportPreview() {
  const monthKey = exportMonth.value;
  if (!monthKey) { exportPreview.textContent = ''; return; }
  const monthTrips = trips.filter(t => t.date.startsWith(monthKey));
  const total = monthTrips.reduce((sum, t) => sum + t.distance, 0);
  exportPreview.textContent = `${monthTrips.length} trips · ${Math.round(total)} km`;
}

// Render the route for CSV/email (handles round trip and multi-leg)
function formatTripRoute(t) {
  if (t.legs && t.legs.length > 1) {
    return `${t.legs[0].from} → ` + t.legs.map(l => l.to).join(' → ');
  }
  if (t.roundTrip) {
    const leg = t.legs[0];
    return `${leg.from} → ${leg.to} → ${leg.from}`;
  }
  const leg = t.legs[0];
  return `${leg.from} → ${leg.to}`;
}

function getOverallOdoStart(t) {
  return t.legs[0].odoStart;
}
function getOverallOdoEnd(t) {
  const last = t.legs[t.legs.length - 1];
  return last.odoEnd;
}

btnCsv.addEventListener('click', () => {
  const monthKey = exportMonth.value;
  const monthTrips = trips
    .filter(t => t.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthTrips.length === 0) { showToast('No trips for this month'); return; }

  const header = 'Date,Route,Purpose,Odo Start,Odo End,Distance (km),Notes\n';
  const rows = monthTrips.map(t => {
    const notes = [];
    if (t.legs && t.legs.length > 1) notes.push(`${t.legs.length} stops`);
    if (t.roundTrip) notes.push('round trip');
    if (t.odoStartReason) notes.push(`override: ${t.odoStartReason}`);
    return `${t.date},"${csvEscape(formatTripRoute(t))}","${csvEscape(t.purpose)}",${getOverallOdoStart(t)},${getOverallOdoEnd(t)},${t.distance},"${csvEscape(notes.join('; '))}"`;
  }).join('\n');
  const total = monthTrips.reduce((sum, t) => sum + t.distance, 0);
  const footer = `\n,,,,,Total:,${Math.round(total)}`;
  const csv = header + rows + footer;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mileage-${monthKey}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Spreadsheet downloaded');
});

btnEmail.addEventListener('click', () => {
  const monthKey = exportMonth.value;
  const monthTrips = trips
    .filter(t => t.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthTrips.length === 0) { showToast('No trips for this month'); return; }

  const [y, mo] = monthKey.split('-');
  const monthName = new Date(parseInt(y), parseInt(mo) - 1, 1)
    .toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

  const lines = monthTrips.map(t => {
    let line = `${formatDateShort(t.date)}  ${formatTripRoute(t)}  (${t.purpose})  ${getOverallOdoStart(t)}–${getOverallOdoEnd(t)}km  = ${t.distance}km`;
    if (t.odoStartReason) line += `\n   ↳ Start odo override: ${t.odoStartReason}`;
    return line;
  }).join('\n');
  const total = monthTrips.reduce((sum, t) => sum + t.distance, 0);

  const body = `Kia ora Vikram,\n\nMileage log for ${monthName}:\n\n${lines}\n\nTotal: ${Math.round(total)} km\n\nNgā mihi,\nIlka`;
  const subject = `Mileage log — ${monthName}`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

btnClear.addEventListener('click', () => {
  if (!confirm('This will delete ALL trips from this phone. Continue?')) return;
  if (!confirm('Are you sure? There is no backup and no way to undo this.')) return;
  trips = [];
  inProgress = null;
  saveTrips();
  clearInProgress();
  // Note: we keep lastOdo and customs since those are useful even after a reset
  updateMonthTotal();
  renderLogView();
  renderTrips();
  renderExport();
  showToast('All trips cleared');
});

// ============================================
// Customs (saved "Other" values)
// ============================================
function renderCustoms() {
  const sections = [
    { key: 'purposes', label: 'Purposes' },
    { key: 'froms', label: 'From' },
    { key: 'tos', label: 'To' }
  ];
  let html = '';
  let anyShown = false;
  sections.forEach(s => {
    if (customs[s.key].length === 0) return;
    anyShown = true;
    html += `<div class="customs-section">
      <p class="customs-section-label">${s.label}</p>
      <div class="customs-chips">
        ${customs[s.key].map(c =>
          `<span class="custom-chip">${escapeHtml(c)} <button class="chip-x" data-cat="${s.key}" data-val="${escapeHtml(c)}" aria-label="Remove">×</button></span>`
        ).join('')}
      </div>
    </div>`;
  });
  if (!anyShown) {
    html = '<p class="empty-customs">No custom destinations saved yet. They\'ll appear here as you add them.</p>';
  }
  customsList.innerHTML = html;
  document.querySelectorAll('.chip-x').forEach(btn => {
    btn.addEventListener('click', () => removeCustom(btn.dataset.cat, btn.dataset.val));
  });
}

function rememberCustom(category, value) {
  if (!value) return;
  if (customs[category].includes(value)) return;
  customs[category].push(value);
  saveCustoms();
}

function removeCustom(category, value) {
  if (!confirm(`Remove "${value}" from saved ${category}?`)) return;
  customs[category] = customs[category].filter(v => v !== value);
  saveCustoms();
  populateDropdowns();
  renderCustoms();
}

// ============================================
// Persistence
// ============================================
function loadTrips() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}
function saveTrips() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)); }
  catch (e) { showToast('Could not save — storage might be full'); }
}

function loadInProgress() {
  try { const raw = localStorage.getItem(IN_PROGRESS_KEY); const ip = raw ? JSON.parse(raw) : null;
    // Migrate old in-progress format (had odoStart/from/to at top level, no legs)
    if (ip && !ip.legs) {
      return {
        date: ip.date, purpose: ip.purpose, startedAt: ip.startedAt,
        roundTrip: false,
        legs: [{ from: ip.from, to: ip.to, odoStart: ip.odoStart, odoEnd: null, distance: null }]
      };
    }
    return ip;
  } catch (e) { return null; }
}
function saveInProgress() {
  try { localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(inProgress)); }
  catch (e) { showToast('Could not save — storage might be full'); }
}
function clearInProgress() {
  try { localStorage.removeItem(IN_PROGRESS_KEY); } catch (e) {}
}

function loadLastOdo() {
  try { const raw = localStorage.getItem(LAST_ODO_KEY); if (!raw) return null;
    const d = JSON.parse(raw); return d.value; } catch (e) { return null; }
}
function loadLastOdoDate() {
  try { const raw = localStorage.getItem(LAST_ODO_KEY); if (!raw) return null;
    const d = JSON.parse(raw); return d.date; } catch (e) { return null; }
}
function saveLastOdo(value) {
  try { localStorage.setItem(LAST_ODO_KEY, JSON.stringify({ value: value, date: todayISO() })); }
  catch (e) {}
}

function loadCustoms() {
  try { const raw = localStorage.getItem(CUSTOMS_KEY);
    if (!raw) return { purposes: [], froms: [], tos: [] };
    const c = JSON.parse(raw);
    return {
      purposes: c.purposes || [],
      froms: c.froms || [],
      tos: c.tos || []
    };
  } catch (e) { return { purposes: [], froms: [], tos: [] }; }
}
function saveCustoms() {
  try { localStorage.setItem(CUSTOMS_KEY, JSON.stringify(customs)); }
  catch (e) {}
}

// Migrate old trip format to new legs-based format
function migrateTrips(raw) {
  return raw.map(t => {
    if (t.legs) return t;
    return {
      ...t,
      legs: [{
        from: t.from, to: t.to,
        odoStart: t.odoStart, odoEnd: t.odoEnd,
        distance: t.distance
      }],
      roundTrip: false
    };
  });
}

// ============================================
// Helpers
// ============================================
function parseOdo(value) {
  if (value == null) return NaN;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

function csvEscape(str) {
  return String(str).replace(/"/g, '""');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ============================================
// Service worker registration
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
