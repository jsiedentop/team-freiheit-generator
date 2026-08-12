/* global TF */
var TF = window.TF || {};
window.TF = TF;

TF.setType = function (ctx, fontSize, baseline) {
  ctx.font = "900 " + fontSize + "px Montserrat";
  ctx.textAlign = "left";
  ctx.textBaseline = baseline || "top";
};

TF.glyphVertical = function (ctx, text, fontSize) {
  TF.setType(ctx, fontSize, "alphabetic");
  var metrics = ctx.measureText(text || "H");
  var ascent = metrics.actualBoundingBoxAscent;
  var descent = metrics.actualBoundingBoxDescent;
  if (!isFinite(ascent) || !isFinite(descent) || ascent + descent < fontSize * 0.3) {
    ascent = fontSize * 0.74;
    descent = fontSize * 0.02;
  }
  return { ascent: ascent, descent: descent, h: ascent + descent };
};

TF.measureTracked = function (ctx, text, fontSize, trackingEm) {
  TF.setType(ctx, fontSize);
  if (!text) return 0;
  var width = 0;
  for (var i = 0; i < text.length; i++) {
    width += ctx.measureText(text.charAt(i)).width;
  }
  if (text.length > 1) width += trackingEm * fontSize * (text.length - 1);
  return width;
};

TF.drawTracked = function (ctx, text, x, y, fontSize, trackingEm, baseline) {
  TF.setType(ctx, fontSize, baseline);
  var cursor = x;
  var extra = trackingEm * fontSize;
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + extra;
  }
  return cursor - extra - x;
};

TF.lineBox = function (ctx, line, item, index) {
  var width = TF.measureTracked(ctx, line, item.fontSize, TF.HEAD_TRACK);
  var x = item.x;
  if (item.align === "center") x = item.x - width / 2;
  if (item.align === "right") x = item.x - width;
  return {
    text: line,
    x: x,
    y: item.y + index * item.fontSize * TF.LINE_HEIGHT,
    w: width,
    h: item.fontSize,
  };
};

TF.textBox = function (ctx, item) {
  var lines = TF.displayText(item.text).split("\n");
  if (!lines.length) lines = [""];
  var boxes = lines.map(function (line, i) {
    return TF.lineBox(ctx, line, item, i);
  });
  var left = boxes[0].x;
  var right = boxes[0].x + boxes[0].w;
  var top = boxes[0].y;
  var bottom = boxes[0].y + boxes[0].h;
  for (var i = 1; i < boxes.length; i++) {
    left = Math.min(left, boxes[i].x);
    right = Math.max(right, boxes[i].x + boxes[i].w);
    top = Math.min(top, boxes[i].y);
    bottom = Math.max(bottom, boxes[i].y + boxes[i].h);
  }
  return { x: left, y: top, w: right - left, h: bottom - top, lines: boxes };
};

TF.logoMetrics = function (ctx, logo) {
  var fs = logo.fontSize;
  var textW = TF.measureTracked(ctx, TF.LOGO_LABEL, fs, TF.LOGO_TRACK);
  var glyph = TF.glyphVertical(ctx, TF.LOGO_LABEL, fs);
  var border = 0.16 * fs;
  var padX = 0.82 * fs;
  var padY = 0.155 * fs;
  return {
    x: logo.x,
    y: logo.y,
    w: textW + 2 * padX + 2 * border,
    h: fs + 2 * padY + 2 * border,
    border: border,
    padX: padX,
    padY: padY,
    textW: textW,
    fontSize: fs,
    ascent: glyph.ascent,
    glyphH: glyph.h,
  };
};

TF.drawTextItem = function (ctx, item, color) {
  ctx.fillStyle = color;
  var box = TF.textBox(ctx, item);
  box.lines.forEach(function (line) {
    TF.drawTracked(ctx, line.text, line.x, line.y, item.fontSize, TF.HEAD_TRACK);
  });
  return box;
};

TF.drawLogo = function (ctx, logo, color) {
  var m = TF.logoMetrics(ctx, logo);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = m.border;
  ctx.strokeRect(
    m.x + m.border / 2,
    m.y + m.border / 2,
    m.w - m.border,
    m.h - m.border
  );
  var textX = m.x + m.border + m.padX;
  var innerH = m.h - 2 * m.border;
  var baseline = m.y + m.border + (innerH - m.glyphH) / 2 + m.ascent;
  TF.drawTracked(ctx, TF.LOGO_LABEL, textX, baseline, m.fontSize, TF.LOGO_TRACK, "alphabetic");
  ctx.restore();
  return m;
};

TF.drawGuides = function (ctx, guides) {
  if (!guides) return;
  var xs = guides.xs || (guides.x ? [TF.W / 2] : []);
  var ys = guides.ys || (guides.y ? [TF.H / 2] : []);
  if (!xs.length && !ys.length) return;
  ctx.save();
  ctx.strokeStyle = "#2f6df6";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  xs.forEach(function (x) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TF.H);
    ctx.stroke();
  });
  ys.forEach(function (y) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TF.W, y);
    ctx.stroke();
  });
  ctx.restore();
};

TF.drawSelection = function (ctx, box) {
  var pad = 8;
  ctx.save();
  ctx.strokeStyle = "#2f6df6";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
  ctx.restore();
};

TF.hitList = function (ctx, doc) {
  var hits = [];
  doc.texts.forEach(function (item) {
    var box = TF.textBox(ctx, item);
    hits.push({ id: item.id, type: "text", box: box });
  });
  if (doc.logo.visible) {
    hits.push({ id: "logo", type: "logo", box: TF.logoMetrics(ctx, doc.logo) });
  }
  return hits;
};

TF.hitTest = function (ctx, doc, x, y) {
  var hits = TF.hitList(ctx, doc);
  for (var i = hits.length - 1; i >= 0; i--) {
    var b = hits[i].box;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return hits[i];
    }
  }
  return null;
};

TF.paint = function (ctx, doc, opts) {
  opts = opts || {};
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, TF.W, TF.H);
  if (!(doc.transparent && opts.selection === false)) {
    ctx.fillStyle = TF.paper(doc);
    ctx.fillRect(0, 0, TF.W, TF.H);
  }
  var color = TF.ink(doc);
  var selectedBox = null;
  doc.texts.forEach(function (item) {
    var box = TF.drawTextItem(ctx, item, color);
    if (opts.selection !== false && doc.selectedId === item.id) selectedBox = box;
  });
  if (doc.logo.visible) {
    var logoBox = TF.drawLogo(ctx, doc.logo, color);
    if (opts.selection !== false && doc.selectedId === "logo") selectedBox = logoBox;
  }
  if (selectedBox) TF.drawSelection(ctx, selectedBox);
  if (opts.selection !== false) TF.drawGuides(ctx, opts.guides);
  ctx.restore();
};
