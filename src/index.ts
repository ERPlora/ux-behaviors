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
 *   <script src="ux-behaviors.min.js"></script>
 *   <script src="alpine.min.js"></script>
 *
 * @license MIT
 * @see https://github.com/ERPlora/ux-behaviors
 */

import type { Alpine as AlpineType } from 'alpinejs';

// Re-export for CDN auto-registration
export default function UXBehaviors(Alpine: AlpineType) {
  registerDatatable(Alpine);
  registerSwipe(Alpine);
  registerConfirmDelete(Alpine);
  registerClipboard(Alpine);
  registerAutosize(Alpine);
}

// Auto-register if Alpine is already on window (CDN usage)
declare global {
  interface Window {
    Alpine?: AlpineType;
    showToast?: (message: string, type: string, duration?: number) => void;
    showConfirm?: (header: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string) => void;
  }
}

if (typeof window !== 'undefined' && window.Alpine) {
  window.Alpine.plugin(UXBehaviors);
}

// ==========================================================================
// x-datatable — Row selection, select-all, bulk actions
// ==========================================================================
//
// <div x-data x-datatable>
//   <input type="checkbox" x-datatable:select-all />
//   <div x-datatable:bulk-actions>
//     <span x-datatable:count></span> selected
//     <button x-datatable:delete="/api/delete/">Delete</button>
//   </div>
//   <tr x-datatable:row="1"><td><input type="checkbox" x-datatable:select /></td></tr>
// </div>

function registerDatatable(Alpine: AlpineType) {
  Alpine.directive('datatable', (el, { value, expression }, { evaluate, cleanup }) => {
    if (value === null || value === '') {
      // Root: x-datatable — initialize store on this element
      initDatatableRoot(Alpine, el, cleanup);
    } else if (value === 'select-all') {
      initSelectAll(el);
    } else if (value === 'select') {
      initSelectRow(el);
    } else if (value === 'bulk-actions') {
      initBulkActions(el);
    } else if (value === 'count') {
      initCount(el);
    } else if (value === 'delete') {
      initDeleteButton(el, expression);
    } else if (value === 'row') {
      el.setAttribute('data-row-id', expression);
    }
  });
}

function getRoot(el: HTMLElement): HTMLElement | null {
  return el.closest('[x-datatable]');
}

function getSelectedIds(root: HTMLElement): string[] {
  const ids: string[] = [];
  root.querySelectorAll<HTMLInputElement>('[x-datatable\\:select]').forEach(cb => {
    if (cb.checked) {
      const row = cb.closest('[data-row-id]');
      if (row) ids.push(row.getAttribute('data-row-id')!);
    }
  });
  return ids;
}

function emitUpdate(root: HTMLElement) {
  root.dispatchEvent(new CustomEvent('ux:datatable:update', {
    bubbles: false,
    detail: { selected: getSelectedIds(root) },
  }));
}

function initDatatableRoot(Alpine: AlpineType, el: HTMLElement, cleanup: (fn: () => void) => void) {
  const handler = () => emitUpdate(el);
  el.addEventListener('change', handler);
  cleanup(() => el.removeEventListener('change', handler));
}

function initSelectAll(el: HTMLInputElement) {
  const root = getRoot(el);
  if (!root) return;

  el.addEventListener('change', () => {
    root.querySelectorAll<HTMLInputElement>('[x-datatable\\:select]').forEach(cb => {
      cb.checked = el.checked;
    });
    emitUpdate(root);
  });

  root.addEventListener('ux:datatable:update', () => {
    const boxes = root.querySelectorAll<HTMLInputElement>('[x-datatable\\:select]');
    const checked = Array.from(boxes).filter(cb => cb.checked);
    el.checked = boxes.length > 0 && checked.length === boxes.length;
    el.indeterminate = checked.length > 0 && checked.length < boxes.length;
  });
}

function initSelectRow(el: HTMLInputElement) {
  el.addEventListener('change', () => {
    const root = getRoot(el);
    if (root) emitUpdate(root);
  });
}

function initBulkActions(el: HTMLElement) {
  const root = getRoot(el);
  if (!root) return;
  el.style.display = 'none';

  root.addEventListener('ux:datatable:update', ((e: CustomEvent) => {
    el.style.display = e.detail.selected.length > 0 ? '' : 'none';
  }) as EventListener);
}

function initCount(el: HTMLElement) {
  const root = getRoot(el);
  if (!root) return;

  root.addEventListener('ux:datatable:update', ((e: CustomEvent) => {
    el.textContent = String(e.detail.selected.length);
  }) as EventListener);
}

function initDeleteButton(el: HTMLElement, url: string) {
  const root = getRoot(el);
  if (!root) return;

  el.addEventListener('click', () => {
    const ids = getSelectedIds(root);
    if (ids.length === 0) return;

    const msg = el.getAttribute('data-confirm') ||
      `Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`;
    const csrf = getCsrf();

    const doDelete = () => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ ids }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            ids.forEach(id => {
              const row = root.querySelector(`[data-row-id="${id}"]`);
              if (row instanceof HTMLElement) {
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(() => row.remove(), 300);
              }
            });
            // Reset
            const sa = root.querySelector<HTMLInputElement>('[x-datatable\\:select-all]');
            if (sa) { sa.checked = false; sa.indeterminate = false; }
            setTimeout(() => emitUpdate(root), 350);
            if (window.showToast) window.showToast(data.message || 'Deleted', 'success');
          } else {
            if (window.showToast) window.showToast(data.message || 'Error', 'error');
          }
        })
        .catch(() => {
          if (window.showToast) window.showToast('Network error', 'error');
        });
    };

    if (window.showConfirm) {
      window.showConfirm('Confirm Delete', msg, doDelete);
    } else if (confirm(msg)) {
      doDelete();
    }
  });
}

// ==========================================================================
// x-swipe — Touch swipe detection
// ==========================================================================
//
// <div x-swipe @ux-swipe-left="doSomething()">Swipe me</div>
//
// Dispatches: ux-swipe-left, ux-swipe-right, ux-swipe-up, ux-swipe-down

function registerSwipe(Alpine: AlpineType) {
  Alpine.directive('swipe', (el, { expression }, { cleanup }) => {
    const threshold = parseInt(expression) || 50;
    let startX = 0;
    let startY = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      let direction: string;
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      el.dispatchEvent(new CustomEvent(`ux-swipe-${direction}`, {
        bubbles: true,
        detail: { direction, dx, dy },
      }));
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });

    cleanup(() => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    });
  });
}

// ==========================================================================
// x-confirm-delete — Delete with confirmation modal
// ==========================================================================
//
// <button x-confirm-delete="/api/items/5/delete/" data-name="Item 5">Delete</button>
// On confirm: POST to URL, removes closest <tr>, shows toast.

function registerConfirmDelete(Alpine: AlpineType) {
  Alpine.directive('confirm-delete', (el, { expression }) => {
    el.addEventListener('click', () => {
      const url = expression;
      const name = el.getAttribute('data-name') || 'this item';
      const method = el.getAttribute('data-method') || 'POST';
      const csrf = getCsrf();

      const doDelete = () => {
        const row = el.closest('tr');

        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              if (row instanceof HTMLElement) {
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(() => row.remove(), 300);
              }
              if (window.showToast) window.showToast(data.message || 'Deleted', 'success');
            } else {
              if (window.showToast) window.showToast(data.message || 'Error', 'error');
            }
          })
          .catch(() => {
            if (window.showToast) window.showToast('Network error', 'error');
          });
      };

      if (window.showConfirm) {
        window.showConfirm('Confirm Delete', `Delete "${name}"?`, doDelete);
      } else if (confirm(`Delete "${name}"?`)) {
        doDelete();
      }
    });
  });
}

// ==========================================================================
// x-clipboard — Copy text to clipboard on click
// ==========================================================================
//
// <button x-clipboard="some text to copy">Copy</button>
// <button x-clipboard x-clipboard:from="#my-input">Copy from input</button>

function registerClipboard(Alpine: AlpineType) {
  Alpine.directive('clipboard', (el, { value, expression }) => {
    el.addEventListener('click', () => {
      let text = expression;

      if (value === 'from') {
        const source = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(expression);
        if (source) text = source.value || source.textContent || '';
      }

      if (!text) return;

      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast('Copied!', 'success', 2000);
        el.dispatchEvent(new CustomEvent('ux-copied', { bubbles: true }));
      });
    });
  });
}

// ==========================================================================
// x-autosize — Auto-resize textarea to fit content
// ==========================================================================
//
// <textarea x-autosize></textarea>

function registerAutosize(Alpine: AlpineType) {
  Alpine.directive('autosize', (el, {}, { cleanup }) => {
    if (!(el instanceof HTMLTextAreaElement)) return;

    const resize = () => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };

    el.addEventListener('input', resize);
    // Initial resize
    requestAnimationFrame(resize);

    cleanup(() => el.removeEventListener('input', resize));
  });
}

// ==========================================================================
// Helpers
// ==========================================================================

function getCsrf(): string {
  const input = document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]');
  if (input) return input.value;
  const match = document.cookie.match(/_csrf=([^;]+)/);
  return match ? match[1] : '';
}
