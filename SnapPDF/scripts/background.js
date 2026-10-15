/**
 * SnapPDF - Background Service Worker (Manifest V3 - v2.0.3)
 * Arquitectura Nativa Ultra HD por Franjas y Recorte Milimétrico:
 * - Cero artefactos de repetición o mosaicos (evita bugs de compositor GPU en CDP).
 * - Cero saltos de bloque o división indeseada de páginas.
 * - Archivos ultraligeros (~200 KB - 2 MB en lugar de 14 - 20 MB).
 * - Selección visible instantánea o auto-scroll multipantalla con ocultamiento de barras fijas.
 * - Soporte total de copia e indexación de Emojis mediante /ActualText UTF-16BE.
 */

// Asegurar inyección del Content Script
async function ensureContentScript(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    if (res && res.status === 'pong') return true;
  } catch (e) {}

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/content.js']
    });
    return true;
  } catch (e) {
    console.error('[SnapPDF] Error inyectando content script:', e);
    return false;
  }
}

// Abrir previsualizador con la captura almacenada
async function openPreview(payload) {
  await chrome.storage.local.set({ activeCapture: payload });
  await chrome.tabs.create({ url: chrome.runtime.getURL('preview/preview.html') });
}

// Comandos de teclado globales
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://'))) {
      return;
    }

    await ensureContentScript(tab.id);

    if (command === 'capture-selection') {
      chrome.tabs.sendMessage(tab.id, { action: 'start-selection' });
    } else if (command === 'capture-fullpage') {
      let vectorResult = null;
      try {
        vectorResult = await printTabToVectorPdf(tab);
      } catch (e) {
        console.warn('[SnapPDF Background] Falló printTabToVectorPdf en comando fullpage:', e);
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-fullpage' });
      if (response && response.status === 'completed') {
        await openPreview({
          isVector: !!vectorResult,
          pdfBase64: vectorResult?.pdfBase64,
          type: 'fullpage',
          ...response.payload
        });
      }
    } else if (command === 'capture-visible') {
      let vectorResult = null;
      try {
        vectorResult = await printTabToVectorPdf(tab);
      } catch (e) {
        console.warn('[SnapPDF Background] Falló printTabToVectorPdf en comando visible:', e);
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-visible' });
      if (response && response.status === 'completed') {
        await openPreview({
          isVector: !!vectorResult,
          pdfBase64: vectorResult?.pdfBase64,
          fullDocWidth: vectorResult?.width,
          fullDocHeight: vectorResult?.height,
          cropBox: response.payload.cropBox,
          type: 'visible',
          ...response.payload
        });
      }
    }
  } catch (err) {
    console.error('[SnapPDF Background] Error en comando:', command, err);
  }
});

// Manejo centralizado de mensajes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      // Captura instantánea de franja visible actual de la pestaña activa
      if (request.action === 'capture-slice') {
        const windowId = (sender && sender.tab) ? sender.tab.windowId : null;
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
          if (!dataUrl) {
            throw new Error('chrome.tabs.captureVisibleTab devolvió un resultado vacío.');
          }
          sendResponse({ dataUrl });
        } catch (captureErr) {
          console.error('[SnapPDF Background] Error en captureVisibleTab:', captureErr);
          sendResponse({ error: captureErr.message, dataUrl: null });
        }
        return;
      }

      // Notificación de captura terminada desde el content script (recuadro seleccionado)
      if (request.action === 'capture-completed') {
        sendResponse({ success: true });
        const senderTab = sender.tab;
        let vectorResult = null;
        if (senderTab?.id) {
          try {
            vectorResult = await printTabToVectorPdf(senderTab);
          } catch (e) {
            console.warn('[SnapPDF Background] Error generando PDF vectorial para recuadro:', e);
          }
        }

        const payload = {
          isVector: !!vectorResult,
          pdfBase64: vectorResult?.pdfBase64,
          fullDocWidth: vectorResult?.width,
          fullDocHeight: vectorResult?.height,
          cropBox: request.payload.cropBox,
          ...request.payload
        };
        await openPreview(payload);
        return;
      }

      // Disparador de selección desde popup
      if (request.action === 'trigger-selection') {
        sendResponse({ success: true });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await ensureContentScript(tab.id);
          chrome.tabs.sendMessage(tab.id, { action: 'start-selection' });
        }
        return;
      }

      // Disparador de página completa desde popup
      if (request.action === 'trigger-fullpage') {
        sendResponse({ success: true });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await ensureContentScript(tab.id);
          let vectorResult = null;
          try {
            vectorResult = await printTabToVectorPdf(tab);
          } catch (e) {
            console.warn('[SnapPDF Background] Falló printTabToVectorPdf en fullpage:', e);
          }

          const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-fullpage' });
          if (response && response.status === 'completed') {
            await openPreview({
              isVector: !!vectorResult,
              pdfBase64: vectorResult?.pdfBase64,
              type: 'fullpage',
              ...response.payload
            });
          }
        }
        return;
      }

      // Disparador de vista visible desde popup
      if (request.action === 'trigger-visible') {
        sendResponse({ success: true });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await ensureContentScript(tab.id);
          let vectorResult = null;
          try {
            vectorResult = await printTabToVectorPdf(tab);
          } catch (e) {
            console.warn('[SnapPDF Background] Falló printTabToVectorPdf en visible:', e);
          }

          const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-visible' });
          if (response && response.status === 'completed') {
            await openPreview({
              isVector: !!vectorResult,
              pdfBase64: vectorResult?.pdfBase64,
              fullDocWidth: vectorResult?.width,
              fullDocHeight: vectorResult?.height,
              cropBox: response.payload.cropBox,
              type: 'visible',
              ...response.payload
            });
          }
        }
        return;
      }
    } catch (err) {
      console.error('[SnapPDF Background] Error general:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});

// Generación de PDF vectorial nativo mediante CDP (Page.printToPDF)
async function printTabToVectorPdf(tab) {
  const target = { tabId: tab.id };
  try {
    await chrome.debugger.attach(target, '1.3');

    // Habilitar Page domain
    await chrome.debugger.sendCommand(target, 'Page.enable');

    // Obtener dimensiones del layout de la página
    let widthInches = 8.27; // A4 por defecto (ancho en pulgadas)
    let heightInches = 11.69; // A4 por defecto (alto en pulgadas)
    let widthPx = 1200;
    let heightPx = 1600;

    try {
      const layoutMetrics = await chrome.debugger.sendCommand(target, 'Page.getLayoutMetrics');
      if (layoutMetrics && layoutMetrics.contentSize) {
        widthPx = Math.ceil(layoutMetrics.contentSize.width) || 1200;
        heightPx = Math.ceil(layoutMetrics.contentSize.height) || 1600;
        // 96 DPI: convertir píxeles CSS a pulgadas para que quede en una página continua continua
        widthInches = +(widthPx / 96).toFixed(2);
        heightInches = +(heightPx / 96).toFixed(2);
      }
    } catch (metricsErr) {
      console.warn('[SnapPDF] No se pudo obtener métricas de layout, usando estándar:', metricsErr);
    }

    // Parámetros de impresión vectorial continua optimizados para menor tamaño
    const printOptions = {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1,
      paperWidth: widthInches,
      paperHeight: heightInches,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      preferCSSPageSize: false,
      generateTaggedPDF: false,
      generateDocumentOutline: false
    };

    const pdfResult = await chrome.debugger.sendCommand(target, 'Page.printToPDF', printOptions);
    await chrome.debugger.detach(target);

    return {
      pdfBase64: pdfResult.data,
      width: widthPx,
      height: heightPx
    };
  } catch (err) {
    try {
      await chrome.debugger.detach(target);
    } catch (e) {}
    console.error('[SnapPDF] Error en printTabToVectorPdf:', err);
    throw err;
  }
}
