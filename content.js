/**
 * Advanced QR Pro — content script
 * Floating control, region selection, crop + jsQR decode, result dialog.
 */
(function () {
  // Avoid double-inject on soft reloads / re-injection.
  if (window.__advancedQrProLoaded) return;
  window.__advancedQrProLoaded = true;

  const DRAG_THRESHOLD = 5;
  const MIN_SELECT = 5;

  // 1. Shadow DOM host
  const host = document.createElement('div');
  host.id = 'advanced-qr-root';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    #ball {
      position: fixed; width: 48px; height: 48px; background: #222; color: #00d1ff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: move; z-index: 2147483647; font-weight: 900;
      box-shadow: 0 0 15px rgba(0,209,255,0.4);
      user-select: none; border: 2px solid #00d1ff;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px !important;
      line-height: 1 !important;
      margin: 0 !important; padding: 0 !important;
    }

    .mask {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4); z-index: 2147483645; cursor: none;
    }
    .box {
      border: 1px solid #00d1ff; position: fixed;
      background: rgba(0,209,255,0.1); box-shadow: 0 0 10px #00d1ff;
      pointer-events: none;
    }
    .hint {
      position: fixed; left: 50%; top: 24px; transform: translateX(-50%);
      background: rgba(0,0,0,0.75); color: #ddd; font: 12px/1.4 system-ui, sans-serif;
      padding: 8px 14px; border-radius: 999px; z-index: 2147483647;
      pointer-events: none; letter-spacing: 0.02em;
      border: 1px solid #333;
    }

    .ch-v {
      position: fixed; width: 1px; height: 30px; background: white;
      mix-blend-mode: difference; pointer-events: none; z-index: 2147483647;
    }
    .ch-h {
      position: fixed; height: 1px; width: 30px; background: white;
      mix-blend-mode: difference; pointer-events: none; z-index: 2147483647;
    }
    .ch-dot {
      position: fixed; width: 4px; height: 4px; background: #00d1ff;
      border-radius: 50%; pointer-events: none; z-index: 2147483647;
    }

    .modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 12px;
      padding: 25px; z-index: 2147483647; width: 340px;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      box-sizing: border-box;
    }
    .modal-title {
      font-size: 11px; color: #888; letter-spacing: 0.06em;
    }
    .url-preview {
      font-size: 11px; color: #888; margin-top: 6px; word-break: break-all;
      line-height: 1.35; max-height: 3.2em; overflow: hidden;
    }
    .close-btn {
      position: absolute; top: 10px; right: 15px; cursor: pointer;
      color: #666; font-size: 22px; line-height: 1; user-select: none;
    }
    .close-btn:hover { color: #ff4d4d; }

    textarea {
      width: 100%; height: 100px; background: #000; color: #00ff00;
      border: 1px solid #333; margin: 15px 0; padding: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      border-radius: 4px; resize: none; box-sizing: border-box;
      font-size: 14px !important;
    }
    .btn-row { display: flex; gap: 10px; }
    button {
      flex: 1; padding: 12px; cursor: pointer; border: none; border-radius: 6px;
      font-weight: bold; font-size: 14px !important;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .prime { background: #007bff; color: white; }
    .prime:disabled { opacity: 0.5; cursor: not-allowed; }
    .copy { background: #333; color: #ccc; }

    .toast {
      position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
      background: rgba(20,20,20,0.92); color: #eee; border: 1px solid #444;
      padding: 10px 16px; border-radius: 8px; z-index: 2147483647;
      font: 13px/1.4 system-ui, -apple-system, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35); max-width: 80vw;
      pointer-events: none;
    }
  `;
  shadow.appendChild(style);

  // Per-site floating ball position (keyed by hostname)
  function siteKey() {
    try {
      return location.hostname || location.origin || 'default';
    } catch (_) {
      return 'default';
    }
  }

  function applyBallPos(pos) {
    if (pos && pos.x != null && pos.y != null) {
      ball.style.left = pos.x;
      ball.style.top = pos.y;
      ball.style.right = 'auto';
      ball.style.bottom = 'auto';
    } else {
      ball.style.left = '';
      ball.style.top = '';
      ball.style.right = '20px';
      ball.style.bottom = '100px';
    }
  }

  function loadBallPos() {
    const key = siteKey();
    chrome.storage.local.get(['posByHost', 'pos'], (res) => {
      const map = (res && res.posByHost) || {};
      // Prefer per-site; fall back to legacy global pos once for migration
      applyBallPos(map[key] || (res && res.pos) || null);
    });
  }

  function saveBallPos(x, y) {
    const key = siteKey();
    chrome.storage.local.get(['posByHost'], (res) => {
      const map = Object.assign({}, (res && res.posByHost) || {});
      map[key] = { x: x, y: y };
      chrome.storage.local.set({ posByHost: map });
    });
  }

  // 2. Floating ball
  const ball = document.createElement('div');
  ball.id = 'ball';
  ball.textContent = 'QR';
  loadBallPos();
  shadow.appendChild(ball);

  let scanning = false;
  let resultModal = null;
  let toastTimer = null;

  function showToast(msg, ms) {
    const existing = shadow.querySelector('.toast');
    if (existing) existing.remove();
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    shadow.appendChild(t);
    toastTimer = setTimeout(() => {
      if (t.parentNode) t.remove();
      toastTimer = null;
    }, ms || 2200);
  }

  // 3. Drag with click threshold
  ball.onmousedown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = ball.offsetLeft;
    const originTop = ball.offsetTop;
    let dragged = false;

    const move = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!dragged && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        dragged = true;
      }
      if (dragged) {
        ball.style.left = originLeft + dx + 'px';
        ball.style.top = originTop + dy + 'px';
        ball.style.right = 'auto';
        ball.style.bottom = 'auto';
      }
    };

    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (dragged) {
        saveBallPos(ball.style.left, ball.style.top);
      } else if (!scanning) {
        startScan();
      }
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  // 4. Selection + decode (core flow unchanged)
  function startScan() {
    if (scanning) return;
    scanning = true;

    const mask = document.createElement('div');
    mask.className = 'mask';
    const vL = document.createElement('div');
    vL.className = 'ch-v';
    const hL = document.createElement('div');
    hL.className = 'ch-h';
    const dot = document.createElement('div');
    dot.className = 'ch-dot';
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Drag to select QR · Esc cancel';

    shadow.appendChild(mask);
    shadow.appendChild(vL);
    shadow.appendChild(hL);
    shadow.appendChild(dot);
    shadow.appendChild(hint);

    let sx = 0;
    let sy = 0;
    let box = null;
    let active = false;
    let finished = false;

    function cleanupScanUi() {
      [mask, vL, hL, dot, hint].forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      document.removeEventListener('keydown', onKey, true);
      scanning = false;
    }

    function cancelScan() {
      if (finished) return;
      finished = true;
      cleanupScanUi();
      showToast('Scan cancelled');
    }

    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        cancelScan();
      }
    }
    document.addEventListener('keydown', onKey, true);

    mask.onmousemove = (e) => {
      vL.style.left = e.clientX + 'px';
      vL.style.top = e.clientY - 15 + 'px';
      hL.style.left = e.clientX - 15 + 'px';
      hL.style.top = e.clientY + 'px';
      dot.style.left = e.clientX - 2 + 'px';
      dot.style.top = e.clientY - 2 + 'px';

      if (active && box) {
        box.style.left = Math.min(sx, e.clientX) + 'px';
        box.style.top = Math.min(sy, e.clientY) + 'px';
        box.style.width = Math.abs(e.clientX - sx) + 'px';
        box.style.height = Math.abs(e.clientY - sy) + 'px';
      }
    };

    mask.onmousedown = (e) => {
      if (e.button !== 0) return;
      active = true;
      sx = e.clientX;
      sy = e.clientY;
      box = document.createElement('div');
      box.className = 'box';
      mask.appendChild(box);
    };

    mask.onmouseup = () => {
      if (finished) return;
      active = false;
      const rect = box ? box.getBoundingClientRect() : null;
      finished = true;
      cleanupScanUi();

      if (!rect || rect.width <= MIN_SELECT || rect.height <= MIN_SELECT) {
        showToast('Selection too small');
        return;
      }

      chrome.runtime.sendMessage({ action: 'getScreenshot' }, (res) => {
        if (chrome.runtime.lastError) {
          showToast('Screenshot failed: ' + chrome.runtime.lastError.message);
          return;
        }
        if (!res || res.error || !res.dataUrl) {
          showToast((res && res.error) || 'Screenshot failed');
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            decodeRegion(img, rect);
          } catch (err) {
            showToast('Decode error: ' + (err && err.message ? err.message : String(err)));
          }
        };
        img.onerror = () => showToast('Failed to load screenshot');
        img.src = res.dataUrl;
      });
    };

    // Right-click cancels selection mode
    mask.oncontextmenu = (e) => {
      e.preventDefault();
      cancelScan();
    };
  }

  function decodeRegion(img, rect) {
    // Scale from CSS viewport coords to capture pixels (handles zoom / DPR better than raw devicePixelRatio).
    const scaleX = img.naturalWidth / Math.max(window.innerWidth, 1);
    const scaleY = img.naturalHeight / Math.max(window.innerHeight, 1);

    const sx = Math.max(0, Math.round(rect.left * scaleX));
    const sy = Math.max(0, Math.round(rect.top * scaleY));
    const sw = Math.max(1, Math.round(rect.width * scaleX));
    const sh = Math.max(1, Math.round(rect.height * scaleY));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    if (typeof jsQR !== 'function') {
      showToast('jsQR not loaded');
      return;
    }

    const imageData = ctx.getImageData(0, 0, sw, sh);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      showFinal(code.data);
    } else {
      showToast('No QR code found — try a larger selection');
    }
  }

  function resolveOpenTarget(txt) {
    const raw = String(txt || '').trim();
    if (!raw) return null;

    // Accept http(s) with optional scheme case; also bare domains starting with www.
    let candidate = raw;
    if (/^https?:\/\//i.test(candidate)) {
      // ok
    } else if (/^www\./i.test(candidate)) {
      candidate = 'https://' + candidate;
    } else {
      return {
        kind: 'search',
        href: 'https://www.google.com/search?q=' + encodeURIComponent(raw),
        label: raw,
      };
    }

    try {
      const u = new URL(candidate);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return { kind: 'url', href: u.href, label: u.href };
    } catch (_) {
      return {
        kind: 'search',
        href: 'https://www.google.com/search?q=' + encodeURIComponent(raw),
        label: raw,
      };
    }
  }

  // 5. Result modal — safe DOM (no innerHTML of QR payload)
  function showFinal(txt) {
    if (resultModal && resultModal.parentNode) {
      resultModal.parentNode.removeChild(resultModal);
      resultModal = null;
    }

    const m = document.createElement('div');
    m.className = 'modal';

    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('role', 'button');
    closeBtn.title = 'Close';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'DECODED DATA';

    const ta = document.createElement('textarea');
    ta.id = 'res-t';
    ta.readOnly = true;
    ta.value = txt; // XSS-safe

    const openTarget = resolveOpenTarget(txt);
    if (openTarget && openTarget.kind === 'url') {
      const preview = document.createElement('div');
      preview.className = 'url-preview';
      preview.textContent = 'Open: ' + openTarget.href;
      m.appendChild(closeBtn);
      m.appendChild(title);
      m.appendChild(preview);
      m.appendChild(ta);
    } else {
      m.appendChild(closeBtn);
      m.appendChild(title);
      m.appendChild(ta);
    }

    const row = document.createElement('div');
    row.className = 'btn-row';

    const btnCopy = document.createElement('button');
    btnCopy.className = 'copy';
    btnCopy.type = 'button';
    btnCopy.textContent = 'COPY';

    const btnOpen = document.createElement('button');
    btnOpen.className = 'prime';
    btnOpen.type = 'button';
    btnOpen.textContent = openTarget && openTarget.kind === 'url' ? 'OPEN' : 'SEARCH';

    row.appendChild(btnCopy);
    row.appendChild(btnOpen);
    m.appendChild(row);
    shadow.appendChild(m);
    resultModal = m;

    const closeModal = () => {
      if (m.parentNode) m.parentNode.removeChild(m);
      if (resultModal === m) resultModal = null;
      document.removeEventListener('keydown', onModalKey, true);
    };

    const onModalKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeModal();
      }
    };
    document.addEventListener('keydown', onModalKey, true);

    closeBtn.onclick = closeModal;

    btnCopy.onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(txt);
        } else {
          ta.focus();
          ta.select();
          document.execCommand('copy');
        }
        btnCopy.textContent = 'COPIED!';
        setTimeout(() => {
          btnCopy.textContent = 'COPY';
        }, 1000);
      } catch (_) {
        try {
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          btnCopy.textContent = ok ? 'COPIED!' : 'FAILED';
        } catch (e2) {
          btnCopy.textContent = 'FAILED';
        }
        setTimeout(() => {
          btnCopy.textContent = 'COPY';
        }, 1200);
      }
    };

    btnOpen.onclick = () => {
      if (!openTarget) {
        showToast('Cannot open this content');
        return;
      }
      window.open(openTarget.href, '_blank', 'noopener,noreferrer');
    };
  }
})();
