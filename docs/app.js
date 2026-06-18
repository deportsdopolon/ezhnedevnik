const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const STORAGE_KEY = 'ezhnedevnik.entries.v1';
const HINT_KEY = 'ezhnedevnik.hint.dismissed';

const WEEKDAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let entries = loadEntries();
let weekStart = startOfWeek(new Date());
let editingKey = null;

const weekGrid = document.getElementById('weekGrid');
const monthTitle = document.getElementById('monthTitle');
const weekTitle = document.getElementById('weekTitle');
const miniCalendar = document.getElementById('miniCalendar');
const entryDialog = document.getElementById('entryDialog');
const entryForm = document.getElementById('entryForm');
const dialogTitle = document.getElementById('dialogTitle');
const entryText = document.getElementById('entryText');
const contactName = document.getElementById('contactName');
const contactPhone = document.getElementById('contactPhone');

document.getElementById('prevWeek').addEventListener('click', () => shiftWeek(-1));
document.getElementById('nextWeek').addEventListener('click', () => shiftWeek(1));
document.getElementById('todayBtn').addEventListener('click', () => {
  weekStart = startOfWeek(new Date());
  render();
});

document.getElementById('pickContactBtn').addEventListener('click', pickContact);
document.getElementById('cancelBtn').addEventListener('click', () => entryDialog.close());
document.getElementById('deleteEntryBtn').addEventListener('click', deleteCurrentEntry);
entryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveCurrentEntry();
  entryDialog.close();
});

document.getElementById('dismissHint').addEventListener('click', () => {
  localStorage.setItem(HINT_KEY, '1');
  document.getElementById('installHint').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

if (!localStorage.getItem(HINT_KEY) && !window.navigator.standalone) {
  document.getElementById('installHint').classList.remove('hidden');
}

render();

function render() {
  const days = getWeekDays(weekStart);
  monthTitle.textContent = formatMonthRange(days);
  weekTitle.textContent = `Неделя ${getWeekNumber(weekStart)} week`;
  weekGrid.innerHTML = '';

  days.forEach((date) => {
    const isSunday = date.getDay() === 0;
    weekGrid.appendChild(createDayCard(date, isSunday));
  });

  renderMiniCalendar(days[0]);
}

function createDayCard(date, compact) {
  const card = document.createElement('section');
  card.className = `day-card${isToday(date) ? ' today' : ''}${compact ? ' compact' : ''}`;

  const info = dayInfo(date);
  card.innerHTML = `
    <div class="day-header">
      <div class="day-top">
        <div class="day-number">${info.day}</div>
        <div class="day-counter">${info.dayOfYear}/${info.daysLeft}</div>
      </div>
      <div class="day-name">${info.weekdayRu} / ${info.weekdayEn}</div>
      <div class="sun-times">
        <span>☀️ ${info.sunrise}</span>
        <span>🌙 ${info.sunset}</span>
      </div>
    </div>
    <div class="hours"></div>
  `;

  const hoursEl = card.querySelector('.hours');
  HOURS.forEach((hour) => {
    const key = entryKey(date, hour);
    const entry = entries[key] || {};
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'hour-row';
    row.innerHTML = `
      <span class="hour-label">${hour}</span>
      <span class="hour-content">
        ${entry.contactName ? `<span class="hour-contact">${escapeHtml(entry.contactName)}</span>` : ''}
        ${entry.text ? `<span class="hour-note">${escapeHtml(entry.text)}</span>` : ''}
      </span>
    `;
    row.addEventListener('click', () => openEditor(key, date, hour));
    hoursEl.appendChild(row);
  });

  return card;
}

function openEditor(key, date, hour) {
  editingKey = key;
  const entry = entries[key] || {};
  dialogTitle.textContent = `${formatDateLabel(date)} · ${String(hour).padStart(2, '0')}:00`;
  entryText.value = entry.text || '';
  contactName.value = entry.contactName || '';
  contactPhone.value = entry.contactPhone || '';
  entryDialog.showModal();
}

function saveCurrentEntry() {
  const text = entryText.value.trim();
  const name = contactName.value.trim();
  const phone = contactPhone.value.trim();

  if (!text && !name && !phone) {
    delete entries[editingKey];
  } else {
    entries[editingKey] = { text, contactName: name, contactPhone: phone };
  }

  persistEntries();
  render();
}

function deleteCurrentEntry() {
  delete entries[editingKey];
  persistEntries();
  entryDialog.close();
  render();
}

async function pickContact() {
  if (!('contacts' in navigator) || !navigator.contacts?.select) {
    alert('На iPhone введите имя и телефон вручную, или скопируйте из приложения «Контакты».');
    contactName.focus();
    return;
  }

  try {
    const result = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!result?.length) return;
    const contact = result[0];
    contactName.value = contact.name?.[0] || '';
    contactPhone.value = contact.tel?.[0] || '';
  } catch {
    contactName.focus();
  }
}

function renderMiniCalendar(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;

  let daysHtml = '';
  for (let i = 0; i < leading; i += 1) {
    daysHtml += '<span></span>';
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const todayClass = isToday(date) ? ' today-dot' : '';
    daysHtml += `<span class="${todayClass}">${day}</span>`;
  }

  miniCalendar.innerHTML = `
    <div class="mini-title">${capitalize(MONTHS_RU[month])} / ${MONTHS_EN[month]}</div>
    <div class="mini-weekdays">
      <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
    </div>
    <div class="mini-days">${daysHtml}</div>
  `;
}

function shiftWeek(delta) {
  weekStart = addDays(weekStart, delta * 7);
  render();
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
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
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
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);
  const yearLength = isLeapYear(date.getFullYear()) ? 366 : 365;
  const daysLeft = Math.max(yearLength - dayOfYear, 0);
  const sun = sunTimes(date);

  return {
    day: date.getDate(),
    weekdayRu: WEEKDAYS_RU[date.getDay()],
    weekdayEn: WEEKDAYS_EN[date.getDay()],
    dayOfYear,
    daysLeft,
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
  const sunriseHour = solarNoon - hourAngle * 12 / Math.PI;
  const sunsetHour = solarNoon + hourAngle * 12 / Math.PI;
  return {
    sunrise: formatHour(sunriseHour),
    sunset: formatHour(sunsetHour)
  };
}

function formatHour(value) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatMonthRange(days) {
  const first = days[0];
  const last = days[6];
  const ruFirst = capitalize(MONTHS_RU[first.getMonth()]);
  const ruLast = capitalize(MONTHS_RU[last.getMonth()]);
  const enFirst = MONTHS_EN[first.getMonth()];
  const enLast = MONTHS_EN[last.getMonth()];
  if (first.getMonth() === last.getMonth()) {
    return `${ruFirst} / ${enFirst}`;
  }
  return `${ruFirst} — ${ruLast} / ${enFirst} — ${enLast}`;
}

function formatDateLabel(date) {
  return `${date.getDate()} ${capitalize(MONTHS_RU[date.getMonth()])}`;
}

function entryKey(date, hour) {
  return `${dateKey(date)}-${hour}`;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
