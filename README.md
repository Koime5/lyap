# ⚡ Lyap.js (`လျှပ်`)

> *Coming Soon* — An ultra-lightweight, fine-grained reactive micro-framework.

Blends the reactive power of **Signals** with the simplicity of **HTML-first directives** and **server-driven HTML swaps**.

```html
<div ly-data="{ count: 0 }">
  <button @click="count++">
    Clicks: <span :text="count">0</span>
  </button>
</div>
