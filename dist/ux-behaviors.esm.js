// src/index.ts
function UXBehaviors(Alpine) {
  registerDatatable(Alpine);
  registerSwipe(Alpine);
  registerConfirmDelete(Alpine);
  registerClipboard(Alpine);
  registerAutosize(Alpine);
  registerDrawer(Alpine);
  registerJsonValue(Alpine);
  registerDispatch(Alpine);
}
if (typeof window !== "undefined") {
  if (window.Alpine) {
    window.Alpine.plugin(UXBehaviors);
  } else {
    document.addEventListener("alpine:init", () => {
      if (window.Alpine) window.Alpine.plugin(UXBehaviors);
    });
  }
}
function registerDatatable(Alpine) {
  Alpine.directive("datatable", (el, { value, expression }, { evaluate, cleanup }) => {
    if (value === null || value === "") {
      initDatatableRoot(Alpine, el, cleanup);
    } else if (value === "select-all") {
      initSelectAll(el);
    } else if (value === "select") {
      initSelectRow(el);
    } else if (value === "bulk-actions") {
      initBulkActions(el);
    } else if (value === "count") {
      initCount(el);
    } else if (value === "delete") {
      initDeleteButton(el, expression);
    } else if (value === "row") {
      el.setAttribute("data-row-id", expression);
    } else if (value === "action") {
      initActionButton(el, expression);
    }
  });
}
function getRoot(el) {
  return el.closest("[x-datatable]");
}
function getSelectedIds(root) {
  const ids = [];
  root.querySelectorAll("[x-datatable\\:select]").forEach((cb) => {
    if (cb.checked) {
      const row = cb.closest("[data-row-id]");
      if (row) ids.push(row.getAttribute("data-row-id"));
    }
  });
  return ids;
}
function emitUpdate(root) {
  root.dispatchEvent(new CustomEvent("ux:datatable:update", {
    bubbles: false,
    detail: { selected: getSelectedIds(root) }
  }));
}
function initDatatableRoot(Alpine, el, cleanup) {
  const handler = () => emitUpdate(el);
  el.addEventListener("change", handler);
  cleanup(() => el.removeEventListener("change", handler));
}
function initSelectAll(el) {
  const root = getRoot(el);
  if (!root) return;
  el.addEventListener("change", () => {
    root.querySelectorAll("[x-datatable\\:select]").forEach((cb) => {
      cb.checked = el.checked;
    });
    emitUpdate(root);
  });
  root.addEventListener("ux:datatable:update", () => {
    const boxes = root.querySelectorAll("[x-datatable\\:select]");
    const checked = Array.from(boxes).filter((cb) => cb.checked);
    el.checked = boxes.length > 0 && checked.length === boxes.length;
    el.indeterminate = checked.length > 0 && checked.length < boxes.length;
  });
}
function initSelectRow(el) {
  el.addEventListener("change", () => {
    const root = getRoot(el);
    if (root) emitUpdate(root);
  });
}
function initBulkActions(el) {
  const root = getRoot(el);
  if (!root) return;
  el.style.display = "none";
  root.addEventListener("ux:datatable:update", ((e) => {
    el.style.display = e.detail.selected.length > 0 ? "" : "none";
  }));
}
function initCount(el) {
  const root = getRoot(el);
  if (!root) return;
  root.addEventListener("ux:datatable:update", ((e) => {
    el.textContent = String(e.detail.selected.length);
  }));
}
function initDeleteButton(el, url) {
  const root = getRoot(el);
  if (!root) return;
  el.addEventListener("click", () => {
    const ids = getSelectedIds(root);
    if (ids.length === 0) return;
    const msg = el.getAttribute("data-confirm") || `Delete ${ids.length} item${ids.length > 1 ? "s" : ""}?`;
    const csrf = getCsrf();
    const doDelete = () => {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ ids })
      }).then((r) => r.json()).then((data) => {
        if (data.success) {
          ids.forEach((id) => {
            const row = root.querySelector(`[data-row-id="${id}"]`);
            if (row instanceof HTMLElement) {
              row.style.transition = "opacity 0.3s";
              row.style.opacity = "0";
              setTimeout(() => row.remove(), 300);
            }
          });
          const sa = root.querySelector("[x-datatable\\:select-all]");
          if (sa) {
            sa.checked = false;
            sa.indeterminate = false;
          }
          setTimeout(() => emitUpdate(root), 350);
          if (window.showToast) window.showToast(data.message || "Deleted", "success");
        } else {
          if (window.showToast) window.showToast(data.message || "Error", "error");
        }
      }).catch(() => {
        if (window.showToast) window.showToast("Network error", "error");
      });
    };
    if (window.showConfirm) {
      window.showConfirm("Confirm Delete", msg, doDelete);
    } else if (confirm(msg)) {
      doDelete();
    }
  });
}
function initActionButton(el, action) {
  const root = getRoot(el);
  if (!root) return;
  el.addEventListener("htmx:configRequest", ((e) => {
    const ids = getSelectedIds(root);
    e.detail.parameters["ids"] = ids.join(",");
    e.detail.parameters["action"] = action;
  }));
}
function registerJsonValue(Alpine) {
  Alpine.directive("json-value", (el, { expression }, { evaluate, effect, cleanup }) => {
    const input = el;
    const update = () => {
      try {
        const data = evaluate(expression);
        input.value = JSON.stringify(data);
      } catch {
        input.value = "";
      }
    };
    const stop = effect(update);
    cleanup(() => {
      if (typeof stop === "function") stop();
    });
  });
}
function registerSwipe(Alpine) {
  Alpine.directive("swipe", (el, { expression }, { cleanup }) => {
    const threshold = parseInt(expression) || 50;
    let startX = 0;
    let startY = 0;
    const onStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      let direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? "right" : "left";
      } else {
        direction = dy > 0 ? "down" : "up";
      }
      el.dispatchEvent(new CustomEvent(`ux-swipe-${direction}`, {
        bubbles: true,
        detail: { direction, dx, dy }
      }));
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    cleanup(() => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    });
  });
}
function registerConfirmDelete(Alpine) {
  Alpine.directive("confirm-delete", (el, { expression }) => {
    el.addEventListener("click", () => {
      const url = expression;
      const name = el.getAttribute("data-name") || "this item";
      const method = el.getAttribute("data-method") || "POST";
      const csrf = getCsrf();
      const doDelete = () => {
        const row = el.closest("tr");
        fetch(url, {
          method,
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf }
        }).then((r) => r.json()).then((data) => {
          if (data.success) {
            if (row instanceof HTMLElement) {
              row.style.transition = "opacity 0.3s";
              row.style.opacity = "0";
              setTimeout(() => row.remove(), 300);
            }
            if (window.showToast) window.showToast(data.message || "Deleted", "success");
          } else {
            if (window.showToast) window.showToast(data.message || "Error", "error");
          }
        }).catch(() => {
          if (window.showToast) window.showToast("Network error", "error");
        });
      };
      if (window.showConfirm) {
        window.showConfirm("Confirm Delete", `Delete "${name}"?`, doDelete);
      } else if (confirm(`Delete "${name}"?`)) {
        doDelete();
      }
    });
  });
}
function registerClipboard(Alpine) {
  Alpine.directive("clipboard", (el, { value, expression }) => {
    el.addEventListener("click", () => {
      let text = expression;
      if (value === "from") {
        const source = document.querySelector(expression);
        if (source) text = source.value || source.textContent || "";
      }
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast("Copied!", "success", 2e3);
        el.dispatchEvent(new CustomEvent("ux-copied", { bubbles: true }));
      });
    });
  });
}
function registerAutosize(Alpine) {
  Alpine.directive("autosize", (el, {}, { cleanup }) => {
    if (!(el instanceof HTMLTextAreaElement)) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };
    el.addEventListener("input", resize);
    requestAnimationFrame(resize);
    cleanup(() => el.removeEventListener("input", resize));
  });
}
function registerDrawer(Alpine) {
  Alpine.directive("drawer", (el, { value, modifiers, expression }, { cleanup }) => {
    if (value === "backdrop") {
      initDrawerBackdrop(el, cleanup);
      return;
    }
    if (value === "trigger") {
      initDrawerTrigger(el);
      return;
    }
    const noCollapse = modifiers.includes("nocollapse");
    const noHtmx = modifiers.includes("nohtmx");
    const breakpoint = parseInt(expression) || getBreakpoint(el);
    let open = false;
    let collapsed = false;
    const update = () => {
      el.classList.toggle("drawer-open", open);
      if (!noCollapse) {
        el.classList.toggle("drawer-collapsed", collapsed);
      } else {
        el.classList.toggle("drawer-open", open);
      }
      el.dispatchEvent(new CustomEvent("ux:drawer:state", {
        bubbles: true,
        detail: { open, collapsed }
      }));
    };
    const toggle = () => {
      if (window.innerWidth >= breakpoint) {
        if (noCollapse) {
          open = !open;
        } else {
          collapsed = !collapsed;
        }
      } else {
        open = !open;
      }
      update();
    };
    const close = () => {
      if (window.innerWidth >= breakpoint) {
        if (noCollapse) {
          open = false;
        } else {
          collapsed = true;
        }
      } else {
        open = false;
      }
      update();
    };
    const openDrawer = () => {
      open = true;
      update();
    };
    const onToggle = () => toggle();
    const onOpen = () => openDrawer();
    const onClose = () => close();
    const scope = el.closest("[x-data]") || document;
    scope.addEventListener("drawer-toggle", onToggle);
    scope.addEventListener("drawer-open", onOpen);
    scope.addEventListener("drawer-close", onClose);
    let onHtmx = null;
    if (!noHtmx) {
      onHtmx = () => {
        if (window.innerWidth < breakpoint && open) {
          open = false;
          update();
        }
      };
      document.body.addEventListener("htmx:afterSettle", onHtmx);
    }
    el._xDrawer = {
      get open() {
        return open;
      },
      set open(v) {
        open = v;
        update();
      },
      get collapsed() {
        return collapsed;
      },
      set collapsed(v) {
        collapsed = v;
        update();
      },
      toggle,
      close
    };
    Alpine.addScopeToNode(el, {
      get $drawer() {
        return el._xDrawer;
      }
    });
    cleanup(() => {
      scope.removeEventListener("drawer-toggle", onToggle);
      scope.removeEventListener("drawer-open", onOpen);
      scope.removeEventListener("drawer-close", onClose);
      if (onHtmx) document.body.removeEventListener("htmx:afterSettle", onHtmx);
    });
  });
}
function initDrawerBackdrop(el, cleanup) {
  const onState = ((e) => {
    el.classList.toggle("drawer-backdrop-open", e.detail.open);
  });
  const scope = el.closest("[x-data]") || document;
  scope.addEventListener("ux:drawer:state", onState);
  const onClick = () => {
    scope.dispatchEvent(new CustomEvent("drawer-close", { bubbles: false }));
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    scope.removeEventListener("ux:drawer:state", onState);
    el.removeEventListener("click", onClick);
  });
}
function initDrawerTrigger(el) {
  el.addEventListener("click", () => {
    const scope = el.closest("[x-data]") || document;
    scope.dispatchEvent(new CustomEvent("drawer-toggle", { bubbles: false }));
  });
}
function getBreakpoint(el) {
  const val = getComputedStyle(el).getPropertyValue("--drawer-breakpoint");
  return parseInt(val) || 992;
}
function registerDispatch(Alpine) {
  Alpine.directive("dispatch", (el, { value, expression }) => {
    if (value === "detail") return;
    const eventName = expression;
    el.addEventListener("click", () => {
      const scope = el.closest("[x-data]") || document;
      let detail = void 0;
      const detailAttr = el.getAttribute("data-dispatch-detail") || el.getAttribute("x-dispatch:detail");
      if (detailAttr) {
        try {
          detail = JSON.parse(detailAttr);
        } catch {
        }
      }
      scope.dispatchEvent(new CustomEvent(eventName, {
        bubbles: true,
        detail
      }));
    });
  });
}
function getCsrf() {
  const input = document.querySelector("[name=csrfmiddlewaretoken]");
  if (input) return input.value;
  const match = document.cookie.match(/_csrf=([^;]+)/);
  return match ? match[1] : "";
}
export {
  UXBehaviors as default
};
/**
 * UX Behaviors v2.0.0
 * Alpine.js plugin — datatable bulk actions, swipe gestures, and more.
 * CSP-safe, zero eval.
 *
 * Usage:
 *   import UXBehaviors from 'ux-behaviors';
 *   Alpine.plugin(UXBehaviors);
 *
 * Or via CDN (loads as Alpine plugin automatically):
 *   <script src="ux-behaviors.min.js"><\/script>
 *   <script src="alpine.min.js"><\/script>
 *
 * @license MIT
 * @see https://github.com/ERPlora/ux-behaviors
 */
