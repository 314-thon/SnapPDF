/**
 * SnapPDF - Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnSelection = document.getElementById('btnSelection');
  const btnFullpage = document.getElementById('btnFullpage');
  const btnVisible = document.getElementById('btnVisible');

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
