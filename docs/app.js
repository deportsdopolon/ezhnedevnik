const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const SERVICE_TYPES = ['', 'м+л', 'м+г', 'м', 'г'];
const STORAGE_KEY = 'ezhnedevnik.entries.v2';
const HINT_KEY = 'ezhnedevnik.hint.dismissed';

const WEEKDAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

let entries = loadEntries();
let weekStart = startOfWeek(new Date());
let selectedDate = new Date(weekStart);
let viewMode = 'day';
let editingKey = null;

const app = document.getElementById('app');
const monthTitle = document.getElementById('monthTitle');
const dayTitle = document.getElementById('dayTitle');
const dayHeader = document.getElementById('dayHeader');
const hoursList = document.getElementById('hoursList');
const weekGrid = document.getElementById('weekGrid');
const dayView = document.getElementById('dayView');
const weekView = document.getElementById('weekView');
const contactDialog = document.getElementById('contactDialog');
const contactDialogTitle = document.getElementById('contactDialogTitle');
const manualName = document.getElementById('manualName');
const manualPhone = document.getElementById('manualPhone');

document.getElementById('prevBtn').addEventListener('click', () => navigateDay(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigateDay(1));
document.getElementById('pickContactBtn').addEventListener('click', pickContact);
document.getElementById('saveContactBtn').addEventListener('click', saveContactFromDialog);
document.getElementById('clearContactBtn').addEventListener('click', clearContactFromDialog);
document.getElementById('cancelContactBtn').addEventListener('click', () => contactDialog.close());
document.getElementById('dismissHint').addEventListener('click', () => {
  localStorage.setItem(HINT_KEY, '1');
  document.getElementById('installHint').classList.add('hidden');
});

setupPinchZoom();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

if (!localStorage.getItem(HINT_KEY) && !window.navigator.standalone) {
  document.getElementById('installHint').classList.remove('hidden');
}

render();

function render() {
  if (viewMode === 'day') {
    renderDayView();
  } else {
    renderWeekView();
  }
}

function renderDayView() {
  app.dataset.mode = 'day';
  dayView.classList.remove('hidden');
  weekView.classList.add('hidden');

  const info = dayInfo(selectedDate);
  monthTitle.textContent = `${capitalize(MONTHS_RU[selectedDate.getMonth()])} · неделя ${getWeekNumber(weekStart)}`;
  dayTitle.textContent = `${info.weekdayRu} / ${info.weekdayEn}`;

  dayHeader.innerHTML = `
    <div class="day-top">
      <div class="day-number">${info.day}</div>
      <div class="day-counter">${info.dayOfYear}/${info.daysLeft}</div>
    </div>
    <div class="sun-times">
      <span>☀️ ${info.sunrise}</span>
      <span>🌙 ${info.sunset}</span>
    </div>
  `;

  hoursList.innerHTML = '';
  HOURS.forEach((hour) => {
    hoursList.appendChild(createHourRow(selectedDate, hour));
  });
}

function createHourRow(date, hour) {
  const key = entryKey(date, hour);
  const entry = getEntry(key);
  const row = document.createElement('div');
  row.className = 'hour-row';
  row.dataset.key = key;

  const timeCol = document.createElement('div');
  timeCol.className = 'time-col';
  timeCol.innerHTML = `<span class="hour-label">${hour}</span>`;

  const minutesInput = document.createElement('input');
  minutesInput.type = 'text';
  minutesInput.inputMode = 'numeric';
  minutesInput.pattern = '[0-9]*';
  minutesInput.maxLength = 2;
  minutesInput.className = 'minutes-input';
  minutesInput.placeholder = '00';
  minutesInput.value = entry.minutes ?? '';
  minutesInput.setAttribute('aria-label', `Минуты для ${hour} часа`);
  minutesInput.addEventListener('click', (e) => e.stopPropagation());
  minutesInput.addEventListener('input', () => {
    minutesInput.value = minutesInput.value.replace(/\D/g, '').slice(0, 2);
    if (minutesInput.value.length === 2) {
      const val = Math.min(59, parseInt(minutesInput.value, 10) || 0);
      minutesInput.value = String(val).padStart(2, '0');
    }
    saveMinutes(key, minutesInput.value);
  });
  minutesInput.addEventListener('blur', () => {
    if (minutesInput.value !== '' && minutesInput.value.length === 1) {
      minutesInput.value = minutesInput.value.padStart(2, '0');
      saveMinutes(key, minutesInput.value);
    }
  });
  timeCol.appendChild(minutesInput);

  const clientBtn = document.createElement('button');
  clientBtn.type = 'button';
  clientBtn.className = 'client-cell';
  if (entry.contactName) {
    clientBtn.innerHTML = `<span class="client-name">${escapeHtml(entry.contactName)}</span>`;
    clientBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (entry.contactPhone) {
        window.location.href = `tel:${normalizePhone(entry.contactPhone)}`;
      } else {
        openContactDialog(key, date, hour);
      }
    });
    clientBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    let pressTimer = null;
    clientBtn.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => openContactDialog(key, date, hour), 500);
    }, { passive: true });
    clientBtn.addEventListener('touchend', () => clearTimeout(pressTimer));
    clientBtn.addEventListener('touchmove', () => clearTimeout(pressTimer));
  } else {
    clientBtn.innerHTML = '<span class="client-placeholder">+ клиент</span>';
    clientBtn.addEventListener('click', () => openContactDialog(key, date, hour));
  }

  const serviceSelect = document.createElement('select');
  serviceSelect.className = 'service-select';
  serviceSelect.setAttribute('aria-label', 'Тип услуги');
  SERVICE_TYPES.forEach((type) => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type || '—';
    serviceSelect.appendChild(opt);
  });
  serviceSelect.value = entry.serviceType || '';
  serviceSelect.addEventListener('click', (e) => e.stopPropagation());
  serviceSelect.addEventListener('change', () => saveServiceType(key, serviceSelect.value));

  row.appendChild(timeCol);
  row.appendChild(clientBtn);
  row.appendChild(serviceSelect);
  return row;
}

function renderWeekView() {
  app.dataset.mode = 'week';
  dayView.classList.add('hidden');
  weekView.classList.remove('hidden');

  const days = getWeekDays(weekStart);
  monthTitle.textContent = formatMonthRange(days);
  dayTitle.textContent = `Неделя ${getWeekNumber(weekStart)}`;

  weekGrid.innerHTML = '';
  days.forEach((date) => {
    const col = document.createElement('button');
    col.type = 'button';
    col.className = `week-day-col${isSameDay(date, selectedDate) ? ' active' : ''}${isToday(date) ? ' today' : ''}`;
    const info = dayInfo(date);
    const slots = HOURS
      .map((hour) => {
        const entry = getEntry(entryKey(date, hour));
        if (!entry.contactName) return '';
        const mins = entry.minutes ? `:${entry.minutes}` : '';
        const svc = entry.serviceType ? ` ${entry.serviceType}` : '';
        return `<div class="week-slot"><span class="week-slot-time">${hour}${mins}</span> ${escapeHtml(entry.contactName)}${svc}</div>`;
      })
      .filter(Boolean)
      .join('');

    col.innerHTML = `
      <div class="week-day-head">
        <strong>${info.day}</strong>
        <span>${info.weekdayRu.slice(0, 2)}</span>
      </div>
      <div class="week-day-body">${slots || '<span class="week-empty">—</span>'}</div>
    `;
    col.addEventListener('click', () => {
      selectedDate = new Date(date);
      setViewMode('day');
    });
    weekGrid.appendChild(col);
  });
}

function openContactDialog(key, date, hour) {
  editingKey = key;
  const entry = getEntry(key);
  contactDialogTitle.textContent = `${formatDateLabel(date)} · ${String(hour).padStart(2, '0')}:${(entry.minutes || '00').toString().padStart(2, '0')}`;
  manualName.value = entry.contactName || '';
  manualPhone.value = entry.contactPhone || '';
  contactDialog.showModal();
}

function saveContactFromDialog() {
  const name = manualName.value.trim();
  const phone = manualPhone.value.trim();
  updateEntry(editingKey, { contactName: name, contactPhone: phone });
  contactDialog.close();
  render();
}

function clearContactFromDialog() {
  updateEntry(editingKey, { contactName: '', contactPhone: '' });
  contactDialog.close();
  render();
}

async function pickContact() {
  if ('contacts' in navigator && navigator.contacts?.select) {
    try {
      const result = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (result?.length) {
        manualName.value = result[0].name?.[0] || '';
        manualPhone.value = result[0].tel?.[0] || '';
        return;
      }
    } catch {
      /* fallback below */
    }
  }
  manualName.focus();
}

function saveMinutes(key, minutes) {
  updateEntry(key, { minutes });
}

function saveServiceType(key, serviceType) {
  updateEntry(key, { serviceType });
}

function getEntry(key) {
  return entries[key] || { minutes: '', contactName: '', contactPhone: '', serviceType: '' };
}

function updateEntry(key, patch) {
  const current = getEntry(key);
  const next = { ...current, ...patch };
  const empty = !next.contactName && !next.contactPhone && !next.serviceType &&
    (next.minutes === '' || next.minutes == null);
  if (empty) {
    delete entries[key];
  } else {
    entries[key] = next;
  }
  persistEntries();
}

function navigateDay(delta) {
  selectedDate = addDays(selectedDate, delta);
  weekStart = startOfWeek(selectedDate);
  render();
}

function setViewMode(mode) {
  viewMode = mode;
  render();
}

function setupPinchZoom() {
  let initialDistance = null;

  app.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = touchDistance(e.touches[0], e.touches[1]);
    }
  }, { passive: true });

  app.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || initialDistance == null) return;
    const distance = touchDistance(e.touches[0], e.touches[1]);
    const ratio = distance / initialDistance;
    if (ratio < 0.75 && viewMode === 'day') {
      setViewMode('week');
      initialDistance = null;
    } else if (ratio > 1.35 && viewMode === 'week') {
      setViewMode('day');
      initialDistance = null;
    }
  }, { passive: true });

  app.addEventListener('touchend', () => {
    initialDistance = null;
  });
}

function touchDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function isSameDay(a, b) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dayInfo(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const yearLength = isLeapYear(date.getFullYear()) ? 366 : 365;
  const sun = sunTimes(date);
  return {
    day: date.getDate(),
    weekdayRu: WEEKDAYS_RU[date.getDay()],
    weekdayEn: WEEKDAYS_EN[date.getDay()],
    dayOfYear,
    daysLeft: Math.max(yearLength - dayOfYear, 0),
    sunrise: sun.sunrise,
    sunset: sun.sunset
  };
}

function sunTimes(date, lat = 55.7558, lon = 37.6173) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const latRad = lat * Math.PI / 180;
  const decl = 23.45 * Math.sin((360 / 365 * (dayOfYear - 81)) * Math.PI / 180) * Math.PI / 180;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(decl));
  const solarNoon = 12 - lon / 15;
  return {
    sunrise: formatHour(solarNoon - hourAngle * 12 / Math.PI),
    sunset: formatHour(solarNoon + hourAngle * 12 / Math.PI)
  };
}

function formatHour(value) {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatMonthRange(days) {
  const ruFirst = capitalize(MONTHS_RU[days[0].getMonth()]);
  const ruLast = capitalize(MONTHS_RU[days[6].getMonth()]);
  return days[0].getMonth() === days[6].getMonth() ? ruFirst : `${ruFirst} — ${ruLast}`;
}

function formatDateLabel(date) {
  return `${date.getDate()} ${capitalize(MONTHS_RU[date.getMonth()])}`;
}

function entryKey(date, hour) {
  return `${dateKey(date)}-${hour}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const old = localStorage.getItem('ezhnedevnik.entries.v1');
    if (Object.keys(raw).length === 0 && old) {
      const migrated = {};
      Object.entries(JSON.parse(old)).forEach(([key, val]) => {
        migrated[key] = {
          minutes: '',
          contactName: val.contactName || '',
          contactPhone: val.contactPhone || '',
          serviceType: ''
        };
      });
      return migrated;
    }
    return raw;
  } catch {
    return {};
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
