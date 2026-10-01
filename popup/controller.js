function getPopupInitState() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            initalizePopup({ validResponse: false });
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { key: "getPopupInitState" }, (response) => {
            // no content script on this tab -> chrome.runtime.lastError is set, response undefined
            void chrome.runtime.lastError;
            if (response !== undefined) {
                initalizePopup({ validResponse: true, ...response });
            } else {
                initalizePopup({ validResponse: false });
            }
        });
    });
}

function setValues(key, values, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { key: key, values: values }, (response) => {
            void chrome.runtime.lastError;
            if (callback) {
                callback(response);
            }
        });
    });
}

function resetInputs() {
    setLoginEncKey("");
    setLoginUsername("");
    setLoginPassword("");
}

function initalizePopup(values) {
    document.getElementById("version").textContent = "v" + chrome.runtime.getManifest().version;
    if (values.validResponse !== true) {
        setPopupState(false);
        return;
    }
    setPopupState(true);
    setThemeMode(values.darkmodeState);
    setLoginState(values.loginState);
    setEncLoginState(values.encState);
    setHighlightColor(values.highlightColor);
    createSubjectColorFields(values.colorFields || []);
}

let colorFields = [];

// Events

function themeModeEvent(mode) {
    const state = mode === "system" ? null : mode === "dark";
    setThemeMode(state);
    setValues("darkmodeToggleEvent", { darkModeState: state }, null);
}

function colorButtonEvent(color) {
    const value = color.trim().toLowerCase();
    setValues("colorButtonEvent", { color: value }, (response) => {
        if (response === undefined) return;
        if (response.failedInputValidation === true) {
            showError("message-color", "Farbe muss als #rrggbb angegeben werden.");
        } else {
            hideMessage("message-color");
            markAccent(value);
        }
    });
}

function createSubjectColorFields(input) {
    colorFields = input.map(val => new objectColorField(val.name, val.color, val.id, val.displayName, val.hidden));
    renderSubjectRows(colorFields);
}

function readSubjectRows() {
    colorFields.forEach(field => {
        field.color = document.getElementById(`${field.id}Picker`).dataset.color.toLowerCase();
        field.displayName = document.getElementById(`${field.id}Name`).value.trim();
        field.hidden = !document.getElementById(`${field.id}Shown`).checked;
    });
}

// every change is saved right away (throttled) - the popup may close any moment
function saveSubColorEvent() {
    readSubjectRows();
    setValues("updateColorFields", colorFields, null);
}

const saveSubjectsSoon = throttle(saveSubColorEvent, 250);

function resetSubColorEvent() {
    setValues("resetSubColors", null, (response) => {
        if (response !== undefined) {
            createSubjectColorFields(response.colors);
            showSuccess("sCMessage", "Farben zurückgesetzt.");
        }
    });
}

function loginCheckboxEvent() {
    setValues("loginCheckboxEvent", { setLoginState: getLoginState() }, null);
    onLoginStateChange(getLoginState());
}

function loginEncCheckboxEvent() {
    setValues("loginEncCheckboxEvent", { setEncLoginState: getEncLoginState() }, null);
    onEncLoginStateChange(getEncLoginState());
}

function loginEncKeyEvent(event) {
    if (event.key === "Enter" && getLoginUsername() === "" && getLoginPassword() === "") {
        loginEncButtonEvent();
    }
}

const loginHelp = "Eingabe ungültig – bitte prüfen und erneut versuchen.";

function loginSaveButtonEvent() {
    setValues("loginSaveButtonEvent", {
        username: getLoginUsername(),
        password: getLoginPassword(),
        encKey: getLoginEncKey()
    }, (response) => {
        if (response === undefined) return;
        if (response.failedInputValidation === false) {
            showSuccess("message-login", "Auto-Login eingerichtet.");
        } else {
            showError("message-login", loginHelp);
        }
        resetInputs();
    });
}

function loginDeleteButtonEvent() {
    setValues("loginDeleteButtonEvent", { deleteLogin: true }, null);
    setLoginState(false);
    setEncLoginState(false);
    showSuccess("message-login", "Login gelöscht.");
}

function loginEncButtonEvent() {
    setValues("loginEncButtonEvent", { encKey: getLoginEncKey() }, (response) => {
        if (response !== undefined && response.failedInputValidation === true) {
            showError("message-login", loginHelp);
        }
        resetInputs();
    });
}

window.addEventListener("DOMContentLoaded", getPopupInitState);
