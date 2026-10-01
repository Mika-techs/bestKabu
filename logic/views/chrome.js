// replaces digikabu's Bootstrap navbar with the kabuProxy-style top bar
function renderChrome() {
    const navbar = parseNavbar(document);
    if (!navbar || document.querySelector('.bk-topbar')) return;

    const path = window.location.pathname.toLowerCase();
    const logout = navbar.links.find(l => /logout/i.test(l.href || ''));
    const links = navbar.links.filter(l => l !== logout).map(l => {
        const active = l.active || (l.href && l.href !== '/' && path.startsWith(l.href.toLowerCase()));
        return h('a', { class: `bk-nav__link${active ? ' is-active' : ''}`, href: l.href }, l.label);
    });

    const themeToggle = h('button', {
        type: 'button', class: 'bk-icon-btn', title: 'Hell/Dunkel umschalten', 'aria-label': 'Hell/Dunkel umschalten',
        onclick: () => {
            const root = document.documentElement;
            const dark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            setDarkModeState({ darkModeState: !dark });
        }
    });
    themeToggle.innerHTML = ICONS.moon;

    const actions = h('div', { class: 'bk-topbar__actions' }, themeToggle);
    if (logout) {
        const a = h('a', { class: 'bk-icon-btn', href: logout.href, title: `Abmelden${navbar.name ? ' (' + navbar.name + ')' : ''}`, 'aria-label': 'Abmelden' });
        a.innerHTML = ICONS.logout;
        actions.append(a);
    }

    const header = h('header', { class: 'bk-topbar' },
        h('div', { class: 'bk-topbar__inner' },
            h('a', { class: 'bk-brand', href: links.length ? '/Main' : '/' },
                h('span', { class: 'bk-brand__logo', 'aria-hidden': 'true' }),
                h('span', { class: 'bk-brand__name' }, 'Best', h('b', null, 'Kabu'))),
            navbar.className ? h('span', { class: 'bk-chip', title: navbar.name || '' }, navbar.className) : null,
            links.length ? h('nav', { class: 'bk-nav', 'aria-label': 'Hauptnavigation' }, links) : null,
            actions));
    document.body.prepend(header);
    document.documentElement.classList.add('bk-chrome');
    if (isLoginPage()) {
        document.documentElement.classList.add('bk-login');
    }

    const footer = document.querySelector('.body-content > footer');
    if (footer) {
        footer.append(h('p', null, `BestKabu ${chrome.runtime.getManifest().version} · Daten von digikabu.de`));
    }
}
