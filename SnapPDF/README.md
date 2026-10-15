# SnapPDF (v2.0.1)

Extensión moderna de navegador para Microsoft Edge y Google Chrome (Manifest V3) que captura áreas seleccionadas (recuadros) o páginas completas generando documentos **PDF vectoriales nativos (100% vector, zoom infinito sin pixelado)** y de alta resolución.

---

## 🚀 Innovaciones de la Versión 2.0 & 2.1

1. **Motor Vectorial Nativo de Chromium (Skia):**
   - **Cero Pixelado:** Al hacer zoom (200%, 500%, 1000%), las tipografías, trazos y vectores SVG se mantienen matemáticamente nítidos porque se generan como objetos vectoriales reales de Skia en el PDF.
   - **Texto y Emojis Seleccionables Auténticos:** Fuentes tipográficas incrustadas directamente y soporte de `/ActualText` en UTF-16BE para emojis completos (`🚀`, `✨`, etc.), permitiendo seleccionar, copiar y buscar con `Ctrl + F` con total fidelidad.
   - **Captura Instantánea en Página Completa:** No requiere desplazarse franja por franja ni sufre problemas de unión; imprime la página completa de una sola vez.

2. **Recorte Vectorial de Precisión:**
   - La selección por recuadro (`Alt + Shift + 4`) recorta matemáticamente las cajas de coordenadas del árbol vectorial (`translateContent` y `setMediaBox`), conservando toda la información sin pérdida ni desfasajes.

3. **Arquitectura Híbrida Inteligente:**
   - **Motor Primario:** PDF Vectorial Nativo de Skia (`Page.printToPDF` con medios de pantalla CSS emulados).
   - **Motor Fallback:** Captura multipaso por franjas Ultra HD con capa OCR invisible estándar `3 Tr` y `/ActualText` para Emojis. Se activa automáticamente si el usuario tiene DevTools (`F12`) abierto en esa pestaña.

---

## 🛠️ Cómo Instalar o Recargar en Microsoft Edge / Chrome

1. Abre tu navegador y ve a:
   - En Edge: `edge://extensions`
   - En Chrome: `chrome://extensions`
2. Activa el interruptor **"Modo de desarrollador"** (Developer mode).
3. Si ya la tenías cargada, elimina la tarjeta vieja o haz clic en **"Cargar extensión sin empaquetar"** (Load unpacked) y selecciona la nueva ubicación:
   `D:\github\snap-pdf`

---

## ⌨️ Atajos de Teclado

| Acción | Windows | macOS |
| :--- | :--- | :--- |
| **Capturar Recuadro** | `Alt + Shift + 4` | `Command + Shift + 4` |
| **Capturar Página Completa** | `Alt + Shift + 1` | `Command + Shift + 1` |
| **Capturar Vista Visible** | `Alt + Shift + 3` | `Command + Shift + 3` |

---

## 💡 Recomendación para Modo Inspector / Móvil

- Para obtener la máxima calidad vectorial con zoom infinito en modo móvil: puedes seleccionar el tamaño móvil en el diseño o simplemente cerrar la ventana de DevTools (`F12`) al momento de tomar la captura. Si mantienes DevTools abierto, SnapPDF utilizará automáticamente el motor Ultra HD sin trabarse.
