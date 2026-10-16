/**
 * SnapPDF - Content Script (v2.0.1)
 * Selector de recuadro interactivo multi-pantalla, auto-scroll universal,
 * segmentación inteligente de palabras y Emojis (Intl.Segmenter)
 * y motor de captura híbrido (Vector Skia + Fallback Ultra HD).
 */

(() => {
  if (window.__snapPdfLoaded) return;
  window.__snapPdfLoaded = true;

  // =========================================================================
  // 1. Utilidades de Desplazamiento y Viewport Universal (Desktop & Móvil)
  // =========================================================================
  function getScrollOffset() {
    return {
      x: window.scrollX || window.pageXOffset || (document.scrollingElement ? document.scrollingElement.scrollLeft : 0) || (document.documentElement ? document.documentElement.scrollLeft : 0) || 0,
      y: window.scrollY || window.pageYOffset || (document.scrollingElement ? document.scrollingElement.scrollTop : 0) || (document.documentElement ? document.documentElement.scrollTop : 0) || 0
    };
  }

  function getDocumentDimensions() {
    const doc = document.documentElement;
    const body = document.body;
    return {
      width: Math.max(
        doc ? doc.scrollWidth : 0,
        body ? body.scrollWidth : 0,
        doc ? doc.clientWidth : 0,
        window.innerWidth || 0
      ),
      height: Math.max(
        doc ? doc.scrollHeight : 0,
        body ? body.scrollHeight : 0,
        doc ? doc.clientHeight : 0,
        window.innerHeight || 0
      ),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }

  function getMainScrollTarget() {
    const docHeight = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
    if (docHeight > window.innerHeight + 100) {
      return { isWindow: true, el: window, scrollHeight: docHeight };
    }

    let bestEl = null;
    let bestHeight = 0;
    const candidates = document.querySelectorAll('main, [role="main"], article, infinite-scroller, div, section');
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100) {
        if (el.scrollHeight > bestHeight) {
          bestHeight = el.scrollHeight;
          bestEl = el;
        }
      }
    }

    if (bestEl) {
      return { isWindow: false, el: bestEl, scrollHeight: bestHeight };
    }

    return { isWindow: true, el: window, scrollHeight: docHeight };
  }

  function scrollToCoords(x, y, targetEl = null) {
    if (targetEl && targetEl !== window && targetEl !== document.documentElement && targetEl !== document.body && targetEl !== document.scrollingElement) {
      targetEl.scrollLeft = x;
      targetEl.scrollTop = y;
      return;
    }
    try {
      window.scrollTo({ left: x, top: y, behavior: 'instant' });
    } catch (e) {
      window.scrollTo(x, y);
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollLeft = x;
      document.scrollingElement.scrollTop = y;
    }
  }

  // =========================================================================
  // 2. Cosechador Semántico con Soporte Completo de Emojis y Unicode
  // =========================================================================
  class DomHarvester {
    static isNodeVisible(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
      if (el.closest('.cdk-visually-hidden, .visually-hidden, .sr-only, .screen-reader-text, .a11y-hidden, .u-vh, .katex-mathml, .MJX_Assistive_MathML, [hidden]')) {
        return false;
      }

      const rects = el.getClientRects();
      if (!rects || rects.length === 0) return false;
      const elRect = el.getBoundingClientRect();
      if (elRect.width < 2 || elRect.height < 2) return false;

      let curr = el;
      while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.documentElement) {
        const st = window.getComputedStyle(curr);
        if (st.display === 'none' || st.visibility === 'hidden' || st.visibility === 'collapse') return false;
        if (parseFloat(st.opacity || '1') <= 0.02) return false;
        if (parseFloat(st.fontSize) <= 1) return false;
        if (parseFloat(st.textIndent) < -500) return false;

        if (st.clip && st.clip !== 'auto') {
          if (/rect\(\s*[01](px)?[\s,]+[01](px)?[\s,]+[01](px)?[\s,]+[01](px)?\s*\)/i.test(st.clip)) {
            return false;
          }
        }
        if (st.clipPath && st.clipPath !== 'none') {
          if (/inset\(\s*(50|100)%|circle\(\s*0|polygon\(\s*0\s+0\s*,\s*0\s+0/i.test(st.clipPath)) {
            return false;
          }
        }

        const isClippedOverflow = (
          st.overflow === 'hidden' || st.overflow === 'clip' ||
          st.overflowX === 'hidden' || st.overflowX === 'clip' ||
          st.overflowY === 'hidden' || st.overflowY === 'clip'
        );
        if (isClippedOverflow || st.position === 'absolute' || st.position === 'fixed') {
          const cRect = curr.getBoundingClientRect();
          if (isClippedOverflow && (cRect.width <= 4 || cRect.height <= 4)) {
            return false;
          }
          if (isClippedOverflow && cRect.width > 0 && cRect.height > 0) {
            if (
              elRect.right <= cRect.left + 2 ||
              elRect.left >= cRect.right - 2 ||
              elRect.bottom <= cRect.top + 2 ||
              elRect.top >= cRect.bottom - 2
            ) {
              return false;
            }
          }
        }
        curr = curr.parentElement;
      }
      return true;
    }

    static isIconElement(el, compStyle, rawText) {
      if (!el) return false;
      if (el.closest('svg, mat-icon, [data-icon], .material-icons, .material-symbols-outlined, .material-symbols-rounded, .material-symbols-sharp, .google-symbols, .fa, .fas, .far, .fab, .bi, .codicon, [role="img"]')) {
        return true;
      }
      const fontFamily = (compStyle && compStyle.fontFamily ? compStyle.fontFamily : '').toLowerCase();
      if (/icon|symbol|material|fontawesome|glyph|feather|lucide|remix|codicon|icomoon|octicon/.test(fontFamily)) {
        return true;
      }
      const trimmed = (rawText || '').trim();
      if ((el.tagName === 'I' || el.tagName === 'SPAN') && el.getAttribute('aria-hidden') === 'true' && trimmed.length <= 28 && !/\s/.test(trimmed)) {
        return true;
      }
      return false;
    }

    static findEffectiveBgColor(el) {
      let curr = el;
      while (curr && curr !== document.documentElement) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) {
          return bg;
        }
        curr = curr.parentElement;
      }
      return null;
    }

    static shouldPreserveVisual(el, compStyle) {
      if (!el) return false;
      if (el.closest('code, pre, kbd, samp, button, mark, .badge, .pill, .chip')) {
        return true;
      }
      let checkEl = el;
      for (let depth = 0; depth < 2 && checkEl && checkEl !== document.body; depth++) {
        const r = checkEl.getBoundingClientRect();
        if (r.width > 0 && r.width <= 68 && r.height > 0 && r.height <= 48) {
          const st = depth === 0 && compStyle ? compStyle : window.getComputedStyle(checkEl);
          const hasBorder = (parseFloat(st.borderTopWidth) > 0 || parseFloat(st.borderLeftWidth) > 0) && st.borderTopStyle !== 'none';
          const radius = parseFloat(st.borderTopLeftRadius) || 0;
          const bg = st.backgroundColor;
          const hasBg = bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)');
          if (hasBorder || (radius >= 4 && hasBg)) {
            return true;
          }
        }
        checkEl = checkEl.parentElement;
      }
      return false;
    }

    static harvest(bounds = null, customScroll = null) {
      const scroll = customScroll || getScrollOffset();
      const words = [];
      const links = [];

      const textIterator = document.createNodeIterator(
        document.body || document.documentElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toUpperCase();
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'IFRAME') {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest('#__snappdf_overlay')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!node.textContent || node.textContent.trim().length === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let textNode;
      const range = document.createRange();

      while ((textNode = textIterator.nextNode())) {
        const parent = textNode.parentElement;
        if (!this.isNodeVisible(parent)) continue;

        const text = textNode.textContent;
        if (!text) continue;

        const compStyle = window.getComputedStyle(parent);
        if (this.isIconElement(parent, compStyle, text)) continue;

        const color = compStyle ? compStyle.color : 'rgb(0,0,0)';
        const rawFontFamily = compStyle && compStyle.fontFamily ? compStyle.fontFamily : 'sans-serif';
        const fontStyle = compStyle ? compStyle.fontStyle : 'normal';
        const bgColor = this.findEffectiveBgColor(parent);
        const preserveVisual = this.shouldPreserveVisual(parent, compStyle);

        // Calcular peso tipográfico real (CSS font-weight + variable fonts + nombres de familia + etiquetas semánticas de título/negrita)
        let weightNum = parseInt(compStyle ? compStyle.fontWeight : '400', 10);
        if (isNaN(weightNum)) {
          const fwStr = (compStyle && compStyle.fontWeight ? compStyle.fontWeight : '').toLowerCase();
          weightNum = (fwStr === 'bold' || fwStr === 'bolder') ? 700 : 400;
        }
        const varSettings = compStyle ? compStyle.fontVariationSettings : '';
        if (varSettings && varSettings !== 'normal') {
          const mWght = varSettings.match(/["']wght["']\s+([\d.]+)/i);
          if (mWght) {
            weightNum = Math.max(weightNum, Math.round(parseFloat(mWght[1])));
          }
        }
        const ffLower = rawFontFamily.toLowerCase();
        if (/extrabold|ultrabold|black|heavy/.test(ffLower)) {
          weightNum = Math.max(weightNum, 800);
        } else if (/\bbold\b/.test(ffLower)) {
          weightNum = Math.max(weightNum, 700);
        } else if (/semibold|demibold|demi|medium/.test(ffLower)) {
          weightNum = Math.max(weightNum, 600);
        }

        const headingEl = parent.closest('h1, h2, h3, h4, h5, h6, [role="heading"]');
        const strongEl = parent.closest('strong, b, th, dt, legend, summary');
        const isHeading = !!headingEl;
        if (headingEl || strongEl) {
          weightNum = Math.max(weightNum, 700);
        }
        const fontWeight = String(weightNum);

        // Segmentación por espacios en blanco para preservar URLs, puntuación y palabras completas
        const len = text.length;
        let wordStart = -1;

        for (let i = 0; i <= len; i++) {
          const char = i < len ? text[i] : ' ';
          const isWhitespace = /\s/.test(char);

          if (!isWhitespace && wordStart === -1) {
            wordStart = i;
          } else if (isWhitespace && wordStart !== -1) {
            const word = text.slice(wordStart, i);
            try {
              range.setStart(textNode, wordStart);
              range.setEnd(textNode, i);
              const rects = range.getClientRects();

              for (let r = 0; r < rects.length; r++) {
                const rect = rects[r];
                if (rect.width < 1 || rect.height < 1) continue;

                const pageX = rect.left + scroll.x;
                const pageY = rect.top + scroll.y;
                const pageRight = pageX + rect.width;
                const pageBottom = pageY + rect.height;

                if (bounds) {
                  if (
                    pageRight < bounds.left ||
                    pageX > bounds.right ||
                    pageBottom < bounds.top ||
                    pageY > bounds.bottom
                  ) {
                    continue;
                  }
                }

                // Permitir que signos tipográficos comunes (comillas curvas, guiones largos, viñetas •, …, €, ™) se vectoricen
                const hasUnicode = /[^\x20-\x7E\xA0-\xFF\u0152\u0153\u2013\u2014\u2018-\u201E\u2022\u2026\u2039\u203A\u20AC\u2122\u2212]/.test(word);
                const rawFontSize = compStyle ? parseFloat(compStyle.fontSize) || (rect.height * 0.8) : (rect.height * 0.8);
                const fontSize = +(rawFontSize.toFixed(2));

                words.push({
                  text: word,
                  x: Math.round(pageX),
                  y: Math.round(pageY),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  fontSize,
                  fontFamily: rawFontFamily,
                  color,
                  bgColor,
                  fontWeight,
                  fontStyle,
                  isHeading: isHeading || (weightNum >= 500 && fontSize >= 15.5),
                  hasUnicode,
                  preserveVisual: preserveVisual || hasUnicode
                });
              }
            } catch (e) {}
            wordStart = -1;
          }
        }
      }

      // Enlaces activos
      const anchorElements = document.querySelectorAll('a[href]');
      anchorElements.forEach(a => {
        if (!this.isNodeVisible(a)) return;
        if (a.closest('#__snappdf_overlay')) return;

        const href = a.href;
        if (!href || href.startsWith('javascript:')) return;

        const rects = a.getClientRects();
        for (let r = 0; r < rects.length; r++) {
          const rect = rects[r];
          if (rect.width < 2 || rect.height < 2) continue;

          const pageX = rect.left + scroll.x;
          const pageY = rect.top + scroll.y;
          const pageRight = pageX + rect.width;
          const pageBottom = pageY + rect.height;

          if (bounds) {
            if (
              pageRight < bounds.left ||
              pageX > bounds.right ||
              pageBottom < bounds.top ||
              pageY > bounds.bottom
            ) {
              continue;
            }
          }

          links.push({
            url: href,
            x: Math.round(pageX),
            y: Math.round(pageY),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });

      // Imágenes locales dentro del área (avatares, fotos del post, badges)
      const rawImages = [];
      const imgElements = document.querySelectorAll('img, image, [role="img"]');
      imgElements.forEach(img => {
        if (!this.isNodeVisible(img)) return;
        if (img.closest('#__snappdf_overlay') || img.closest('#__snappdf_toast')) return;

        const rects = img.getClientRects();
        if (!rects || rects.length === 0) return;
        const r = rects[0];
        if (r.width < 10 || r.height < 10) return;

        const pageX = r.left + scroll.x;
        const pageY = r.top + scroll.y;
        const pageRight = pageX + r.width;
        const pageBottom = pageY + r.height;

        if (bounds) {
          if (
            pageRight < bounds.left ||
            pageX > bounds.right ||
            pageBottom < bounds.top ||
            pageY > bounds.bottom
          ) {
            return;
          }
        }

        rawImages.push({
          x: Math.round(pageX),
          y: Math.round(pageY),
          width: Math.round(r.width),
          height: Math.round(r.height)
        });
      });

      // Deduplicar imágenes con posiciones y dimensiones coincidentes
      const images = [];
      for (const item of rawImages) {
        const isDuplicate = images.some(existing =>
          Math.abs(existing.x - item.x) < 8 &&
          Math.abs(existing.y - item.y) < 8 &&
          Math.abs(existing.width - item.width) < 12 &&
          Math.abs(existing.height - item.height) < 12
        );
        if (!isDuplicate) {
          images.push(item);
        }
      }

      // Detección del color de fondo real del contenedor o body (soporte nativo modo oscuro / claro)
      let backgroundColor = null;
      if (bounds) {
        const clientCenterX = Math.round((bounds.left + bounds.right) / 2) - scroll.x;
        const clientCenterY = Math.round((bounds.top + bounds.bottom) / 2) - scroll.y;
        let el = document.elementFromPoint(
          Math.max(10, Math.min(window.innerWidth - 10, clientCenterX)),
          Math.max(10, Math.min(window.innerHeight - 10, clientCenterY))
        );
        while (el && el !== document.documentElement) {
          const bg = window.getComputedStyle(el).backgroundColor;
          if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) {
            backgroundColor = bg;
            break;
          }
          el = el.parentElement;
        }
      }
      if (!backgroundColor) {
        const bodyBg = window.getComputedStyle(document.body || document.documentElement).backgroundColor;
        if (bodyBg && bodyBg !== 'transparent' && !bodyBg.startsWith('rgba(0, 0, 0, 0)')) {
          backgroundColor = bodyBg;
        }
      }

      return { words, links, images, backgroundColor };
    }

    static collectWebFonts() {
      const rules = [];
      const crossOriginSheets = new Set();
      const seenRuleKeys = new Set();

      const processRuleList = (cssRules, baseHref) => {
        if (!cssRules) return;
        for (let i = 0; i < cssRules.length; i++) {
          const rule = cssRules[i];
          if (rule.type === CSSRule.FONT_FACE_RULE || (rule.cssText && /^@font-face/i.test(rule.cssText.trim()))) {
            const st = rule.style;
            if (!st) continue;
            const rawFam = (st.getPropertyValue('font-family') || '').replace(/["']/g, '').trim().toLowerCase();
            if (!rawFam) continue;

            const unicodeRange = (st.getPropertyValue('unicode-range') || '').trim();
            if (unicodeRange && !/U\+0*00-0*FF|U\+0*20-0*7[EF]|U\+0*00-0*7F/i.test(unicodeRange)) {
              continue;
            }

            const weight = (st.getPropertyValue('font-weight') || '400').trim().toLowerCase();
            const style = (st.getPropertyValue('font-style') || 'normal').trim().toLowerCase();
            const src = st.getPropertyValue('src') || '';
            if (!src) continue;

            const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
            let match;
            let bestUrl = null;
            while ((match = urlRegex.exec(src)) !== null) {
              const candidate = match[2].trim();
              if (!candidate || candidate.startsWith('local(')) continue;
              try {
                const absUrl = new URL(candidate, baseHref || document.baseURI).href;
                if (/\.(ttf|otf|woff)(\?|$|#)/i.test(absUrl)) {
                  bestUrl = absUrl;
                  break;
                }
                if (!bestUrl) {
                  bestUrl = absUrl;
                }
              } catch (e) {}
            }

            if (bestUrl) {
              const dedupKey = `${rawFam}|${weight}|${style}|${bestUrl}`;
              if (!seenRuleKeys.has(dedupKey)) {
                seenRuleKeys.add(dedupKey);
                rules.push({ family: rawFam, weight, style, url: bestUrl });
              }
            }
          } else if (rule.cssRules) {
            try {
              processRuleList(rule.cssRules, baseHref);
            } catch (e) {}
          }
        }
      };

      try {
        const sheets = Array.from(document.styleSheets || []);
        for (const sheet of sheets) {
          const href = sheet.href || document.baseURI;
          try {
            processRuleList(sheet.cssRules, href);
          } catch (corsErr) {
            if (sheet.href && /^https?:\/\//i.test(sheet.href)) {
              crossOriginSheets.add(sheet.href);
            }
          }
        }
      } catch (e) {}

      return {
        rules,
        crossOriginSheets: Array.from(crossOriginSheets).slice(0, 25)
      };
    }
  }

  // =========================================================================
  // 3. Selector de Recuadro Interactivo con Soporte Táctil y Auto-Scroll
  // =========================================================================
  class SelectionEngine {
    constructor() {
      this.overlay = null;
      this.box = null;
      this.badge = null;
      this.banner = null;
      this.startDocX = 0;
      this.startDocY = 0;
      this.lastClientX = 0;
      this.lastClientY = 0;
      this.isDragging = false;
      this.activePointerId = null;
      this.autoScrollTimer = null;
      this.currentDocRect = null;
      this.activeScrollContainer = null;

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onWheel = this.onWheel.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    start() {
      if (this.isDragging) return;
      this.cleanup();

      this.overlay = document.createElement('div');
      this.overlay.id = '__snappdf_overlay';
      this.overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        cursor: crosshair;
        background: rgba(15, 23, 42, 0.4);
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      `;

      this.box = document.createElement('div');
      this.box.style.cssText = `
        position: fixed;
        box-sizing: border-box;
        border: 2px solid #38bdf8;
        background: transparent;
        box-shadow: 0 0 0 99999px rgba(15, 23, 42, 0.5);
        display: none;
        pointer-events: none;
        z-index: 2147483647;
      `;

      this.badge = document.createElement('div');
      this.badge.style.cssText = `
        position: absolute;
        bottom: -32px;
        right: 0;
        background: #0f172a;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        border: 1px solid #334155;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      `;
      this.box.appendChild(this.badge);

      this.banner = document.createElement('div');
      this.banner.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: #0f172a;
        color: #f8fafc;
        padding: 8px 18px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #334155;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        pointer-events: none;
        white-space: nowrap;
        z-index: 2147483647;
      `;
      this.banner.textContent = 'Arrastra para seleccionar (auto-scroll al acercar al borde) • [Esc] para cancelar';
      this.overlay.appendChild(this.banner);

      this.overlay.appendChild(this.box);
      document.documentElement.appendChild(this.overlay);

      this.overlay.addEventListener('pointerdown', this.onPointerDown, { passive: false });
      window.addEventListener('pointermove', this.onPointerMove, { passive: false });
      window.addEventListener('pointerup', this.onPointerUp, { passive: false });
      window.addEventListener('pointercancel', this.onPointerUp, { passive: false });

      window.addEventListener('wheel', this.onWheel, { passive: false, capture: true });
      window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      window.addEventListener('keydown', this.onKeyDown, true);
    }

    findActiveScrollContainer(clientX, clientY) {
      let el = null;
      if (this.overlay) {
        this.overlay.style.pointerEvents = 'none';
        el = document.elementFromPoint(clientX, clientY);
        this.overlay.style.pointerEvents = 'auto';
      }
      while (el && el !== document.documentElement && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
          return el;
        }
        el = el.parentElement;
      }

      const candidates = document.querySelectorAll('main, [role="main"], article, infinite-scroller');
      for (const c of candidates) {
        const style = window.getComputedStyle(c);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && c.scrollHeight > c.clientHeight + 20) {
          return c;
        }
      }

      return null;
    }

    getEffectiveScroll() {
      const scroller = this.activeScrollContainer;
      if (scroller && scroller !== window && scroller !== document.documentElement && scroller !== document.body && scroller !== document.scrollingElement) {
        return {
          x: scroller.scrollLeft || 0,
          y: scroller.scrollTop || 0
        };
      }
      return getScrollOffset();
    }

    onPointerDown(e) {
      if (e.button && e.button !== 0) return;
      this.isDragging = true;
      this.activePointerId = e.pointerId;

      try {
        this.overlay.setPointerCapture(e.pointerId);
      } catch (err) {}

      // Al arrastrar, el overlay se vuelve transparente para que lo que esté dentro
      // del recuadro se vea 100% natural, sin ningún tinte azul ni oscurecimiento
      this.overlay.style.background = 'transparent';
      if (this.banner) {
        this.banner.style.display = 'none';
      }

      this.activeScrollContainer = this.findActiveScrollContainer(e.clientX, e.clientY);
      const scroll = this.getEffectiveScroll();
      this.lastClientX = e.clientX;
      this.lastClientY = e.clientY;

      this.startDocX = e.clientX + scroll.x;
      this.startDocY = e.clientY + scroll.y;

      this.box.style.display = 'block';
      this.updateSelection(e.clientX, e.clientY);
      this.startAutoScroll();

      e.preventDefault();
      e.stopPropagation();
    }

    onPointerMove(e) {
      if (!this.isDragging) return;
      this.lastClientX = e.clientX;
      this.lastClientY = e.clientY;

      this.updateSelection(e.clientX, e.clientY);

      e.preventDefault();
      e.stopPropagation();
    }

    onScroll() {
      if (!this.isDragging) return;
      this.updateSelection(this.lastClientX, this.lastClientY);
    }

    onWheel(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const scroller = this.activeScrollContainer || this.findActiveScrollContainer(this.lastClientX, this.lastClientY);
      const isInner = scroller && scroller !== window && scroller !== document.documentElement && scroller !== document.body && scroller !== document.scrollingElement;

      if (isInner) {
        scroller.scrollTop += e.deltaY;
        scroller.scrollLeft += e.deltaX;
      } else {
        window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: 'instant' });
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += e.deltaY;
          document.scrollingElement.scrollLeft += e.deltaX;
        }
      }

      this.updateSelection(this.lastClientX, this.lastClientY);
    }

    updateSelection(clientX, clientY) {
      const scroll = this.getEffectiveScroll();
      const currentDocX = clientX + scroll.x;
      const currentDocY = clientY + scroll.y;

      const left = Math.min(this.startDocX, currentDocX);
      const top = Math.min(this.startDocY, currentDocY);
      const width = Math.max(1, Math.abs(currentDocX - this.startDocX));
      const height = Math.max(1, Math.abs(currentDocY - this.startDocY));

      this.currentDocRect = {
        x: Math.round(left),
        y: Math.round(top),
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
        right: Math.round(left + width),
        bottom: Math.round(top + height),
        scroller: this.activeScrollContainer
      };

      const screenLeft = left - scroll.x;
      const screenTop = top - scroll.y;

      this.box.style.left = `${screenLeft}px`;
      this.box.style.top = `${screenTop}px`;
      this.box.style.width = `${width}px`;
      this.box.style.height = `${height}px`;

      this.badge.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    }

    startAutoScroll() {
      const scrollThreshold = 70;
      const scrollSpeed = 18;

      const step = () => {
        if (!this.isDragging) return;
        const vh = window.innerHeight;
        const scroller = this.activeScrollContainer || this.findActiveScrollContainer(this.lastClientX, this.lastClientY);
        const isInner = scroller && scroller !== window && scroller !== document.documentElement && scroller !== document.body && scroller !== document.scrollingElement;

        if (this.lastClientY > vh - scrollThreshold) {
          if (isInner) {
            scroller.scrollTop += scrollSpeed;
          } else {
            window.scrollBy({ top: scrollSpeed, left: 0, behavior: 'instant' });
            if (document.scrollingElement) document.scrollingElement.scrollTop += scrollSpeed;
          }
          this.updateSelection(this.lastClientX, this.lastClientY);
        } else if (this.lastClientY < scrollThreshold && this.lastClientY > 0) {
          if (isInner) {
            scroller.scrollTop -= scrollSpeed;
          } else {
            window.scrollBy({ top: -scrollSpeed, left: 0, behavior: 'instant' });
            if (document.scrollingElement) document.scrollingElement.scrollTop -= scrollSpeed;
          }
          this.updateSelection(this.lastClientX, this.lastClientY);
        }

        this.autoScrollTimer = requestAnimationFrame(step);
      };

      this.autoScrollTimer = requestAnimationFrame(step);
    }

    stopAutoScroll() {
      if (this.autoScrollTimer) {
        cancelAnimationFrame(this.autoScrollTimer);
        this.autoScrollTimer = null;
      }
    }

    async onPointerUp(e) {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.stopAutoScroll();

      if (this.activePointerId !== null) {
        try {
          this.overlay.releasePointerCapture(this.activePointerId);
        } catch (err) {}
        this.activePointerId = null;
      }

      e.preventDefault();
      e.stopPropagation();

      const docRect = this.currentDocRect;

      // Ocultar de inmediato la caja y el overlay antes de destruirlos
      if (this.box) this.box.style.display = 'none';
      if (this.overlay) {
        this.overlay.style.display = 'none';
        this.overlay.style.visibility = 'hidden';
      }
      this.cleanup();

      if (!docRect || docRect.width < 10 || docRect.height < 10) {
        return;
      }

      // Pausa obligatoria (doble requestAnimationFrame + 80ms) para garantizar
      // que el compositor GPU de Chromium pinte la pantalla 100% limpia sin el overlay
      // ni el borde azul de selección antes de invocar la captura.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 80));

      try {
        const payload = await FallbackEngine.captureSelectedArea(docRect);
        chrome.runtime.sendMessage({
          action: 'capture-completed',
          payload: {
            type: 'selection',
            ...payload
          }
        });
      } catch (err) {
        console.error('[SnapPDF] Error capturando recuadro:', err);
      }
    }

    onKeyDown(e) {
      if (e.key === 'Escape') {
        this.cleanup();
        e.preventDefault();
      }
    }

    cleanup() {
      this.isDragging = false;
      this.stopAutoScroll();

      if (this.overlay) {
        this.overlay.removeEventListener('pointerdown', this.onPointerDown);
        this.overlay.style.display = 'none';
        this.overlay.style.visibility = 'hidden';
      }
      if (this.box) {
        this.box.style.display = 'none';
      }
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);

      window.removeEventListener('wheel', this.onWheel, { capture: true });
      window.removeEventListener('scroll', this.onScroll, { capture: true });
      window.removeEventListener('keydown', this.onKeyDown, true);

      // Eliminar cualquier elemento overlay residual del DOM
      const existingOverlays = document.querySelectorAll('#__snappdf_overlay');
      existingOverlays.forEach(el => el.remove());

      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.box = null;
      this.badge = null;
      this.banner = null;
      this.currentDocRect = null;
      this.activeScrollContainer = null;
    }
  }

  class FallbackEngine {
    static async requestCaptureSlice() {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await new Promise(resolve => {
          try {
            chrome.runtime.sendMessage({ action: 'capture-slice' }, resp => {
              if (chrome.runtime.lastError) {
                resolve({ error: chrome.runtime.lastError.message, dataUrl: null });
              } else {
                resolve(resp);
              }
            });
          } catch (e) {
            resolve({ error: e.message, dataUrl: null });
          }
        });

        if (res && res.dataUrl) {
          return res;
        }
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 560));
        } else {
          return res;
        }
      }
      return null;
    }

    static mergeHarvested(target, sliceHarvest) {
      if (sliceHarvest.backgroundColor && !target.backgroundColor) {
        target.backgroundColor = sliceHarvest.backgroundColor;
      }
      for (const w of sliceHarvest.words) {
        const isDup = target.words.some(ew =>
          ew.text === w.text && Math.abs(ew.x - w.x) <= 4 && Math.abs(ew.y - w.y) <= 6
        );
        if (!isDup) target.words.push(w);
      }
      for (const l of sliceHarvest.links) {
        const isDup = target.links.some(el =>
          el.url === l.url && Math.abs(el.x - l.x) <= 6 && Math.abs(el.y - l.y) <= 8
        );
        if (!isDup) target.links.push(l);
      }
      for (const img of sliceHarvest.images) {
        const isDup = target.images.some(ei =>
          Math.abs(ei.x - img.x) < 8 && Math.abs(ei.y - img.y) < 8 && Math.abs(ei.width - img.width) < 12
        );
        if (!isDup) target.images.push(img);
      }
    }

    static async captureSelectedArea(rect) {
      const rectX = Math.round(rect.x !== undefined ? rect.x : (rect.left || 0));
      const rectY = Math.round(rect.y !== undefined ? rect.y : (rect.top || 0));
      const rectW = Math.round(rect.width || 0);
      const rectH = Math.round(rect.height || 0);

      if (rectW < 5 || rectH < 5) {
        throw new Error('Dimensiones de selección insuficientes.');
      }

      const scroller = rect.scroller;
      const isInner = scroller && scroller !== window && scroller !== document.documentElement && scroller !== document.body && scroller !== document.scrollingElement;
      const origScroll = isInner ? { x: scroller.scrollLeft, y: scroller.scrollTop } : getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;

      const harvested = { words: [], links: [], images: [], backgroundColor: null };
      const slices = [];

      // Caso 1: Si el recuadro está completamente visible en la pantalla actual (sin necesidad de scroll)
      const isVisibleInScreen = (
        rectX >= origScroll.x &&
        rectX + rectW <= origScroll.x + viewportWidth &&
        rectY >= origScroll.y &&
        rectY + rectH <= origScroll.y + viewportHeight
      );

      if (isVisibleInScreen) {
        const initialHarvest = DomHarvester.harvest({
          left: rectX,
          top: rectY,
          right: rectX + rectW,
          bottom: rectY + rectH
        }, origScroll);
        this.mergeHarvested(harvested, initialHarvest);

        const captureResponse = await this.requestCaptureSlice();

        if (!captureResponse || !captureResponse.dataUrl) {
          throw new Error('Fallo al capturar franja visible: ' + (captureResponse?.error || 'sin respuesta de captura'));
        }

        slices.push({
          dataUrl: captureResponse.dataUrl,
          cropX: Math.max(0, rectX - origScroll.x),
          cropY: Math.max(0, rectY - origScroll.y),
          cropW: rectW,
          cropH: rectH,
          destY: 0,
          viewportWidth,
          viewportHeight
        });
      } else {
        // Caso 2: El recuadro abarca más de una pantalla o requiere scroll.
        const modifiedStyles = [];
        const hideFloatingHeaders = () => {
          if (modifiedStyles.length > 0) return;
          const all = document.querySelectorAll('*');
          for (const el of all) {
            if (el.id === '__snappdf_overlay' || el.id === '__snappdf_toast') continue;
            const style = window.getComputedStyle(el);
            const pos = style.getPropertyValue('position');
            if (pos === 'fixed' || pos === 'sticky') {
              const r = el.getBoundingClientRect();
              if (r.height > 0 && r.height <= 120 && r.top <= 10 && r.width >= window.innerWidth * 0.5) {
                if (!el.querySelector('main, article, [role="main"], p, ul, ol, h1, h2')) {
                  modifiedStyles.push({
                    el,
                    opacity: el.style.opacity,
                    animation: el.style.animation,
                    transition: el.style.transition
                  });
                  el.style.setProperty('opacity', '0', 'important');
                  el.style.setProperty('animation', 'unset', 'important');
                  el.style.setProperty('transition', '0s', 'important');
                }
              }
            }
          }
        };

        if (rectY > 80) {
          hideFloatingHeaders();
        }

        try {
          let currentY = rectY;
          const bottomY = rectY + rectH;
          let sliceIndex = 0;
          const maxSlices = 60;
          let prevScrollY = -1;

          while (currentY < bottomY && sliceIndex < maxSlices) {
            if (sliceIndex > 0) {
              hideFloatingHeaders();
            }

            const topClearance = currentY > 80 ? 80 : 0;
            const targetScrollY = Math.max(0, currentY - topClearance);

            if (isInner) {
              scroller.scrollTop = targetScrollY;
            } else {
              scrollToCoords(rectX, targetScrollY);
            }
            await new Promise(r => setTimeout(r, 320));

            const currentScroll = isInner ? { x: scroller.scrollLeft, y: scroller.scrollTop } : getScrollOffset();
            const maxScrollHeight = isInner ? scroller.scrollHeight : Math.max(dims.height, document.documentElement ? document.documentElement.scrollHeight : 0);
            const viewH = isInner ? scroller.clientHeight : viewportHeight;
            const maxScrollTop = Math.max(0, maxScrollHeight - viewH);
            const canScrollMore = currentScroll.y < maxScrollTop - 5;

            const toast = document.getElementById('__snappdf_toast');
            if (toast) toast.style.display = 'none';

            const captureResponse = await this.requestCaptureSlice();

            if (toast) toast.style.display = 'block';

            if (!captureResponse || !captureResponse.dataUrl) {
              console.warn('[SnapPDF] capture-slice falló en paso:', sliceIndex, captureResponse?.error);
              break;
            }

            const cropXInScreen = Math.max(0, rectX - currentScroll.x);
            const cropYInScreen = Math.max(0, currentY - currentScroll.y);
            const remainingDocHeight = bottomY - currentY;

            // Si todavía podemos seguir scrolleando hacia abajo y la selección sigue más abajo,
            // detener la franja 140px antes del borde inferior para no capturar barras de chat flotantes
            let effectiveViewportBottom = viewportHeight;
            if (canScrollMore && (cropYInScreen + remainingDocHeight > viewportHeight - 140)) {
              effectiveViewportBottom = Math.max(cropYInScreen + 180, viewportHeight - 140);
            }

            const availableScreenHeight = Math.max(0, effectiveViewportBottom - cropYInScreen);
            const pieceWidth = Math.min(rectW, Math.max(0, viewportWidth - cropXInScreen));
            const pieceHeight = Math.min(remainingDocHeight, availableScreenHeight);

            if (pieceWidth <= 0 || pieceHeight <= 0) {
              break;
            }

            const sliceHarvest = DomHarvester.harvest({
              left: rectX,
              top: currentY,
              right: rectX + pieceWidth,
              bottom: currentY + pieceHeight
            }, currentScroll);
            this.mergeHarvested(harvested, sliceHarvest);

            slices.push({
              dataUrl: captureResponse.dataUrl,
              cropX: cropXInScreen,
              cropY: cropYInScreen,
              cropW: pieceWidth,
              cropH: pieceHeight,
              destY: currentY - rectY,
              viewportWidth,
              viewportHeight
            });

            sliceIndex++;
            currentY += pieceHeight;

            if (!canScrollMore && currentY >= currentScroll.y + viewportHeight) {
              break;
            }
            if (sliceIndex > 1 && currentScroll.y === prevScrollY && currentY >= currentScroll.y + viewportHeight) {
              break;
            }
            prevScrollY = currentScroll.y;
          }
        } finally {
          modifiedStyles.forEach(({ el, opacity, animation, transition }) => {
            el.style.opacity = opacity;
            el.style.animation = animation;
            el.style.transition = transition;
          });
          if (isInner) {
            scroller.scrollTop = origScroll.y;
            scroller.scrollLeft = origScroll.x;
          } else {
            scrollToCoords(origScroll.x, origScroll.y);
          }
        }
      }

      if (slices.length === 0) {
        throw new Error('No se pudo capturar ninguna franja de la selección. Asegúrate de que la pestaña esté activa y visible.');
      }

      const actualCapturedHeight = slices.reduce((maxB, s) => Math.max(maxB, s.destY + s.cropH), 0) || rectH;

      return {
        slices,
        finalWidth: rectW,
        finalHeight: Math.min(rectH, actualCapturedHeight),
        cropBox: {
          x: rectX,
          y: rectY,
          width: rectW,
          height: Math.min(rectH, actualCapturedHeight)
        },
        words: harvested.words.map(w => ({ ...w, x: w.x - rectX, y: w.y - rectY })),
        links: harvested.links.map(l => ({ ...l, x: l.x - rectX, y: l.y - rectY })),
        images: (harvested.images || []).map(img => ({
          ...img,
          x: Math.max(0, img.x - rectX),
          y: Math.max(0, img.y - rectY),
          width: Math.min(img.width, rectW - Math.max(0, img.x - rectX)),
          height: Math.min(img.height, rectH - Math.max(0, img.y - rectY))
        })),
        backgroundColor: harvested.backgroundColor,
        webFonts: DomHarvester.collectWebFonts(),
        title: document.title || 'Recuadro',
        url: window.location.href
      };
    }

    static async captureFullPage() {
      const mainScroll = getMainScrollTarget();
      const isInner = !mainScroll.isWindow;
      const scrollerEl = isInner ? mainScroll.el : null;
      const origScroll = isInner ? { x: scrollerEl.scrollLeft, y: scrollerEl.scrollTop } : getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;
      const fullWidth = viewportWidth;
      let fullHeight = mainScroll.scrollHeight;

      const modifiedStyles = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.id === '__snappdf_overlay' || el.id === '__snappdf_toast') continue;
        const style = window.getComputedStyle(el);
        const pos = style.getPropertyValue('position');
        if (pos === 'fixed' || pos === 'sticky') {
          const r = el.getBoundingClientRect();
          // Solo ocultar barras flotantes de cabecera muy delgadas (< 120px) en el borde superior
          if (r.height > 0 && r.height <= 120 && r.top <= 10 && r.width >= window.innerWidth * 0.5) {
            if (!el.querySelector('main, article, [role="main"], p, ul, ol, h1, h2')) {
              modifiedStyles.push({
                el,
                opacity: el.style.opacity,
                animation: el.style.animation,
                transition: el.style.transition
              });
              el.style.setProperty('opacity', '0', 'important');
              el.style.setProperty('animation', 'unset', 'important');
              el.style.setProperty('transition', '0s', 'important');
            }
          }
        }
      }

      const harvested = { words: [], links: [], images: [], backgroundColor: null };
      const slices = [];
      let currentY = 0;
      let lastActualY = -1;
      let sliceCount = 0;
      const maxSlices = 50;

      try {
        while (currentY < fullHeight && sliceCount < maxSlices) {
          const topClearance = sliceCount > 0 ? 80 : 0;
          const targetScrollY = Math.max(0, currentY - topClearance);

          if (isInner) {
            scrollerEl.scrollTop = targetScrollY;
          } else {
            scrollToCoords(0, targetScrollY);
          }
          await new Promise(r => setTimeout(r, 360));

          const actualY = isInner ? scrollerEl.scrollTop : getScrollOffset().y;
          const currentScroll = isInner ? { x: scrollerEl.scrollLeft, y: actualY } : getScrollOffset();

          const currentDocHeight = isInner ? scrollerEl.scrollHeight : (document.documentElement ? document.documentElement.scrollHeight : dims.height);
          if (currentDocHeight > fullHeight) {
            fullHeight = currentDocHeight;
          }

          const viewH = isInner ? scrollerEl.clientHeight : viewportHeight;
          const maxScrollTop = Math.max(0, fullHeight - viewH);
          const canScrollMore = actualY < maxScrollTop - 5;

          if (sliceCount > 0 && actualY === lastActualY && currentY >= actualY + viewportHeight) {
            break;
          }
          lastActualY = actualY;

          const captureResponse = await this.requestCaptureSlice();

          if (!captureResponse || !captureResponse.dataUrl) {
            break;
          }

          const cropYInScreen = Math.max(0, currentY - actualY);
          const remainingDocHeight = fullHeight - currentY;

          let effectiveViewportBottom = viewportHeight;
          if (canScrollMore && (cropYInScreen + remainingDocHeight > viewportHeight - 140)) {
            effectiveViewportBottom = Math.max(cropYInScreen + 180, viewportHeight - 140);
          }

          const availableScreenHeight = Math.max(0, effectiveViewportBottom - cropYInScreen);
          const pieceHeight = Math.min(remainingDocHeight, availableScreenHeight);

          if (pieceHeight <= 0) {
            break;
          }

          const sliceHarvest = DomHarvester.harvest({
            left: 0,
            top: currentY,
            right: viewportWidth,
            bottom: currentY + pieceHeight
          }, currentScroll);
          this.mergeHarvested(harvested, sliceHarvest);

          slices.push({
            dataUrl: captureResponse.dataUrl,
            cropX: 0,
            cropY: cropYInScreen,
            cropW: viewportWidth,
            cropH: pieceHeight,
            destY: currentY,
            y: currentY,
            height: pieceHeight,
            width: viewportWidth
          });

          sliceCount++;
          currentY += pieceHeight;

          if (!canScrollMore && currentY >= actualY + viewportHeight) {
            break;
          }
        }

        if (slices.length === 0) {
          throw new Error('No se pudo capturar ninguna franja de la página completa.');
        }

        const calculatedFinalHeight = slices.reduce((maxB, s) => Math.max(maxB, s.destY + s.cropH), 0) || fullHeight;

        return {
          slices,
          fullWidth,
          fullHeight: calculatedFinalHeight,
          viewportWidth,
          viewportHeight,
          words: harvested.words,
          links: harvested.links,
          images: harvested.images || [],
          backgroundColor: harvested.backgroundColor,
          webFonts: DomHarvester.collectWebFonts(),
          title: document.title || 'Página Completa',
          url: window.location.href
        };
      } finally {
        modifiedStyles.forEach(({ el, opacity, animation, transition }) => {
          el.style.opacity = opacity;
          el.style.animation = animation;
          el.style.transition = transition;
        });
        if (isInner) {
          scrollerEl.scrollTop = origScroll.y;
        } else {
          scrollToCoords(origScroll.x, origScroll.y);
        }
      }
    }

    static async captureVisible() {
      const scroll = getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;

      const { words, links, images, backgroundColor } = DomHarvester.harvest({
        left: scroll.x,
        top: scroll.y,
        right: scroll.x + viewportWidth,
        bottom: scroll.y + viewportHeight
      });

      const captureResponse = await this.requestCaptureSlice();

      if (!captureResponse || !captureResponse.dataUrl) {
        throw new Error('No se pudo capturar la vista visible');
      }

      return {
        dataUrl: captureResponse.dataUrl,
        width: viewportWidth,
        height: viewportHeight,
        viewportWidth,
        viewportHeight,
        cropBox: {
          x: scroll.x,
          y: scroll.y,
          width: viewportWidth,
          height: viewportHeight
        },
        words: words.map(w => ({ ...w, x: w.x - scroll.x, y: w.y - scroll.y })),
        links: links.map(l => ({ ...l, x: l.x - scroll.x, y: l.y - scroll.y })),
        images: (images || []).map(img => ({
          ...img,
          x: Math.max(0, img.x - scroll.x),
          y: Math.max(0, img.y - scroll.y),
          width: Math.min(img.width, viewportWidth - Math.max(0, img.x - scroll.x)),
          height: Math.min(img.height, viewportHeight - Math.max(0, img.y - scroll.y))
        })),
        backgroundColor,
        webFonts: DomHarvester.collectWebFonts(),
        title: document.title || 'Vista Visible',
        url: window.location.href
      };
    }
  }

  // =========================================================================
  // 5. Escuchador de Mensajes Central
  // =========================================================================
  const selectionEngine = new SelectionEngine();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'pong' });
      return false;
    }

    if (request.action === 'start-selection') {
      selectionEngine.start();
      sendResponse({ status: 'started' });
      return false;
    }

    if (request.action === 'get-page-info') {
      const dims = getDocumentDimensions();
      const scroll = getScrollOffset();
      // Enviar las palabras y enlaces para captura vectorial / visible
      const { words, links } = DomHarvester.harvest(null);
      const unicodeWords = words.filter(w => w.hasUnicode);

      sendResponse({
        dims,
        scroll,
        unicodeWords,
        words,
        links,
        title: document.title || 'Página Web',
        url: window.location.href
      });
      return false;
    }

    if (request.action === 'run-fallback-selection') {
      FallbackEngine.captureSelectedArea(request.rect)
        .then(payload => sendResponse({ status: 'completed', payload }))
        .catch(err => sendResponse({ status: 'error', message: err.message }));
      return true;
    }

    if (request.action === 'run-fallback-fullpage') {
      FallbackEngine.captureFullPage()
        .then(payload => sendResponse({ status: 'completed', payload }))
        .catch(err => sendResponse({ status: 'error', message: err.message }));
      return true;
    }

    if (request.action === 'run-fallback-visible') {
      FallbackEngine.captureVisible()
        .then(payload => sendResponse({ status: 'completed', payload }))
        .catch(err => sendResponse({ status: 'error', message: err.message }));
      return true;
    }

    return false;
  });

  // =========================================================================
  // 6. Atajos de Teclado en Página (Ctrl+Shift+S / Ctrl+Shift+E / Ctrl+Shift+X)
  // Permite activación inmediata incluso si el gestor de atajos de Chromium
  // tiene demoras o conflictos de registro.
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd || !e.shiftKey) return;

    // Si el usuario está escribiendo en un input, textarea o contenido editable, no interferir
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    const key = (e.key || '').toUpperCase();
    const code = e.code;

    // Ctrl + Shift + S -> Iniciar captura de recuadro
    if (key === 'S' || code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      selectionEngine.start();
      return;
    }

    // Ctrl + Shift + E -> Captura de página completa
    if (key === 'E' || code === 'KeyE') {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'trigger-fullpage' });
      return;
    }

    // Ctrl + Shift + X -> Captura de vista actual
    if (key === 'X' || code === 'KeyX') {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'trigger-visible' });
      return;
    }
  }, true);
})();
