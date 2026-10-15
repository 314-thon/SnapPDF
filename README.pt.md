# SnapPDF

[English](README.md) | [Español](README.es.md) | [Português](README.pt.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

Extensão para navegadores baseados em Chromium (Chrome, Edge, Brave, Opera) que captura páginas inteiras ou áreas selecionadas, exportando PDFs e PNGs em alta definição com links clicáveis e texto selecionável preservados.

Sem servidores externos, sem rastreamento e sem telemetria. Todo o processamento é feito localmente no seu navegador.

---

## Principais Recursos

- **PDFs com links clicáveis e ativos:** ao contrário de ferramentas convencionais que geram imagens estáticas, o SnapPDF detecta todas as tags `<a>` e incorpora anotações nativas de link nas coordenadas exatas.
- **Renderização Ultra HD milimétrica:** algoritmo de fatiamento e junção que elimina barras de navegação fixas duplicadas, quebras indesejadas e emendas visíveis.
- **Texto e emojis selecionáveis e pesquisáveis:** cria uma camada de texto invisível perfeitamente alinhada com a imagem (`/ActualText` em UTF-16BE), permitindo pesquisar com `Ctrl + F` e copiar emojis sem caracteres corrompidos.
- **Página contínua ou formato A4:** baixe o documento em um rolo contínuo único (ideal para páginas web longas) ou dividido automaticamente em folhas A4 padrão prontas para impressão.
- **Exportação rápida e área de transferência:** baixe em PNG ou copie a imagem diretamente para a área de transferência (`Ctrl + C`) para colar rapidamente no Slack, WhatsApp ou Notion. Você também pode copiar todos os links encontrados em formato de texto com um único clique.
- **Privacidade total e funcionamento offline:** nada sai da sua máquina. Não há tráfego de dados para a nuvem.

---

## Atalhos de Teclado

| Ação | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Capturar área selecionada** | `Ctrl + Shift + S` | `Command + Shift + S` |
| **Capturar página inteira** | `Ctrl + Shift + E` | `Command + Shift + E` |
| **Capturar área visível** | `Ctrl + Shift + X` | `Command + Shift + X` |

Personalize os atalhos em `chrome://extensions/shortcuts` ou `edge://extensions/shortcuts`.

---

## Como Instalar (Modo Desenvolvedor)

1. Clone este repositório ou baixe o arquivo ZIP.
2. Abra o navegador Chromium e acerte o endereço:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Ative o **Modo de desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** (Load unpacked) e selecione a pasta `SnapPDF`.
5. O SnapPDF estará pronto para uso.

---

## Licença

Distribuído sob a licença MIT.
