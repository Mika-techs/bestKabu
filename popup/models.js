class objectColorField {
    color = "";
    name = "";
    displayName = "";
    hidden = false;
    id = "";

    constructor(name, color, id, displayName = "", hidden = false) {
        this.color = color;
        this.name = name;
        this.id = id;
        this.displayName = displayName;
        this.hidden = hidden;
    }
}
