chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.key) {
        case "getPopupInitState":
            sendResponse(getPopupInitState());
            break;
        case "colorButtonEvent":
            sendResponse({ failedInputValidation: setColor(request.values) });
            break;
        case "loginCheckboxEvent":
            setLoginState(request.values);
            break;
        case "loginEncCheckboxEvent":
            setEncLoginState(request.values);
            break;
        case "loginSaveButtonEvent":
            sendResponse({ failedInputValidation: saveLogin(request.values) });
            break;
        case "loginDeleteButtonEvent":
            deleteLogin();
            break;
        case "loginEncButtonEvent":
            sendResponse({ failedInputValidation: onEncLogin(request.values) });
            break;
        case "darkmodeToggleEvent":
            setDarkModeState(request.values);
            break;
        case "updateColorFields":
            updateColorFields(request.values);
            sendResponse({ colors: getColorFields() });
            break;
        case "resetSubColors":
            sendResponse({ colors: getPresetColorsAsObjects() });
            break;
        default:
            console.warn("Popup received unknown key: " + request.key);
    }
});

function getPopupInitState() {
    return {
        darkmodeState: getDarkModeState(),
        loginState: isLoginState(),
        encState: isEncLoginState(),
        loginPage: isLoginPage(),
        highlightColor: getColor(),
        colorFields: getColorFields()
    };
}
