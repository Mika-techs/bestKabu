class objectColorField {
    color = "";
    name = "";
    displayName = "";
    hidden = false;
    id;

    constructor(name, color, displayName = "", hidden = false) {
        this.color = color;
        this.name = name;
        this.displayName = displayName;
        this.hidden = hidden;
        this.id = name.replace(/[^A-Za-z0-9_-]/g, c => c.charCodeAt(0).toString(16));
    }
}
