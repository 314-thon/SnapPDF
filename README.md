# SnapPDF

Extensión para Chromium (Chrome, Edge, Brave, Opera) que captura páginas completas o selecciones manuales y las exporta a PDF en alta calidad o PNG, manteniendo el texto seleccionable y los enlaces web activos.

Sin servidores externos, sin tracking y sin telemetría. Todo el procesamiento corre directo en tu navegador.

---

## Qué hace diferente a SnapPDF

- **PDFs con enlaces reales:** no te deja una imagen muerta pegada en una hoja. Si la página tenía links (`<a>`), el PDF final conserva las anotaciones clicables en sus coordenadas exactas para que puedas abrirlos directo desde cualquier lector de PDF.
- **Calidad Ultra HD sin pixelado:** motor de renderizado por franjas milimétricas que evita los típicos cortes raros, saltos de bloques o barras fijas duplicadas que dejan otras extensiones.
- **Texto y emojis seleccionables:** incrusta una capa de texto invisible alineada con la captura (`/ActualText` en UTF-16BE), así que podés buscar con `Ctrl + F`, seleccionar texto y copiar emojis sin que se rompan.
- **Formato continuo o dividido en A4:** podés descargar el documento como una sola tira vertical para leer de corrido o formatearlo automáticamente en páginas A4 estándar listas para imprimir.
- **Exportación rápida y portapapeles:** descargá en PNG o mandá la imagen directo al portapapeles con un botón para pegarla al instante en Slack, WhatsApp o Notion. También podés extraer y copiar todos los enlaces de la captura en texto plano de un saque.
- **100% privado y offline:** no manda tus capturas a ningún backend. Corre localmente con la API de extensiones de tu navegador.

---

## Atajos de teclado

| Acción | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Capturar recuadro seleccionado** | `Ctrl + Shift + S` | `Command + Shift + S` |
| **Capturar página completa** | `Ctrl + Shift + E` | `Command + Shift + E` |
| **Capturar vista visible** | `Ctrl + Shift + X` | `Command + Shift + X` |

Podés personalizar estos atajos en cualquier momento entrando a `chrome://extensions/shortcuts` o `edge://extensions/shortcuts`.

---

## Cómo instalarla en modo desarrollador

Como no hace falta pagar la licencia de la tienda para usarla o compartirla, la podés cargar directamente en tu navegador:

1. Cloná este repositorio o descargá el ZIP del proyecto y descomprimilo en una carpeta fija.
2. Abrí tu navegador basado en Chromium y andá a la sección de extensiones:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Activá la casilla o switch de **Modo de desarrollador** (suele estar arriba a la derecha).
4. Hacé clic en **Cargar descomprimida** (Load unpacked) y seleccioná la carpeta `SnapPDF`.
5. Listo. Ya te aparece el icono de SnapPDF en la barra de herramientas para usarla cuando quieras.

---

## Estructura del proyecto

```text
SnapPDF/
├── icons/            # Iconos de la extensión en diferentes resoluciones
├── lib/              # Librerías locales (pdf-lib para ensamblado de PDFs)
├── popup/            # Interfaz emergente al hacer clic en el icono
├── preview/          # Visor y editor posterior a la captura (descarga A4/Continuo, copiado)
├── scripts/
│   ├── background.js # Service worker para atajos globales y capturas de pestaña
│   └── content.js    # Selector visual de área y cálculo de scroll
└── manifest.json     # Manifiesto V3 de la extensión
```

---

## Licencia

Distribuido bajo licencia MIT. Sentite libre de usarlo, adaptarlo o contribuir.
