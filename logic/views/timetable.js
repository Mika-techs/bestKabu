// ---------- shared lesson rendering (week grid, day cards on mobile and on /Main) ----------

// grid rows: a break row wherever two periods don't touch, then one row per period
function periodLayout(periods) {
    const rows = [];
    const rowOfPeriod = {};
    const byNo = {};
    const breaks = [];
    let previous = null;
    for (const p of periods) {
        if (previous && p.start > previous.end) {
            rows.push('var(--break-h)');
            breaks.push({ row: rows.length, before: p.no, label: `${formatTime(previous.end)}–${formatTime(p.start)}` });
        }
        rows.push('minmax(var(--row-h), auto)');
        rowOfPeriod[p.no] = rows.length;
        byNo[p.no] = p;
        previous = p;
    }
    return { rows: rows.join(' '), rowOfPeriod, byNo, breaks };
}

function lessonTimes(lesson, layout) {
    const first = layout.byNo[lesson.from];
    const last = layout.byNo[lesson.to] || first;
    return first ? { start: first.start, end: last.end } : null;
}

function lessonNote(lesson) {
    if (lesson.note || lesson.hint) return [lesson.hint, lesson.note].filter(Boolean).join(' · ');
    if (lesson.status === 'changed') return 'Änderung';
    if (lesson.status === 'cancelled') return 'Entfällt';
    return null;
}

function lessonClass(lesson) {
    const status = { changed: ' bk-lesson--changed', cancelled: ' bk-lesson--cancelled', unknown: ' bk-lesson--unknown' }[lesson.status] || '';
    return `bk-lesson${status}${lesson.from === lesson.to ? ' bk-lesson--short' : ''}`;
}

function lessonAttrs(lesson, layout, extraStyle) {
    const times = lessonTimes(lesson, layout);
    return {
        class: lessonClass(lesson),
        style: Object.assign({ '--lesson-color': lesson.status === 'regular' ? subjectColor(lesson.subject) : null }, extraStyle),
        dataset: {
            group: `${subjectName(lesson.subject)}|${lesson.teacher || ''}`,
            start: times ? times.start : '',
            end: times ? times.end : '',
            cancelled: lesson.status === 'cancelled' ? '1' : ''
        },
        title: lesson.subject && lessonNames[lesson.subject] ? lesson.subject : null
    };
}

function periodLabel(lesson) {
    return lesson.from === lesson.to ? `${lesson.from}.` : `${lesson.from}.–${lesson.to}.`;
}

function timeLabel(lesson, layout) {
    const times = lessonTimes(lesson, layout);
    return times ? `${formatTime(times.start)}–${formatTime(times.end)}` : '';
}

function gridLesson(lesson, layout) {
    const span = 60 / lesson.lanes;
    const rowStart = layout.rowOfPeriod[lesson.from];
    const rowEnd = layout.rowOfPeriod[lesson.to] || rowStart;
    const note = lessonNote(lesson);
    const attrs = lessonAttrs(lesson, layout, {
        'grid-row': rowStart ? `${rowStart} / ${rowEnd + 1}` : null,
        'grid-column': `${Math.round(lesson.lane * span) + 1} / span ${Math.round(span)}`
    });
    if (lesson.lane > 0) attrs.class += ' bk-lesson--lane';
    return h('article', attrs,
        h('div', { class: 'bk-lesson__subject' }, subjectName(lesson.subject)),
        h('div', { class: 'bk-lesson__meta' }, h('span', null, lesson.teacher || ''), h('span', { class: 'bk-lesson__room' }, lesson.room || '')),
        note ? h('div', { class: 'bk-lesson__note' }, note) : null);
}

function rowLesson(lesson, layout) {
    const note = lessonNote(lesson);
    return h('li', lessonAttrs(lesson, layout),
        h('span', { class: 'bk-row__period' }, periodLabel(lesson)),
        h('span', { class: 'bk-row__time' }, timeLabel(lesson, layout)),
        h('span', { class: 'bk-row__subject' }, subjectName(lesson.subject)),
        h('span', { class: 'bk-row__meta' }, [lesson.teacher, lesson.room].filter(Boolean).join(' · ')),
        note ? h('span', { class: 'bk-row__note' }, note) : null);
}

function visibleLessons(day) {
    return day.lessons.filter(l => !isSubjectHidden(l.subject));
}

function dayState(day) {
    const today = todayIso();
    return { today: day.iso === today, past: day.iso < today };
}

function freeLabel(day, calendar) {
    const entry = calendar && calendar.get(day.iso);
    return (entry && entry.text) || (entry && entry.kind === 'holiday' ? 'Feiertag' : 'Kein Unterricht');
}

function dayCard(day, layout, calendar, options = {}) {
    const lessons = visibleLessons(day);
    const state = dayState(day);
    const entry = calendar && calendar.get(day.iso);
    const items = [];
    let previousTo = null;
    for (const lesson of lessons) {
        const pause = previousTo !== null && lesson.from > previousTo
            ? layout.breaks.find(b => b.before > previousTo && b.before <= lesson.from) : null;
        if (pause) items.push(h('li', { class: 'bk-daycard__break' }, `Pause · ${pause.label}`));
        items.push(rowLesson(lesson, layout));
        previousTo = Math.max(previousTo || 0, lesson.to);
    }
    return h('section', { class: `bk-daycard${state.today ? ' is-today' : ''}`, id: options.id || null, dataset: { date: day.iso } },
        h('h2', { class: 'bk-daycard__head' },
            h('span', null, WEEKDAYS_LONG[day.date.getDay()]),
            h('span', { class: 'bk-muted' }, dayMonth(day.date)),
            state.today ? h('span', { class: 'bk-chip bk-chip--accent' }, 'heute') : null,
            entry && entry.text && lessons.length ? h('span', { class: `bk-chip${isExamText(entry.text) ? ' bk-chip--exam' : ''}` }, entry.text) : null),
        lessons.length ? h('ul', { class: 'bk-daycard__list' }, items) : h('p', { class: 'bk-daycard__free' }, freeLabel(day, calendar)));
}

// ---------- live parts: "jetzt" marker, finished lessons, countdown ----------

let tickTimer = null;

function startTicker(view, todaySelector) {
    clearInterval(tickTimer);
    const nextup = view.querySelector('.bk-nextup');
    const pad = n => (n < 10 ? '0' : '') + n;
    const format = left => {
        const hours = Math.floor(left / 3600);
        const minutes = Math.floor(left % 3600 / 60);
        return (hours > 0 ? hours + ':' + pad(minutes) : minutes) + ':' + pad(left % 60);
    };
    const tick = () => {
        const now = new Date();
        const minutes = nowMinutes();
        const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        view.querySelectorAll('.bk-lesson[data-start]').forEach(el => {
            const today = !!el.closest('[data-date="' + todayIso() + '"]');
            const start = +el.dataset.start;
            const end = +el.dataset.end;
            el.classList.toggle('is-now', today && el.dataset.start !== '' && minutes >= start && minutes < end);
            el.classList.toggle('is-over', today && el.dataset.end !== '' && minutes >= end);
        });
        if (!nextup) return;

        // desktop grid or the single day card - the mobile list holds the same lessons
        const lessons = [...view.querySelectorAll(todaySelector)]
            .filter(el => el.dataset.start !== '' && !el.dataset.cancelled)
            .map(el => ({
                start: +el.dataset.start * 60,
                end: +el.dataset.end * 60,
                subject: el.querySelector('.bk-lesson__subject, .bk-row__subject')?.textContent || '',
                teacher: el.querySelector('.bk-lesson__meta span:first-child')?.textContent || el.querySelector('.bk-row__meta')?.textContent.split(' · ')[0] || '',
                room: el.querySelector('.bk-lesson__room')?.textContent || el.querySelector('.bk-row__meta')?.textContent.split(' · ')[1] || ''
            }));
        let next = null;
        let currentEnd = null;
        lessons.forEach(l => {
            if (l.start > seconds && (next === null || l.start < next)) next = l.start;
            // parallel lessons may end at different times - count until the last one is over
            if (l.start <= seconds && l.end > seconds && (currentEnd === null || l.end > currentEnd)) currentEnd = l.end;
        });
        // the end only matters when the next lesson doesn't follow right away
        const showEnd = currentEnd !== null && currentEnd !== next;
        const endRow = nextup.querySelector('.bk-nextup__end');
        const nextRow = nextup.querySelector('.bk-nextup__next');
        endRow.hidden = !showEnd;
        if (showEnd) endRow.querySelector('.bk-nextup__timer').textContent = format(currentEnd - seconds);
        nextRow.hidden = next === null;
        if (next !== null) {
            nextRow.querySelector('.bk-nextup__timer').textContent = format(next - seconds);
            // parallel lessons share a start time - name the teacher to tell them apart
            const parallel = lessons.filter(l => l.start === next);
            const labels = parallel.map(l => {
                const details = [l.room, parallel.length > 1 ? l.teacher : ''].filter(Boolean).join(', ');
                return l.subject + (details ? ` (${details})` : '');
            });
            nextRow.querySelector('.bk-nextup__what').textContent = labels.filter((s, i) => s && labels.indexOf(s) === i).join(' / ');
        }
        nextup.hidden = !showEnd && next === null;
    };
    tick();
    tickTimer = setInterval(tick, 1000);
}

function nextupBox() {
    return h('div', { class: 'bk-nextup', role: 'status', hidden: true },
        h('div', { class: 'bk-nextup__row bk-nextup__end', hidden: true },
            h('span', { class: 'bk-nextup__label' }, 'Stunde endet in'), h('span', { class: 'bk-nextup__timer' })),
        h('div', { class: 'bk-nextup__row bk-nextup__next', hidden: true },
            h('span', { class: 'bk-nextup__label' }, 'Nächste Stunde in'), h('span', { class: 'bk-nextup__timer' }), h('span', { class: 'bk-nextup__what' })));
}

// ---------- click a lesson: highlight every lesson of the same group ----------

let highlightedGroup = null;

function highlightGroup(group) {
    highlightedGroup = group;
    document.querySelectorAll('.bk-timetable, .bk-daylist').forEach(list => list.classList.toggle('has-highlight', group !== null));
    document.querySelectorAll('.bk-lesson[data-group]').forEach(el => el.classList.toggle('is-highlighted', group !== null && el.dataset.group === group));
}

function installHighlight() {
    document.addEventListener('click', e => {
        const lesson = e.target.closest ? e.target.closest('.bk-lesson[data-group]') : null;
        if (lesson && lesson.dataset.group !== highlightedGroup) highlightGroup(lesson.dataset.group);
        else if (highlightedGroup !== null) highlightGroup(null);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && highlightedGroup !== null) highlightGroup(null);
    });
}

// ---------- changes since the last visit (snapshot per week in localStorage) ----------

const SEEN_PREFIX = 'bkSeen:';

function lessonSignature(day, lesson) {
    return [day.iso, lesson.from, lesson.to, lesson.subject || '', lesson.teacher || '', lesson.room || '', lesson.status, lessonNote(lesson) || ''].join('|');
}

function weekSignatures(week) {
    // all lessons, so hiding a subject in the popup doesn't count as a change
    return week.days.flatMap(day => day.lessons.map(l => lessonSignature(day, l)));
}

function describeSignature(sig) {
    const [, , , subject, teacher, room, status, note] = sig.split('|');
    const text = [subjectName(subject), teacher, room].filter(Boolean).join(' · ');
    return status === 'cancelled' ? `${text} (entfällt)` : (note ? `${text} (${note})` : text);
}

function weekChanges(week) {
    const key = SEEN_PREFIX + isoDate(week.monday);
    const current = weekSignatures(week);
    let previous = null;
    try {
        previous = JSON.parse(retrieve(key));
    } catch {
        previous = null;
    }
    if (!Array.isArray(previous)) {
        markWeekSeen(week);
        return [];
    }
    const removed = previous.filter(s => !current.includes(s));
    const added = current.filter(s => !previous.includes(s));
    const slot = s => s.split('|').slice(0, 4).join('|');
    const changes = [];
    for (const after of added) {
        const index = removed.findIndex(b => slot(b) === slot(after));
        const before = index >= 0 ? removed.splice(index, 1)[0] : null;
        changes.push({ type: before ? 'modified' : 'added', before, after, sig: after });
    }
    removed.forEach(before => changes.push({ type: 'removed', before, after: null, sig: before }));
    return changes
        .filter(c => !isSubjectHidden(c.sig.split('|')[3]))
        .sort((a, b) => a.sig.localeCompare(b.sig, undefined, { numeric: true }));
}

function markWeekSeen(week) {
    store(SEEN_PREFIX + isoDate(week.monday), JSON.stringify(weekSignatures(week)));
    // keep the last few weeks only
    const keys = Object.keys(localStorage).filter(k => k.startsWith(SEEN_PREFIX)).sort();
    keys.slice(0, Math.max(0, keys.length - 8)).forEach(remove);
}

function changesBox(week, changes, onSeen) {
    if (!changes.length) return null;
    const label = { added: 'Neu', removed: 'Entfernt', modified: 'Geändert' };
    return h('section', { class: 'bk-changes', 'aria-label': 'Änderungen' },
        h('div', { class: 'bk-changes__head' },
            h('h2', null, changes.length === 1 ? '1 Änderung seit deinem letzten Besuch' : `${changes.length} Änderungen seit deinem letzten Besuch`),
            h('button', { type: 'button', class: 'bk-btn bk-btn--small', onclick: () => { markWeekSeen(week); onSeen(); } }, 'Gesehen')),
        h('ul', { class: 'bk-changes__list' }, changes.map(c => {
            const [iso, from, to] = c.sig.split('|');
            const date = new Date(iso + 'T00:00');
            return h('li', { class: `bk-change bk-change--${c.type}` },
                h('span', { class: 'bk-change__when' }, `${WEEKDAYS_SHORT[date.getDay()]} ${dayMonth(date)} · ${from === to ? from : from + '.–' + to}. Std`),
                h('span', { class: 'bk-change__type' }, label[c.type]),
                h('span', { class: 'bk-change__what' },
                    c.before && c.after ? [h('s', null, describeSignature(c.before)), ' → ', describeSignature(c.after)]
                        : c.after ? describeSignature(c.after) : h('s', null, describeSignature(c.before))));
        })));
}

// ---------- /Stundenplan: week grid ----------

const timetableState = { className: null, week: null, calendar: null, error: null, loading: false, loadedAt: 0 };

function timetableClassName() {
    for (const script of document.querySelectorAll('script:not([src])')) {
        const m = /"StdPlanKlasse","([^"]+)"/.exec(script.textContent);
        if (m) return m[1];
    }
    const fromPath = /\/Stundenplan\/Klasse\/([^/?#]+)/i.exec(window.location.pathname);
    return fromPath ? decodeURIComponent(fromPath[1]) : parseNavbar(document)?.className;
}

async function loadTimetable() {
    const s = timetableState;
    s.loading = true;
    document.querySelector('.bk-view')?.classList.add('bk-loading');
    try {
        const doc = await fetchDocument('/Stundenplan/StdPlanStd', {
            method: 'POST',
            body: new URLSearchParams({ art: 'StdPlanKlasse', bez: s.className })
        });
        s.week = parseWeek(doc);
        s.error = s.week ? null : (doc.getElementById('UserName') ? 'Deine digikabu-Sitzung ist abgelaufen.' : 'Der Stundenplan konnte nicht gelesen werden.');
    } catch (e) {
        s.error = 'digikabu ist gerade nicht erreichbar.';
    }
    s.loading = false;
    s.loadedAt = Date.now();
    if (s.week) rememberSubjects(s.week.days.flatMap(d => d.lessons));
    renderTimetablePage();
}

async function changeWeek(dir) {
    const s = timetableState;
    if (!s.week || !s.week.token || s.loading) return;
    s.loading = true;
    document.querySelector('.bk-view')?.classList.add('bk-loading');
    try {
        await pageFetch('/Stundenplan/ChangeDate', {
            method: 'POST',
            body: new URLSearchParams({ planart: 'StdPlanKlasse', bez: s.className, dir: String(dir), __RequestVerificationToken: s.week.token })
        });
    } catch (e) {
        // the reload below shows the error
    }
    await loadTimetable();
}

// holidays and exams for the day heads / free days, from the exam plan
async function loadCalendar() {
    try {
        const days = parseExamPlan(await fetchDocument('/SchulaufgabenPlan'));
        timetableState.calendar = new Map(days.map(d => [d.iso, d]));
        renderTimetablePage();
    } catch (e) {
        // optional
    }
}

function weekToolbar(week) {
    const offset = Math.round((week.monday - mondayOf(new Date())) / (7 * 86400000));
    const friday = addDays(week.monday, 4);
    return h('div', { class: 'bk-toolbar' },
        h('div', { class: 'bk-toolbar__lead' },
            h('h1', { class: 'bk-toolbar__title' }, 'Woche ',
                h('span', { class: 'bk-muted' }, `KW ${weekNumber(week.monday)} · ${dayMonth(week.monday)} – ${dayMonth(friday)}${friday.getFullYear()}`)),
            mebisButton()),
        h('div', { class: 'bk-weeknav', role: 'group', 'aria-label': 'Woche wechseln' },
            h('button', { type: 'button', class: 'bk-btn bk-btn--icon', title: 'Vorherige Woche', 'aria-label': 'Vorherige Woche', onclick: () => changeWeek(-7) }, '‹'),
            h('button', { type: 'button', class: `bk-btn${offset === 0 ? ' bk-btn--active' : ''}`, onclick: () => offset !== 0 && changeWeek(-offset * 7) }, 'Diese Woche'),
            h('button', { type: 'button', class: 'bk-btn bk-btn--icon', title: 'Nächste Woche', 'aria-label': 'Nächste Woche', onclick: () => changeWeek(7) }, '›')));
}

function weekGrid(week, layout, calendar) {
    const children = [h('div', { class: 'bk-timetable__corner' })];
    for (const day of week.days) {
        const state = dayState(day);
        const entry = calendar && calendar.get(day.iso);
        const event = entry && entry.kind === 'school' && entry.text;
        children.push(h('div', { class: `bk-dayhead${state.today ? ' is-today' : ''}${state.past ? ' is-past' : ''}` },
            h('span', { class: 'bk-dayhead__name' }, WEEKDAYS_SHORT[day.date.getDay()]),
            h('span', { class: 'bk-dayhead__date' }, dayMonth(day.date)),
            event ? h('span', { class: `bk-dayhead__event${isExamText(event) ? ' is-exam' : ''}`, title: event }, event) : null));
    }

    const times = h('div', { class: 'bk-timetable__times', style: { 'grid-template-rows': layout.rows } });
    layout.breaks.forEach(b => times.append(h('div', { class: 'bk-slot bk-slot--break', style: { 'grid-row': b.row }, title: b.label }, 'Pause')));
    week.periods.forEach(p => times.append(h('div', { class: 'bk-slot', style: { 'grid-row': layout.rowOfPeriod[p.no] } },
        h('span', { class: 'bk-slot__no' }, p.no),
        h('span', { class: 'bk-slot__time' }, formatTime(p.start), h('br'), formatTime(p.end)))));
    children.push(times);

    for (const day of week.days) {
        const state = dayState(day);
        const lessons = visibleLessons(day);
        children.push(h('div', {
            class: `bk-timetable__day${state.today ? ' is-today' : ''}${state.past ? ' is-past' : ''}`,
            style: { 'grid-template-rows': layout.rows },
            dataset: { date: day.iso }
        },
            lessons.length ? null : h('div', { class: 'bk-day__free', style: { 'grid-row': '1 / -1', 'grid-column': '1 / -1' } }, freeLabel(day, calendar)),
            lessons.length ? layout.breaks.map(b => h('div', { class: 'bk-day__break', style: { 'grid-row': b.row, 'grid-column': '1 / -1' }, title: `Pause ${b.label}` })) : null,
            lessons.map(l => gridLesson(l, layout))));
    }
    return h('div', { class: 'bk-timetable', style: { '--days': week.days.length } }, children);
}

function renderTimetablePage() {
    const s = timetableState;
    const view = h('div', { class: 'bk-view bk-view--timetable' });
    if (s.error) {
        view.append(h('div', { class: 'bk-banner bk-banner--warn' },
            h('strong', null, 'Hinweis:'), ` ${s.error}`,
            h('button', { type: 'button', class: 'bk-btn bk-btn--small', onclick: () => window.location.reload() }, icon('refresh'), 'Neu laden')));
    }
    if (!s.week) {
        if (!s.error) view.append(h('div', { class: 'bk-empty' }, 'Stundenplan wird geladen …'));
        mountView(view);
        return;
    }

    const week = s.week;
    const layout = periodLayout(week.periods);
    const current = week.days.some(d => d.iso === todayIso());
    view.append(weekToolbar(week));
    if (current) view.append(nextupBox());
    const changes = changesBox(week, weekChanges(week), renderTimetablePage);
    if (changes) view.append(changes);
    if (!week.days.some(d => visibleLessons(d).length)) {
        view.append(h('div', { class: 'bk-empty' }, 'Für diese Woche liegen keine Stunden vor.'));
    }
    view.append(weekGrid(week, layout, s.calendar));
    view.append(h('div', { class: 'bk-daylist' }, week.days.map(d => dayCard(d, layout, s.calendar, { id: `day-${d.iso}` }))));
    mountView(view);
    if (highlightedGroup !== null) highlightGroup(highlightedGroup);
    startTicker(view, '.bk-timetable__day.is-today .bk-lesson');
}

function initTimetablePage() {
    const original = document.getElementById('stdplan');
    timetableState.className = timetableClassName();
    if (!original || !timetableState.className) return false;
    original.classList.add('bk-replaced');
    rerenderView = renderTimetablePage;
    renderTimetablePage();
    loadTimetable().then(() => {
        // mobile: jump to today's card
        const todayCard = document.querySelector('.bk-daylist .bk-daycard.is-today');
        if (todayCard && window.matchMedia('(max-width: 860px)').matches) todayCard.scrollIntoView({ block: 'start' });
    });
    loadCalendar();
    return true;
}

// ---------- /Main: today's lessons + "Aktuelle Termine" ----------

function renderMainPage(data) {
    const layout = periodLayout(data.periods);
    const day = data.day;
    const isToday = day.iso === todayIso();
    const calendar = new Map(data.events.map(e => [isoDate(e.date), { kind: 'school', text: e.text }]));
    const today = todayIso();

    const view = h('div', { class: 'bk-view bk-view--main' },
        h('div', { class: 'bk-toolbar' },
            h('div', { class: 'bk-toolbar__lead' },
                h('h1', { class: 'bk-toolbar__title' }, 'Tag ', h('span', { class: 'bk-muted' }, `${WEEKDAYS_LONG[day.date.getDay()]}, ${dayMonth(day.date)}${day.date.getFullYear()}`)),
                mebisButton()),
            h('div', { class: 'bk-weeknav', role: 'group', 'aria-label': 'Tag wechseln' },
                data.previous ? h('a', { class: 'bk-btn bk-btn--icon', href: `/Main?date=${data.previous}`, title: 'Vorheriger Tag', 'aria-label': 'Vorheriger Tag' }, '‹') : null,
                h('a', { class: `bk-btn${isToday ? ' bk-btn--active' : ''}`, href: '/Main' }, 'Heute'),
                data.next ? h('a', { class: 'bk-btn bk-btn--icon', href: `/Main?date=${data.next}`, title: 'Nächster Tag', 'aria-label': 'Nächster Tag' }, '›') : null)),
        isToday ? nextupBox() : null,
        h('div', { class: 'bk-split' },
            h('div', { class: 'bk-daylist' }, dayCard(day, layout, calendar)),
            h('section', null,
                h('h2', { class: 'bk-section-title' }, 'Aktuelle Termine'),
                data.events.length
                    ? h('ul', { class: 'bk-month__list' }, data.events.map(e => {
                        const iso = isoDate(e.date);
                        const exam = isExamText(e.text);
                        return h('li', { class: `bk-entry bk-entry--event${exam ? ' bk-entry--exam' : ''}${iso === today ? ' bk-entry--today' : ''}` },
                            h('span', { class: 'bk-entry__date' }, `${WEEKDAYS_SHORT[e.date.getDay()]} ${dayMonth(e.date)}${e.date.getFullYear()}`),
                            h('span', { class: 'bk-entry__text' }, e.text));
                    }))
                    : h('div', { class: 'bk-empty' }, 'Keine Termine.'))));
    mountView(view, document.getElementById('umgebung'));
    if (highlightedGroup !== null) highlightGroup(highlightedGroup);
    startTicker(view, '.bk-daycard.is-today .bk-lesson');
}

function initMainPage() {
    const data = parseMainPage(document);
    if (!data) return false;
    rememberSubjects(data.day.lessons);
    rerenderView = () => renderMainPage(data);
    renderMainPage(data);
    return true;
}
