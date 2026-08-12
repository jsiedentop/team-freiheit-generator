/* global TF */
var TF = window.TF || {};
window.TF = TF;

TF.FORMATS = {
  x169: { id: "x169", w: 1600, h: 900, label: "16:9", file: "16x9" },
  square: { id: "square", w: 1080, h: 1080, label: "1:1", file: "1x1" },
  feed45: { id: "feed45", w: 1080, h: 1350, label: "4:5", file: "4x5" },
  story: { id: "story", w: 1080, h: 1920, label: "9:16", file: "9x16" },
};

TF.W = 1600;
TF.H = 900;
TF.HEAD_TRACK = -0.01;
TF.LOGO_TRACK = 0.02;
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
    format: "x169",
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
    format: doc.format || "x169",
    theme: doc.theme,
    transparent: !!doc.transparent,
    logo: doc.logo,
    texts: doc.texts,
  });
};

TF.getFormat = function (id) {
  return TF.FORMATS[id] || TF.FORMATS.x169;
};

TF.applyCanvasSize = function (format) {
  format = format || TF.getFormat((TF.doc && TF.doc.format) || "x169");
  TF.W = format.w;
  TF.H = format.h;
};

TF.setFormat = function (nextId) {
  var prev = TF.getFormat(TF.doc.format);
  var next = TF.getFormat(nextId);
  if (prev.id === next.id) return false;
  var sx = next.w / prev.w;
  var sy = next.h / prev.h;
  var scale = Math.min(sx, sy);
  TF.doc.texts.forEach(function (item) {
    item.x *= sx;
    item.y *= sy;
    item.fontSize = Math.max(24, Math.min(220, Math.round(item.fontSize * scale)));
  });
  TF.doc.logo.x *= sx;
  TF.doc.logo.y *= sy;
  TF.doc.logo.fontSize = Math.max(16, Math.min(80, Math.round(TF.doc.logo.fontSize * scale)));
  TF.doc.format = next.id;
  TF.applyCanvasSize(next);
  return true;
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
  TF.doc.format = snap.format || "x169";
  TF.doc.theme = snap.theme;
  TF.doc.transparent = !!snap.transparent;
  TF.doc.logo = snap.logo;
  TF.doc.texts = snap.texts;
  TF.applyCanvasSize(TF.getFormat(TF.doc.format));
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

TF.clampItem = function (ctx, id, item) {
  var box = id === "logo" ? TF.logoMetrics(ctx, item) : TF.textBox(ctx, item);
  var dx = 0;
  var dy = 0;
  if (id !== "logo" && box.w >= TF.W) {
    if (item.align === "center") item.x = TF.W / 2;
    else if (item.align === "right") item.x = TF.W;
    else item.x = 0;
  } else if (box.x < 0) dx = -box.x;
  else if (box.x + box.w > TF.W) dx = TF.W - box.x - box.w;
  if (box.h >= TF.H) item.y = 0;
  else if (box.y < 0) dy = -box.y;
  else if (box.y + box.h > TF.H) dy = TF.H - box.y - box.h;
  item.x += dx;
  item.y += dy;
};

TF.clampAll = function (ctx) {
  TF.doc.texts.forEach(function (item) {
    TF.clampItem(ctx, item.id, item);
  });
  TF.clampItem(ctx, "logo", TF.doc.logo);
};

TF.ink = function (doc) {
  return (doc || TF.doc).theme === "dark" ? "#ffffff" : "#000000";
};

TF.paper = function (doc) {
  return (doc || TF.doc).theme === "dark" ? "#000000" : "#ffffff";
};
