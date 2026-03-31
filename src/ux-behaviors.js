/**
 * UX Behaviors v1.0.0
 * Zero-dependency, CSP-safe UI behaviors via data attributes.
 * Complements HTMX + Alpine.js with missing interactive patterns.
 *
 * Behaviors:
 *   data-ux="datatable"  — Row selection, select-all, bulk actions, delete confirmation
 *   data-ux="swipe"      — Touch swipe detection (left/right/up/down)
 *   data-ux="sortable"   — Drag-and-drop reordering (TODO)
 *
 * @license MIT
 * @see https://github.com/ERPlora/ux-behaviors
 */

(function () {
  'use strict';

  const ATTR = 'data-ux';

  // =========================================================================
  // DATATABLE — Row selection, select-all, bulk actions, delete confirmation
  // =========================================================================
  //
  // Usage:
  //   <div data-ux="datatable">
  //     <input type="checkbox" data-select-all />
  //     <div data-bulk-actions>...</div>
  //     <table>
  //       <tr data-row-id="1"><td><input type="checkbox" data-select-row /></td>...</tr>
  //     </table>
  //     <button data-delete-selected data-delete-url="/api/items/delete/" data-csrf="{{csrf}}">Delete</button>
  //   </div>

  function initDatatable(el) {
    const selectAll = el.querySelector('[data-select-all]');
    const bulkActions = el.querySelector('[data-bulk-actions]');
    const deleteBtn = el.querySelector('[data-delete-selected]');

    function getRowCheckboxes() {
      return el.querySelectorAll('[data-select-row]');
    }

    function getSelectedIds() {
      const ids = [];
      getRowCheckboxes().forEach(function (cb) {
        if (cb.checked) {
          const row = cb.closest('[data-row-id]');
          if (row) ids.push(row.getAttribute('data-row-id'));
        }
      });
      return ids;
    }

    function updateBulkUI() {
      const selected = getSelectedIds();
      if (bulkActions) {
        bulkActions.style.display = selected.length > 0 ? '' : 'none';
      }
      // Update counter if exists
      const counter = el.querySelector('[data-selected-count]');
      if (counter) counter.textContent = selected.length;
    }

    // Select all
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        const checked = selectAll.checked;
        getRowCheckboxes().forEach(function (cb) {
          cb.checked = checked;
        });
        updateBulkUI();
      });
    }

    // Individual row selection
    el.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-select-row')) {
        // Update select-all state
        if (selectAll) {
          const boxes = getRowCheckboxes();
          const allChecked = Array.from(boxes).every(function (cb) { return cb.checked; });
          selectAll.checked = allChecked;
          selectAll.indeterminate = !allChecked && getSelectedIds().length > 0;
        }
        updateBulkUI();
      }
    });

    // Delete selected with confirmation
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        const ids = getSelectedIds();
        if (ids.length === 0) return;

        var url = deleteBtn.getAttribute('data-delete-url');
        var csrf = deleteBtn.getAttribute('data-csrf');
        var confirmMsg = deleteBtn.getAttribute('data-confirm') ||
          'Delete ' + ids.length + ' item' + (ids.length > 1 ? 's' : '') + '?';

        // Use global showConfirm if available (from base.html), otherwise native confirm
        if (typeof window.showConfirm === 'function') {
          window.showConfirm('Confirm Delete', confirmMsg, function () {
            _doDelete(el, url, csrf, ids);
          });
        } else if (confirm(confirmMsg)) {
          _doDelete(el, url, csrf, ids);
        }
      });
    }

    // Initial state
    updateBulkUI();
  }

  function _doDelete(el, url, csrf, ids) {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrf || ''
      },
      body: JSON.stringify({ ids: ids })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          // Remove rows from DOM
          ids.forEach(function (id) {
            var row = el.querySelector('[data-row-id="' + id + '"]');
            if (row) {
              row.style.transition = 'opacity 0.3s';
              row.style.opacity = '0';
              setTimeout(function () { row.remove(); }, 300);
            }
          });
          // Reset select-all
          var selectAll = el.querySelector('[data-select-all]');
          if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
          // Update bulk UI after animation
          setTimeout(function () {
            var bulkActions = el.querySelector('[data-bulk-actions]');
            if (bulkActions) bulkActions.style.display = 'none';
          }, 350);
          // Toast
          if (typeof window.showToast === 'function') {
            window.showToast(data.message || 'Deleted', 'success');
          }
        } else {
          if (typeof window.showToast === 'function') {
            window.showToast(data.message || 'Error', 'error');
          }
        }
      })
      .catch(function () {
        if (typeof window.showToast === 'function') {
          window.showToast('Network error', 'error');
        }
      });
  }

  // =========================================================================
  // SWIPE — Touch swipe detection
  // =========================================================================
  //
  // Usage:
  //   <div data-ux="swipe" data-swipe-left="closeDrawer()" data-swipe-right="openDrawer()">
  //     ...
  //   </div>
  //
  // Dispatches custom events: ux:swipe:left, ux:swipe:right, ux:swipe:up, ux:swipe:down

  function initSwipe(el) {
    var startX = 0;
    var startY = 0;
    var threshold = parseInt(el.getAttribute('data-swipe-threshold')) || 50;

    el.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);

      if (absDx < threshold && absDy < threshold) return;

      var direction;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      el.dispatchEvent(new CustomEvent('ux:swipe:' + direction, {
        bubbles: true,
        detail: { dx: dx, dy: dy }
      }));

      // Also dispatch generic swipe event
      el.dispatchEvent(new CustomEvent('ux:swipe', {
        bubbles: true,
        detail: { direction: direction, dx: dx, dy: dy }
      }));
    }, { passive: true });
  }

  // =========================================================================
  // INIT — Scan DOM and initialize behaviors
  // =========================================================================

  var behaviorMap = {
    datatable: initDatatable,
    swipe: initSwipe
  };

  function init(root) {
    root = root || document;
    root.querySelectorAll('[' + ATTR + ']').forEach(function (el) {
      var behavior = el.getAttribute(ATTR);
      if (el._uxInit) return; // Already initialized
      var fn = behaviorMap[behavior];
      if (fn) {
        fn(el);
        el._uxInit = true;
      }
    });
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // Re-init after HTMX swaps (if HTMX is present)
  document.addEventListener('htmx:afterSettle', function (e) {
    init(e.detail.target);
  });

  // Expose API
  window.UXBehaviors = {
    init: init,
    version: '1.0.0'
  };
})();
