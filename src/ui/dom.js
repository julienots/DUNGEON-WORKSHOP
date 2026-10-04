/**
 * Mini-helper DOM : h('div.card', { onclick }, enfants...)
 * Les classes peuvent être données dans le sélecteur ("div.card.big").
 */
export function h(sel, attrs = {}, ...children) {
  if (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    children.unshift(attrs);
    attrs = {};
  }
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

/** Remplace le contenu d'un conteneur en conservant la position de défilement. */
export function rerender(container, buildFn) {
  const scroller = container.closest('.scroll') || container;
  const top = scroller.scrollTop;
  clear(container);
  append(container, [buildFn()]);
  scroller.scrollTop = top;
}

export function vibrate(ms = 12) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* non supporté */
  }
}
