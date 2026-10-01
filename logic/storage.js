function store(key, value) {
    localStorage.setItem(key, value);
}

function retrieve(key) {
    return localStorage.getItem(key);
}

function retrieveBool(key) {
    return localStorage.getItem(key) == true || localStorage.getItem(key) == "true" ? true : false;
}

function remove(key) {
    localStorage.removeItem(key);
}
