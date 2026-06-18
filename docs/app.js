const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const SERVICE_TYPES = ['', 'м+л', 'м+г', 'м', 'г'];
const STORAGE_KEY = 'ezhnedevnik.entries.v2';
const HINT_KEY = 'ezhnedevnik.hint.dismissed';

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const today = startOfDay(new Date());
let entries = loadEntries();
let selectedDate = new Date(today);
let weekStart = startOfWeek(selectedDate);
let viewMode = 'day';

const app = document.getElementById('app');
const monthTitle = document.getElementById('monthTitle');
const dayTitle = document.getElementById('dayTitle');
const dayHeader = document.getElementById('dayHeader');
const hoursList = document.getElementById('hoursList');
const weekGrid = document.getElementById('weekGrid');
const dayView = document.getElementById('dayView');
const weekView = document.getElementById('weekView');

document.getElementById('prevBtn').addEventListener('click', () => navigateDay(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigateDay(1));
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
  if (viewMode === 'day') renderDayView();
  else renderWeekView();
}

function renderDayView() {
  app.dataset.mode = 'day';
  dayView.classList.remove('hidden');
  weekView.classList.add('hidden');

  const info = dayInfo(selectedDate);
  monthTitle.textContent = `${capitalize(MONTHS_RU[selectedDate.getMonth()])} · нед. ${getWeekNumber(weekStart)}`;
  dayTitle.textContent = `${info.day} · ${info.weekdayRu}`;

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
  HOURS.forEach((hour) => hoursList.appendChild(createHourRow(selectedDate, hour)));
}

function createHourRow(date, hour) {
  const key = entryKey(date, hour);
  const entry = getEntry(key);
  const row = document.createElement('div');
  row.className = 'hour-row';
  row.dataset.hourKey = key;

  const timeCol = document.createElement('div');
  timeCol.className = 'time-col';
  const hourLabel = document.createElement('span');
  hourLabel.className = 'hour-label';
  hourLabel.textContent = hour;
  timeCol.appendChild(hourLabel);

  const minutesInput = document.createElement('input');
  minutesInput.type = 'text';
  minutesInput.inputMode = 'numeric';
  minutesInput.maxLength = 2;
  minutesInput.className = 'minutes-input';
  minutesInput.placeholder = '00';
  minutesInput.value = entry.minutes || '';
  minutesInput.setAttribute('aria-label', `Минуты, ${hour} час`);
  bindMinutesInput(minutesInput, key);
  timeCol.appendChild(minutesInput);

  const clientCol = document.createElement('div');
  clientCol.className = 'client-col';

  if (entry.contactPhone) {
    const callBtn = document.createElement('button');
    callBtn.type = 'button';
    callBtn.className = 'name-call-btn';
    callBtn.textContent = entry.contactName || 'Звонок';
    callBtn.title = 'Позвонить';
    callBtn.addEventListener('click', () => {
      window.location.href = `tel:${normalizePhone(entry.contactPhone)}`;
    });
    clientCol.appendChild(callBtn);
  } else {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'name-input';
    nameInput.placeholder = 'Имя';
    nameInput.value = entry.contactName || '';
    nameInput.setAttribute('aria-label', `Имя, ${hour} час`);
    nameInput.addEventListener('input', () => {
      updateEntry(key, { contactName: nameInput.value.trim() });
    });
    nameInput.addEventListener('blur', () => {
      updateEntry(key, { contactName: nameInput.value.trim() });
    });
    clientCol.appendChild(nameInput);
  }

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.className = 'pick-btn';
  pickBtn.textContent = '👤';
  pickBtn.title = 'Из контактов';
  pickBtn.addEventListener('click', () => pickContactForRow(key));
  clientCol.appendChild(pickBtn);

  const serviceSelect = document.createElement('select');
  serviceSelect.className = 'service-select';
  SERVICE_TYPES.forEach((type) => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type || '—';
    serviceSelect.appendChild(opt);
  });
  serviceSelect.value = entry.serviceType || '';
  serviceSelect.addEventListener('change', () => {
    updateEntry(key, { serviceType: serviceSelect.value });
  });

  row.appendChild(timeCol);
  row.appendChild(clientCol);
  row.appendChild(serviceSelect);
  return row;
}

function bindMinutesInput(input, key) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 2);
    updateEntry(key, { minutes: input.value });
  });
  input.addEventListener('blur', () => {
    if (input.value.length === 1) {
      input.value = input.value.padStart(2, '0');
      updateEntry(key, { minutes: input.value });
    }
    if (input.value.length === 2) {
      const val = Math.min(59, parseInt(input.value, 10) || 0);
      input.value = String(val).padStart(2, '0');
      updateEntry(key, { minutes: input.value });
    }
  });
}

async function pickContactForRow(key) {
  if ('contacts' in navigator && navigator.contacts?.select) {
    try {
      const result = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!result?.length) return;
      const contact = result[0];
      const fullName = contact.name?.[0] || '';
      const firstName = fullName.split(/\s+/)[0] || fullName;
      const phone = contact.tel?.[0] || '';
      updateEntry(key, { contactName: firstName, contactPhone: phone });
      render();
      return;
    } catch {
      /* manual entry */
    }
  }
  render();
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
    const dayEntries = getDayEntries(date);
    const col = document.createElement('button');
    col.type = 'button';
    col.className = `week-day-col${isSameDay(date, selectedDate) ? ' active' : ''}${isToday(date) ? ' today' : ''}`;

    const slotsHtml = dayEntries.length
      ? dayEntries.map(({ hour, entry }) => {
          const mins = entry.minutes ? `:${entry.minutes}` : '';
          const svc = entry.serviceType ? ` ${entry.serviceType}` : '';
          return `<div class="week-slot"><b>${hour}${mins}</b> ${escapeHtml(entry.contactName)}${svc}</div>`;
        }).join('')
      : '<span class="week-empty">пусто</span>';

    const fillClass = dayEntries.length === 0 ? '' : dayEntries.length >= 5 ? ' fill-high' : ' fill-low';

    col.innerHTML = `
      <div class="week-day-head">
        <strong>${date.getDate()}</strong>
        <span>${WEEKDAYS_RU[date.getDay()]}</span>
        <span class="week-fill${fillClass}">${dayEntries.length}</span>
      </div>
      <div class="week-day-body">${slotsHtml}</div>
    `;
    col.addEventListener('click', () => {
      selectedDate = startOfDay(date);
      setViewMode('day');
    });
    weekGrid.appendChild(col);
  });
}

function getDayEntries(date) {
  return HOURS
    .map((hour) => ({ hour, entry: getEntry(entryKey(date, hour)) }))
    .filter(({ entry }) => entry.contactName || entry.serviceType || entry.minutes);
}

function getEntry(key) {
  return entries[key] || { minutes: '', contactName: '', contactPhone: '', serviceType: '' };
}

function updateEntry(key, patch) {
  const current = getEntry(key);
  const next = { ...current, ...patch };
  const empty = !next.contactName && !next.contactPhone && !next.serviceType &&
    (next.minutes === '' || next.minutes == null);
  if (empty) delete entries[key];
  else entries[key] = next;
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
    if (ratio < 0.8 && viewMode === 'day') {
      setViewMode('week');
      initialDistance = null;
    } else if (ratio > 1.25 && viewMode === 'week') {
      setViewMode('day');
      initialDistance = null;
    }
  }, { passive: true });

  app.addEventListener('touchend', () => { initialDistance = null; });
}

function touchDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
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
    weekdayRu: WEEKDAYS_FULL_RU[date.getDay()],
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

function entryKey(date, hour) {
  return `${dateKey(date)}-${hour}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
