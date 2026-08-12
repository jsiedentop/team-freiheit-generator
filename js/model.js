/* global TF */
var TF = window.TF || {};
window.TF = TF;

TF.W = 1600;
TF.H = 900;
TF.HEAD_TRACK = -0.025;
TF.LOGO_TRACK = 0.06;
TF.LINE_HEIGHT = 0.9;
TF.LOGO_LABEL = "TEAM FREIHEIT";
TF.MAX_HISTORY = 50;
TF.SNAP = 14;

TF.displayText = function (value) {
  return String(value || "").toLocaleUpperCase("de-DE");
};

TF.uid = function () {
  return "t" + Math.random().toString(36).slice(2, 8);
};

TF.defaultText = function (overrides) {
  var item = {
    id: TF.uid(),
    text: "NEUER TEXT",
    x: 96,
    y: 120,
    fontSize: 72,
    align: "left",
  };
  if (overrides) {
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        item[key] = overrides[key];
      }
    }
  }
  return item;
};

TF.defaultDoc = function () {
  var first = TF.defaultText({
    text: "DIE JAGEN\nSTEUERHINTERZIEHER.",
    x: 96,
    y: 138,
    fontSize: 104,
    align: "left",
  });
  return {
    theme: "dark",
    transparent: false,
    logo: {
      visible: true,
      x: 1120,
      y: 758,
      fontSize: 40,
    },
    texts: [
      first,
      TF.defaultText({
        text: "WIR JAGEN\nSTEUERVERSCHWENDER.",
        x: 96,
        y: 438,
        fontSize: 104,
        align: "left",
      }),
    ],
    selectedId: first.id,
  };
};

TF.doc = TF.defaultDoc();
TF.past = [];
TF.future = [];

TF.snapshot = function (doc) {
  doc = doc || TF.doc;
  return JSON.stringify({
    theme: doc.theme,
    transparent: !!doc.transparent,
    logo: doc.logo,
    texts: doc.texts,
  });
};

TF.commitSnapshot = function (raw) {
  TF.past.push(raw);
  if (TF.past.length > TF.MAX_HISTORY) TF.past.shift();
  TF.future = [];
};

TF.pushHistory = function () {
  TF.commitSnapshot(TF.snapshot());
};

TF.restoreSnapshot = function (raw) {
  var snap = JSON.parse(raw);
  var selected = TF.doc.selectedId;
  TF.doc.theme = snap.theme;
  TF.doc.transparent = !!snap.transparent;
  TF.doc.logo = snap.logo;
  TF.doc.texts = snap.texts;
  var stillThere =
    selected === "logo" ||
    TF.doc.texts.some(function (t) {
      return t.id === selected;
    });
  TF.doc.selectedId = stillThere ? selected : null;
};

TF.undo = function () {
  if (!TF.past.length) return false;
  TF.future.push(TF.snapshot());
  TF.restoreSnapshot(TF.past.pop());
  return true;
};

TF.redo = function () {
  if (!TF.future.length) return false;
  TF.past.push(TF.snapshot());
  TF.restoreSnapshot(TF.future.pop());
  return true;
};

TF.findText = function (id) {
  for (var i = 0; i < TF.doc.texts.length; i++) {
    if (TF.doc.texts[i].id === id) return TF.doc.texts[i];
  }
  return null;
};

TF.selectedText = function () {
  return TF.findText(TF.doc.selectedId);
};

TF.ink = function (doc) {
  return (doc || TF.doc).theme === "dark" ? "#ffffff" : "#000000";
};

TF.paper = function (doc) {
  return (doc || TF.doc).theme === "dark" ? "#000000" : "#ffffff";
};
