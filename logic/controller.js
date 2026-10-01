// Validates login values based on the encryption state
function validateLogin(values) {
    return ((isEncLoginState() && values.encKey !== "") ?
        (values.encKey.length > 0 && values.username.length > 0 && values.password.length > 0) :
        (values.username.length > 0 && values.password.length > 0));
}

// Encrypts the password using an encryption key
function encrypt(password, encryptionKey) {
    const keyLength = encryptionKey.length;
    const result = new Uint8Array(password.length);

    for (let i = 0; i < password.length; i++) {
        result[i] = password.charCodeAt(i) ^ encryptionKey.charCodeAt(i % keyLength);
    }

    return String.fromCharCode(...result);
}

function isLoginPage() {
    return document.getElementById("UserName") !== null && document.getElementById("Password") !== null;
}

// Performs login by filling in the fields and clicking the login button
function login(username, password) {
    if (!isLoginPage() || !username || !password) return;
    document.getElementById("UserName").value = username;
    document.getElementById("Password").value = password;
    document.querySelector(".btn.btn-primary").click();
}

// a failed login shows the form again with an error - logging in again would loop (and may lock the account)
function loginFailedBefore() {
    return document.querySelector(".alert-danger") !== null;
}

// gets stored colors, names and hidden flags for subjects
function retrieveLessonSettings() {
    const storedColors = retrieve('SubColors');
    if (storedColors) {
        lessonColor = JSON.parse(storedColors);
    }
    try {
        lessonNames = JSON.parse(retrieve('SubNames') || '{}');
        hiddenLessons = JSON.parse(retrieve('SubHidden') || '[]');
    } catch {
        lessonNames = {};
        hiddenLessons = [];
    }
}

function subjectColor(subject) {
    if (!subject) return null;
    return lessonColor[subject] || getColorFromHash(getHash(subject));
}

function subjectName(subject) {
    return (subject && lessonNames[subject]) || subject || '–';
}

function isSubjectHidden(subject) {
    return !!subject && hiddenLessons.includes(subject);
}

// creates a 32bit hash from a String
// @original author Sebastian Weidner
function getHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash;
}

//creates a color from a hash value
// @original author Sebastian Weidner
function getColorFromHash(hash) {
    return `#${(hash & 0xFFFFFF).toString(16).padStart(6, '0')}`;
}

// subjects seen on the current page (incl. hidden ones), for the popup
const pageSubjects = new Set();

function rememberSubjects(lessons) {
    lessons.forEach(l => l.subject && pageSubjects.add(l.subject));
}

function getColorFields() {
    return [...pageSubjects].sort((a, b) => a.localeCompare(b, 'de')).map(name =>
        new objectColorField(name, subjectColor(name), lessonNames[name] || '', isSubjectHidden(name)));
}

//resets the colors and returns the standard colors
function getPresetColorsAsObjects() {
    store("SubColors", "");
    lessonColor = structuredClone(preSetlessonColor);
    rerenderView();
    return getColorFields();
}
