const defaultHighlightColor = "#4f46e5";
const accentPresets = ["#4f46e5", "#2563eb", "#0e7490", "#15803d", "#c2410c", "#b91c1c", "#be185d", "#7c3aed", "#475569"];
const mebisUrl = "https://portal.bycs.de/";

// fallback when digikabu sends no period column (minutes since midnight)
const timeTable = [
    { start: [8, 30], end: [9, 15] },
    { start: [9, 15], end: [10, 0] },
    { start: [10, 15], end: [11, 0] },
    { start: [11, 0], end: [11, 45] },
    { start: [11, 45], end: [12, 30] },
    { start: [12, 30], end: [13, 15] },
    { start: [13, 15], end: [14, 0] },
    { start: [14, 0], end: [14, 45] },
    { start: [14, 45], end: [15, 30] },
    { start: [15, 30], end: [16, 15] },
];

const preSetlessonColor = {
    "PuG": "#612f00",
    "IT-Tec": "#582a8f",
    "BGWP": "#b9b372",
    "E": "#ad9000",
    "D": "#630000",
    "AEuP": "#37ae1c",
    "FU-IT": "#4576cd",
    "smw": "#0b4700",
    "K": "#101050",
    "DGWP": "#242b7e",
    "TRF": "#401080",
    "MSWE": "#b9b3f2",
    "AEmP": "#37ae1c",
    "IuKS": "#4546cd",
    "WU-PE": "#79bb84",
    "Ev": "#103050",
    "DBS": "#24bb7e",
    "Mathe": "#4576cd",
    "BWP-C": "#b9b372"
};

let lessonColor = structuredClone(preSetlessonColor);
// own display names and hidden subjects (popup "Fächer")
let lessonNames = {};
let hiddenLessons = [];
