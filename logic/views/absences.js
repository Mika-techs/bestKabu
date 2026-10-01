// /Fehlzeiten: summary tiles + list
function renderAbsencesPage(data) {
    const stat = (value, label, unexcused) => h('div', { class: 'bk-stat' },
        h('span', { class: 'bk-stat__value' }, value),
        h('span', { class: 'bk-stat__label' }, label),
        h('span', { class: `bk-stat__sub${unexcused > 0 ? ' is-bad' : ''}` }, unexcused > 0 ? `davon ${unexcused} unentschuldigt` : 'alle entschuldigt'));

    const view = h('div', { class: 'bk-view bk-view--absences' },
        h('h1', { class: 'bk-toolbar__title' }, 'Deine Fehlzeiten'),
        h('section', { class: 'bk-stats' },
            stat(data.fullDays.total, 'ganze Tage', data.fullDays.unexcused),
            stat(data.hours.total, 'einzelne Stunden', data.hours.unexcused)),
        data.entries.length
            ? h('ul', { class: 'bk-absences' }, data.entries.map(a => h('li', { class: `bk-absence ${a.excused ? 'is-excused' : 'is-open'}` },
                h('span', { class: 'bk-absence__date' }, `${WEEKDAYS_SHORT[a.date.getDay()]} ${dayMonth(a.date)}${a.date.getFullYear()}`),
                h('span', { class: 'bk-absence__span' }, [[a.from, a.to].filter(Boolean).join(' – '), a.kind].filter(Boolean).join(' · ')),
                h('span', { class: 'bk-absence__remark' }, a.remark || ''),
                h('span', { class: 'bk-absence__state' }, a.excused ? (a.excusedText || 'entschuldigt') : 'nicht entschuldigt'))))
            : h('div', { class: 'bk-empty' }, 'Keine Fehlzeiten eingetragen. 🎉'),
        h('p', { class: 'bk-muted bk-small' }, 'Abgegebene Entschuldigungen erscheinen bei digikabu erst mit Verzögerung.'));

    const content = document.querySelector('.container.body-content');
    const originals = content ? [...content.children].filter(el => el.tagName !== 'FOOTER' && el.tagName !== 'HR' && !el.classList.contains('bk-view')) : [];
    mountView(view, ...originals);
}

function initAbsencesPage() {
    const data = parseAbsences(document);
    if (!data) return false;
    renderAbsencesPage(data);
    return true;
}
