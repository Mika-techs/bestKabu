// tiny hyperscript: h('div', {class: 'x', onclick: fn, style: {'--a': 1}}, 'text', child)
function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'style') Object.entries(value).forEach(([p, v]) => v !== null && v !== undefined && el.style.setProperty(p, v));
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false) continue;
        el.append(child instanceof Node ? child : String(child));
    }
    return el;
}

// static, trusted icon markup only
const ICONS = {
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>'
};

function icon(name, cls = 'bk-btn__icon') {
    const span = h('span', { class: cls, 'aria-hidden': 'true' });
    span.innerHTML = ICONS[name];
    return span;
}

function mebisButton() {
    return h('a', { class: 'bk-btn', href: mebisUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('external'), 'Mebis');
}

// mounts a view in front of the page's content and hides the original parts
function mountView(view, ...originals) {
    const content = document.querySelector('.container.body-content') || document.body;
    const old = content.querySelector(':scope > .bk-view');
    if (old) old.replaceWith(view);
    else content.prepend(view);
    originals.forEach(el => el && el.classList.add('bk-hidden'));
}

// re-renders the current page's view after a settings change from the popup
let rerenderView = () => {};
