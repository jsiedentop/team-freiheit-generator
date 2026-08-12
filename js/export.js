/* global TF */
var TF = window.TF || {};
window.TF = TF;

TF.fileSlug = function (doc) {
  var first = (doc.texts[0] && TF.displayText(doc.texts[0].text).split("\n")[0]) || "bild";
  var slug = first
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "bild";
};

TF.downloadBlob = function (blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
};

TF.exportPng = function (doc) {
  var canvas = document.createElement("canvas");
  canvas.width = TF.W;
  canvas.height = TF.H;
  var ctx = canvas.getContext("2d");
  TF.paint(ctx, doc, { selection: false });
  canvas.toBlob(function (blob) {
    if (!blob) return;
    TF.downloadBlob(blob, "team-freiheit-" + TF.fileSlug(doc) + ".png");
  }, "image/png");
};
