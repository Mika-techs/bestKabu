function setColor(value) {
    if (validateColor(value.color)) {
        store('color', value.color.toLowerCase());
        applyAccent(value.color);
        return false;
    }
    return true;
}

function getColor() {
    return validateColor(retrieve('color')) ? retrieve('color') : defaultHighlightColor;
}

function setLoginState(state) {
    store('loginState', state.setLoginState);
    if (state.setLoginState) {
        loginUnenc();
    }
}

function isLoginState() {
    return retrieveBool('loginState');
}

function setEncLoginState(state) {
    store('encLoginState', state.setEncLoginState);
}

function isEncLoginState() {
    return retrieveBool('encLoginState');
}

function saveLogin(values) {
    if (isEncLoginState() && validateLogin(values)) {
        store('username', encrypt(values.username, values.encKey));
        store('password', encrypt(values.password, values.encKey));
        return false;
    }
    else if (validateLogin(values)) {
        store('username', values.username);
        store('password', values.password);
        loginUnenc();
        return false;
    }
    return true;
}

function deleteLogin() {
    store('username', '');
    store('password', '');
    store('loginState', false);
    store('encLoginState', false);
}

function loginUnenc() {
    if (isLoginPage() && !loginFailedBefore() && isLoginState() && !isEncLoginState()) {
        login(retrieve('username'), retrieve('password'));
    }
}

function onEncLogin(values) {
    if (!values.encKey) return true;
    if (isLoginPage() && isLoginState() && isEncLoginState()) {
        login(encrypt(retrieve('username'), values.encKey), encrypt(retrieve('password'), values.encKey));
    }
    return false;
}

// true = dark, false = light, null = follow the system (key removed)
function setDarkModeState(values) {
    if (values.darkModeState === null || values.darkModeState === undefined) {
        remove('darkmodeState');
    } else {
        store('darkmodeState', values.darkModeState);
    }
    applyTheme();
}

function getDarkModeState() {
    return retrieve('darkmodeState') === null ? null : retrieveBool('darkmodeState');
}

function updateColorFields(values) {
    values.forEach(element => {
        if (validateColor(element.color)) {
            lessonColor[element.name] = element.color.toLowerCase();
        }
        const displayName = (element.displayName || '').trim();
        if (displayName && displayName !== element.name) {
            lessonNames[element.name] = displayName;
        } else {
            delete lessonNames[element.name];
        }
        hiddenLessons = hiddenLessons.filter(n => n !== element.name);
        if (element.hidden) {
            hiddenLessons.push(element.name);
        }
    });
    store("SubColors", JSON.stringify(lessonColor));
    store("SubNames", JSON.stringify(lessonNames));
    store("SubHidden", JSON.stringify(hiddenLessons));
    rerenderView();
}
