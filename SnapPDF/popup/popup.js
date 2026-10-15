/**
 * SnapPDF - Popup Controller con soporte i18n
 */

document.addEventListener('DOMContentLoaded', async () => {
  const btnSelection = document.getElementById('btnSelection');
  const btnFullpage = document.getElementById('btnFullpage');
  const btnVisible = document.getElementById('btnVisible');
  const flagButtons = document.querySelectorAll('.flag-btn');

  // Inicializar idioma
  const currentLang = await getCurrentLanguage();
  applyTranslations(currentLang);

  // Escuchar cambio de banderas
  flagButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const selected = btn.dataset.lang;
      await setLanguage(selected);
    });
  });

  btnSelection.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'trigger-selection' });
    window.close();
  });

  btnFullpage.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'trigger-fullpage' });
    window.close();
  });

  btnVisible.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'trigger-visible' });
    window.close();
  });
});
