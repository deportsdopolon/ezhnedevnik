const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const SERVICES = [
  { id: '', label: '—', price: 0 },
  { id: 'm_ukr_1500', label: 'м+укр', price: 1500 },
  { id: 'mbp_600', label: 'мбп', price: 600 },
  { id: 'm_ukr_d_1700', label: 'м+укр+д', price: 1700 },
  { id: 'yap_man_1000', label: 'Яп.ман', price: 1000 },
  { id: 'ppbp_700', label: 'пПбп', price: 700 },
  { id: 'psbp_1400', label: 'пСбп', price: 1400 },
  { id: 'ppgl_1400', label: 'пП+г.л', price: 1400 },
  { id: 'psgl_1700', label: 'пС+г.л', price: 1700 }
];
const STORAGE_KEY = 'ezhnedevnik.entries.v4';
const HINT_KEY = 'ezhnedevnik.hint.dismissed';

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const today = startOfDay(new Date());
let entries = loadEntries();
let selectedDate = new Date(today);
let overviewStart = startOfWeek(selectedDate);
let viewMode = 'day';
let pickerMonth = new Date(today);

const app = document.getElementById('app');
const appBanner = document.getElementById('appBanner');
const topSubtitle = document.getElementById('topSubtitle');
const dayHeader = document.getElementById('dayHeader');
const hoursList = document.getElementById('hoursList');
const overviewGrid = document.getElementById('overviewGrid');
const overviewHint = document.getElementById('overviewHint');
const dayView = document.getElementById('dayView');
const overviewView = document.getElementById('overviewView');
const monthPicker = document.getElementById('monthPicker');
const pickerDays = document.getElementById('pickerDays');
const pickerMonthTitle = document.getElementById('pickerMonthTitle');
const toast = document.getElementById('toast');

document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('monthBtn').addEventListener('click', openMonthPicker);
document.getElementById('pickerPrevMonth').addEventListener('click', () => { pickerMonth = addMonths(pickerMonth, -1); renderMonthPicker(); });
document.getElementById('pickerNextMonth').addEventListener('click', () => { pickerMonth = addMonths(pickerMonth, 1); renderMonthPicker(); });
document.getElementById('pickerToday').addEventListener('click', () => selectPickerDate(today));
document.getElementById('pickerClose').addEventListener('click', () => monthPicker.close());
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
  appBanner.innerHTML = bannerHTML();
  document.getElementById('monthBtn').textContent = capitalize(MONTHS_RU[selectedDate.getMonth()]).slice(0, 3);
  if (viewMode === 'day') renderDayView();
  else renderOverviewView();
}

function bannerHTML() {
  return `<div class="banner-bg"><img src="logo-banner.png?v=5" alt="АлёнаNails" class="banner-img"></div>`;
}

function renderDayView() {
  app.dataset.mode = 'day';
  dayView.classList.remove('hidden');
  overviewView.classList.add('hidden');

  const info = dayInfo(selectedDate);
  topSubtitle.textContent = `${info.weekdayRu} · ${capitalize(MONTHS_RU[selectedDate.getMonth()])}`;

  dayHeader.innerHTML = `<div class="day-number-big">${info.day}</div>`;

  hoursList.innerHTML = '';
  HOURS.forEach((hour) => hoursList.appendChild(createHourRow(selectedDate, hour)));
}

function createHourRow(date, hour) {
  const key = entryKey(date, hour);
  const entry = getEntry(key);
  const row = document.createElement('div');
  row.className = 'hour-row';

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
  clientCol.appendChild(createNameField(key, entry));

  const priceInput = document.createElement('input');
  priceInput.type = 'text';
  priceInput.inputMode = 'numeric';
  priceInput.className = 'price-input';
  priceInput.placeholder = '₽';
  priceInput.value = entry.price ? String(entry.price) : '';
  priceInput.addEventListener('input', () => {
    const val = priceInput.value.replace(/\D/g, '');
    priceInput.value = val;
    updateEntry(key, { price: val ? parseInt(val, 10) : '' });
  });

  const serviceSelect = document.createElement('select');
  serviceSelect.className = 'service-select';
  SERVICES.forEach((svc) => {
    const opt = document.createElement('option');
    opt.value = svc.id;
    opt.textContent = svc.label;
    serviceSelect.appendChild(opt);
  });
  serviceSelect.value = entry.serviceId || '';
  serviceSelect.addEventListener('change', () => {
    const svc = SERVICES.find((s) => s.id === serviceSelect.value);
    const patch = { serviceId: serviceSelect.value };
    if (svc?.price && !priceInput.value) {
      patch.price = svc.price;
      priceInput.value = String(svc.price);
    } else if (!serviceSelect.value) {
      patch.price = '';
      priceInput.value = '';
    }
    updateEntry(key, patch);
  });

  row.appendChild(timeCol);
  row.appendChild(clientCol);
  row.appendChild(priceInput);
  row.appendChild(serviceSelect);
  return row;
}

function createNameField(key, entry) {
  const wrap = document.createElement('div');
  wrap.className = 'name-wrap';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'name-input';
  nameInput.placeholder = 'Имя / фамилия';
  nameInput.autocapitalize = 'words';
  nameInput.value = entry.contactName || '';

  const phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.className = 'phone-input';
  phoneInput.placeholder = 'Телефон';
  phoneInput.inputMode = 'tel';
  phoneInput.value = entry.contactPhone || '';

  const callBtn = document.createElement('button');
  callBtn.type = 'button';
  callBtn.className = 'call-btn';
  callBtn.innerHTML = '📞';
  callBtn.title = 'Позвонить';

  function syncCallBtn() {
    const phone = phoneInput.value.trim();
    callBtn.classList.toggle('hidden', !phone);
    callBtn.onclick = () => { window.location.href = `tel:${normalizePhone(phone)}`; };
  }

  function saveContact() {
    updateEntry(key, {
      contactName: nameInput.value.trim(),
      contactPhone: phoneInput.value.trim()
    });
    syncCallBtn();
  }

  nameInput.addEventListener('input', () => updateEntry(key, { contactName: nameInput.value.trim() }));
  nameInput.addEventListener('blur', saveContact);
  phoneInput.addEventListener('input', () => {
    updateEntry(key, { contactPhone: phoneInput.value.trim() });
    syncCallBtn();
  });
  phoneInput.addEventListener('blur', saveContact);

  wrap.appendChild(nameInput);
  wrap.appendChild(phoneInput);
  wrap.appendChild(callBtn);
  syncCallBtn();
  return wrap;
}

function openMonthPicker() {
  pickerMonth = new Date(selectedDate);
  renderMonthPicker();
  monthPicker.showModal();
}

function renderMonthPicker() {
  const year = pickerMonth.getFullYear();
  const month = pickerMonth.getMonth();
  pickerMonthTitle.textContent = `${capitalize(MONTHS_RU[month])} ${year}`;
  pickerDays.innerHTML = '';

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;

  for (let i = 0; i < leading; i += 1) {
    const empty = document.createElement('span');
    empty.className = 'picker-empty';
    pickerDays.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-day';
    if (isSameDay(date, selectedDate)) btn.classList.add('selected');
    if (isToday(date)) btn.classList.add('today');
    btn.textContent = day;
    const count = getDayEntries(date).length;
    if (count > 0) {
      const dot = document.createElement('span');
      dot.className = 'picker-dot';
      dot.textContent = count;
      btn.appendChild(dot);
    }
    btn.addEventListener('click', () => selectPickerDate(date));
    pickerDays.appendChild(btn);
  }
}

function selectPickerDate(date) {
  selectedDate = startOfDay(date);
  overviewStart = startOfWeek(selectedDate);
  viewMode = 'day';
  monthPicker.close();
  render();
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
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
  for (let w = 0; w < weekCount; w += 1) allDays.push(...getWeekDays(addDays(overviewStart, w * 7)));

  topSubtitle.textContent = viewMode === 'fortnight'
    ? `2 недели · ${formatMonthRange(allDays)}`
    : `4 недели · ${formatMonthRange(allDays)}`;
  overviewHint.textContent = viewMode === 'fortnight'
    ? 'Сведите пальцы — 4 недели · Разведите — день · Нажмите на день'
    : 'Разведите пальцы — 2 недели · Нажмите на день';
  overviewGrid.className = `overview-grid ${viewMode}`;

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
  weekDays.slice(0, 5).forEach((d) => row5.appendChild(createDayCol(d)));
  block.appendChild(row5);

  const rowWE = document.createElement('div');
  rowWE.className = 'week-row-we';
  weekDays.slice(5, 7).forEach((d) => rowWE.appendChild(createDayCol(d, true)));
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
        const price = entry.price ? ` <em>${entry.price}</em>` : '';
        return `<div class="slot-line"><b>${hour}${mins}</b> ${escapeHtml(entry.contactName)}${svc}${price}</div>`;
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
    .filter(({ entry }) => entry.contactName || entry.serviceId || entry.minutes || entry.price);
}

function serviceLabel(serviceId) {
  return SERVICES.find((s) => s.id === serviceId)?.label || '';
}

function getEntry(key) {
  return entries[key] || { minutes: '', contactName: '', contactPhone: '', serviceId: '', price: '' };
}

function updateEntry(key, patch) {
  const next = { ...getEntry(key), ...patch };
  const empty = !next.contactName && !next.contactPhone && !next.serviceId &&
    !next.price && (next.minutes === '' || next.minutes == null);
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
    if (e.touches.length === 2) { initialDistance = touchDistance(e.touches[0], e.touches[1]); triggered = false; }
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

function normalizePhone(phone) { return phone.replace(/[^\d+]/g, ''); }

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start) { return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }

function startOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()));
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
    const old = JSON.parse(localStorage.getItem('ezhnedevnik.entries.v3') || '{}');
    const migrated = {};
    Object.entries(old).forEach(([key, val]) => {
      const svc = SERVICES.find((s) => s.id === val.serviceId);
      migrated[key] = {
        minutes: val.minutes || '',
        contactName: val.contactName || '',
        contactPhone: val.contactPhone || '',
        serviceId: val.serviceId || '',
        price: svc?.price || ''
      };
    });
    return migrated;
  } catch { return {}; }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
