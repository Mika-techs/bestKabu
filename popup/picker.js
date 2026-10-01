// Inline colour picker for the popup. The native <input type="color"> opens a system dialog, which takes the focus
// away from the popup - Firefox (and some window managers) then close the popup and the colour is lost.
// This one is plain HTML: palette + hue/saturation/lightness sliders + hex field, it never leaves the popup.

const PICKER_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
    "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#991b1b", "#9a3412", "#854d0e", "#166534", "#115e59", "#1e3a8a", "#581c87", "#64748b"
];

function hexToHsl(hex) {
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

// returns {element, set(color)}; onChange(color) fires on every change
function createColorPicker(initial, onChange) {
    let color = validHex(initial) ? initial.toLowerCase() : "#4f46e5";
    let hsl = hexToHsl(color);

    const swatches = el("div", { class: "pp-picker__palette" });
    PICKER_PALETTE.forEach(c => {
        const b = el("button", { type: "button", class: "pp-picker__swatch", title: c, "aria-label": c });
        b.style.setProperty("--swatch", c);
        b.addEventListener("click", () => apply(c, true));
        swatches.append(b);
    });

    const slider = (label, max) => {
        const input = el("input", { type: "range", min: "0", max: String(max), class: "pp-picker__range", "aria-label": label });
        const row = el("label", { class: "pp-picker__slider" }, el("span", null, label), input);
        return { row, input };
    };
    const hue = slider("Farbton", 360);
    const sat = slider("Sättigung", 100);
    const light = slider("Helligkeit", 100);
    hue.input.classList.add("pp-picker__range--hue");

    const preview = el("span", { class: "pp-picker__preview" });
    const hex = el("input", { type: "text", class: "pp-input pp-input--hex", maxlength: "7", spellcheck: "false", "aria-label": "Hex-Farbe" });

    const element = el("div", { class: "pp-picker" },
        swatches, hue.row, sat.row, light.row,
        el("div", { class: "pp-row" }, preview, hex));

    function paint() {
        hue.input.value = hsl.h;
        sat.input.value = hsl.s;
        light.input.value = hsl.l;
        sat.input.style.setProperty("--from", hslToHex(hsl.h, 0, hsl.l));
        sat.input.style.setProperty("--to", hslToHex(hsl.h, 100, hsl.l));
        light.input.style.setProperty("--mid", hslToHex(hsl.h, hsl.s, 50));
        preview.style.background = color;
        if (document.activeElement !== hex) hex.value = color;
        swatches.querySelectorAll(".pp-picker__swatch").forEach(b => b.setAttribute("aria-pressed", String(b.title === color)));
    }

    function apply(c, fromHex) {
        color = c.toLowerCase();
        if (fromHex) hsl = hexToHsl(color);
        paint();
        onChange(color);
    }

    const fromSliders = () => {
        hsl = { h: +hue.input.value, s: +sat.input.value, l: +light.input.value };
        apply(hslToHex(hsl.h, hsl.s, hsl.l), false);
    };
    [hue, sat, light].forEach(s => s.input.addEventListener("input", fromSliders));
    hex.addEventListener("input", () => {
        const value = hex.value.trim();
        const normalized = value.startsWith("#") ? value : "#" + value;
        if (validHex(normalized)) apply(normalized, true);
    });
    hex.addEventListener("blur", paint);

    paint();
    return {
        element,
        set(c) {
            if (!validHex(c)) return;
            color = c.toLowerCase();
            hsl = hexToHsl(color);
            paint();
        }
    };
}

// calls fn at most every `ms` while changes keep coming, plus once at the end
function throttle(fn, ms) {
    let timer = null;
    let pending = null;
    return (...args) => {
        pending = args;
        if (timer) return;
        fn(...pending);
        pending = null;
        timer = setTimeout(function flush() {
            timer = null;
            if (pending) {
                fn(...pending);
                pending = null;
                timer = setTimeout(flush, ms);
            }
        }, ms);
    };
}
