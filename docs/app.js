const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const SERVICES = [
  { id: '', label: '—', price: 0 },
  { id: 'm_ukr_1500', label: 'м+укр', price: 1500 },
  { id: 'mbp_600', label: 'мбп', price: 600 },
  { id: 'm_ukr_1700', label: 'м+укр', price: 1700 },
  { id: 'yap_m_1000', label: 'Яп.м', price: 1000 },
  { id: 'pbp_700', label: 'пбп', price: 700 },
  { id: 'pbp_1400', label: 'пбп', price: 1400 },
  { id: 'pg_l_1400', label: 'п+г.л', price: 1400 },
  { id: 'pg_l_1700', label: 'п+г.л', price: 1700 }
];
const STORAGE_KEY = 'ezhnedevnik.entries.v3';
const HINT_KEY = 'ezhnedevnik.hint.dismissed';

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const today = startOfDay(new Date());
let entries = loadEntries();
let selectedDate = new Date(today);
let overviewStart = startOfWeek(selectedDate);
let viewMode = 'day';
let editingKey = null;

const app = document.getElementById('app');
const topBrand = document.getElementById('topBrand');
const topSubtitle = document.getElementById('topSubtitle');
const dayHeader = document.getElementById('dayHeader');
const hoursList = document.getElementById('hoursList');
const overviewGrid = document.getElementById('overviewGrid');
const overviewHint = document.getElementById('overviewHint');
const dayView = document.getElementById('dayView');
const overviewView = document.getElementById('overviewView');
const contactSheet = document.getElementById('contactSheet');
const sheetName = document.getElementById('sheetName');
const sheetPhone = document.getElementById('sheetPhone');
const contactSheetNote = document.getElementById('contactSheetNote');
const toast = document.getElementById('toast');

document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('tryContactsBtn').addEventListener('click', () => tryNativeContacts(true));
document.getElementById('sheetSaveBtn').addEventListener('click', saveFromSheet);
document.getElementById('sheetClearBtn').addEventListener('click', clearFromSheet);
document.getElementById('sheetCancelBtn').addEventListener('click', () => contactSheet.close());
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
  topBrand.innerHTML = brandHTML('sm');
  if (viewMode === 'day') renderDayView();
  else renderOverviewView();
}

function brandHTML(size = 'md') {
  const cls = size === 'sm' ? 'brand-logo-sm' : size === 'lg' ? 'brand-logo-lg' : 'brand-logo-md';
  return `<img src="logo.png" alt="АлёнаNails" class="brand-logo-img ${cls}">`;
}

function renderDayView() {
  app.dataset.mode = 'day';
  dayView.classList.remove('hidden');
  overviewView.classList.add('hidden');

  const info = dayInfo(selectedDate);
  topSubtitle.textContent = `${info.weekdayRu} · ${capitalize(MONTHS_RU[selectedDate.getMonth()])}`;

  dayHeader.innerHTML = `
    <div class="day-brand-bar">
      ${brandHTML('lg')}
      <div class="day-number-big">${info.day}</div>
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
  bindMinutesInput(minutesInput, key);
  timeCol.appendChild(minutesInput);

  const clientCol = document.createElement('div');
  clientCol.className = 'client-col';

  if (entry.contactPhone) {
    const callBtn = document.createElement('button');
    callBtn.type = 'button';
    callBtn.className = 'name-call-btn';
    callBtn.textContent = entry.contactName || 'Звонок';
    callBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `tel:${normalizePhone(entry.contactPhone)}`;
    });
    let holdTimer = null;
    callBtn.addEventListener('touchstart', () => {
      holdTimer = setTimeout(() => openContactSheet(key), 600);
    }, { passive: true });
    callBtn.addEventListener('touchend', () => clearTimeout(holdTimer));
    callBtn.addEventListener('touchmove', () => clearTimeout(holdTimer));
    clientCol.appendChild(callBtn);
  } else {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'name-input';
    nameInput.placeholder = 'Имя';
    nameInput.autocomplete = 'name';
    nameInput.value = entry.contactName || '';
    nameInput.addEventListener('input', () => updateEntry(key, { contactName: nameInput.value.trim() }));
    nameInput.addEventListener('blur', () => updateEntry(key, { contactName: nameInput.value.trim() }));
    clientCol.appendChild(nameInput);
  }

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.className = 'pick-btn';
  pickBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  pickBtn.title = 'Контакты';
  pickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openContactSheet(key);
  });
  clientCol.appendChild(pickBtn);

  const priceSpan = document.createElement('span');
  priceSpan.className = 'price-tag';
  priceSpan.textContent = formatPrice(entry.serviceId);

  const serviceSelect = document.createElement('select');
  serviceSelect.className = 'service-select';
  SERVICES.forEach((svc) => {
    const opt = document.createElement('option');
    opt.value = svc.id;
    opt.textContent = svc.id ? `${svc.label} ${svc.price}` : '—';
    serviceSelect.appendChild(opt);
  });
  serviceSelect.value = entry.serviceId || '';
  serviceSelect.addEventListener('change', () => {
    updateEntry(key, { serviceId: serviceSelect.value });
    priceSpan.textContent = formatPrice(serviceSelect.value);
  });

  row.appendChild(timeCol);
  row.appendChild(clientCol);
  row.appendChild(priceSpan);
  row.appendChild(serviceSelect);
  return row;
}

function formatPrice(serviceId) {
  const svc = SERVICES.find((s) => s.id === serviceId);
  return svc?.price ? String(svc.price) : '';
}

function serviceLabel(serviceId) {
  const svc = SERVICES.find((s) => s.id === serviceId);
  return svc?.id ? `${svc.label} ${svc.price}` : '';
}

function openContactSheet(key) {
  editingKey = key;
  const entry = getEntry(key);
  sheetName.value = entry.contactName || '';
  sheetPhone.value = entry.contactPhone || '';
  contactSheetNote.textContent = contactsSupported()
    ? 'Нажмите кнопку ниже или введите вручную'
    : 'Введите имя и телефон. В поле телефона iPhone может подсказать контакты.';
  contactSheet.showModal();
}

async function tryNativeContacts(showErrors) {
  try {
    if (!contactsSupported()) throw new Error('unsupported');
    const result = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!result?.length) return false;
    applyContact(result[0]);
    contactSheet.close();
    showToast('Контакт добавлен');
    render();
    return true;
  } catch {
    if (showErrors) {
      showToast('Введите вручную — iPhone подскажет в поле телефона');
      sheetPhone.focus();
    }
    return false;
  }
}

function contactsSupported() {
  return 'contacts' in navigator && typeof navigator.contacts?.select === 'function';
}

function applyContact(contact) {
  const fullName = contact.name?.[0] || '';
  const firstName = fullName.split(/\s+/)[0] || fullName;
  updateEntry(editingKey, { contactName: firstName, contactPhone: contact.tel?.[0] || '' });
}

function saveFromSheet() {
  const name = sheetName.value.trim();
  const phone = sheetPhone.value.trim();
  if (!name && !phone) delete entries[editingKey];
  else updateEntry(editingKey, { contactName: name, contactPhone: phone });
  contactSheet.close();
  render();
}

function clearFromSheet() {
  delete entries[editingKey];
  persistEntries();
  contactSheet.close();
  render();
}

function bindMinutesInput(input, key) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 2);
    updateEntry(key, { minutes: input.value });
  });
  input.addEventListener('blur', () => {
    if (input.value.length === 1) input.value = input.value.padStart(2, '0');
    if (input.value.length === 2) {
      input.value = String(Math.min(59, parseInt(input.value, 10) || 0)).padStart(2, '0');
    }
    updateEntry(key, { minutes: input.value });
  });
}

function renderOverviewView() {
  app.dataset.mode = viewMode;
  dayView.classList.add('hidden');
  overviewView.classList.remove('hidden');

  const weekCount = viewMode === 'fortnight' ? 2 : 4;
  const allDays = [];
  for (let w = 0; w < weekCount; w += 1) {
    allDays.push(...getWeekDays(addDays(overviewStart, w * 7)));
  }

  if (viewMode === 'fortnight') {
    topSubtitle.textContent = `2 недели · ${formatMonthRange(allDays)}`;
    overviewHint.textContent = 'Сведите пальцы — 4 недели · Разведите — день · Нажмите на день';
    overviewGrid.className = 'overview-grid fortnight';
  } else {
    topSubtitle.textContent = `4 недели · ${formatMonthRange(allDays)}`;
    overviewHint.textContent = 'Разведите пальцы — 2 недели · Нажмите на день';
    overviewGrid.className = 'overview-grid month';
  }

  overviewGrid.innerHTML = '';
  for (let w = 0; w < weekCount; w += 1) {
    overviewGrid.appendChild(buildWeekBlock(addDays(overviewStart, w * 7)));
  }
}

function buildWeekBlock(weekStartDate) {
  const weekDays = getWeekDays(weekStartDate);
  const block = document.createElement('div');
  block.className = 'week-block';

  const label = document.createElement('div');
  label.className = 'week-row-label';
  label.textContent = `Неделя ${getWeekNumber(weekDays[0])}`;
  block.appendChild(label);

  const row5 = document.createElement('div');
  row5.className = 'week-row-five';
  weekDays.slice(0, 5).forEach((date) => row5.appendChild(createDayCol(date)));
  block.appendChild(row5);

  const rowWE = document.createElement('div');
  rowWE.className = 'week-row-we';
  weekDays.slice(5, 7).forEach((date) => rowWE.appendChild(createDayCol(date, true)));
  block.appendChild(rowWE);

  return block;
}

function createDayCol(date, isWeekend = false) {
  const dayEntries = getDayEntries(date);
  const col = document.createElement('button');
  col.type = 'button';
  col.className = `day-col${isWeekend ? ' weekend' : ''}${isSameDay(date, selectedDate) ? ' active' : ''}${isToday(date) ? ' today' : ''}`;

  const slotsHtml = dayEntries.length
    ? dayEntries.map(({ hour, entry }) => {
        const mins = entry.minutes ? `:${entry.minutes}` : '';
        const svc = entry.serviceId ? ` <i>${escapeHtml(serviceLabel(entry.serviceId))}</i>` : '';
        return `<div class="slot-line"><b>${hour}${mins}</b> ${escapeHtml(entry.contactName)}${svc}</div>`;
      }).join('')
    : '<span class="slot-empty">—</span>';

  const fillClass = dayEntries.length === 0 ? '' : dayEntries.length >= 4 ? ' fill-high' : ' fill-low';

  col.innerHTML = `
    <div class="day-col-head">
      <strong>${date.getDate()}</strong>
      <span>${WEEKDAYS_RU[date.getDay()]}</span>
      <span class="fill-badge${fillClass}">${dayEntries.length}</span>
    </div>
    <div class="day-col-body">${slotsHtml}</div>
  `;
  col.addEventListener('click', () => {
    selectedDate = startOfDay(date);
    overviewStart = startOfWeek(selectedDate);
    setViewMode('day');
  });
  return col;
}

function getDayEntries(date) {
  return HOURS
    .map((hour) => ({ hour, entry: getEntry(entryKey(date, hour)) }))
    .filter(({ entry }) => entry.contactName || entry.serviceId || entry.minutes);
}

function getEntry(key) {
  return entries[key] || { minutes: '', contactName: '', contactPhone: '', serviceId: '' };
}

function updateEntry(key, patch) {
  const next = { ...getEntry(key), ...patch };
  const empty = !next.contactName && !next.contactPhone && !next.serviceId &&
    (next.minutes === '' || next.minutes == null);
  if (empty) delete entries[key];
  else entries[key] = next;
  persistEntries();
}

function navigate(delta) {
  if (viewMode === 'day') {
    selectedDate = addDays(selectedDate, delta);
    overviewStart = startOfWeek(selectedDate);
  } else if (viewMode === 'fortnight') {
    overviewStart = addDays(overviewStart, delta * 14);
  } else {
    overviewStart = addDays(overviewStart, delta * 28);
  }
  render();
}

function setViewMode(mode) {
  viewMode = mode;
  if (mode !== 'day') overviewStart = startOfWeek(selectedDate);
  render();
}

function zoomIn() {
  if (viewMode === 'month') setViewMode('fortnight');
  else if (viewMode === 'fortnight') setViewMode('day');
}

function zoomOut() {
  if (viewMode === 'day') setViewMode('fortnight');
  else if (viewMode === 'fortnight') setViewMode('month');
}

function setupPinchZoom() {
  let initialDistance = null;
  let triggered = false;
  app.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = touchDistance(e.touches[0], e.touches[1]);
      triggered = false;
    }
  }, { passive: true });
  app.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || initialDistance == null || triggered) return;
    const ratio = touchDistance(e.touches[0], e.touches[1]) / initialDistance;
    if (ratio < 0.78) { zoomOut(); triggered = true; }
    else if (ratio > 1.28) { zoomIn(); triggered = true; }
  }, { passive: true });
  app.addEventListener('touchend', () => { initialDistance = null; triggered = false; });
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 2800);
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
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isToday(date) { return isSameDay(date, new Date()); }

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dayInfo(date) {
  return { day: date.getDate(), weekdayRu: WEEKDAYS_FULL_RU[date.getDay()] };
}

function formatMonthRange(days) {
  const ruFirst = capitalize(MONTHS_RU[days[0].getMonth()]);
  const ruLast = capitalize(MONTHS_RU[days[days.length - 1].getMonth()]);
  return days[0].getMonth() === days[days.length - 1].getMonth() ? ruFirst : `${ruFirst} — ${ruLast}`;
}

function entryKey(date, hour) { return `${dateKey(date)}-${hour}`; }

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Object.keys(raw).length) return raw;
    const old = JSON.parse(localStorage.getItem('ezhnedevnik.entries.v2') || '{}');
    const migrated = {};
    Object.entries(old).forEach(([key, val]) => {
      migrated[key] = {
        minutes: val.minutes || '',
        contactName: val.contactName || '',
        contactPhone: val.contactPhone || '',
        serviceId: ''
      };
    });
    return migrated;
  } catch {
    return {};
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
