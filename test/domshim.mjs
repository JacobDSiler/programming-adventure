// Tiny DOM stand-in so the UI code can be smoke-tested in plain Node (no browser available in CI/VM).
export class Node {
  constructor(tag, ns) { this.tagName = String(tag).toUpperCase(); this.localName = String(tag); this.nodeType = tag === '#text' ? 3 : 1; this.childNodes = []; this.parentNode = null; this.attrs = {}; this.listeners = {}; this._text = ''; this.value = ''; this.checked = false; this.disabled = false; this.selectionStart = 0; this.selectionEnd = 0; this.open = false;
    const props = {}; const self = this;
    this.style = new Proxy(props, { get(t, k) { if (k === 'setProperty') return (n, v) => { t[n] = v; }; if (k === 'removeProperty') return n => { delete t[n]; }; return t[k]; }, set(t, k, v) { t[k] = v; return true; } });
    const cls = () => new Set((this.attrs['class'] || '').split(/\s+/).filter(Boolean));
    this.classList = { add: (...a) => { const s = cls(); a.forEach(x => s.add(x)); this.attrs['class'] = [...s].join(' '); }, remove: (...a) => { const s = cls(); a.forEach(x => s.delete(x)); this.attrs['class'] = [...s].join(' '); }, contains: x => cls().has(x), toggle: (x, f) => { const s = cls(); const on = f === undefined ? !s.has(x) : !!f; on ? s.add(x) : s.delete(x); this.attrs['class'] = [...s].join(' '); return on; } };
  }
  get className() { return this.attrs['class'] || ''; } set className(v) { this.attrs['class'] = v; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this.value = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  append(...kids) { kids.forEach(k => { if (typeof k === 'string') k = new Text(k); if (k.parentNode) k.remove(); k.parentNode = this; this.childNodes.push(k); }); }
  appendChild(k) { this.append(k); return k; }
  remove() { if (this.parentNode) { const i = this.parentNode.childNodes.indexOf(this); if (i >= 0) this.parentNode.childNodes.splice(i, 1); this.parentNode = null; } }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get firstChild() { return this.childNodes[0] || null; }
  set innerHTML(v) { this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; if (v) this._html = v; }
  get innerHTML() { return this.childNodes.map(c => c.nodeType === 3 ? c._text : c.outerHTMLish()).join(''); }
  outerHTMLish() { return '<' + this.localName + '>' + this.innerHTML + '</' + this.localName + '>'; }
  set textContent(v) { this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; if (v !== '' && v != null) this.append(new Text(String(v))); }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(c => c.textContent).join(''); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  fire(t, ev) { const e = Object.assign({ type: t, target: this, currentTarget: this, preventDefault() { }, stopPropagation() { }, key: '' }, ev || {}); let n = this; while (n) { e.currentTarget = n; (n.listeners[t] || []).slice().forEach(f => f(e)); if (t !== 'click') break; n = n.parentNode; } }
  click() { if (!this.disabled) this.fire('click'); }
  focus() { } blur() { } scrollTo() { } getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100 }; }
  matches(sel) { return sel.split(',').some(s => { s = s.trim(); const m = s.match(/^([a-zA-Z0-9]*)((?:\.[\w-]+)*)(#[\w-]+)?$/); if (!m) return false; if (m[1] && m[1].toLowerCase() !== this.localName.toLowerCase()) return false; const cl = (m[2] || '').split('.').filter(Boolean); if (!cl.every(c => this.classList.contains(c))) return false; if (m[3] && this.attrs.id !== m[3].slice(1)) return false; return true; }); }
  querySelectorAll(sel) { const out = []; const walk = n => n.childNodes.forEach(c => { if (c.nodeType === 1) { if (c.matches(sel)) out.push(c); walk(c); } }); walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
export class Text extends Node { constructor(t) { super('#text'); this._text = String(t); this.nodeType = 3; } get textContent() { return this._text; } set textContent(v) { this._text = String(v); } }

export function install() {
  const g = globalThis;
  const body = new Node('body'), app = new Node('div'); app.attrs.id = 'app'; body.append(app);
  const store = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
  g.localStorage = store(); g.sessionStorage = store();
  const hashListeners = []; let hash = '';
  g.location = { get hash() { return hash; }, set hash(v) { hash = v.startsWith('#') ? v : '#' + v; hashListeners.slice().forEach(f => f()); }, search: '', protocol: 'file:' };
  g.window = g; g.history = { length: 1 };
  g.addEventListener = (t, fn) => { if (t === 'hashchange') hashListeners.push(fn); };
  g.scrollTo = () => { };
  g.document = { body, createElement: t => new Node(t), createElementNS: (ns, t) => new Node(t), createTextNode: t => new Text(t), querySelector: s => s === '#app' ? app : body.querySelector(s), querySelectorAll: s => body.querySelectorAll(s) };
  g.confirm = () => true;
  g.URLSearchParams = URLSearchParams;
  Object.defineProperty(g, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, configurable: true });
  return { body, app };
}
export const textOf = n => n.textContent;
export const all = (root, sel) => root.querySelectorAll(sel);
export const byText = (root, sel, re) => all(root, sel).filter(n => re.test(n.textContent));
