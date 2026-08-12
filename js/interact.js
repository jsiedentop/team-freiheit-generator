/* global TF */
(function () {
  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var textList = document.getElementById("text-list");
  var textEditor = document.getElementById("text-editor");
  var textInput = document.getElementById("text-input");
  var fontSize = document.getElementById("font-size");
  var sizeVal = document.getElementById("size-val");
  var logoVisible = document.getElementById("logo-visible");
  var logoSize = document.getElementById("logo-size");
  var logoSizeVal = document.getElementById("logo-size-val");

  var drag = null;
  var ready = false;

  function canvasPoint(event) {
    var rect = canvas.getBoundingClientRect();
    var src = event.touches ? event.touches[0] : event;
    if (!src) src = event.changedTouches && event.changedTouches[0];
    return {
      x: ((src.clientX - rect.left) * canvas.width) / rect.width,
      y: ((src.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function isField(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  function render() {
    if (!ready) return;
    TF.paint(ctx, TF.doc, {
      selection: true,
      guides: drag && drag.guides,
    });
    syncSidebar();
  }

  function itemBox(id, item) {
    return id === "logo" ? TF.logoMetrics(ctx, item) : TF.textBox(ctx, item);
  }

  function edgeXs(box) {
    return [box.x, box.x + box.w / 2, box.x + box.w];
  }

  function edgeYs(box) {
    return [box.y, box.y + box.h / 2, box.y + box.h];
  }

  function siblingBoxes(exceptId) {
    var boxes = [];
    TF.doc.texts.forEach(function (item) {
      if (item.id !== exceptId) boxes.push(TF.textBox(ctx, item));
    });
    if (TF.doc.logo.visible && exceptId !== "logo") {
      boxes.push(TF.logoMetrics(ctx, TF.doc.logo));
    }
    return boxes;
  }

  function nearestSnap(mines, candidates) {
    var best = null;
    mines.forEach(function (mine) {
      candidates.forEach(function (line) {
        var delta = line - mine;
        if (Math.abs(delta) > TF.SNAP) return;
        if (!best || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta: delta, line: line };
        }
      });
    });
    return best;
  }

  function applySnap(target, id, event) {
    if (event && event.shiftKey) return { xs: [], ys: [] };
    var box = itemBox(id, target);
    var xCandidates = [TF.W / 2];
    var yCandidates = [TF.H / 2];
    siblingBoxes(id).forEach(function (other) {
      edgeXs(other).forEach(function (v) {
        xCandidates.push(v);
      });
      edgeYs(other).forEach(function (v) {
        yCandidates.push(v);
      });
    });
    var bestX = nearestSnap(edgeXs(box), xCandidates);
    var bestY = nearestSnap(edgeYs(box), yCandidates);
    if (bestX) target.x += bestX.delta;
    if (bestY) target.y += bestY.delta;
    return {
      xs: bestX ? [bestX.line] : [],
      ys: bestY ? [bestY.line] : [],
    };
  }

  function previewLabel(item) {
    var line = TF.displayText(item.text).split("\n")[0] || "LEER";
    return line.length > 28 ? line.slice(0, 27) + "…" : line;
  }

  function markSeg(root, attr, value) {
    [].forEach.call(root.querySelectorAll("button"), function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute(attr) === value);
    });
  }

  function syncSidebar() {
    markSeg(document.getElementById("theme-seg"), "data-theme", TF.doc.theme);

    textList.innerHTML = "";
    TF.doc.texts.forEach(function (item, index) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = index + 1 + " · " + previewLabel(item);
      btn.classList.toggle("is-on", TF.doc.selectedId === item.id);
      btn.addEventListener("click", function () {
        TF.doc.selectedId = item.id;
        render();
      });
      li.appendChild(btn);
      textList.appendChild(li);
    });

    var selected = TF.selectedText();
    textEditor.hidden = !selected;
    if (selected) {
      if (document.activeElement !== textInput) textInput.value = selected.text;
      fontSize.value = String(selected.fontSize);
      sizeVal.textContent = selected.fontSize + " px";
      markSeg(document.getElementById("align-seg"), "data-align", selected.align);
    }

    var bgTransparent = document.getElementById("bg-transparent");
    if (bgTransparent) bgTransparent.checked = !!TF.doc.transparent;

    logoVisible.checked = !!TF.doc.logo.visible;
    logoSize.value = String(TF.doc.logo.fontSize);
    logoSizeVal.textContent = TF.doc.logo.fontSize + " px";
  }

  function retargetAlign(item, nextAlign) {
    if (item.align === nextAlign) return;
    var box = TF.textBox(ctx, item);
    if (nextAlign === "left") item.x = box.x;
    else if (nextAlign === "center") item.x = box.x + box.w / 2;
    else item.x = box.x + box.w;
    item.align = nextAlign;
  }

  document.getElementById("theme-seg").addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-theme]");
    if (!btn || btn.getAttribute("data-theme") === TF.doc.theme) return;
    TF.pushHistory();
    TF.doc.theme = btn.getAttribute("data-theme");
    render();
  });

  document.getElementById("bg-transparent").addEventListener("change", function () {
    TF.pushHistory();
    TF.doc.transparent = document.getElementById("bg-transparent").checked;
    render();
  });

  document.getElementById("add-text").addEventListener("click", function () {
    TF.pushHistory();
    var item = TF.defaultText({
      x: 96,
      y: 120 + TF.doc.texts.length * 80,
    });
    TF.doc.texts.push(item);
    TF.doc.selectedId = item.id;
    render();
  });

  document.getElementById("delete-text").addEventListener("click", function () {
    var selected = TF.selectedText();
    if (!selected) return;
    TF.pushHistory();
    TF.doc.texts = TF.doc.texts.filter(function (item) {
      return item.id !== selected.id;
    });
    TF.doc.selectedId = TF.doc.texts.length ? TF.doc.texts[TF.doc.texts.length - 1].id : null;
    render();
  });

  textInput.addEventListener("input", function () {
    var selected = TF.selectedText();
    if (!selected) return;
    selected.text = textInput.value;
    render();
  });

  textInput.addEventListener("focus", function () {
    textInput.dataset.hist = TF.snapshot();
  });

  function commitFieldIfDirty() {
    if (!textInput.dataset.hist) return;
    var before = textInput.dataset.hist;
    if (before !== TF.snapshot()) TF.commitSnapshot(before);
    textInput.dataset.hist = TF.snapshot();
  }

  textInput.addEventListener("blur", function () {
    commitFieldIfDirty();
    delete textInput.dataset.hist;
  });

  fontSize.addEventListener("pointerdown", function () {
    TF.pushHistory();
  });

  fontSize.addEventListener("input", function () {
    var selected = TF.selectedText();
    if (!selected) return;
    selected.fontSize = Number(fontSize.value);
    render();
  });

  document.getElementById("align-seg").addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-align]");
    var selected = TF.selectedText();
    if (!btn || !selected) return;
    var next = btn.getAttribute("data-align");
    if (next === selected.align) return;
    TF.pushHistory();
    retargetAlign(selected, next);
    render();
  });

  logoVisible.addEventListener("change", function () {
    TF.pushHistory();
    TF.doc.logo.visible = logoVisible.checked;
    if (logoVisible.checked) TF.doc.selectedId = "logo";
    else if (TF.doc.selectedId === "logo") TF.doc.selectedId = null;
    render();
  });

  logoSize.addEventListener("pointerdown", function () {
    TF.pushHistory();
  });

  logoSize.addEventListener("input", function () {
    TF.doc.logo.fontSize = Number(logoSize.value);
    render();
  });

  document.getElementById("export-png").addEventListener("click", function () {
    TF.exportPng(TF.doc);
  });

  function startDrag(event) {
    if (!ready) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    if (document.activeElement && document.activeElement !== canvas && document.activeElement.blur) {
      document.activeElement.blur();
    }
    canvas.focus();
    var pt = canvasPoint(event);
    var hit = TF.hitTest(ctx, TF.doc, pt.x, pt.y);
    TF.doc.selectedId = hit ? hit.id : null;
    if (hit) {
      var target = hit.id === "logo" ? TF.doc.logo : TF.findText(hit.id);
      drag = {
        id: hit.id,
        dx: pt.x - target.x,
        dy: pt.y - target.y,
        moved: false,
        guides: { xs: [], ys: [] },
        origin: TF.snapshot(),
      };
    } else {
      drag = null;
    }
    render();
    if (event.pointerType === "touch") event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag) return;
    var pt = canvasPoint(event);
    var target = drag.id === "logo" ? TF.doc.logo : TF.findText(drag.id);
    if (!target) return;
    var nx = pt.x - drag.dx;
    var ny = pt.y - drag.dy;
    if (nx !== target.x || ny !== target.y) drag.moved = true;
    target.x = nx;
    target.y = ny;
    drag.guides = applySnap(target, drag.id, event);
    render();
    event.preventDefault();
  }

  function endDrag() {
    if (!drag) return;
    if (drag.moved) TF.commitSnapshot(drag.origin);
    drag = null;
    render();
  }

  canvas.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  window.addEventListener("keydown", function (event) {
    var mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      commitFieldIfDirty();
      var changed = event.shiftKey ? TF.redo() : TF.undo();
      if (changed) {
        var restored = TF.selectedText();
        if (document.activeElement === textInput) {
          textInput.value = restored ? restored.text : "";
          textInput.dataset.hist = TF.snapshot();
        }
        render();
      }
      return;
    }
    if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      commitFieldIfDirty();
      if (TF.redo()) {
        var redone = TF.selectedText();
        if (document.activeElement === textInput) {
          textInput.value = redone ? redone.text : "";
          textInput.dataset.hist = TF.snapshot();
        }
        render();
      }
      return;
    }
    if (isField(event.target)) return;

    var step = event.shiftKey ? 10 : 1;
    var selectedId = TF.doc.selectedId;
    var target =
      selectedId === "logo" ? TF.doc.logo : selectedId ? TF.findText(selectedId) : null;

    if (target && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
      if (!event.repeat) TF.pushHistory();
      if (event.key === "ArrowLeft") target.x -= step;
      if (event.key === "ArrowRight") target.x += step;
      if (event.key === "ArrowUp") target.y -= step;
      if (event.key === "ArrowDown") target.y += step;
      event.preventDefault();
      render();
      return;
    }

    if ((event.key === "Backspace" || event.key === "Delete") && TF.selectedText()) {
      event.preventDefault();
      document.getElementById("delete-text").click();
      return;
    }

    if (event.key === "Escape") {
      TF.doc.selectedId = null;
      render();
    }
  });

  function boot() {
    ready = true;
    if (!TF.doc.selectedId && TF.doc.texts[0]) TF.doc.selectedId = TF.doc.texts[0].id;
    render();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot).catch(boot);
  } else {
    boot();
  }
})();
