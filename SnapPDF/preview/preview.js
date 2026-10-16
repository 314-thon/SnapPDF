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
  const statPdfSizeEl = document.getElementById('statPdfSize');

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

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function updateEngineOptionLabels(lang = currentLang) {
    if (!pdfEngineSelect) return;

    const optClean = pdfEngineSelect.querySelector('option[value="vector-clean"]');
    const optCompressed = pdfEngineSelect.querySelector('option[value="vector-compressed"]');
    const optHybrid = pdfEngineSelect.querySelector('option[value="vector-hybrid"]');
    const optNative = pdfEngineSelect.querySelector('option[value="vector-native"]');

    const cleanTitle = getTranslation(lang, 'engineVectorClean');
    const compressedTitle = getTranslation(lang, 'engineVectorCompressed');
    const hybridTitle = getTranslation(lang, 'engineVectorHybrid');
    const nativeTitle = getTranslation(lang, 'engineVectorNative');

    if (optClean) {
      const sizeStr = captureData?.cleanVectorBytes ? ` (${formatBytes(captureData.cleanVectorBytes.length)})` : '';
      optClean.textContent = `${cleanTitle}${sizeStr}`;
    }
    if (optCompressed) {
      const sizeStr = captureData?.compressedVectorBytes ? ` (${formatBytes(captureData.compressedVectorBytes.length)})` : '';
      optCompressed.textContent = `${compressedTitle}${sizeStr}`;
    }
    if (optHybrid) {
      const sizeStr = captureData?.rasterHdBytes ? ` (${formatBytes(captureData.rasterHdBytes.length)})` : '';
      optHybrid.textContent = `${hybridTitle}${sizeStr}`;
    }
    if (optNative) {
      const sizeStr = captureData?.cdpBytes ? ` (${formatBytes(captureData.cdpBytes.length)})` : '';
      optNative.textContent = `${nativeTitle}${sizeStr}`;
    }

    if (activePdfBlob && statPdfSizeEl) {
      statPdfSizeEl.textContent = formatBytes(activePdfBlob.size);
    }

    // Actualizar tipo de captura en el panel lateral según el idioma
    if (captureData && statTypeEl) {
      const typeKeyMap = {
        selection: 'typeSelection',
        fullpage: 'typeFullpage',
        visible: 'typeVisible',
        vector: 'typeVector'
      };
      const key = typeKeyMap[captureData.type];
      statTypeEl.textContent = key ? getTranslation(lang, key) : captureData.type;
    }

    // Actualizar motor activo en el panel lateral según el idioma
    if (statEngineEl && pdfEngineSelect) {
      const currentMode = pdfEngineSelect.value;
      let activeTitle = hybridTitle;
      let activeBytes = captureData?.pdfBytes?.length || 0;
      if (currentMode === 'vector-clean') {
        activeTitle = cleanTitle;
      } else if (currentMode === 'vector-compressed') {
        activeTitle = compressedTitle;
      } else if (currentMode === 'vector-native') {
        activeTitle = nativeTitle;
      }
      const sizeStr = activeBytes > 0 ? ` (${formatBytes(activeBytes)})` : '';
      statEngineEl.textContent = `${activeTitle}${sizeStr}`;
    }
  }

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
      updateEngineOptionLabels(currentLang);
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

  updateEngineOptionLabels(currentLang);

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

    // Si viene CDP de Chromium disponible, calcular su tamaño recortado de inmediato
    if (captureData.isVector && captureData.pdfBase64 && !captureData.cdpBytes) {
      try {
        const binaryString = atob(captureData.pdfBase64);
        const len = binaryString.length;
        let rawBytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) rawBytes[i] = binaryString.charCodeAt(i);
        if (captureData.cropBox && captureData.fullDocWidth && captureData.fullDocHeight) {
          rawBytes = await cropVectorPdf(rawBytes, captureData.cropBox, captureData.fullDocWidth, captureData.fullDocHeight);
        }
        captureData.cdpBytes = rawBytes;
      } catch (cdpErr) {
        console.warn('Error precargando CDP bytes:', cdpErr);
      }
    }

    // Habilitar o deshabilitar opciones en el dropdown según disponibilidad
    if (pdfEngineSelect) {
      const nativeOpt = pdfEngineSelect.querySelector('option[value="vector-native"]');
      if (nativeOpt) {
        nativeOpt.disabled = !captureData.isVector || !captureData.pdfBase64;
      }
      const hasWords = normalizedWords && normalizedWords.length > 0;
      const cleanOpt = pdfEngineSelect.querySelector('option[value="vector-clean"]');
      if (cleanOpt) cleanOpt.disabled = !hasWords;
      const compressedOpt = pdfEngineSelect.querySelector('option[value="vector-compressed"]');
      if (compressedOpt) compressedOpt.disabled = !hasWords;
    }

    // Priorizar motor Fiel Buscable FHD por defecto (máxima fidelidad gráfica pixel-perfect + texto buscable)
    if (hasImagePayload) {
      loadingStatusText.textContent = 'Generando PDF fiel buscable FHD...';
      const hybridVectorBytes = await generateFallbackSearchablePdf();
      captureData.rasterHdBytes = hybridVectorBytes;
      captureData.pdfBytes = hybridVectorBytes;

      statEngineEl.textContent = `📸 Fiel Buscable FHD (${formatBytes(hybridVectorBytes.length)})`;
      vectorBadge.style.display = 'inline-flex';
      vectorBadge.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        PDF Fiel Buscable FHD
      `;
      if (pdfEngineSelect) pdfEngineSelect.value = 'vector-hybrid';
    } else if (captureData.cdpBytes) {
      captureData.pdfBytes = captureData.cdpBytes;
      statEngineEl.textContent = `🖨️ Chromium CDP Print (${formatBytes(captureData.cdpBytes.length)})`;
      vectorBadge.style.display = 'inline-flex';
      if (pdfEngineSelect) pdfEngineSelect.value = 'vector-native';
    } else {
      loadingStatusText.textContent = 'Generando PDF vectorial puro fiel...';
      const cleanVectorBytes = await generateCleanVectorPdf(false);
      captureData.cleanVectorBytes = cleanVectorBytes;
      captureData.pdfBytes = cleanVectorBytes;
      statEngineEl.textContent = `⚡ Vectorial Puro Fiel (${formatBytes(cleanVectorBytes.length)})`;
      if (pdfEngineSelect) pdfEngineSelect.value = 'vector-clean';
    }

    activePdfBlob = new Blob([captureData.pdfBytes], { type: 'application/pdf' });
    activePdfUrl = URL.createObjectURL(activePdfBlob);

    // Actualizar labels con los tamaños reales medidos
    updateEngineOptionLabels();

    // Calcular de fondo los otros motores para que el desplegable muestre los pesos reales de todos
    setTimeout(async () => {
      try {
        if (normalizedWords && normalizedWords.length > 0) {
          if (!captureData.cleanVectorBytes) {
            captureData.cleanVectorBytes = await generateCleanVectorPdf(false);
            updateEngineOptionLabels();
          }
          if (!captureData.compressedVectorBytes) {
            captureData.compressedVectorBytes = await generateCleanVectorPdf(true);
            updateEngineOptionLabels();
          }
        }
      } catch (bgErr) {
        console.warn('Error calculando tamaño de motor de fondo:', bgErr);
      }
    }, 100);

    // Escuchar cambio de modo en el selector de motor
    if (pdfEngineSelect) {
      pdfEngineSelect.addEventListener('change', async () => {
        btnDownloadPdf.disabled = true;
        const prevText = btnDownloadPdf.innerHTML;
        btnDownloadPdf.textContent = 'Cambiando motor...';

        try {
          const mode = pdfEngineSelect.value;
          if (mode === 'vector-clean') {
            if (!captureData.cleanVectorBytes) {
              captureData.cleanVectorBytes = await generateCleanVectorPdf(false);
            }
            captureData.pdfBytes = captureData.cleanVectorBytes;
          } else if (mode === 'vector-compressed') {
            if (!captureData.compressedVectorBytes) {
              captureData.compressedVectorBytes = await generateCleanVectorPdf(true);
            }
            captureData.pdfBytes = captureData.compressedVectorBytes;
          } else if (mode === 'vector-hybrid' || mode === 'raster-hd') {
            if (!captureData.rasterHdBytes) {
              captureData.rasterHdBytes = await generateFallbackSearchablePdf();
            }
            captureData.pdfBytes = captureData.rasterHdBytes;
          } else if (mode === 'vector-native' || mode === 'cdp-full') {
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
          }

          let finalBytes = captureData.pdfBytes;
          if (pdfLayoutSelect && pdfLayoutSelect.value === 'a4') {
            finalBytes = await splitVectorPdfToA4(finalBytes);
          }

          if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
          activePdfBlob = new Blob([finalBytes], { type: 'application/pdf' });
          activePdfUrl = URL.createObjectURL(activePdfBlob);
          pdfPreviewFrame.src = activePdfUrl;

          updateEngineOptionLabels();
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
    ctx.imageSmoothingEnabled = false;

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
      mainCanvas.width = img.naturalWidth;
      mainCanvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

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
        if (slice.cropY !== undefined && slice.cropH !== undefined) {
          const sX = Math.round((slice.cropX || 0) * scale);
          const sY = Math.round(slice.cropY * scale);
          const sW = Math.round((slice.cropW || slice.width || captureData.viewportWidth) * scale);
          const sH = Math.round(slice.cropH * scale);
          const dY = Math.round((slice.destY !== undefined ? slice.destY : slice.y) * scale);
          if (sW > 0 && sH > 0) {
            ctx.drawImage(sliceImg, sX, sY, sW, sH, 0, dY, sW, sH);
          }
        } else {
          const sliceW = Math.round((slice.width || captureData.viewportWidth) * scale);
          const sliceH = Math.round((slice.height || captureData.viewportHeight) * scale);
          const destY = Math.round(slice.y * scale);
          ctx.drawImage(sliceImg, 0, 0, sliceImg.naturalWidth, sliceImg.naturalHeight, 0, destY, sliceW, sliceH);
        }
      }

      normalizedWords = captureData.words || [];
      normalizedLinks = captureData.links || [];
    }

    // Filtrar etiquetas fantasma de lectores de pantalla (ej. "Tú dijiste" / "You said" en Gemini)
    // que colisionan en la misma coordenada (x, y) que el texto real del mensaje
    if (normalizedWords.length > 1) {
      const srPattern = /^(t[uú]|dijiste|dijo|you|said|gemini|voce|você|disse)$/i;
      const toRemove = new Set();
      for (let i = 0; i < normalizedWords.length; i++) {
        if (toRemove.has(i)) continue;
        const a = normalizedWords[i];
        const aClean = (a.text || '').replace(/[:.,]/g, '').trim();
        for (let j = i + 1; j < normalizedWords.length; j++) {
          if (toRemove.has(j)) continue;
          const b = normalizedWords[j];
          if (Math.abs(a.y - b.y) > 12) continue;
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          if (overlapX >= 4) {
            const bClean = (b.text || '').replace(/[:.,]/g, '').trim();
            if (srPattern.test(aClean) && !srPattern.test(bClean)) {
              toRemove.add(i);
              break;
            } else if (srPattern.test(bClean) && !srPattern.test(aClean)) {
              toRemove.add(j);
            } else if (overlapX >= Math.min(a.width, b.width) * 0.5) {
              // En elementos .cdk-visually-hidden el nodo oculto aparece antes en el DOM que el texto visible real
              toRemove.add(i);
              break;
            }
          }
        }
      }
      if (toRemove.size > 0) {
        normalizedWords = normalizedWords.filter((_, idx) => !toRemove.has(idx));
      }
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

  // Ensamblador de PDF Buscable FHD (100% Lossless PNG sin submuestreo de color + capa de texto vectorial invisible)
  async function generateFallbackSearchablePdf() {
    const { PDFDocument, StandardFonts, rgb, setTextRenderingMode, TextRenderingMode, PDFName, PDFString } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Usar PNG sin pérdida (lossless FHD 4:4:4) salvo capturas multipágina gigantes (> 16 MP)
    const useJpeg = (mainCanvas.width * mainCanvas.height > 16000000);
    const mimeType = useJpeg ? 'image/jpeg' : 'image/png';
    const imgDataUrl = useJpeg ? mainCanvas.toDataURL('image/jpeg', 0.98) : mainCanvas.toDataURL('image/png');
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

  // Caché en memoria de binarios de fuentes decodificados (TTF/OTF/WOFF)
  const fontBinaryCache = new Map();
  let localFontsCache = null;
  let localFontsChecked = false;

  const BUNDLED_FONT_FILES = {
    'roboto': {
      '400-normal': '../fonts/roboto-400-normal.ttf',
      '500-normal': '../fonts/roboto-500-normal.ttf',
      '700-normal': '../fonts/roboto-700-normal.ttf',
      '400-italic': '../fonts/roboto-400-italic.ttf',
      '700-italic': '../fonts/roboto-700-italic.ttf'
    },
    'noto-sans': {
      '400-normal': '../fonts/noto-sans-400-normal.ttf',
      '500-normal': '../fonts/noto-sans-600-normal.ttf',
      '700-normal': '../fonts/noto-sans-700-normal.ttf',
      '400-italic': '../fonts/noto-sans-400-italic.ttf',
      '700-italic': '../fonts/noto-sans-700-italic.ttf'
    },
    'inter': {
      '400-normal': '../fonts/inter-400-normal.ttf',
      '500-normal': '../fonts/inter-600-normal.ttf',
      '700-normal': '../fonts/inter-700-normal.ttf',
      '400-italic': '../fonts/roboto-400-italic.ttf',
      '700-italic': '../fonts/roboto-700-italic.ttf'
    }
  };

  const SYSTEM_FONT_FALLBACK_MAP = {
    'google sans': 'roboto',
    'google sans text': 'roboto',
    'google sans display': 'roboto',
    'product sans': 'roboto',
    'roboto': 'roboto',
    'roboto flex': 'roboto',
    'android': 'roboto',
    'segoe ui': 'noto-sans',
    'segoe ui historic': 'noto-sans',
    'segoe ui variable': 'noto-sans',
    'segoe ui variable text': 'noto-sans',
    'segoe ui variable display': 'noto-sans',
    'segoe ui symbol': 'noto-sans',
    'noto sans': 'noto-sans',
    'calibri': 'noto-sans',
    'candara': 'noto-sans',
    'corbel': 'noto-sans',
    'tahoma': 'noto-sans',
    'verdana': 'noto-sans',
    'trebuchet ms': 'noto-sans',
    'lucida grande': 'noto-sans',
    'lucida sans': 'noto-sans',
    'inter': 'inter',
    'inter var': 'inter',
    'inter variable': 'inter',
    'twitterchirp': 'inter',
    'chirp': 'inter',
    'sf pro': 'inter',
    'sf pro display': 'inter',
    'sf pro text': 'inter',
    'helvetica neue': 'inter',
    'soehne': 'inter',
    'söhne': 'inter',
    'geist': 'inter',
    'arial': 'inter',
    'helvetica': 'inter',
    'google sans mono': 'roboto-mono',
    'consolas': 'roboto-mono',
    'menlo': 'roboto-mono',
    'monaco': 'roboto-mono',
    'courier new': 'roboto-mono',
    'monospace': 'roboto-mono',
    'ui-monospace': 'roboto-mono',
    'georgia': 'merriweather',
    'cambria': 'merriweather',
    'charter': 'lora',
    'times new roman': 'times-roman',
    'times': 'times-roman',
    'serif': 'times-roman',
    'ui-serif': 'times-roman'
  };

  const GENERIC_CSS_FAMILIES = new Set([
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', '-apple-system', 'blinkmacsystemfont',
    'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded'
  ]);

  async function decodeFontBytesIfNeeded(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer);
    if (u8.length < 4) return null;
    // Detectar cabecera WOFF2 ("wOF2" = 0x77, 0x4F, 0x46, 0x32) y descomprimir a TTF/OTF
    if (u8[0] === 0x77 && u8[1] === 0x4F && u8[2] === 0x46 && u8[3] === 0x32) {
      const mod = typeof window !== 'undefined' ? window.woff2DecompressModule : null;
      if (!mod) return null;
      if (!mod.calledRun) {
        await new Promise((resolve) => {
          const prev = mod.onRuntimeInitialized;
          mod.onRuntimeInitialized = () => {
            if (prev) prev();
            resolve();
          };
          setTimeout(resolve, 1500);
        });
      }
      if (typeof mod.decompress === 'function') {
        const decompressed = mod.decompress(u8);
        return decompressed ? new Uint8Array(decompressed) : null;
      }
      return null;
    }
    return u8;
  }

  function parseWeightRange(weightStr) {
    const clean = (weightStr || '400').trim().toLowerCase();
    if (clean === 'bold' || clean === 'bolder') return { min: 700, max: 700, isRange: false };
    if (clean === 'normal' || clean === 'regular') return { min: 400, max: 400, isRange: false };
    const parts = clean.split(/\s+/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (parts.length >= 2) {
      return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]), isRange: parts[0] !== parts[1] };
    }
    if (parts.length === 1) {
      return { min: parts[0], max: parts[0], isRange: false };
    }
    return { min: 400, max: 400, isRange: false };
  }

  function extractFontFacesFromCssText(cssText, baseHref) {
    const extracted = [];
    if (!cssText) return extracted;
    const blocks = cssText.match(/@font-face\s*\{[^}]+\}/gi) || [];
    for (const block of blocks) {
      const ur = ((block.match(/unicode-range\s*:\s*([^;]+)/i) || [])[1] || '').trim();
      if (ur && !/U\+0*00-0*FF|U\+0*20-0*7[EF]|U\+0*00-0*7F/i.test(ur)) {
        continue;
      }
      const famMatch = block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i);
      if (!famMatch || !famMatch[2]) continue;
      const family = famMatch[2].trim().toLowerCase();
      const weight = ((block.match(/font-weight\s*:\s*([^;]+)/i) || [])[1] || '400').trim().toLowerCase();
      const style = ((block.match(/font-style\s*:\s*([^;]+)/i) || [])[1] || 'normal').trim().toLowerCase();
      const srcMatch = block.match(/src\s*:\s*([^;]+)/i);
      if (!srcMatch) continue;

      const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
      let m;
      let bestUrl = null;
      while ((m = urlRegex.exec(srcMatch[1])) !== null) {
        const cand = m[2].trim();
        if (!cand || cand.startsWith('local(')) continue;
        try {
          const abs = new URL(cand, baseHref).href;
          if (/\.(ttf|otf|woff)(\?|$|#)/i.test(abs)) {
            bestUrl = abs;
            break;
          }
          if (!bestUrl) bestUrl = abs;
        } catch (e) {}
      }
      if (bestUrl) {
        extracted.push({ family, weight, style, url: bestUrl });
      }
    }
    return extracted;
  }

  let preparedPageFontRules = null;
  async function getPreparedPageFontRules() {
    if (preparedPageFontRules) return preparedPageFontRules;
    const rawRules = [...(captureData?.webFonts?.rules || [])];
    const crossSheets = captureData?.webFonts?.crossOriginSheets || [];

    if (crossSheets.length > 0) {
      const sheetPromises = crossSheets.slice(0, 12).map(async (href) => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1800);
          const res = await fetch(href, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) {
            const txt = await res.text();
            return extractFontFacesFromCssText(txt, href);
          }
        } catch (e) {}
        return [];
      });
      const extraLists = await Promise.all(sheetPromises);
      for (const list of extraLists) {
        rawRules.push(...list);
      }
    }

    preparedPageFontRules = rawRules.map(r => {
      const wr = parseWeightRange(r.weight);
      return {
        family: (r.family || '').replace(/["']/g, '').trim().toLowerCase(),
        style: (r.style || 'normal').includes('italic') || (r.style || '').includes('oblique') ? 'italic' : 'normal',
        weightMin: wr.min,
        weightMax: wr.max,
        isRange: wr.isRange,
        url: r.url
      };
    });
    return preparedPageFontRules;
  }

  async function tryGetLocalSystemFontBytes(familyName, targetWeight, isItalic) {
    if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') return null;
    if (!localFontsChecked) {
      localFontsChecked = true;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'local-fonts' });
          if (status.state === 'granted') {
            localFontsCache = await window.queryLocalFonts();
          }
        }
      } catch (e) {}
    }
    if (!localFontsCache || localFontsCache.length === 0) return null;

    const famLower = familyName.toLowerCase();
    const matches = localFontsCache.filter(f => (f.family || '').toLowerCase() === famLower);
    if (matches.length === 0) return null;

    let best = matches[0];
    let bestScore = -999;
    for (const m of matches) {
      const st = (m.style || '').toLowerCase();
      const mItalic = st.includes('italic') || st.includes('oblique');
      let mWeight = 400;
      if (st.includes('black') || st.includes('heavy')) mWeight = 900;
      else if (st.includes('extrabold') || st.includes('ultrabold')) mWeight = 800;
      else if (st.includes('semibold') || st.includes('demibold') || st.includes('demi')) mWeight = 600;
      else if (st.includes('bold')) mWeight = 700;
      else if (st.includes('medium')) mWeight = 500;
      else if (st.includes('light')) mWeight = 300;

      let score = 0;
      if (mItalic === isItalic) score += 50;
      score -= Math.abs(mWeight - targetWeight) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    try {
      const blob = await best.blob();
      const buf = await blob.arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) {
      return null;
    }
  }

  async function fetchBundledOrCdnFontBytes(familyKey, weight, style) {
    const cacheKey = `std:${familyKey}:${weight}-${style}`;
    if (fontBinaryCache.has(cacheKey)) {
      return fontBinaryCache.get(cacheKey);
    }

    // 1. Fuentes empaquetadas localmente en la extensión (instantáneas y 100% offline)
    if (BUNDLED_FONT_FILES[familyKey]) {
      const map = BUNDLED_FONT_FILES[familyKey];
      const relPath = map[`${weight}-${style}`] || map[`${weight}-normal`] || map['400-normal'];
      try {
        const res = await fetch(relPath);
        if (res.ok) {
          const u8 = new Uint8Array(await res.arrayBuffer());
          fontBinaryCache.set(cacheKey, u8);
          return u8;
        }
      } catch (e) {}
    }

    // 2. Cualquier fuente web abierta desde @fontsource vía jsDelivr con caché en chrome.storage.local
    const slug = familyKey.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (slug && slug.length >= 2) {
      const storageKey = `snappdf_ttf_${slug}_${weight}_${style}`;
      try {
        const stored = await chrome.storage.local.get(storageKey);
        if (stored && stored[storageKey]) {
          const binStr = atob(stored[storageKey]);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
          fontBinaryCache.set(cacheKey, bytes);
          return bytes;
        }
      } catch (e) {}

      const weightsToTry = weight === '500' ? ['500', '600', '700', '400'] : (weight === '700' ? ['700', '600', '400'] : ['400']);
      const stylesToTry = style === 'italic' ? ['italic', 'normal'] : ['normal'];

      for (const st of stylesToTry) {
        for (const wt of weightsToTry) {
          const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-${wt}-${st}.ttf`;
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2200);
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(timer);
            if (res.ok) {
              const u8 = new Uint8Array(await res.arrayBuffer());
              fontBinaryCache.set(cacheKey, u8);
              try {
                let bin = '';
                for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
                chrome.storage.local.set({ [storageKey]: btoa(bin) });
              } catch (storageErr) {}
              return u8;
            } else if (res.status === 404 && wt === weightsToTry[0] && st === stylesToTry[0]) {
              // Si la familia ni siquiera existe en @fontsource, no seguir probando pesos
              const check400 = wt === '400' ? res : await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-400-normal.ttf`);
              if (!check400.ok) {
                fontBinaryCache.set(cacheKey, null);
                return null;
              }
            }
          } catch (fetchErr) {
            break;
          }
        }
      }
    }

    fontBinaryCache.set(cacheKey, null);
    return null;
  }

  // Generador de PDF Vectorial Puro Fiel o Vectorial Ligero (30%)
  // Conserva intactos iconos, badges, círculos numerados y bloques de código, limpia el fondo local con precisión,
  // extrae y descomprime la fuente real de la web (@font-face WOFF2/WOFF/TTF + fuentes locales + @fontsource)
  // y respeta las negritas y pesos de los títulos.
  async function generateCleanVectorPdf(isCompressed = false) {
    const {
      PDFDocument,
      StandardFonts,
      rgb,
      PDFString,
      PDFName,
      PDFOperator,
      PDFNumber,
      setTextRenderingMode,
      TextRenderingMode,
      setStrokingColor,
      setLineWidth
    } = PDFLib;

    const pdfDoc = await PDFDocument.create();
    if (typeof window !== 'undefined' && window.fontkit) {
      pdfDoc.registerFontkit(window.fontkit);
    }

    const fallbackRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fallbackBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fallbackItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fallbackBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    const pageRules = await getPreparedPageFontRules();
    const embeddedFontCache = new Map();
    const fontCharSetCache = new Map();

    async function resolveAndEmbedWebFont(rawCssFontFamily, weightTier, isItalic) {
      const targetWeight = weightTier === 'bold' ? 700 : (weightTier === 'medium' ? 500 : 400);
      const weightCode = String(targetWeight);
      const styleCode = isItalic ? 'italic' : 'normal';
      const stackKey = `${rawCssFontFamily || 'sans-serif'}|${weightCode}|${styleCode}`;

      if (embeddedFontCache.has(stackKey)) {
        return embeddedFontCache.get(stackKey);
      }

      const embedBytesAndCache = async (bytes, needsSyntheticBold = false) => {
        const emb = await pdfDoc.embedFont(bytes);
        try {
          fontCharSetCache.set(emb, new Set(emb.getCharacterSet()));
        } catch (e) {}
        const result = { font: emb, needsSyntheticBold };
        embeddedFontCache.set(stackKey, result);
        return result;
      };

      const candidates = (rawCssFontFamily || 'sans-serif')
        .split(',')
        .map(s => s.replace(/["']/g, '').trim().toLowerCase())
        .filter(Boolean);

      // Recorrer la pila font-family tal cual la definió la web (de izquierda a derecha)
      for (const rawCand of candidates) {
        if (GENERIC_CSS_FAMILIES.has(rawCand)) continue;

        const cleanedCand = rawCand
          .replace(/\b(regular|medium|semibold|demibold|bold|extrabold|black|heavy|light|thin|italic|oblique)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // 1. Buscar primero en las reglas @font-face reales cargadas por la propia página web (.woff2 / .woff / .ttf / .otf)
        const matchingRules = pageRules.filter(
          r => r.family === rawCand || r.family === cleanedCand
        );
        if (matchingRules.length > 0) {
          // Priorizar coincidencia exacta de estilo y peso estático antes que rangos variables
          const styleMatches = matchingRules.filter(r => r.style === styleCode);
          const pool = styleMatches.length > 0 ? styleMatches : matchingRules;

          let bestRule = null;
          let bestDiff = 9999;
          for (const r of pool) {
            if (!r.isRange && r.weightMin === targetWeight) {
              bestRule = r;
              bestDiff = 0;
              break;
            }
            if (targetWeight >= r.weightMin && targetWeight <= r.weightMax) {
              const diff = r.isRange ? 15 : 0;
              if (diff < bestDiff) {
                bestDiff = diff;
                bestRule = r;
              }
            } else {
              const dist = Math.min(Math.abs(targetWeight - r.weightMin), Math.abs(targetWeight - r.weightMax));
              if (dist < bestDiff) {
                bestDiff = dist;
                bestRule = r;
              }
            }
          }

          if (bestRule && bestRule.url) {
            const urlCacheKey = `url:${bestRule.url}`;
            let decodedBytes = fontBinaryCache.get(urlCacheKey);
            if (decodedBytes === undefined) {
              try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 2500);
                const res = await fetch(bestRule.url, { signal: ctrl.signal });
                clearTimeout(timer);
                if (res.ok) {
                  const buf = await res.arrayBuffer();
                  decodedBytes = await decodeFontBytesIfNeeded(buf);
                } else {
                  decodedBytes = null;
                }
              } catch (e) {
                decodedBytes = null;
              }
              fontBinaryCache.set(urlCacheKey, decodedBytes);
            }

            if (decodedBytes) {
              try {
                // Si el @font-face de la web es una fuente variable (ej. 400..700 en un solo .woff2) o un peso 400 usado en un título bold,
                // activamos needsSyntheticBold para que el título tenga el grosor exacto de negrita
                const isVarOrLowWeight = bestRule.isRange || (targetWeight >= 500 && bestRule.weightMax < 500);
                return await embedBytesAndCache(decodedBytes, isVarOrLowWeight);
              } catch (embErr) {
                console.warn('[SnapPDF] Falló incrustación de @font-face de la web, probando siguiente:', bestRule.url, embErr);
              }
            }
          }
        }

        // 2. Si es una fuente instalada en el sistema operativo y el permiso local-fonts está activo, leerla directo de la PC
        const localBytes = await tryGetLocalSystemFontBytes(cleanedCand || rawCand, targetWeight, isItalic);
        if (localBytes) {
          try {
            return await embedBytesAndCache(localBytes, false);
          } catch (e) {}
        }

        // 3. Probar descarga dinámica desde @fontsource (cubre +1.600 fuentes web reales en pesos estáticos 400/500/600/700)
        // Si es una fuente propietaria conocida (Google Sans, Segoe UI, SF Pro, Chirp), mapear a su equivalente TTF estático exacto
        const mappedKey = SYSTEM_FONT_FALLBACK_MAP[rawCand] || SYSTEM_FONT_FALLBACK_MAP[cleanedCand];
        if (mappedKey === 'times-roman') {
          let stdFont = StandardFonts.TimesRoman;
          if (weightTier !== 'regular' && isItalic) stdFont = StandardFonts.TimesRomanBoldItalic;
          else if (weightTier !== 'regular') stdFont = StandardFonts.TimesRomanBold;
          else if (isItalic) stdFont = StandardFonts.TimesRomanItalic;
          const emb = await pdfDoc.embedFont(stdFont);
          const result = { font: emb, needsSyntheticBold: false };
          embeddedFontCache.set(stackKey, result);
          return result;
        }

        const lookupKey = mappedKey || cleanedCand.replace(/\s+/g, '-');
        const cdnOrBundledBytes = await fetchBundledOrCdnFontBytes(lookupKey, weightCode, styleCode);
        if (cdnOrBundledBytes) {
          try {
            return await embedBytesAndCache(cdnOrBundledBytes, false);
          } catch (e) {}
        }
      }

      // 4. Fallback final según el dominio o familia genérica (system-ui, sans-serif, monospace, serif)
      const urlLower = (captureData?.url || '').toLowerCase();
      const isMetaOrMsSite = /facebook\.com|fb\.com|messenger\.com|instagram\.com|whatsapp\.com|linkedin\.com|microsoft\.com|live\.com/.test(urlLower);
      const defaultFamily = isMetaOrMsSite ? 'noto-sans' : 'roboto';
      const defaultBytes = await fetchBundledOrCdnFontBytes(defaultFamily, weightCode, styleCode);
      if (defaultBytes) {
        try {
          return await embedBytesAndCache(defaultBytes, false);
        } catch (e) {}
      }

      let fb = fallbackRegular;
      if (weightTier !== 'regular' && isItalic) fb = fallbackBoldItalic;
      else if (weightTier !== 'regular') fb = fallbackBold;
      else if (isItalic) fb = fallbackItalic;
      const fbResult = { font: fb, needsSyntheticBold: false };
      embeddedFontCache.set(stackKey, fbResult);
      return fbResult;
    }

    function sanitizeForEmbeddedFont(str, fontObj) {
      if (!str) return '';
      const charSet = fontObj ? fontCharSetCache.get(fontObj) : null;
      if (!charSet) {
        return sanitizeForWinAnsi(str);
      }
      const cleaned = str
        .replace(/\u00A0/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');

      let out = '';
      for (const ch of cleaned) {
        const cp = ch.codePointAt(0);
        if (charSet.has(cp)) {
          out += ch;
        } else {
          const fallbackCh = sanitizeForWinAnsi(ch);
          if (fallbackCh && charSet.has(fallbackCh.codePointAt(0))) {
            out += fallbackCh;
          } else {
            out += ' ';
          }
        }
      }
      return out;
    }

    const page = pdfDoc.addPage([finalWidth, finalHeight]);

    function parseCssColor(cssStr, defaultColor = rgb(0.1, 0.1, 0.1)) {
      if (!cssStr) return defaultColor;
      const m = cssStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        if (m[4] !== undefined && parseFloat(m[4]) === 0) {
          return null;
        }
        return rgb(
          Math.min(1, Math.max(0, parseInt(m[1], 10) / 255)),
          Math.min(1, Math.max(0, parseInt(m[2], 10) / 255)),
          Math.min(1, Math.max(0, parseInt(m[3], 10) / 255))
        );
      }
      return defaultColor;
    }

    function getCssLuminance(cssStr) {
      if (!cssStr) return 0.9;
      const m = cssStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return 0.9;
      const r = parseInt(m[1], 10);
      const g = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    const ICON_LIGATURES = new Set([
      'warning', 'spark', 'mic', 'search', 'menu', 'close', 'check', 'add', 'keep',
      'tune', 'more_vert', 'more_horiz', 'expand_more', 'expand_less', 'chevron_right',
      'chevron_left', 'arrow_downward', 'arrow_upward', 'arrow_forward', 'arrow_back',
      'push_pin', 'edit_square', 'filter_list', 'content_copy', 'thumb_up', 'thumb_down',
      'share', 'refresh', 'settings', 'Send', 'send', 'info', 'error', 'help'
    ]);

    function isIconWord(w) {
      if (!w || !w.text) return true;
      const t = w.text.trim();
      if (!t) return true;
      if (w.width <= 42 && w.height <= 42) {
        if (ICON_LIGATURES.has(t)) return true;
        if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(t)) return true;
      }
      return false;
    }

    function hasUnsupportedGlyphs(text) {
      return /[^\x20-\x7E\xA0-\xFF\u0152\u0153\u2013\u2014\u2018-\u201E\u2022\u2026\u2039\u203A\u20AC\u2122\u2212]/.test(text);
    }

    function shouldKeepOnCanvas(w) {
      if (w.preserveVisual || w.hasUnicode) return true;
      const t = (w.text || '').trim();
      if (!t) return true;
      if (hasUnsupportedGlyphs(t)) return true;
      if (t.length <= 2 && /^[✓✔✗✘▼▲►◄↓↑←→]+$/.test(t) && w.width <= 36 && w.height <= 36) {
        return true;
      }
      return false;
    }

    // 1. Incrustar Lienzo Gráfico con limpieza local inteligente solo en palabras vectorizables normales
    if (mainCanvas && mainCanvas.width > 0 && mainCanvas.height > 0) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = mainCanvas.width;
      bgCanvas.height = mainCanvas.height;
      const bgCtx = bgCanvas.getContext('2d');
      bgCtx.drawImage(mainCanvas, 0, 0);

      const scaleX = mainCanvas.width / finalWidth;
      const scaleY = mainCanvas.height / finalHeight;

      let fallbackBgCss = captureData.backgroundColor;
      if (!fallbackBgCss || fallbackBgCss === 'transparent' || fallbackBgCss.startsWith('rgba(0, 0, 0, 0)')) {
        let lightWordCount = 0;
        let totalCount = 0;
        for (const w of normalizedWords.slice(0, 40)) {
          if (!w.color) continue;
          if (getCssLuminance(w.color) > 0.6) lightWordCount++;
          totalCount++;
        }
        fallbackBgCss = (totalCount > 0 && lightWordCount / totalCount > 0.45)
          ? 'rgb(19, 19, 20)'
          : 'rgb(255, 255, 255)';
      }

      const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
      const cw = mainCanvas.width;
      const ch = mainCanvas.height;

      for (const w of normalizedWords) {
        if (isIconWord(w) || shouldKeepOnCanvas(w)) continue;

        const padX = Math.max(1, Math.round(1 * scaleX));
        const padY = Math.max(1, Math.round(1 * scaleY));
        const targetX = Math.max(0, Math.round(w.x * scaleX) - padX);
        const targetY = Math.max(0, Math.round(w.y * scaleY) - padY);
        const targetW = Math.min(cw - targetX, Math.round(w.width * scaleX) + padX * 2);
        const targetH = Math.min(ch - targetY, Math.round(w.height * scaleY) + padY * 2);

        const isLightText = getCssLuminance(w.color) > 0.5;
        let localColor = w.bgColor || fallbackBgCss;

        // Muestrear 8 puntos perimetrales fuera de la palabra y elegir el píxel de mayor contraste con la letra
        // (el más oscuro si el texto es claro, o el más claro si el texto es oscuro) para jamás pisar otra letra
        try {
          const samplePoints = [
            [targetX - 2, targetY - 2],
            [targetX + Math.floor(targetW / 2), targetY - 2],
            [targetX + targetW + 1, targetY - 2],
            [targetX - 2, targetY + Math.floor(targetH / 2)],
            [targetX + targetW + 1, targetY + Math.floor(targetH / 2)],
            [targetX - 2, targetY + targetH + 1],
            [targetX + Math.floor(targetW / 2), targetY + targetH + 1],
            [targetX + targetW + 1, targetY + targetH + 1]
          ];

          let bestLum = isLightText ? 999 : -1;
          let bestRgb = null;

          for (const [sx, sy] of samplePoints) {
            const cx = Math.max(0, Math.min(cw - 1, sx));
            const cy = Math.max(0, Math.min(ch - 1, sy));
            const pix = mainCtx.getImageData(cx, cy, 1, 1).data;
            if (pix[3] > 200) {
              const lum = (0.299 * pix[0] + 0.587 * pix[1] + 0.114 * pix[2]) / 255;
              if (isLightText) {
                if (lum < bestLum) {
                  bestLum = lum;
                  bestRgb = `rgb(${pix[0]}, ${pix[1]}, ${pix[2]})`;
                }
              } else {
                if (lum > bestLum) {
                  bestLum = lum;
                  bestRgb = `rgb(${pix[0]}, ${pix[1]}, ${pix[2]})`;
                }
              }
            }
          }

          if (bestRgb) {
            localColor = bestRgb;
          }
        } catch (e) {}

        bgCtx.fillStyle = localColor;
        bgCtx.fillRect(targetX, targetY, targetW, targetH);
      }

      let embeddedBg;
      if (isCompressed) {
        const imgDataUrl = bgCanvas.toDataURL('image/jpeg', 0.30);
        const imgBytes = await (await fetch(imgDataUrl)).arrayBuffer();
        embeddedBg = await pdfDoc.embedJpg(imgBytes);
      } else {
        // Comparar PNG sin pérdida vs JPEG 90% y elegir el más eficiente (en interfaces oscuras PNG pesa ~70KB vs ~690KB en JPEG)
        const pngDataUrl = bgCanvas.toDataURL('image/png');
        const jpgDataUrl = bgCanvas.toDataURL('image/jpeg', 0.90);
        const usePng = (pngDataUrl.length <= jpgDataUrl.length * 1.45);
        if (usePng) {
          const imgBytes = await (await fetch(pngDataUrl)).arrayBuffer();
          embeddedBg = await pdfDoc.embedPng(imgBytes);
        } else {
          const imgBytes = await (await fetch(jpgDataUrl)).arrayBuffer();
          embeddedBg = await pdfDoc.embedJpg(imgBytes);
        }
      }

      page.drawImage(embeddedBg, {
        x: 0,
        y: 0,
        width: finalWidth,
        height: finalHeight
      });
    } else {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: finalWidth,
        height: finalHeight,
        color: rgb(19 / 255, 19 / 255, 20 / 255)
      });
    }

    // 2. Ordenar palabras en flujo natural de lectura
    const sortedWords = [...normalizedWords].sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 5) return dy;
      return a.x - b.x;
    });

    // 2a. Para los elementos preservados visualmente en el lienzo (badges, círculos 1-2-3, pills de código),
    // agregar capa de texto invisible para que sigan siendo 100% buscables y seleccionables sin alterar su diseño
    page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
    for (const w of sortedWords) {
      if (isIconWord(w) || !shouldKeepOnCanvas(w)) continue;
      const clean = sanitizeForWinAnsi(w.text).trim();
      if (!clean) continue;
      const pdfX = w.x;
      const pdfY = finalHeight - (w.y + Math.round(w.height * 0.8));
      const fSize = Math.max(4, Math.round((w.fontSize || w.height * 0.78) * 0.9));
      try {
        page.drawText(clean + ' ', {
          x: pdfX,
          y: pdfY,
          size: fSize,
          font: fallbackRegular,
          color: rgb(0, 0, 0)
        });
      } catch (e) {}
    }
    page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));

    // 2b. Agrupar palabras normales en segmentos continuos de la misma fuente, peso y estilo
    const segments = [];
    let currentSeg = null;
    const pageUrl = captureData.url || '';

    for (const w of sortedWords) {
      if (isIconWord(w) || shouldKeepOnCanvas(w)) {
        if (currentSeg) {
          segments.push(currentSeg);
          currentSeg = null;
        }
        continue;
      }

      const rawWord = (w.text || '').trim();
      if (!rawWord) continue;

      const weightNum = parseInt(w.fontWeight || '400', 10) || 400;
      const fontSize = Math.max(5, +(w.fontSize || (w.height * 0.8)).toFixed(2));
      const isHeading = !!(w.isHeading || (weightNum >= 500 && fontSize >= 15.5));
      const isBold = !!(isHeading || weightNum >= 600 || w.fontWeight === 'bold');
      const isMedium = !isBold && weightNum >= 500;
      const weightTier = isBold ? 'bold' : (isMedium ? 'medium' : 'regular');
      const isItalic = !!(w.fontStyle && (w.fontStyle === 'italic' || w.fontStyle === 'oblique'));
      const fontFamily = (w.fontFamily || 'sans-serif').trim();
      const color = w.color || 'rgb(0,0,0)';

      if (!currentSeg) {
        currentSeg = {
          words: [rawWord],
          x: w.x,
          y: w.y,
          endX: w.x + w.width,
          height: w.height,
          fontSize,
          fontFamily,
          weightTier,
          isHeading,
          isBold,
          isMedium,
          isItalic,
          color
        };
      } else {
        const sameLine = Math.abs(w.y - currentSeg.y) <= Math.max(5, currentSeg.height * 0.45);
        const sameStyle = (
          currentSeg.fontFamily === fontFamily &&
          currentSeg.weightTier === weightTier &&
          currentSeg.isItalic === isItalic &&
          currentSeg.color === color &&
          Math.abs(currentSeg.fontSize - fontSize) <= 1.2
        );
        const gap = w.x - currentSeg.endX;
        const isContinuous = (gap >= -3 && gap <= Math.max(14, fontSize * 1.15));

        if (sameLine && sameStyle && isContinuous) {
          currentSeg.words.push(rawWord);
          currentSeg.endX = w.x + w.width;
          currentSeg.height = Math.max(currentSeg.height, w.height);
          currentSeg.isHeading = currentSeg.isHeading || isHeading;
        } else {
          segments.push(currentSeg);
          currentSeg = {
            words: [rawWord],
            x: w.x,
            y: w.y,
            endX: w.x + w.width,
            height: w.height,
            fontSize,
            fontFamily,
            weightTier,
            isHeading,
            isBold,
            isMedium,
            isItalic,
            color
          };
        }
      }
    }
    if (currentSeg) {
      segments.push(currentSeg);
    }

    // 3. Dibujar cada segmento vectorial con la fuente real de la web y refuerzo de negritas en títulos
    for (const seg of segments) {
      const { font, needsSyntheticBold } = await resolveAndEmbedWebFont(seg.fontFamily, seg.weightTier, seg.isItalic);
      const rawLineText = seg.words.join(' ');
      const lineText = sanitizeForEmbeddedFont(rawLineText, font).trim();
      if (!lineText) continue;

      const textColor = parseCssColor(seg.color, rgb(0.1, 0.1, 0.1));
      const pdfX = seg.x;
      const baselineOffset = Math.round(seg.height * 0.79);
      const pdfY = finalHeight - (seg.y + baselineOffset);
      const fontSize = Math.max(5, +(seg.fontSize).toFixed(2));

      let textWidth = 0;
      try {
        textWidth = font.widthOfTextAtSize(lineText, fontSize);
      } catch (e) {
        continue;
      }

      const segWidth = seg.endX - seg.x;
      let hScale = 100;
      if (segWidth > 3 && textWidth > 0) {
        // En títulos y negritas no comprimir por debajo de 92% para no adelgazar el trazo vertical
        const minScale = (seg.isBold || seg.isMedium) ? 92 : 78;
        const maxScale = (seg.isBold || seg.isMedium) ? 108 : 112;
        hScale = Math.max(minScale, Math.min(maxScale, (segWidth / textWidth) * 100));
      }

      const applyBoldStroke = seg.isBold || seg.isMedium;
      let strokeWidth = 0;
      if (applyBoldStroke) {
        if (needsSyntheticBold) {
          // Si la fuente extraída de @font-face es variable (instancia base 400), sintetizar el grosor real de negrita
          strokeWidth = seg.isHeading
            ? +(fontSize * 0.038).toFixed(2)
            : (seg.isBold ? +(fontSize * 0.032).toFixed(2) : +(fontSize * 0.018).toFixed(2));
        } else {
          strokeWidth = seg.isHeading
            ? +(fontSize * 0.016).toFixed(2)
            : (seg.isBold ? +(fontSize * 0.012).toFixed(2) : +(fontSize * 0.009).toFixed(2));
        }
      }

      try {
        if (Math.abs(hScale - 100) > 0.5) {
          page.pushOperators(PDFOperator.of('Tz', [PDFNumber.of(Number(hScale.toFixed(1)))]));
        }
        if (applyBoldStroke && strokeWidth > 0.05) {
          page.pushOperators(
            setTextRenderingMode(TextRenderingMode.FillAndOutline),
            setStrokingColor(textColor),
            setLineWidth(strokeWidth)
          );
        }

        page.drawText(lineText, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font,
          color: textColor
        });

        if (applyBoldStroke && strokeWidth > 0.05) {
          page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
        }
        if (Math.abs(hScale - 100) > 0.5) {
          page.pushOperators(PDFOperator.of('Tz', [PDFNumber.of(100)]));
        }
      } catch (err) {
        console.warn('Error dibujando segmento de texto vectorial:', lineText, err);
      }
    }

    // 4. Agregar hipervínculos activos
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
