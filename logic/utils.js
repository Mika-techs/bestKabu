const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

// "8:30" -> minutes since midnight
function parseTime(text) {
    const m = /(\d{1,2}):(\d{2})/.exec(text || '');
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

function formatTime(minutes) {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayIso() {
    return isoDate(new Date());
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function mondayOf(date) {
    const day = (date.getDay() + 6) % 7;
    return addDays(startOfDay(date), -day);
}

function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
}

// ISO 8601 calendar week
function weekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// "21.09."
function dayMonth(date) {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;
}

// digikabu prints "Mo, 21.09." without a year: pick the year that puts the date closest to today
function inferDate(day, month, reference = new Date()) {
    let best = null;
    for (let year = reference.getFullYear() - 1; year <= reference.getFullYear() + 1; year++) {
        const candidate = new Date(year, month - 1, day);
        if (candidate.getMonth() !== month - 1) continue;
        if (best === null || Math.abs(candidate - reference) < Math.abs(best - reference)) {
            best = candidate;
        }
    }
    return best;
}

// fetch in the page's context so digikabu's session cookie is sent (Firefox content scripts need content.fetch)
function pageFetch(url, options = {}) {
    const fetcher = (typeof content !== 'undefined' && content && content.fetch) ? content.fetch.bind(content) : fetch;
    return fetcher(url, Object.assign({ credentials: 'same-origin' }, options));
}

async function fetchDocument(url, options) {
    const response = await pageFetch(url, options);
    if (!response.ok) throw new Error(`digikabu answered ${response.status}`);
    return new DOMParser().parseFromString(await response.text(), 'text/html');
}

// "SchA ITP", "1.SA AEuP", "Ex D", "KA" (case-sensitive, so the weekday "Sa" never matches), "Prüfung", "Test"
function isExamText(text) {
    return !!text && (/\b(SchA|SA|Ex|KA)\b/.test(text) || /prüfung|klausur|\btest\b/i.test(text));
}
