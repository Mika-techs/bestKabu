// /SchulaufgabenPlan: exams as cards, the rest as month lists. Consecutive school days become one "Unterricht" range
// (block schedule), consecutive holidays with the same text one range; plain no-school days are just the gaps.

function calendarEntries(days) {
    const entries = [];
    let block = null;
    let range = null;
    const nextSchoolDay = date => {
        let next = addDays(date, 1);
        while (isWeekend(next)) next = addDays(next, 1);
        return isoDate(next);
    };
    const flushBlock = () => {
        if (block) entries.push({ from: block.from, to: block.to, kind: 'school', text: 'Unterricht', schoolRange: true });
        block = null;
    };
    const flushRange = () => {
        if (range) entries.push({ from: range.from, to: range.to, kind: range.kind, text: range.text, schoolRange: false });
        range = null;
    };
    for (const day of days) {
        if (isWeekend(day.date)) continue;
        if (day.kind === 'school') {
            flushRange();
            if (block && day.iso !== nextSchoolDay(block.to)) flushBlock();
            if (!block) block = { from: day.date, to: day.date };
            block.to = day.date;
            if (day.text) entries.push({ from: day.date, to: day.date, kind: 'school', text: day.text, schoolRange: false });
            continue;
        }
        flushBlock();
        if (range && day.kind === range.kind && day.text === range.text && day.iso === nextSchoolDay(range.to)) {
            range.to = day.date;
            continue;
        }
        flushRange();
        if (day.kind === 'holiday' || day.text) range = { from: day.date, to: day.date, kind: day.kind, text: day.text || 'Ferien' };
    }
    flushBlock();
    flushRange();
    // a school range is added when it ends - move it in front of the days listed within it
    entries.sort((a, b) => a.from - b.from || (b.schoolRange - a.schoolRange));
    const today = startOfDay(new Date());
    entries.forEach(e => {
        e.past = e.to < today;
        e.today = e.from <= today && e.to >= today;
        e.exam = e.kind === 'school' && !e.schoolRange && isExamText(e.text);
    });
    return entries;
}

function entryDateLabel(e) {
    return e.from.getTime() === e.to.getTime()
        ? `${WEEKDAYS_SHORT[e.from.getDay()]} ${dayMonth(e.from)}`
        : `${dayMonth(e.from)} – ${dayMonth(e.to)}`;
}

let calendarShowPast = false;

function renderCalendarPage(entries) {
    const shown = entries.filter(e => calendarShowPast || !e.past);
    const months = [];
    for (const e of shown) {
        const title = `${MONTHS[e.from.getMonth()]} ${e.from.getFullYear()}`;
        if (!months.length || months[months.length - 1].title !== title) months.push({ title, entries: [] });
        months[months.length - 1].entries.push(e);
    }
    const exams = entries.filter(e => e.exam && !e.past);
    const toggle = past => () => {
        calendarShowPast = past;
        renderCalendarPage(entries);
    };

    const view = h('div', { class: 'bk-view bk-view--calendar' },
        h('div', { class: 'bk-toolbar' },
            h('h1', { class: 'bk-toolbar__title' }, 'Termine & Schulaufgaben'),
            h('div', { class: 'bk-weeknav' },
                h('button', { type: 'button', class: `bk-btn${calendarShowPast ? '' : ' bk-btn--active'}`, onclick: toggle(false) }, 'Ab heute'),
                h('button', { type: 'button', class: `bk-btn${calendarShowPast ? ' bk-btn--active' : ''}`, onclick: toggle(true) }, 'Ganzes Jahr'))),
        exams.length ? h('section', { class: 'bk-cards' }, exams.map(e => h('article', { class: 'bk-examcard' },
            h('span', { class: 'bk-examcard__date' }, entryDateLabel(e)),
            h('span', { class: 'bk-examcard__text' }, e.text)))) : null,
        months.length ? null : h('div', { class: 'bk-empty' }, 'Keine Termine.'),
        months.map(m => h('section', { class: 'bk-month' },
            h('h2', { class: 'bk-section-title' }, m.title),
            h('ul', { class: 'bk-month__list' }, m.entries.map(e => {
                const kind = e.kind === 'school' ? (e.schoolRange ? 'school' : 'event') : e.kind;
                return h('li', { class: `bk-entry bk-entry--${kind}${e.exam ? ' bk-entry--exam' : ''}${e.past ? ' bk-entry--past' : ''}${e.today ? ' bk-entry--today' : ''}` },
                    h('span', { class: 'bk-entry__date' }, entryDateLabel(e)),
                    h('span', { class: 'bk-entry__text' }, e.text));
            })))));
    mountView(view, document.getElementById('stdplanheading'), document.getElementById('umgebung'));
}

function initCalendarPage() {
    const days = parseExamPlan(document);
    if (!days.length) return false;
    renderCalendarPage(calendarEntries(days));
    return true;
}
