// Runs at document_start: applies theme + highlight colour before the first paint, so the page never flashes white.

// darkmodeState missing = never toggled = follow the system setting
function applyTheme() {
    const state = retrieve('darkmodeState');
    if (state === null) {
        delete document.documentElement.dataset.theme;
    } else {
        document.documentElement.dataset.theme = retrieveBool('darkmodeState') ? 'dark' : 'light';
    }
}

// the built-in accent has tuned light/dark variants, any other colour is lightened in dark mode by the css
function applyAccent(color) {
    const root = document.documentElement;
    if (!validateColor(color) || color.toLowerCase() === defaultHighlightColor) {
        root.dataset.accent = 'default';
        root.style.removeProperty('--user-accent');
        root.style.removeProperty('--user-accent-text');
        return;
    }
    root.dataset.accent = 'custom';
    root.style.setProperty('--user-accent', color);
    root.style.setProperty('--user-accent-text', textOn(color));
}

// Validates if the color is in hexadecimal format
function validateColor(color) {
    return /^#([0-9A-Fa-f]{6})$/.test(color || '');
}

// readable text colour on top of a background (WCAG relative luminance)
function textOn(hex) {
    const ch = i => {
        const c = parseInt(hex.substr(i, 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5) > 0.4 ? '#1d2130' : '#ffffff';
}

applyTheme();
applyAccent(retrieve('color'));
