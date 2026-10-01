// popup DOM: getters/setters + wiring. The popup mirrors the page's theme and accent colour.

window.addEventListener("DOMContentLoaded", () => {
    const swatches = document.getElementById("swatches");
    accentPresets.slice().reverse().forEach(color => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "pp-swatch";
        swatch.setAttribute("role", "radio");
        swatch.dataset.color = color;
        swatch.title = color;
        swatch.style.setProperty("--swatch", color);
        swatch.addEventListener("click", () => {
            setHighlightColor(color);
            colorButtonEvent(color);
        });
        swatches.prepend(swatch);
    });

    document.querySelectorAll("#themeMode .pp-segmented__opt").forEach(b =>
        b.addEventListener("click", () => themeModeEvent(b.dataset.value)));
    const sendAccent = throttle(color => colorButtonEvent(color), 150);
    accentPicker = createColorPicker(defaultHighlightColor, color => {
        markAccent(color);
        sendAccent(color);
    });
    document.getElementById("accentPicker").append(accentPicker.element);
    document.getElementById("customSwatch").addEventListener("click", () => {
        const panel = document.getElementById("accentPicker");
        panel.hidden = !panel.hidden;
        document.getElementById("customSwatch").setAttribute("aria-expanded", String(!panel.hidden));
    });

    document.getElementById("loginCheckbox").addEventListener("change", loginCheckboxEvent);
    document.getElementById("loginEncCheckbox").addEventListener("change", loginEncCheckboxEvent);
    document.getElementById("loginEncKey").addEventListener("keypress", loginEncKeyEvent);
    document.getElementById("loginSaveButton").addEventListener("click", loginSaveButtonEvent);
    document.getElementById("loginDeleteButton").addEventListener("click", loginDeleteButtonEvent);
    document.getElementById("loginEncButton").addEventListener("click", loginEncButtonEvent);

    document.getElementById("resetColors").addEventListener("click", resetSubColorEvent);
});

function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else node.setAttribute(k, v === true ? "" : v);
    });
    children.forEach(c => c !== null && c !== undefined && node.append(c));
    return node;
}

function validHex(color) {
    return /^#([0-9A-Fa-f]{6})$/.test(color || "");
}

function textOn(hex) {
    const ch = i => {
        const c = parseInt(hex.substr(i, 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5) > 0.4 ? "#1d2130" : "#ffffff";
}

// null = system
function setThemeMode(state) {
    const mode = state === null || state === undefined ? "system" : (state ? "dark" : "light");
    document.querySelectorAll("#themeMode .pp-segmented__opt").forEach(b =>
        b.setAttribute("aria-checked", String(b.dataset.value === mode)));
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
}

let accentPicker = null;

function setHighlightColor(color) {
    color = validHex(color) ? color.toLowerCase() : defaultHighlightColor;
    if (accentPicker) accentPicker.set(color);
    markAccent(color);
}

// selection state of the swatches + live accent of the popup itself
function markAccent(color) {
    let preset = false;
    document.querySelectorAll(".pp-swatch[data-color]").forEach(s => {
        const hit = s.dataset.color === color;
        preset = preset || hit;
        s.setAttribute("aria-checked", String(hit));
    });
    const custom = document.getElementById("customSwatch");
    custom.setAttribute("aria-checked", String(!preset));
    custom.style.setProperty("--custom", preset ? "transparent" : color);

    const root = document.documentElement;
    if (color === defaultHighlightColor) {
        root.dataset.accent = "default";
    } else {
        root.dataset.accent = "custom";
        root.style.setProperty("--user-accent", color);
        root.style.setProperty("--user-accent-text", textOn(color));
    }
}

function setPopupState(state) {
    document.getElementById("mainPopup").hidden = !state;
    document.getElementById("gotoPopup").hidden = state;
}

function renderSubjectRows(fields) {
    const body = document.getElementById("sColors");
    body.replaceChildren();
    const empty = fields.length === 0;
    document.getElementById("subjectsEmpty").hidden = !empty;
    document.getElementById("subjectsHint").hidden = empty;
    document.getElementById("subjectTable").hidden = empty;
    document.getElementById("subjectActions").hidden = empty;

    let openRow = null;
    fields.forEach(field => {
        const demo = el("span", { class: "bk-demo", title: field.name }, field.displayName || field.name);
        demo.style.setProperty("--lesson-color", field.color);
        const name = el("input", { class: "pp-input", type: "text", id: `${field.id}Name`, placeholder: field.name, maxlength: "24" });
        name.value = field.displayName || "";
        const colorButton = el("button", { type: "button", class: "pp-colorbtn", id: `${field.id}Picker`, title: "Farbe wählen", "aria-expanded": "false" });
        colorButton.dataset.color = field.color;
        colorButton.style.setProperty("--swatch", field.color);
        const shown = el("input", { type: "checkbox", id: `${field.id}Shown`, title: "Im Stundenplan anzeigen", checked: !field.hidden });
        const row = el("tr", { class: field.hidden ? "is-hidden" : null },
            el("td", null, demo), el("td", null, name), el("td", null, colorButton), el("td", null, shown));

        // picker opens in a row of its own below the subject
        let pickerRow = null;
        colorButton.addEventListener("click", () => {
            if (openRow && openRow !== pickerRow) {
                openRow.remove();
                body.querySelectorAll(".pp-colorbtn[aria-expanded=true]").forEach(b => b.setAttribute("aria-expanded", "false"));
            }
            if (pickerRow && pickerRow.isConnected) {
                pickerRow.remove();
                colorButton.setAttribute("aria-expanded", "false");
                openRow = null;
                return;
            }
            const picker = createColorPicker(colorButton.dataset.color, color => {
                colorButton.dataset.color = color;
                colorButton.style.setProperty("--swatch", color);
                demo.style.setProperty("--lesson-color", color);
                saveSubjectsSoon();
            });
            pickerRow = el("tr", { class: "pp-subjects__picker" }, el("td", { colspan: "4" }, picker.element));
            row.after(pickerRow);
            openRow = pickerRow;
            colorButton.setAttribute("aria-expanded", "true");
        });
        name.addEventListener("input", () => {
            demo.textContent = name.value.trim() || field.name;
            saveSubjectsSoon();
        });
        shown.addEventListener("change", () => {
            row.classList.toggle("is-hidden", !shown.checked);
            saveSubjectsSoon();
        });
        body.append(row);
    });
}

function setLoginState(state) {
    document.getElementById("loginCheckbox").checked = state;
    onLoginStateChange(state);
}

function getLoginState() {
    return document.getElementById("loginCheckbox").checked;
}

function onLoginStateChange(state) {
    document.getElementById("loginBody").hidden = !state;
}

function setEncLoginState(state) {
    document.getElementById("loginEncCheckbox").checked = state;
    onEncLoginStateChange(state);
}

function getEncLoginState() {
    return document.getElementById("loginEncCheckbox").checked;
}

function onEncLoginStateChange(state) {
    document.getElementById("loginEncKey").hidden = !state;
    document.getElementById("loginEncButton").hidden = !state;
}

function getLoginUsername() {
    return document.getElementById("loginUsername").value;
}

function setLoginUsername(username) {
    document.getElementById("loginUsername").value = username;
}

function getLoginPassword() {
    return document.getElementById("loginPassword").value;
}

function setLoginPassword(password) {
    document.getElementById("loginPassword").value = password;
}

function getLoginEncKey() {
    return document.getElementById("loginEncKey").value;
}

function setLoginEncKey(key) {
    document.getElementById("loginEncKey").value = key;
}

function showMessage(id, message, cls) {
    const box = document.getElementById(id);
    box.textContent = message;
    box.className = `pp-message ${cls}`;
    box.hidden = false;
}

function showError(id, message) {
    showMessage(id, message, "pp-message--error");
}

function showSuccess(id, message) {
    showMessage(id, message, "pp-message--ok");
}

function hideMessage(id) {
    document.getElementById(id).hidden = true;
}
