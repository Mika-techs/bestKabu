// after login digikabu lands on /Main - the timetable is more useful
if (
    document.referrer === "https://www.digikabu.de" ||
    document.referrer === "https://www.digikabu.de/Main/TestRedirect"
) {
    if (!window.location.pathname.toLowerCase().startsWith("/stundenplan")) {
        window.location.replace("https://www.digikabu.de/Stundenplan/Klasse");
    }
}

function initPage() {
    const path = window.location.pathname.toLowerCase();
    retrieveLessonSettings();
    renderChrome();
    installHighlight();

    if (path.startsWith("/stundenplan")) {
        initTimetablePage();
    } else if (path === "/main" || path.startsWith("/main/") || path === "/main/index") {
        initMainPage();
    } else if (path.startsWith("/schulaufgabenplan")) {
        initCalendarPage();
    } else if (path.startsWith("/fehlzeiten")) {
        initAbsencesPage();
    }

    if (isLoginPage() && isLoginState() && !isEncLoginState()) {
        loginUnenc();
    }
    keepFresh(path);
}

// an open tab stays current: after 15 min (when visible) the timetable is fetched again, other views reload (GET only)
function keepFresh(path) {
    if (isLoginPage() || !/^\/(stundenplan|main|schulaufgabenplan)/.test(path)) return;
    let loadedAt = Date.now();
    const FRESH_MS = 15 * 60 * 1000;
    const refreshIfStale = () => {
        if (document.visibilityState !== 'visible' || Date.now() - loadedAt < FRESH_MS) return;
        loadedAt = Date.now();
        if (path.startsWith('/stundenplan') && timetableState.className) {
            loadTimetable();
        } else {
            window.location.href = window.location.pathname + window.location.search;
        }
    };
    document.addEventListener('visibilitychange', refreshIfStale);
    setInterval(refreshIfStale, 60 * 1000);
}

initPage();
