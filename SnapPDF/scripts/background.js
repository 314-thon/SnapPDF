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
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-fullpage' });
      if (response && response.status === 'completed') {
        await openPreview({
          isVector: false,
          type: 'fullpage',
          ...response.payload
        });
      }
    } else if (command === 'capture-visible') {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-visible' });
      if (response && response.status === 'completed') {
        await openPreview({
          isVector: false,
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
        const payload = {
          isVector: false,
          ...request.payload
        };
        await openPreview(payload);
        sendResponse({ success: true });
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
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-fullpage' });
          if (response && response.status === 'completed') {
            await openPreview({
              isVector: false,
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
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'run-fallback-visible' });
          if (response && response.status === 'completed') {
            await openPreview({
              isVector: false,
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
