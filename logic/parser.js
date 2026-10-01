// Reads digikabu's server-rendered pages into plain objects. The timetable is an SVG: one fixed-width column with the
// period times, then one column per weekday; a lesson is a nested svg whose y/height encode the periods (60 per row)
// and whose x/width (in %) encode parallel groups.

const ROW_HEIGHT = 60;

function attrNumber(el, name) {
    const value = parseFloat((el.getAttribute(name) || '').replace('%', ''));
    return isNaN(value) ? 0 : value;
}

function textOf(el) {
    const text = el ? el.textContent.trim() : '';
    return text === '' ? null : text;
}

function rowOf(y, offset) {
    return Math.round((y - offset) / ROW_HEIGHT) + 1;
}

function parsePeriods(column) {
    const periods = [];
    for (const group of column.querySelectorAll(':scope > g')) {
        const rect = group.querySelector('rect');
        const texts = group.querySelectorAll('text');
        if (!rect || texts.length < 3) continue;
        const start = parseTime(texts[0].textContent);
        const end = parseTime(texts[2].textContent);
        if (start === null || end === null) continue;
        periods.push({ no: rowOf(attrNumber(rect, 'y'), 30), start, end });
    }
    return withoutBreaks(periods);
}

// digikabu folds a break into the following period (10:00–11:00 instead of 10:15–11:00): periods longer than the
// usual length are shortened at the start, which leaves the break as a gap
function withoutBreaks(periods) {
    const counts = new Map();
    periods.forEach(p => counts.set(p.end - p.start, (counts.get(p.end - p.start) || 0) + 1));
    let usual = null;
    counts.forEach((count, length) => {
        if (usual === null || count > counts.get(usual) || (count === counts.get(usual) && length < usual)) usual = length;
    });
    return periods.map(p => (p.end - p.start > usual ? { no: p.no, start: p.end - usual, end: p.end } : p));
}

function defaultPeriods() {
    return timeTable.map((t, i) => ({ no: i + 1, start: t.start[0] * 60 + t.start[1], end: t.end[0] * 60 + t.end[1] }));
}

function lessonStatus(raw) {
    if (!raw || raw === 'regStd') return 'regular';
    const lower = raw.toLowerCase();
    if (lower.includes('entf') || lower.includes('ausf')) return 'cancelled';
    if (lower.includes('vertret')) return 'changed';
    return 'unknown';
}

function parseLesson(box, offset) {
    const from = rowOf(attrNumber(box, 'y'), offset);
    const to = from + Math.max(1, Math.round(attrNumber(box, 'height') / ROW_HEIGHT)) - 1;
    const width = attrNumber(box, 'width') || 100;
    const lanes = Math.max(1, Math.round(100 / width));
    const lane = Math.min(lanes - 1, Math.round(attrNumber(box, 'x') / width));

    const lesson = { from, to, lane, lanes, teacher: null, room: null, subject: null, status: 'regular', note: null, hint: null };
    for (const text of box.querySelectorAll(':scope > text.sp, :scope > text.sp_small')) {
        const anchor = text.getAttribute('text-anchor');
        if (anchor === 'end') lesson.room = textOf(text);
        else if (anchor === 'middle') lesson.subject = textOf(text);
        else lesson.teacher = textOf(text);
    }
    for (const rect of box.querySelectorAll(':scope > rect')) {
        const cls = rect.getAttribute('class') || '';
        if (cls !== 'std' && cls.endsWith('Std')) {
            lesson.status = lessonStatus(cls);
            break;
        }
    }
    lesson.hint = textOf(box.querySelector(':scope > text.vhinweis_vertr'));
    const lines = [...box.querySelectorAll(':scope > text.inhalt tspan')].map(t => t.textContent.trim()).filter(Boolean);
    lesson.note = lines.length ? lines.join(' · ') : null;
    return lesson;
}

function parseDayColumn(column, date) {
    // weekday columns of the week plan start with a 30px date header, the single day on /Main has none
    const offset = column.querySelector(':scope > g') ? 30 : 0;
    if (!date) {
        for (const text of column.querySelectorAll(':scope > g > text')) {
            const m = /^\p{L}{2},\s*(\d{1,2})\.(\d{1,2})\.?$/u.exec(text.textContent.trim());
            if (m) {
                date = inferDate(parseInt(m[1], 10), parseInt(m[2], 10));
                break;
            }
        }
    }
    if (!date) return null;
    const lessons = [...column.querySelectorAll(':scope > svg')].map(box => parseLesson(box, offset));
    lessons.sort((a, b) => a.from - b.from || a.lane - b.lane);
    return { date, iso: isoDate(date), lessons };
}

// fragment of POST /Stundenplan/StdPlanStd
function parseWeek(doc) {
    const container = doc.querySelector('#umgebung');
    if (!container) return null;
    let periods = [];
    const days = [];
    for (const column of container.children) {
        if (column.tagName.toLowerCase() !== 'svg') continue;
        if ((column.getAttribute('width') || '').endsWith('%')) {
            const day = parseDayColumn(column);
            if (day) days.push(day);
        } else {
            periods = parsePeriods(column);
        }
    }
    if (days.length === 0) return null;
    const heading = textOf(doc.querySelector('#stdplanheading h3'));
    return {
        periods: periods.length ? periods : defaultPeriods(),
        days,
        monday: mondayOf(days[0].date),
        title: heading,
        token: doc.querySelector('input[name="__RequestVerificationToken"]')?.value || null
    };
}

// GET /Main: one day of the timetable plus "Aktuelle Termine"
function parseMainPage(doc) {
    const container = doc.querySelector('#umgebung');
    if (!container) return null;
    const svgs = [...container.querySelectorAll('svg')].filter(s => !s.parentElement.closest('svg'));
    const timeColumn = svgs.find(s => !(s.getAttribute('width') || '').endsWith('%'));
    const dayColumn = svgs.find(s => (s.getAttribute('width') || '').endsWith('%'));

    const label = textOf(container.querySelector('.center-block span'));
    const m = /(\d{1,2})\.(\d{1,2})\./.exec(label || '');
    const date = m ? inferDate(parseInt(m[1], 10), parseInt(m[2], 10)) : startOfDay(new Date());
    const periods = timeColumn ? parsePeriods(timeColumn) : [];

    const events = [];
    for (const row of container.querySelectorAll('table tr')) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;
        const d = /(\d{2})\.(\d{2})\.(\d{4})/.exec(cells[1].textContent);
        if (!d) continue;
        events.push({ date: new Date(+d[3], +d[2] - 1, +d[1]), text: cells[2].textContent.trim() });
    }

    return {
        periods: periods.length ? periods : defaultPeriods(),
        day: dayColumn ? parseDayColumn(dayColumn, date) : { date, iso: isoDate(date), lessons: [] },
        previous: container.querySelector('#btnback')?.value || null,
        next: container.querySelector('#btnforw')?.value || null,
        events
    };
}

// GET /SchulaufgabenPlan: one row per calendar day, grouped by "September 2026" headers
function parseExamPlan(doc) {
    const days = [];
    let year = null;
    for (const row of doc.querySelectorAll('table.saplan tr')) {
        const header = row.querySelector('h4');
        if (header) {
            const y = /(\d{4})/.exec(header.textContent);
            year = y ? parseInt(y[1], 10) : year;
            continue;
        }
        const cells = row.querySelectorAll(':scope > td');
        if (cells.length < 3 || year === null) continue;
        const d = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(cells[0].textContent.trim());
        if (!d) continue;
        let text = cells[2].textContent.trim();
        if (text === '***' || text === '') text = null;
        const kind = row.classList.contains('feiertag') ? 'holiday' : (row.classList.contains('keinunterr') ? 'noschool' : 'school');
        const date = new Date(year, parseInt(d[2], 10) - 1, parseInt(d[1], 10));
        days.push({ date, iso: isoDate(date), kind, text });
    }
    return days;
}

// GET /Fehlzeiten: "Ganztags: 1 (davon 1 unentschuldigt)" / "(alle entschuldigt)" plus a details table
function parseAbsences(doc) {
    const summary = {};
    for (const row of doc.querySelectorAll('.body-content table tr')) {
        const cells = row.querySelectorAll(':scope > td');
        if (cells.length !== 2) continue;
        const label = cells[0].textContent.trim();
        const m = /^(\d+)\s*(?:\(davon\s+(\d+)\s+unentschuldigt\))?/.exec(cells[1].textContent.trim());
        if (!m) continue;
        const value = { total: parseInt(m[1], 10), unexcused: m[2] ? parseInt(m[2], 10) : 0 };
        if (label.startsWith('Ganztags')) summary.fullDays = value;
        else if (label.startsWith('Stundenweise')) summary.hours = value;
    }
    if (!summary.fullDays || !summary.hours) return null;

    const entries = [];
    for (const row of doc.querySelectorAll('table.table-striped tbody tr')) {
        const cells = row.querySelectorAll(':scope > td');
        if (cells.length < 6) continue;
        const d = /(\d{2})\.(\d{2})\.(\d{4})/.exec(cells[0].textContent);
        if (!d) continue;
        const excusedText = textOf(cells[5]);
        entries.push({
            date: new Date(+d[3], +d[2] - 1, +d[1]),
            from: textOf(cells[1]),
            to: textOf(cells[2]),
            remark: textOf(cells[3]),
            kind: textOf(cells[4]),
            excused: excusedText !== null || cells[5].querySelector('.glyphicon-ok') !== null,
            excusedText
        });
    }
    return { ...summary, entries };
}

// navbar: "Max Muster (WIT12A)" + menu links
function parseNavbar(doc) {
    const nav = doc.querySelector('nav.navbar');
    if (!nav) return null;
    const brand = textOf(nav.querySelector('span.navbar-brand'));
    const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(brand || '');
    return {
        name: m ? m[1].trim() : null,
        className: m ? m[2].trim() : null,
        links: [...nav.querySelectorAll('ul.nav a')].map(a => ({
            href: a.getAttribute('href'),
            label: a.textContent.trim(),
            active: a.parentElement.classList.contains('active')
        }))
    };
}
