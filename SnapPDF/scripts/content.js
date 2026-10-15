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

  function scrollToCoords(x, y) {
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
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity || '1') <= 0) return false;
      if (style.fontSize === '0px') return false;
      if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clip === 'rect(0, 0, 0, 0)') return false;
      const rects = el.getClientRects();
      return rects && rects.length > 0;
    }

    static harvest(bounds = null) {
      const scroll = getScrollOffset();
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

                const hasUnicode = /[^\x20-\x7E\xA0-\xFF]/.test(word);

                const compStyle = window.getComputedStyle(parent);
                const color = compStyle ? compStyle.color : 'rgb(0,0,0)';
                const fontWeight = compStyle ? compStyle.fontWeight : '400';

                words.push({
                  text: word,
                  x: Math.round(pageX),
                  y: Math.round(pageY),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  color,
                  fontWeight,
                  hasUnicode
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

      return { words, links };
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

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onScroll = this.onScroll.bind(this);
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

      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('keydown', this.onKeyDown, true);
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

      const scroll = getScrollOffset();
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

    updateSelection(clientX, clientY) {
      const scroll = getScrollOffset();
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
        bottom: Math.round(top + height)
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

        if (this.lastClientY > vh - scrollThreshold) {
          window.scrollBy({ top: scrollSpeed, left: 0, behavior: 'instant' });
          this.updateSelection(this.lastClientX, this.lastClientY);
        } else if (this.lastClientY < scrollThreshold && this.lastClientY > 0) {
          window.scrollBy({ top: -scrollSpeed, left: 0, behavior: 'instant' });
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

      window.removeEventListener('scroll', this.onScroll);
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
    }
  }

  // =========================================================================
  // 4. Captura Fallback por Franjas Ultra HD
  // =========================================================================
  class FallbackEngine {
    static async captureSelectedArea(rect) {
      const rectX = Math.round(rect.x !== undefined ? rect.x : (rect.left || 0));
      const rectY = Math.round(rect.y !== undefined ? rect.y : (rect.top || 0));
      const rectW = Math.round(rect.width || 0);
      const rectH = Math.round(rect.height || 0);

      if (rectW < 5 || rectH < 5) {
        throw new Error('Dimensiones de selección insuficientes.');
      }

      const origScroll = getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;

      const { words, links } = DomHarvester.harvest({
        left: rectX,
        top: rectY,
        right: rectX + rectW,
        bottom: rectY + rectH
      });

      const slices = [];

      // Caso 1: Si el recuadro está completamente visible en la pantalla actual (sin necesidad de scroll)
      const isVisibleInScreen = (
        rectX >= origScroll.x &&
        rectX + rectW <= origScroll.x + viewportWidth &&
        rectY >= origScroll.y &&
        rectY + rectH <= origScroll.y + viewportHeight
      );

      if (isVisibleInScreen) {
        const captureResponse = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: 'capture-slice' }, resolve);
        });

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
        // Ocultar elementos fixed / sticky para que no se dupliquen repetidamente en cada franja
        const modifiedStyles = [];
        const hideFixedElements = () => {
          if (modifiedStyles.length > 0) return;
          const iterator = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_ELEMENT);
          let el;
          while ((el = iterator.nextNode())) {
            if (el.id === '__snappdf_overlay' || el.id === '__snappdf_toast') continue;
            const style = window.getComputedStyle(el);
            const pos = style.getPropertyValue('position');
            if (pos === 'fixed' || pos === 'sticky') {
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
        };

        // Si la selección empieza por debajo del encabezado (> 80px), ocultamos fixed de inmediato
        if (rectY > 80) {
          hideFixedElements();
        }

        try {
          let currentY = rectY;
          const bottomY = rectY + rectH;
          let sliceIndex = 0;
          const maxSlices = 60;

          while (currentY < bottomY && sliceIndex < maxSlices) {
            // A partir de la segunda franja, garantizar que fixed/sticky no se repitan
            if (sliceIndex > 0) {
              hideFixedElements();
            }

            scrollToCoords(rectX, currentY);
            await new Promise(r => setTimeout(r, 350));

            const currentScroll = getScrollOffset();
            const toast = document.getElementById('__snappdf_toast');
            if (toast) toast.style.display = 'none';

            const captureResponse = await new Promise(resolve => {
              chrome.runtime.sendMessage({ action: 'capture-slice' }, resolve);
            });

            if (toast) toast.style.display = 'block';

            if (!captureResponse || !captureResponse.dataUrl) {
              console.warn('[SnapPDF] capture-slice falló en paso:', sliceIndex, captureResponse?.error);
              break;
            }

            const cropXInScreen = Math.max(0, rectX - currentScroll.x);
            const cropYInScreen = Math.max(0, currentY - currentScroll.y);
            const remainingDocHeight = bottomY - currentY;
            const availableScreenHeight = Math.max(0, viewportHeight - cropYInScreen);

            const pieceWidth = Math.min(rectW, Math.max(0, viewportWidth - cropXInScreen));
            const pieceHeight = Math.min(remainingDocHeight, availableScreenHeight);

            if (pieceWidth <= 0 || pieceHeight <= 0) {
              break;
            }

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

            if (currentScroll.y + viewportHeight >= dims.height) {
              break;
            }
          }
        } finally {
          modifiedStyles.forEach(({ el, opacity, animation, transition }) => {
            el.style.opacity = opacity;
            el.style.animation = animation;
            el.style.transition = transition;
          });
          scrollToCoords(origScroll.x, origScroll.y);
        }
      }

      if (slices.length === 0) {
        throw new Error('No se pudo capturar ninguna franja de la selección. Asegúrate de que la pestaña esté activa y visible.');
      }

      return {
        slices,
        finalWidth: rectW,
        finalHeight: rectH,
        cropBox: {
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH
        },
        words: words.map(w => ({ ...w, x: w.x - rectX, y: w.y - rectY })),
        links: links.map(l => ({ ...l, x: l.x - rectX, y: l.y - rectY })),
        title: document.title || 'Recuadro',
        url: window.location.href
      };
    }

    static async captureFullPage() {
      const origScroll = getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;
      const fullWidth = Math.max(document.documentElement ? document.documentElement.clientWidth : 0, viewportWidth);
      let fullHeight = dims.height;

      const modifiedStyles = [];
      const iterator = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_ELEMENT);
      let el;
      while ((el = iterator.nextNode())) {
        if (el.id === '__snappdf_overlay' || el.id === '__snappdf_toast') continue;
        const style = window.getComputedStyle(el);
        const pos = style.getPropertyValue('position');
        if (pos === 'fixed' || pos === 'sticky') {
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

      const slices = [];
      let currentY = 0;
      let lastActualY = -1;
      let sliceCount = 0;
      let maxCapturedBottom = 0;
      const maxSlices = 50;

      try {
        while (currentY < fullHeight && sliceCount < maxSlices) {
          scrollToCoords(0, currentY);
          await new Promise(r => setTimeout(r, 380));

          const currentScroll = getScrollOffset();
          const actualY = currentScroll.y;

          if (actualY === lastActualY && currentY > actualY + 50) {
            break;
          }
          lastActualY = actualY;

          const captureResponse = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'capture-slice' }, resolve);
          });

          if (!captureResponse || !captureResponse.dataUrl) {
            break;
          }

          slices.push({
            dataUrl: captureResponse.dataUrl,
            y: actualY,
            height: viewportHeight,
            width: viewportWidth
          });

          maxCapturedBottom = Math.max(maxCapturedBottom, actualY + viewportHeight);
          sliceCount++;
          currentY += (viewportHeight - 25);

          // Actualizar fullHeight si la página creció dinámicamente con scroll infinito
          const currentDocHeight = document.documentElement ? document.documentElement.scrollHeight : dims.height;
          if (currentDocHeight > fullHeight) {
            fullHeight = currentDocHeight;
          }

          if (actualY + viewportHeight >= fullHeight - 10) {
            break;
          }
        }

        if (slices.length === 0) {
          throw new Error('No se pudo capturar ninguna franja de la página completa.');
        }

        const calculatedFinalHeight = Math.max(maxCapturedBottom, fullHeight);
        const { words, links } = DomHarvester.harvest(null);

        return {
          slices,
          fullWidth,
          fullHeight: calculatedFinalHeight,
          viewportWidth,
          viewportHeight,
          words,
          links,
          title: document.title || 'Página Completa',
          url: window.location.href
        };
      } finally {
        modifiedStyles.forEach(({ el, opacity, animation, transition }) => {
          el.style.opacity = opacity;
          el.style.animation = animation;
          el.style.transition = transition;
        });
        scrollToCoords(origScroll.x, origScroll.y);
      }
    }

    static async captureVisible() {
      const scroll = getScrollOffset();
      const dims = getDocumentDimensions();
      const viewportWidth = dims.viewportWidth;
      const viewportHeight = dims.viewportHeight;

      const { words, links } = DomHarvester.harvest({
        left: scroll.x,
        top: scroll.y,
        right: scroll.x + viewportWidth,
        bottom: scroll.y + viewportHeight
      });

      const captureResponse = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'capture-slice' }, resolve);
      });

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
