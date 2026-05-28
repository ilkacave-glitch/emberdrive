/* ============================================
   Mileage app logic — two-step start/finish flow
   ============================================ */

const STORAGE_KEY = 'mileage-trips-v1';
const IN_PROGRESS_KEY = 'mileage-in-progress-v1';

const $ = id => document.getElementById(id);

let trips = loadTrips();
let inProgress = loadInProgress();

const dateInput = $('trip-date');
const purposeInput = $('trip-purpose');
const fromInput = $('trip-from');
const toInput = $('trip-to');
const odoStart = $('odo-start');
const odoEnd = $('odo-end');
const distanceDisplay = $('distance-display');
const distanceValue = $('distance-value');
const btnStartTrip = $('btn-start-trip');
const btnFinishTrip = $('btn-finish-trip');
const btnCancelTrip = $('btn-cancel-trip');
const startForm = $('start-form');
const finishForm = $('finish-form');
const tripInProgress = $('trip-in-progress');
const tipRoute = $('tip-route');
const tipStarted = $('tip-started');
const tipStartOdo = $('tip-start-odo');
const toast = $('toast');
const tripsList = $('trips-list');
const tripsSummary = $('trips-summary');
const monthTotal = $('month-total');
const monthLabel = $('month-label');
const exportMonth = $('export-month');
const exportPreview = $('export-preview');
const btnCsv = $('btn-csv');
const btnEmail = $('btn-email');
const btnClear = $('btn-clear');

dateInput.value = todayISO();

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
  if (name === 'export') renderExport();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// Render the log tab based on whether a trip is in progress
// ============================================
function renderLogView() {
  if (inProgress) {
    startForm.hidden = true;
    finishForm.hidden = false;
    tripInProgress.hidden = false;

    tipRoute.textContent = `${inProgress.from} → ${inProgress.to}`;
    tipStartOdo.textContent = inProgress.odoStart.toLocaleString() + ' km';

    const startedAt = new Date(inProgress.startedAt);
    const today = new Date();
    const sameDay = startedAt.toDateString() === today.toDateString();
    if (sameDay) {
      tipStarted.textContent = startedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
    } else {
      tipStarted.textContent = startedAt.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
        ' · ' + startedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
    }
  } else {
    startForm.hidden = false;
    finishForm.hidden = true;
    tripInProgress.hidden = true;
  }
}

// ============================================
// Distance preview (during finish step)
// ============================================
function updateDistance() {
  if (!inProgress) return;
  const e = parseFloat(odoEnd.value);

  if (isNaN(e)) {
    distanceValue.textContent = '—';
    distanceDisplay.classList.remove('error');
    return;
  }

  if (e < inProgress.odoStart) {
    distanceValue.textContent = 'End must be higher than ' + inProgress.odoStart.toLocaleString();
    distanceDisplay.classList.add('error');
    return;
  }

  distanceValue.textContent = Math.round(e - inProgress.odoStart) + ' km';
  distanceDisplay.classList.remove('error');
}

odoEnd.addEventListener('input', updateDistance);

// ============================================
// Start a trip
// ============================================
btnStartTrip.addEventListener('click', () => {
  const s = parseFloat(odoStart.value);

  if (isNaN(s)) {
    showToast('Please enter the start odometer reading');
    return;
  }

  inProgress = {
    date: dateInput.value,
    purpose: purposeInput.value,
    from: fromInput.value,
    to: toInput.value,
    odoStart: s,
    startedAt: new Date().toISOString()
  };

  saveInProgress();

  odoStart.value = '';
  odoEnd.value = '';
  distanceValue.textContent = '—';
  distanceDisplay.classList.remove('error');

  renderLogView();
  showToast('Trip started · drive safe');
});

// ============================================
// Finish a trip
// ============================================
btnFinishTrip.addEventListener('click', () => {
  if (!inProgress) return;

  const e = parseFloat(odoEnd.value);

  if (isNaN(e)) {
    showToast('Please enter the end odometer reading');
    return;
  }

  if (e < inProgress.odoStart) {
    showToast('End reading must be higher than start');
    return;
  }

  const trip = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    date: inProgress.date,
    purpose: inProgress.purpose,
    from: inProgress.from,
    to: inProgress.to,
    odoStart: inProgress.odoStart,
    odoEnd: e,
    distance: Math.round(e - inProgress.odoStart),
    startedAt: inProgress.startedAt,
    createdAt: new Date().toISOString()
  };

  trips.push(trip);
  saveTrips();

  const dist = trip.distance;

  inProgress = null;
  clearInProgress();

  odoEnd.value = '';
  distanceValue.textContent = '—';
  dateInput.value = todayISO();

  updateMonthTotal();
  renderLogView();
  showToast('Trip saved · ' + dist + ' km');
});

// ============================================
// Cancel an in-progress trip
// ============================================
btnCancelTrip.addEventListener('click', () => {
  if (!confirm('Cancel this trip? The start reading will be lost.')) return;

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

  const sorted = [...trips].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  tripsList.innerHTML = sorted.map(t => {
    const d = new Date(t.date + 'T12:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString('en-NZ', { month: 'short' }).toUpperCase();
    return `
      <div class="trip-item">
        <div class="trip-date-block">
          <div class="trip-day">${day}</div>
          <div class="trip-month">${month}</div>
        </div>
        <div class="trip-info">
          <div class="trip-route">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</div>
          <div class="trip-purpose">${escapeHtml(t.purpose)}</div>
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
  if (!monthKey) {
    exportPreview.textContent = '';
    return;
  }
  const monthTrips = trips.filter(t => t.date.startsWith(monthKey));
  const total = monthTrips.reduce((sum, t) => sum + t.distance, 0);
  exportPreview.textContent = `${monthTrips.length} trips · ${Math.round(total)} km`;
}

btnCsv.addEventListener('click', () => {
  const monthKey = exportMonth.value;
  const monthTrips = trips
    .filter(t => t.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthTrips.length === 0) {
    showToast('No trips for this month');
    return;
  }

  const header = 'Date,From,To,Purpose,Odo Start (km),Odo End (km),Distance (km)\n';
  const rows = monthTrips.map(t =>
    `${t.date},"${csvEscape(t.from)}","${csvEscape(t.to)}","${csvEscape(t.purpose)}",${t.odoStart},${t.odoEnd},${t.distance}`
  ).join('\n');
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

  if (monthTrips.length === 0) {
    showToast('No trips for this month');
    return;
  }

  const [y, mo] = monthKey.split('-');
  const monthName = new Date(parseInt(y), parseInt(mo) - 1, 1)
    .toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

  const lines = monthTrips.map(t =>
    `${formatDateShort(t.date)}  ${t.from} → ${t.to}  (${t.purpose})  ${t.odoStart}–${t.odoEnd}km  = ${t.distance}km`
  ).join('\n');
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
  updateMonthTotal();
  renderLogView();
  renderTrips();
  renderExport();
  showToast('All trips cleared');
});

// ============================================
// Persistence
// ============================================
function loadTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveTrips() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    showToast('Could not save — storage might be full');
  }
}

function loadInProgress() {
  try {
    const raw = localStorage.getItem(IN_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveInProgress() {
  try {
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(inProgress));
  } catch (e) {
    showToast('Could not save — storage might be full');
  }
}

function clearInProgress() {
  try {
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (e) { /* ignore */ }
}

// ============================================
// Helpers
// ============================================
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
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ============================================
// Init
// ============================================
updateMonthTotal();
renderLogView();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
