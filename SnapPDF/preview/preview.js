/**
 * SnapPDF - Preview & High-Fidelity PDF Engine (v2.0.3)
 * Ensamblador de precisión Ultra HD con soporte nativo de Emojis (/ActualText UTF-16BE),
 * enlaces clicables y previsualizador PDF integrado.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const loadingStatusText = document.getElementById('loadingStatusText');
  const previewContainer = document.getElementById('previewContainer');
  const pdfViewerWrapper = document.getElementById('pdfViewerWrapper');
  const pdfPreviewFrame = document.getElementById('pdfPreviewFrame');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const mainCanvas = document.getElementById('mainCanvas');
  const highlightLayer = document.getElementById('highlightLayer');

  const captureTitleEl = document.getElementById('captureTitle');
  const captureUrlEl = document.getElementById('captureUrl');

  const statTypeEl = document.getElementById('statType');
  const statEngineEl = document.getElementById('statEngine');
  const statDimensionsEl = document.getElementById('statDimensions');
  const statWordsEl = document.getElementById('statWords');

  const vectorBadge = document.getElementById('vectorBadge');
  const layersCard = document.getElementById('layersCard');

  const toggleTextOverlay = document.getElementById('toggleTextOverlay');
  const toggleLinkOverlay = document.getElementById('toggleLinkOverlay');

  const pdfLayoutSelect = document.getElementById('pdfLayoutSelect');
  const formatSelectGroup = document.getElementById('formatSelectGroup');
  const pdfEngineSelect = document.getElementById('pdfEngineSelect');
  const renderModeGroup = document.getElementById('renderModeGroup');
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');
  const btnDownloadPng = document.getElementById('btnDownloadPng');
  const btnCopyPng = document.getElementById('btnCopyPng');
  const btnCopyLinks = document.getElementById('btnCopyLinks');

  let captureData = null;
  let activePdfBlob = null;
  let activePdfUrl = null;
  let currentLang = 'es';

  // Inicializar i18n
  currentLang = await getCurrentLanguage();
  applyTranslations(currentLang);

  const previewFlagButtons = document.querySelectorAll('#previewFlagsBar .flag-btn');
  previewFlagButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const selected = btn.dataset.lang;
      currentLang = selected;
      await setLanguage(selected);
      if (normalizedWords) {
        statWordsEl.textContent = getTranslation(currentLang, 'wordsText', { words: normalizedWords.length.toLocaleString() });
      }
    });
  });

  let normalizedWords = [];
  let normalizedLinks = [];
  let finalWidth = 0;
  let finalHeight = 0;

  function toUtf16Hex(str) {
    let hex = 'FEFF';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
    }
    return hex;
  }

  function sanitizeForWinAnsi(str) {
    if (!str) return '';
    const s = str
      .replace(/[→➔➜➝➡⇒▶►]/g, '->')
      .replace(/[←⬅⇐◀◄]/g, '<-')
      .replace(/[↔⇄⇆]/g, '<->')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u2022]/g, '·')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    let out = '';
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      // Basic ASCII & Latin-1 Supplement (covers á, é, í, ó, ú, ñ, Á, É, Í, Ó, Ú, Ñ, ü, Ü, ¿, ¡, ·, etc.)
      if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF)) {
        out += ch;
      } else {
        // Decompose non-Latin-1 accented characters to base ASCII
        const decomp = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (decomp && decomp !== ch && decomp.charCodeAt(0) <= 0x7E) {
          out += decomp;
        } else {
          out += ' ';
        }
      }
    }
    return out;
  }

  // 1. Cargar captura desde almacenamiento local
  try {
    loadingStatusText.textContent = 'Cargando captura del almacenamiento...';
    const { activeCapture } = await chrome.storage.local.get('activeCapture');
    if (!activeCapture) {
      loadingIndicator.innerHTML = '<p style="color: #ef4444; font-weight: 600;">No se encontró ninguna captura activa.</p>';
      return;
    }
    captureData = activeCapture;
  } catch (err) {
    loadingIndicator.innerHTML = `<p style="color: #ef4444; font-weight: 600;">Error al cargar datos: ${err.message}</p>`;
    return;
  }

  captureTitleEl.textContent = captureData.title || 'Captura Web';
  captureUrlEl.textContent = captureData.url || '';

  const typeLabels = {
    selection: 'Recuadro Seleccionado',
    fullpage: 'Página Completa',
    visible: 'Vista Visible',
    vector: 'PDF Vectorial Nativo'
  };
  statTypeEl.textContent = typeLabels[captureData.type] || captureData.type;

  if (formatSelectGroup) {
    formatSelectGroup.style.display = (captureData.type === 'fullpage' || captureData.type === 'vector') ? 'flex' : 'none';
  }

  // 2. Procesar imagen para previsualización / portapapeles y preparar el PDF vectorial
  try {
    const hasImagePayload = !!(captureData.slices?.length || captureData.dataUrl);

    if (hasImagePayload) {
      loadingStatusText.textContent = 'Ensamblando vista previa de imagen...';
      await processFallbackCapture();
      btnDownloadPng.style.display = 'inline-flex';
      if (btnCopyPng) btnCopyPng.style.display = 'inline-flex';
      if (btnCopyLinks) btnCopyLinks.style.display = 'inline-flex';
      layersCard.style.display = 'block';

      // Copiar automáticamente al portapapeles la imagen
      copyCanvasToClipboard(true).then((copied) => {
        if (!copied) {
          const onFirstFocus = () => {
            window.removeEventListener('focus', onFirstFocus);
            copyCanvasToClipboard(true);
          };
          window.addEventListener('focus', onFirstFocus, { once: true });
        }
      });
    } else {
      btnDownloadPng.style.display = 'none';
      if (btnCopyPng) btnCopyPng.style.display = 'none';
      if (btnCopyLinks) btnCopyLinks.style.display = 'none';
      layersCard.style.display = 'none';
    }

    // Priorizar PDF vectorial nativo nítido de Chromium si está disponible
    if (captureData.isVector && captureData.pdfBase64) {
      loadingStatusText.textContent = 'Procesando PDF vectorial nativo nítido...';
      const binaryString = atob(captureData.pdfBase64);
      const len = binaryString.length;
      let rawBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) rawBytes[i] = binaryString.charCodeAt(i);

      if (captureData.cropBox && captureData.fullDocWidth && captureData.fullDocHeight) {
        rawBytes = await cropVectorPdf(rawBytes, captureData.cropBox, captureData.fullDocWidth, captureData.fullDocHeight);
      }

      captureData.cdpBytes = rawBytes;
      captureData.pdfBytes = rawBytes;

      statEngineEl.textContent = '⚡ Vectorial Nativo Nítido (Zoom Infinito ~500KB)';
      vectorBadge.style.display = 'inline-flex';
      vectorBadge.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        PDF Vectorial Nativo
      `;
      if (pdfEngineSelect) pdfEngineSelect.value = 'vector-native';
    } else {
      loadingStatusText.textContent = 'Generando PDF fiel de alta definición...';
      const hybridVectorBytes = await generateFallbackSearchablePdf();
      captureData.rasterHdBytes = hybridVectorBytes;
      captureData.pdfBytes = hybridVectorBytes;
      statEngineEl.textContent = '📸 Fiel Buscable HD (~150KB)';
      if (pdfEngineSelect) pdfEngineSelect.value = 'vector-hybrid';
    }

    activePdfBlob = new Blob([captureData.pdfBytes], { type: 'application/pdf' });
    activePdfUrl = URL.createObjectURL(activePdfBlob);

    // Escuchar cambio de modo en el selector de motor
    if (pdfEngineSelect) {
      pdfEngineSelect.addEventListener('change', async () => {
        btnDownloadPdf.disabled = true;
        const prevText = btnDownloadPdf.innerHTML;
        btnDownloadPdf.textContent = 'Cambiando motor...';

        try {
          const mode = pdfEngineSelect.value;
          if (mode === 'vector-native' || mode === 'cdp-full') {
            if (!captureData.cdpBytes && captureData.isVector && captureData.pdfBase64) {
              const binaryString = atob(captureData.pdfBase64);
              const len = binaryString.length;
              let rawBytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) rawBytes[i] = binaryString.charCodeAt(i);
              if (captureData.cropBox && captureData.fullDocWidth && captureData.fullDocHeight) {
                rawBytes = await cropVectorPdf(rawBytes, captureData.cropBox, captureData.fullDocWidth, captureData.fullDocHeight);
              }
              captureData.cdpBytes = rawBytes;
            }
            captureData.pdfBytes = captureData.cdpBytes || captureData.rasterHdBytes;
            statEngineEl.textContent = '⚡ Vectorial Nativo Nítido (Zoom Infinito ~500KB)';
          } else if (mode === 'vector-hybrid' || mode === 'raster-hd') {
            if (!captureData.rasterHdBytes) {
              captureData.rasterHdBytes = await generateFallbackSearchablePdf();
            }
            captureData.pdfBytes = captureData.rasterHdBytes;
            statEngineEl.textContent = '📸 Fiel Buscable HD (~150KB)';
          } else if (mode === 'vector-clean') {
            if (!captureData.cleanVectorBytes) {
              captureData.cleanVectorBytes = await generateCleanVectorPdf();
            }
            captureData.pdfBytes = captureData.cleanVectorBytes;
            statEngineEl.textContent = '📝 Texto Minimalista (~4KB)';
          }

          let finalBytes = captureData.pdfBytes;
          if (pdfLayoutSelect && pdfLayoutSelect.value === 'a4') {
            finalBytes = await splitVectorPdfToA4(finalBytes);
          }

          if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
          activePdfBlob = new Blob([finalBytes], { type: 'application/pdf' });
          activePdfUrl = URL.createObjectURL(activePdfBlob);
          pdfPreviewFrame.src = activePdfUrl;
        } catch (switchErr) {
          console.error('Error cambiando motor de PDF:', switchErr);
        } finally {
          btnDownloadPdf.disabled = false;
          btnDownloadPdf.innerHTML = prevText;
        }
      });
    }

    pdfPreviewFrame.src = activePdfUrl;
    pdfViewerWrapper.style.display = 'flex';
    canvasWrapper.style.display = 'none';

    loadingIndicator.style.display = 'none';
    previewContainer.style.display = 'flex';
    btnDownloadPdf.disabled = false;
    if (hasImagePayload) {
      btnDownloadPng.disabled = false;
      if (btnCopyPng) btnCopyPng.disabled = false;
      if (btnCopyLinks) btnCopyLinks.disabled = false;
    }
  } catch (err) {
    console.error('Error procesando captura:', err);
    loadingIndicator.innerHTML = `<p style="color: #ef4444; font-weight: 600;">Error al procesar: ${err.message}</p>`;
    return;
  }

  async function processFallbackCapture() {
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });

    if (captureData.type === 'selection') {
      if (!captureData.slices || captureData.slices.length === 0) {
        throw new Error('No se capturó ninguna franja del recuadro seleccionado. Por favor, reintenta asegurando que la pestaña permanezca visible.');
      }

      finalWidth = captureData.finalWidth;
      finalHeight = captureData.finalHeight;

      const firstSlice = captureData.slices[0];
      const firstImg = await loadImage(firstSlice.dataUrl);
      const scale = firstImg.naturalWidth / (firstSlice.viewportWidth || firstImg.naturalWidth);

      mainCanvas.width = Math.round(finalWidth * scale);
      mainCanvas.height = Math.round(finalHeight * scale);

      for (const slice of captureData.slices) {
        const img = await loadImage(slice.dataUrl);
        const sX = Math.round(slice.cropX * scale);
        const sY = Math.round(slice.cropY * scale);
        const sW = Math.round(slice.cropW * scale);
        const sH = Math.round(slice.cropH * scale);
        const dY = Math.round(slice.destY * scale);

        if (sW > 0 && sH > 0) {
          ctx.drawImage(img, sX, sY, sW, sH, 0, dY, sW, sH);
        }
      }

      normalizedWords = captureData.words || [];
      normalizedLinks = captureData.links || [];
    } else if (captureData.type === 'visible') {
      if (!captureData.dataUrl) {
        throw new Error('No se capturó la imagen de la vista visible. Por favor, reintenta.');
      }

      finalWidth = captureData.width;
      finalHeight = captureData.height;

      const img = await loadImage(captureData.dataUrl);
      const scale = img.naturalWidth / (captureData.viewportWidth || img.naturalWidth);

      mainCanvas.width = Math.round(finalWidth * scale);
      mainCanvas.height = Math.round(finalHeight * scale);

      ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);

      normalizedWords = captureData.words || [];
      normalizedLinks = captureData.links || [];
    } else if (captureData.type === 'fullpage') {
      if (!captureData.slices || captureData.slices.length === 0) {
        throw new Error('No se capturaron franjas para la página completa. Por favor, reintenta.');
      }

      finalWidth = captureData.fullWidth;
      finalHeight = captureData.fullHeight;

      const firstSlice = captureData.slices[0];
      const firstImg = await loadImage(firstSlice.dataUrl);
      const scale = firstImg.naturalWidth / (captureData.viewportWidth || firstImg.naturalWidth);

      mainCanvas.width = Math.round(finalWidth * scale);
      mainCanvas.height = Math.round(finalHeight * scale);

      for (const slice of captureData.slices) {
        const sliceImg = await loadImage(slice.dataUrl);
        const sliceW = Math.round((slice.width || captureData.viewportWidth) * scale);
        const sliceH = Math.round((slice.height || captureData.viewportHeight) * scale);
        const destY = Math.round(slice.y * scale);

        ctx.drawImage(sliceImg, 0, 0, sliceImg.naturalWidth, sliceImg.naturalHeight, 0, destY, sliceW, sliceH);
      }

      normalizedWords = captureData.words || [];
      normalizedLinks = captureData.links || [];
    }

    statDimensionsEl.textContent = `${finalWidth} × ${finalHeight} px`;
    statWordsEl.textContent = getTranslation(currentLang, 'wordsText', { words: normalizedWords.length.toLocaleString() });
    updateHighlightOverlays();
  }

  function updateHighlightOverlays() {
    highlightLayer.innerHTML = '';
    const showWords = toggleTextOverlay.checked;
    const showLinks = toggleLinkOverlay.checked;

    if (!showWords && !showLinks) {
      if (activePdfUrl) {
        pdfViewerWrapper.style.display = 'flex';
        canvasWrapper.style.display = 'none';
      }
      return;
    }

    pdfViewerWrapper.style.display = 'none';
    canvasWrapper.style.display = 'block';

    const canvasRect = mainCanvas.getBoundingClientRect();
    const scaleX = canvasRect.width / finalWidth;
    const scaleY = canvasRect.height / finalHeight;

    if (showWords) {
      normalizedWords.forEach(w => {
        const box = document.createElement('div');
        box.className = 'highlight-box-word';
        box.style.left = `${w.x * scaleX}px`;
        box.style.top = `${w.y * scaleY}px`;
        box.style.width = `${w.width * scaleX}px`;
        box.style.height = `${w.height * scaleY}px`;
        box.title = w.text;
        highlightLayer.appendChild(box);
      });
    }

    if (showLinks) {
      normalizedLinks.forEach(l => {
        const box = document.createElement('div');
        box.className = 'highlight-box-link';
        box.style.left = `${l.x * scaleX}px`;
        box.style.top = `${l.y * scaleY}px`;
        box.style.width = `${l.width * scaleX}px`;
        box.style.height = `${l.height * scaleY}px`;
        box.title = l.url;
        highlightLayer.appendChild(box);
      });
    }
  }

  toggleTextOverlay.addEventListener('change', updateHighlightOverlays);
  toggleLinkOverlay.addEventListener('change', updateHighlightOverlays);
  window.addEventListener('resize', updateHighlightOverlays);

  // Ensamblador de PDF Buscable con /ActualText estándar para Emojis
  async function generateFallbackSearchablePdf() {
    const { PDFDocument, StandardFonts, rgb, setTextRenderingMode, TextRenderingMode, PDFName, PDFString, PDFHexString, PDFOperator } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const useJpeg = (mainCanvas.width * mainCanvas.height > 1500000) || finalHeight > 2000;
    const mimeType = useJpeg ? 'image/jpeg' : 'image/png';
    const imgDataUrl = mainCanvas.toDataURL(mimeType, 0.92);
    const imgBytes = await (await fetch(imgDataUrl)).arrayBuffer();
    const embeddedImage = useJpeg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes);

    const page = pdfDoc.addPage([finalWidth, finalHeight]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight
    });

    // Renderizado de capa de texto invisible para selección y búsqueda (sin doble texto fantasma)
    page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));

    const regularFont = font;
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    function parseCssColor(cssStr) {
      if (!cssStr) return rgb(0.1, 0.1, 0.1);
      const m = cssStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        return rgb(parseInt(m[1], 10) / 255, parseInt(m[2], 10) / 255, parseInt(m[3], 10) / 255);
      }
      return rgb(0.1, 0.1, 0.1);
    }

    // Ordenar palabras en flujo natural de lectura (arriba hacia abajo, izquierda a derecha)
    const sortedWords = [...normalizedWords].sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 5) return dy;
      return a.x - b.x;
    });

    for (let i = 0; i < sortedWords.length; i++) {
      const w = sortedWords[i];
      if (!w.text || w.text.trim().length === 0) continue;

      let clean = sanitizeForWinAnsi(w.text).trim();
      if (!clean) continue;

      const isBold = w.fontWeight && (parseInt(w.fontWeight, 10) >= 600 || w.fontWeight === 'bold');
      const activeFont = isBold ? boldFont : regularFont;
      const textColor = parseCssColor(w.color);

      const pdfX = w.x;
      const pdfY = finalHeight - (w.y + w.height);
      let fontSize = Math.max(4, Math.round(w.height * 0.78));

      let textWidth = 0;
      try {
        textWidth = activeFont.widthOfTextAtSize(clean, fontSize);
      } catch (e) {
        clean = clean.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim();
        if (!clean) continue;
        try {
          textWidth = activeFont.widthOfTextAtSize(clean, fontSize);
        } catch (e2) {
          continue;
        }
      }

      if (w.width > 0 && textWidth > w.width) {
        fontSize = Math.max(4, Math.floor(fontSize * (w.width / textWidth)));
      }

      const nextW = sortedWords[i + 1];
      const isLineEnd = !nextW || (nextW.y > w.y + 5);
      const textToDraw = isLineEnd ? (clean + ' ') : clean;

      try {
        page.drawText(textToDraw, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font: activeFont,
          color: textColor
        });
      } catch (err) {
        console.warn('Error dibujando palabra vectorial:', clean, err);
      }
    }

    const annotRefs = [];
    normalizedLinks.forEach(l => {
      if (!l.url) return;
      const pdfX = l.x;
      const pdfY = finalHeight - (l.y + l.height);

      const linkAnnot = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [pdfX, pdfY, pdfX + l.width, pdfY + l.height],
        Border: [0, 0, 0],
        A: {
          Type: 'Action',
          S: 'URI',
          URI: PDFString.of(l.url)
        }
      });
      annotRefs.push(pdfDoc.context.register(linkAnnot));
    });

    if (annotRefs.length > 0) {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotRefs));
    }

    return await pdfDoc.save();
  }

  // Actualizar visor si cambia el formato (Continuo vs A4)
  if (pdfLayoutSelect) {
    pdfLayoutSelect.addEventListener('change', async () => {
      btnDownloadPdf.disabled = true;
      const prevText = btnDownloadPdf.innerHTML;
      btnDownloadPdf.textContent = 'Reorganizando páginas...';

      try {
        if (pdfLayoutSelect.value === 'a4' && captureData.pdfBytes) {
          const a4Bytes = await splitVectorPdfToA4(captureData.pdfBytes);
          activePdfBlob = new Blob([a4Bytes], { type: 'application/pdf' });
        } else if (captureData.pdfBytes) {
          activePdfBlob = new Blob([captureData.pdfBytes], { type: 'application/pdf' });
        }

        if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
        activePdfUrl = URL.createObjectURL(activePdfBlob);
        pdfPreviewFrame.src = activePdfUrl;
      } catch (e) {
        console.error('Error al cambiar formato:', e);
      } finally {
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = prevText;
      }
    });
  }

  btnDownloadPdf.addEventListener('click', async () => {
    if (activePdfBlob) {
      triggerDownload(activePdfBlob, '.pdf');
      return;
    }

    btnDownloadPdf.disabled = true;
    const prevText = btnDownloadPdf.innerHTML;
    btnDownloadPdf.textContent = 'Generando PDF...';

    try {
      const pdfBytes = await generateFallbackSearchablePdf();
      activePdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      triggerDownload(activePdfBlob, '.pdf');
    } catch (err) {
      alert('Error al generar PDF: ' + err.message);
    } finally {
      btnDownloadPdf.disabled = false;
      btnDownloadPdf.innerHTML = prevText;
    }
  });

  btnDownloadPng.addEventListener('click', () => {
    const dataUrl = mainCanvas.toDataURL('image/png');
    const safeTitle = (captureData.title || 'captura')
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_-]/g, '_')
      .substring(0, 40);
    const filename = `SnapPDF_${safeTitle}_${Date.now()}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  if (btnCopyPng) {
    btnCopyPng.addEventListener('click', async () => {
      const ok = await copyCanvasToClipboard(true);
      if (!ok) {
        alert('No se pudo copiar la imagen al portapapeles. Comprueba los permisos de tu navegador.');
      }
    });
  }

  if (btnCopyLinks) {
    btnCopyLinks.addEventListener('click', async () => {
      await copyLinksToClipboard(true);
    });
  }

  // Atajos de teclado en la previsualización:
  // - Ctrl + C: Copiar imagen al portapapeles (si no hay texto seleccionado)
  // - Ctrl + Shift + C: Copiar los enlaces de la captura
  // - Ctrl + S: Descargar PDF
  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    // Si el usuario está interactuando con un campo de formulario, no intervenir
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return;
    }

    // Ctrl + Shift + C -> Copiar enlaces
    if (e.shiftKey && e.code === 'KeyC') {
      e.preventDefault();
      copyLinksToClipboard(true);
      return;
    }

    // Ctrl + C -> Copiar imagen PNG (si no hay texto seleccionado con el ratón)
    if (!e.shiftKey && e.code === 'KeyC') {
      const selectedText = window.getSelection() ? window.getSelection().toString().trim() : '';
      if (!selectedText) {
        e.preventDefault();
        copyCanvasToClipboard(true);
      }
      return;
    }

    // Ctrl + S -> Descargar PDF
    if (!e.shiftKey && e.code === 'KeyS') {
      e.preventDefault();
      if (btnDownloadPdf && !btnDownloadPdf.disabled) {
        btnDownloadPdf.click();
      }
      return;
    }
  });

  function showCopyToast(message, type = 'success') {
    const existing = document.getElementById('__snappdf_preview_toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__snappdf_preview_toast';
    toast.className = `copy-toast ${type === 'info' ? 'copy-toast-info' : ''}`;

    const iconSvg = type === 'info'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
           <circle cx="12" cy="12" r="10"/>
           <line x1="12" y1="16" x2="12" y2="12"/>
           <line x1="12" y1="8" x2="12.01" y2="8"/>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2">
           <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
           <polyline points="22 4 12 14.01 9 11.01"/>
         </svg>`;

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  async function copyCanvasToClipboard(notifyToast = true) {
    try {
      const blob = await new Promise((resolve) => mainCanvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No se pudo generar la imagen del lienzo');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      if (btnCopyPng) {
        btnCopyPng.classList.add('btn-success');
        btnCopyPng.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>¡Copiado!</span>
        `;
        setTimeout(() => {
          btnCopyPng.classList.remove('btn-success');
          btnCopyPng.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copiar PNG</span>
          `;
        }, 2500);
      }

      if (notifyToast) {
        showCopyToast('📋 ¡PNG copiado al portapapeles!');
      }
      return true;
    } catch (err) {
      console.warn('[SnapPDF] No se pudo copiar al portapapeles automáticamente:', err);
      return false;
    }
  }

  async function copyLinksToClipboard(notifyToast = true) {
    if (!normalizedLinks || normalizedLinks.length === 0) {
      if (notifyToast) {
        showCopyToast('ℹ️ No se detectaron enlaces en esta captura', 'info');
      }
      return false;
    }

    // Deduplicar URLs manteniendo el orden original de lectura
    const uniqueUrls = [];
    const seen = new Set();
    for (const l of normalizedLinks) {
      if (l.url && !seen.has(l.url)) {
        seen.add(l.url);
        uniqueUrls.push(l.url);
      }
    }

    if (uniqueUrls.length === 0) {
      if (notifyToast) {
        showCopyToast('ℹ️ No se detectaron enlaces válidos en esta captura', 'info');
      }
      return false;
    }

    const textToCopy = uniqueUrls.join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);

      if (btnCopyLinks) {
        btnCopyLinks.classList.add('btn-success');
        const originalHtml = btnCopyLinks.innerHTML;
        const copiedText = getTranslation(currentLang, 'linksCopied');
        btnCopyLinks.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>${copiedText}</span>
        `;
        setTimeout(() => {
          btnCopyLinks.classList.remove('btn-success');
          btnCopyLinks.innerHTML = originalHtml;
        }, 2500);
      }

      if (notifyToast) {
        const count = uniqueUrls.length;
        showCopyToast(getTranslation(currentLang, 'copiedLinksSuccess', { count }));
      }
      return true;
    } catch (err) {
      console.warn('[SnapPDF] Error al copiar enlaces:', err);
      return false;
    }
  }

  // Dividir PDF a hojas A4
  async function splitVectorPdfToA4(srcData) {
    const { PDFDocument } = PDFLib;
    const srcDoc = await PDFDocument.load(srcData);
    const srcPage = srcDoc.getPages()[0];
    const { width: srcW, height: srcH } = srcPage.getSize();

    const a4W = 595.28;
    const a4H = 841.89;
    const scale = a4W / srcW;
    const scaledH = srcH * scale;

    const destDoc = await PDFDocument.create();
    let currentY = 0;

    while (currentY < scaledH) {
      const destPage = destDoc.addPage([a4W, a4H]);
      const [embedded] = await destDoc.embedPdf(srcDoc, [0]);
      destPage.drawPage(embedded, {
        x: 0,
        y: a4H - scaledH + currentY,
        width: a4W,
        height: scaledH
      });
      currentY += a4H;
    }

    return await destDoc.save();
  }

  // Recortar PDF vectorial al área del recuadro o viewport y purgar imágenes ajenas del feed
  async function cropVectorPdf(srcData, cropBox, fullWidth, fullHeight) {
    const { PDFDocument, PDFName } = PDFLib;
    const pdfDoc = await PDFDocument.load(srcData);
    const page = pdfDoc.getPages()[0];
    const { width: srcPdfW, height: srcPdfH } = page.getSize();

    // Factores de escala entre las coordenadas del DOM (px) y las unidades PDF (pt)
    const scaleX = srcPdfW / (fullWidth || srcPdfW);
    const scaleY = srcPdfH / (fullHeight || srcPdfH);

    const targetW = Math.max(10, cropBox.width * scaleX);
    const targetH = Math.max(10, cropBox.height * scaleY);
    const pdfX = cropBox.x * scaleX;
    // En PDF el origen (0,0) está en la esquina inferior izquierda
    const pdfY = srcPdfH - ((cropBox.y + cropBox.height) * scaleY);

    // Ajustar los límites visibles nativos del PDF sin clonar ni duplicar el stream
    page.setCropBox(pdfX, pdfY, targetW, targetH);
    page.setMediaBox(pdfX, pdfY, targetW, targetH);

    // Optimización de peso: purgar XObjects (imágenes ajenas del feed) que caigan fuera del recuadro
    try {
      const cbLeft = pdfX - 20;
      const cbBottom = pdfY - 20;
      const cbRight = pdfX + targetW + 20;
      const cbTop = pdfY + targetH + 20;

      const contentsRef = page.node.get(PDFName.of('Contents'));
      const contentsStream = pdfDoc.context.lookup(contentsRef);
      if (contentsStream) {
        const contentBytes = contentsStream.contents || (contentsStream.getContents && contentsStream.getContents());
        if (contentBytes && contentsStream.dict?.get(PDFName.of('Filter'))?.name === 'FlateDecode') {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(contentBytes);
          writer.close();
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          const contentStr = new TextDecoder('latin1').decode(decompressedBuf);

          const regex = /([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+cm\s+([^qQ]*?)(\/[a-zA-Z0-9_-]+)\s+Do/g;
          let match;
          const keep = new Set();

          while ((match = regex.exec(contentStr)) !== null) {
            const a = parseFloat(match[1]);
            const d = parseFloat(match[4]);
            const e = parseFloat(match[5]);
            const f = parseFloat(match[6]);
            const keyWithSlash = match[8];

            const minX = Math.min(e, e + a);
            const maxX = Math.max(e, e + a);
            const minY = Math.min(f, f + d);
            const maxY = Math.max(f, f + d);

            if (!(maxX < cbLeft || minX > cbRight || maxY < cbBottom || minY > cbTop)) {
              keep.add(keyWithSlash);
            }
          }

          const resources = page.node.get(PDFName.of('Resources'));
          const xobjectsRef = resources ? resources.get(PDFName.of('XObject')) : null;
          const xobjects = xobjectsRef ? pdfDoc.context.lookup(xobjectsRef) : null;

          if (xobjects && xobjects.entries) {
            xobjects.entries().forEach(([key, valRef]) => {
              const keyStr = key.encodedName || key.toString();
              if (!keep.has(keyStr)) {
                const obj = pdfDoc.context.lookup(valRef);
                if (obj && (obj.contents || obj.getContents)) {
                  obj.contents = new Uint8Array(0);
                  obj.dict.set(PDFName.of('Length'), pdfDoc.context.obj(0));
                  obj.dict.delete(PDFName.of('Filter'));
                }
              }
            });
          }
        }
      }
    } catch (purgeErr) {
      console.warn('[SnapPDF] No se pudieron purgar imágenes fuera de límites:', purgeErr);
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  // Generador de PDF Vectorial Puro Ultraliviano (sin fotos de fondo, texto real nativo nítido)
  async function generateCleanVectorPdf() {
    const { PDFDocument, StandardFonts, rgb, PDFString, PDFName } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([finalWidth, finalHeight]);

    // Fondo blanco limpio por defecto
    page.drawRectangle({
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight,
      color: rgb(1, 1, 1)
    });

    // Helper para parsear rgb(r, g, b)
    function parseCssColor(cssStr) {
      if (!cssStr) return rgb(0.1, 0.1, 0.1);
      const m = cssStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        return rgb(parseInt(m[1], 10) / 255, parseInt(m[2], 10) / 255, parseInt(m[3], 10) / 255);
      }
      return rgb(0.1, 0.1, 0.1);
    }

    const sortedWords = [...normalizedWords].sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 5) return dy;
      return a.x - b.x;
    });

    for (const w of sortedWords) {
      if (!w.text || !w.text.trim()) continue;
      let clean = sanitizeForWinAnsi(w.text).trim();
      if (!clean) continue;

      const isBold = w.fontWeight && (parseInt(w.fontWeight, 10) >= 600 || w.fontWeight === 'bold');
      const font = isBold ? boldFont : regularFont;
      const textColor = parseCssColor(w.color);

      const pdfX = w.x;
      const pdfY = finalHeight - (w.y + w.height);
      let fontSize = Math.max(5, Math.round(w.height * 0.8));

      let textWidth = 0;
      try {
        textWidth = font.widthOfTextAtSize(clean, fontSize);
      } catch (e) {
        clean = clean.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim();
        if (!clean) continue;
        try {
          textWidth = font.widthOfTextAtSize(clean, fontSize);
        } catch (e2) {
          continue;
        }
      }

      if (w.width > 0 && textWidth > w.width) {
        fontSize = Math.max(5, Math.floor(fontSize * (w.width / textWidth)));
      }

      try {
        page.drawText(clean, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font,
          color: textColor
        });
      } catch (err) {
        console.warn('Error dibujando texto vectorial limpio:', clean, err);
      }
    }

    // Agregar enlaces activos
    const annotRefs = [];
    normalizedLinks.forEach(l => {
      if (!l.url) return;
      const pdfX = l.x;
      const pdfY = finalHeight - (l.y + l.height);

      const linkAnnot = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [pdfX, pdfY, pdfX + l.width, pdfY + l.height],
        Border: [0, 0, 0],
        A: {
          Type: 'Action',
          S: 'URI',
          URI: PDFString.of(l.url)
        }
      });
      annotRefs.push(pdfDoc.context.register(linkAnnot));
    });

    if (annotRefs.length > 0) {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotRefs));
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  function triggerDownload(blob, extension) {
    const safeTitle = (captureData.title || 'captura')
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_-]/g, '_')
      .substring(0, 40);
    const filename = `SnapPDF_${safeTitle}_${Date.now()}${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
});
