// ==UserScript==
// @name         Image Picker: Hover Highlight + Open In New Background Tab
// @namespace    geltz.tools
// @version      1.2
// @description  Toggle a mode that highlights images on hover; click opens direct image URL in a background tab.
// @author       geltz
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// ==/UserScript==

(function () {
  'use strict';

  let enabled = GM_getValue('imgPickerEnabled', false);
  let menuId = null;
  let lastHoverEl = null;

  GM_addStyle(`
    .__imgpicker-highlight {
      outline: 3px solid rgba(0, 180, 255, 0.95) !important;
      box-shadow: 0 0 0 4px rgba(0, 180, 255, 0.25), 0 6px 18px rgba(0,0,0,0.25) !important;
      border-radius: 6px !important;
      transition: outline-color 80ms ease-out, box-shadow 80ms ease-out !important;
    }
    .__imgpicker-hud {
      position: fixed; z-index: 2147483647;
      right: 12px; bottom: 12px;
      padding: 6px 10px; border-radius: 999px;
      font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: rgba(0, 180, 255, 0.1); color: #00b4ff;
      border: 1px solid rgba(0, 180, 255, 0.35);
      backdrop-filter: blur(4px);
      user-select: none; pointer-events: none;
    }
  `);

  const hud = document.createElement('div');
  hud.className = '__imgpicker-hud';
  hud.textContent = 'IMG ON (Alt+I)';
  hud.style.display = enabled ? 'block' : 'none';
  document.documentElement.appendChild(hud);

  const isImgElement = (el) => el && el.tagName === 'IMG';

  const findClickableImageEl = (el) => {
    if (!el) return null;
    if (isImgElement(el)) return el;
    const img = el.closest('picture, figure, div, a, span')?.querySelector('img');
    if (img) return img;
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.startsWith('url(')) return el;
    return null;
  };

  const getDirectImageUrl = (el) => {
    if (isImgElement(el)) {
      return el.currentSrc || el.src || el.getAttribute('data-src') || el.getAttribute('data-original') || '';
    }
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.startsWith('url(')) {
      const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
      if (m && m[2]) return m[2];
    }
    return '';
  };

  const highlight = (el) => {
    if (lastHoverEl && lastHoverEl !== el) lastHoverEl.classList.remove('__imgpicker-highlight');
    if (el) {
      (isImgElement(el) ? el : el).classList.add('__imgpicker-highlight');
      lastHoverEl = el;
    }
  };

  const clearHighlight = () => {
    if (lastHoverEl) lastHoverEl.classList.remove('__imgpicker-highlight');
    lastHoverEl = null;
  };

  const setEnabled = (val) => {
    enabled = !!val;
    GM_setValue('imgPickerEnabled', enabled);
    hud.style.display = enabled ? 'block' : 'none';
    if (!enabled) clearHighlight();
    updateMenu();
  };

  const onMouseOver = (e) => {
    if (!enabled) return;
    const imgEl = findClickableImageEl(e.target);
    if (imgEl) highlight(isImgElement(imgEl) ? imgEl : e.target);
  };

  const onMouseOut = (e) => {
    if (!enabled) return;
    const related = e.relatedTarget;
    if (!related || (lastHoverEl && !lastHoverEl.contains(related))) clearHighlight();
  };

  const onClick = (e) => {
    if (!enabled) return;
    const imgEl = findClickableImageEl(e.target);
    if (!imgEl) return;

    e.preventDefault();
    e.stopPropagation();

    let url = getDirectImageUrl(imgEl);
    if (!url && isImgElement(imgEl)) {
      url = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy') || '';
    }
    if (!url) return;

    if (isImgElement(imgEl) && imgEl.naturalWidth && imgEl.naturalHeight &&
        (imgEl.naturalWidth <= 2 || imgEl.naturalHeight <= 2)) {
      return; // skip tiny trackers
    }

    GM_openInTab(url, { active: false, insert: true, setParent: true });
  };

  const onKeydown = (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyI') {
      setEnabled(!enabled);
    }
  };

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKeydown, true);

  function updateMenu() {
    if (menuId) { try { GM_unregisterMenuCommand(menuId); } catch {} }
    menuId = GM_registerMenuCommand(
      (enabled ? '[X] Disable' : 'Enable') + ' Image Picker (Alt+I)',
      () => setEnabled(!enabled)
    );
  }
  updateMenu();

})();
