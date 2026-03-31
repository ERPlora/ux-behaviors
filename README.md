# UX Behaviors

Alpine.js plugin — datatable bulk actions, swipe gestures, confirm delete, clipboard, and autosize textarea. CSP-safe, zero eval.

## Install

```bash
npm install ux-behaviors
```

Or via CDN (load **before** Alpine.js):

```html
<script src="ux-behaviors.min.js" defer></script>
<script src="alpine.min.js" defer></script>
```

## Setup (ESM)

```js
import Alpine from 'alpinejs';
import UXBehaviors from 'ux-behaviors';

Alpine.plugin(UXBehaviors);
Alpine.start();
```

## Directives

### `x-datatable` — Bulk selection & actions

```html
<div x-data x-datatable>
  <div x-datatable:bulk-actions>
    <span x-datatable:count></span> selected
    <button x-datatable:delete="/api/items/delete/">Delete</button>
  </div>
  <table>
    <thead>
      <tr><th><input type="checkbox" x-datatable:select-all></th><th>Name</th></tr>
    </thead>
    <tbody>
      <tr x-datatable:row="1"><td><input type="checkbox" x-datatable:select></td><td>Item 1</td></tr>
      <tr x-datatable:row="2"><td><input type="checkbox" x-datatable:select></td><td>Item 2</td></tr>
    </tbody>
  </table>
</div>
```

Events: `ux:datatable:update` (detail: `{ selected: string[] }`)

### `x-swipe` — Touch swipe detection

```html
<div x-data x-swipe @ux-swipe-left="console.log('left!')">
  Swipe me
</div>
```

Optional threshold: `x-swipe="100"` (default: 50px)

Events: `ux-swipe-left`, `ux-swipe-right`, `ux-swipe-up`, `ux-swipe-down`

### `x-confirm-delete` — Delete with confirmation

```html
<button x-confirm-delete="/api/items/5/delete/" data-name="Item 5">
  Delete
</button>
```

POSTs to URL, removes closest `<tr>`, shows toast.

### `x-clipboard` — Copy to clipboard

```html
<button x-clipboard="Text to copy">Copy</button>
<button x-clipboard:from="#my-input">Copy from input</button>
```

### `x-autosize` — Auto-resize textarea

```html
<textarea x-autosize></textarea>
```

## HTMX Compatible

All directives survive HTMX swaps when using `hx-swap="morph"` (idiomorph).

## CSP Safe

Zero `eval()`, zero `new Function()`. Works with strict Content Security Policy.

## License

MIT
