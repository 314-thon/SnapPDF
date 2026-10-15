# SnapPDF

[English](README.md) | [Español](README.es.md) | [Português](README.pt.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

Browser extension for Chromium (Chrome, Edge, Brave, Opera) that captures full web pages or custom area selections, exporting high-fidelity PDFs and PNGs while preserving clickable links and selectable text.

No remote servers, no tracking, and no telemetry. All processing runs 100% locally in your browser.

---

## Key Features

- **PDFs with active, clickable links:** unlike standard tools that flatten pages into dead images, SnapPDF extracts all `<a>` tags and embeds exact PDF link annotations. Every hyperlink remains clickable in any PDF reader.
- **Ultra HD millimeter rendering:** advanced slice-and-crop compositor that eliminates duplicate sticky navigation bars, misaligned blocks, and seams.
- **Searchable text and emoji support:** builds an invisible text layer aligned with the capture (`/ActualText` in UTF-16BE). You can search with `Ctrl + F`, highlight text, and copy emojis without garbled characters.
- **Continuous page or multi-page A4:** choose between a single continuous roll (ideal for web articles and design reviews) or auto-paginated standard A4 sheets ready for printing.
- **Instant export & clipboard actions:** download as PNG or copy the graphic directly to your system clipboard (`Ctrl + C`) to paste into Slack, Notion, or WhatsApp. You can also extract and copy every link on the page in plain text with one click.
- **Private & offline-first:** zero cloud reliance. No user data, screenshots, or URLs ever leave your local machine.

---

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Capture selected area** | `Ctrl + Shift + S` | `Command + Shift + S` |
| **Capture full page** | `Ctrl + Shift + E` | `Command + Shift + E` |
| **Capture visible viewport** | `Ctrl + Shift + X` | `Command + Shift + X` |

Customize shortcuts at `chrome://extensions/shortcuts` or `edge://extensions/shortcuts`.

---

## Installation (Developer Mode)

1. Clone this repository or download the ZIP archive.
2. Open your Chromium-based browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** (top right switch).
4. Click **Load unpacked** and select the `SnapPDF` folder.
5. SnapPDF is ready in your extension bar.

---

## License

MIT License. Free to use, modify, and distribute.
