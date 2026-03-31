# UX Behaviors

Zero-dependency, CSP-safe UI behaviors via `data-ux` attributes. Complements HTMX + Alpine.js with interactive patterns they don't cover.

## What this is NOT

- Not a replacement for Alpine.js (use Alpine for reactivity: x-data, x-show, @click)
- Not a replacement for HTMX (use HTMX for server communication: hx-get, hx-post)
- Not a framework

## What this IS

A tiny library (~2KB min) for behaviors that need more than Alpine/HTMX but less than a full component:

| Behavior | What it does |
|----------|-------------|
| `datatable` | Row selection, select-all, bulk actions, delete with confirmation |
| `swipe` | Touch swipe detection (left/right/up/down) |

## Usage

```html
<script src="ux-behaviors.min.js"></script>
```

### Datatable

```html
<div data-ux="datatable">
  <div data-bulk-actions style="display:none">
    <span data-selected-count>0</span> selected
    <button data-delete-selected data-delete-url="/api/delete/" data-csrf="...">Delete</button>
  </div>
  <table>
    <thead>
      <tr><th><input type="checkbox" data-select-all></th><th>Name</th></tr>
    </thead>
    <tbody>
      <tr data-row-id="1"><td><input type="checkbox" data-select-row></td><td>Item 1</td></tr>
      <tr data-row-id="2"><td><input type="checkbox" data-select-row></td><td>Item 2</td></tr>
    </tbody>
  </table>
</div>
```

### Swipe

```html
<div data-ux="swipe" data-swipe-threshold="50">
  Swipe me
</div>

<script>
  document.querySelector('[data-ux="swipe"]').addEventListener('ux:swipe:left', () => {
    console.log('Swiped left!');
  });
</script>
```

Events: `ux:swipe:left`, `ux:swipe:right`, `ux:swipe:up`, `ux:swipe:down`, `ux:swipe` (generic with `detail.direction`).

## HTMX Integration

Automatically re-initializes after HTMX swaps (`htmx:afterSettle`). No configuration needed.

## CSP Safe

Zero `eval()`, zero `new Function()`. Works with strict Content Security Policy.

## License

MIT
