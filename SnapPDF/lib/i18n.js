/**
 * SnapPDF - Sistema de Internacionalización (i18n)
 * Idiomas: Español (Argentina 🇦🇷), English (US 🇺🇸), Português (Brasil 🇧🇷), 日本語 (🇯🇵), 한국어 (🇰🇷)
 */

const SNAP_TRANSLATIONS = {
  es: {
    // Popup
    title: "SnapPDF",
    subtitle: "PDF Vectorial y HD",
    btnSelectionTitle: "Capturar Recuadro",
    btnSelectionDesc: "Arrastrá para recortar en PDF o PNG",
    btnFullpageTitle: "Página Completa",
    btnFullpageDesc: "PDF continuo con links y sin pixelado",
    btnVisibleTitle: "Vista Actual",
    btnVisibleDesc: "Captura rápida en PDF de lo que ves",
    btnVectorPdfTitle: "PDF Vectorial Nativo",
    btnVectorPdfDesc: "Texto y enlaces 100% nítidos sin imagen",
    featureTag: "Motor Ultra HD • Links Activos",

    // Preview Topbar
    loadingStatus: "Procesando y generando documento PDF...",
    loadingCapture: "Cargando captura...",
    vectorBadge: "PDF de Alta Fidelidad (Vectorial)",
    modeLabel: "Modo:",
    engineVectorClean: "⚡ Vectorial Puro Fiel",
    engineVectorCompressed: "⚡ Vectorial Ligero",
    engineVectorHybrid: "📸 Fiel Buscable HD",
    engineVectorNative: "🖨️ Chromium CDP Print",
    typeSelection: "Recuadro Seleccionado",
    typeFullpage: "Página Completa",
    typeVisible: "Vista Visible",
    typeVector: "PDF Vectorial Nativo",
    formatLabel: "Formato:",
    optContinuous: "Página Continua (Ajuste Web Exacto)",
    optA4: "Multipágina A4 (Estándar)",
    btnDownloadPdf: "Descargar PDF",
    btnDownloadPdfGenerating: "Generando PDF...",
    btnDownloadPdfReorganizing: "Reorganizando páginas...",
    btnCopyPng: "Copiar PNG",
    btnCopyLinks: "Copiar Links",
    btnDownloadPng: "Descargar PNG",
    linksCopied: "¡Links Copiados!",

    // Sidebar
    metricsTitle: "Métricas de Captura",
    statTypeLabel: "Tipo:",
    statEngineLabel: "Motor:",
    statDimensionsLabel: "Dimensiones:",
    statWordsLabel: "Texto / Enlaces:",
    statSizeLabel: "Peso del PDF:",
    wordsText: "{words} palabras (Texto & Emojis)",
    
    layersTitle: "Inspección de Capas",
    layersDesc: "Visualizá las cajas de texto y los enlaces cosechados del DOM.",
    toggleWords: "Resaltar palabras indexadas",
    toggleLinks: "Resaltar enlaces activos",

    shortcutsTitle: "Atajos de Teclado",
    copyImageShortcut: "Copiar Imagen:",
    copyLinksShortcut: "Copiar Links:",
    downloadPdfShortcut: "Descargar PDF:",

    helpTitle: "✨ Ventajas de SnapPDF",
    helpDesc: "• <strong>Enlaces Activos:</strong> Los links web se conservan clicables dentro del PDF.<br>• <strong>Texto Nativo:</strong> Seleccioná, copiá y buscá con <code>Ctrl + F</code> sin pixelado.<br>• <strong>100% Local:</strong> Procesamiento privado en tu navegador.",

    // Alerts / Toasts
    noLinksDetected: "ℹ️ No se detectaron enlaces válidos en esta captura",
    copiedPngSuccess: "📋 ¡Imagen copiada al portapapeles!",
    copiedLinksSuccess: "🔗 ¡{count} enlace(s) copiado(s) al portapapeles!"
  },
  en: {
    // Popup
    title: "SnapPDF",
    subtitle: "High-Fidelity & Vector PDF",
    btnSelectionTitle: "Capture Selection",
    btnSelectionDesc: "Drag to crop into PDF or PNG",
    btnFullpageTitle: "Full Page",
    btnFullpageDesc: "Seamless PDF with clickable links",
    btnVisibleTitle: "Visible View",
    btnVisibleDesc: "Instant PDF capture of what you see",
    btnVectorPdfTitle: "Native Vector PDF",
    btnVectorPdfDesc: "100% sharp text & links without raster image",
    featureTag: "Ultra HD Engine • Active Links",

    // Preview Topbar
    loadingStatus: "Processing and generating PDF document...",
    loadingCapture: "Loading capture...",
    vectorBadge: "High-Fidelity Vector PDF",
    modeLabel: "Mode:",
    engineVectorClean: "⚡ High-Fidelity Pure Vector",
    engineVectorCompressed: "⚡ Vector Compact",
    engineVectorHybrid: "📸 Searchable HD",
    engineVectorNative: "🖨️ Chromium CDP Print",
    typeSelection: "Selected Area",
    typeFullpage: "Full Page",
    typeVisible: "Visible View",
    typeVector: "Native Vector PDF",
    formatLabel: "Layout:",
    optContinuous: "Continuous Page (Exact Web Fit)",
    optA4: "Multi-page A4 (Standard)",
    btnDownloadPdf: "Download PDF",
    btnDownloadPdfGenerating: "Generating PDF...",
    btnDownloadPdfReorganizing: "Reorganizing pages...",
    btnCopyPng: "Copy PNG",
    btnCopyLinks: "Copy Links",
    btnDownloadPng: "Download PNG",
    linksCopied: "Links Copied!",

    // Sidebar
    metricsTitle: "Capture Metrics",
    statTypeLabel: "Type:",
    statEngineLabel: "Engine:",
    statDimensionsLabel: "Dimensions:",
    statWordsLabel: "Text / Links:",
    statSizeLabel: "PDF File Size:",
    wordsText: "{words} words (Text & Emojis)",
    
    layersTitle: "Layer Inspection",
    layersDesc: "Inspect text bounding boxes and links harvested from DOM.",
    toggleWords: "Highlight indexed words",
    toggleLinks: "Highlight active hyperlinks",

    shortcutsTitle: "Keyboard Shortcuts",
    copyImageShortcut: "Copy Image:",
    copyLinksShortcut: "Copy Links:",
    downloadPdfShortcut: "Download PDF:",

    helpTitle: "✨ SnapPDF Advantages",
    helpDesc: "• <strong>Active Links:</strong> Hyperlinks stay clickable inside the PDF.<br>• <strong>Native Text:</strong> Select, copy, and search with <code>Ctrl + F</code> without blur.<br>• <strong>100% Local:</strong> Private processing inside your browser.",

    // Alerts / Toasts
    noLinksDetected: "ℹ️ No valid links detected in this capture",
    copiedPngSuccess: "📋 Image copied to clipboard!",
    copiedLinksSuccess: "🔗 {count} link(s) copied to clipboard!"
  },
  pt: {
    // Popup
    title: "SnapPDF",
    subtitle: "PDF Vetorial e Alta Resolução",
    btnSelectionTitle: "Capturar Seleção",
    btnSelectionDesc: "Arraste para recortar em PDF ou PNG",
    btnFullpageTitle: "Página Inteira",
    btnFullpageDesc: "PDF contínuo com links e sem cortes",
    btnVisibleTitle: "Vista Atual",
    btnVisibleDesc: "Captura rápida em PDF do que você vê",
    btnVectorPdfTitle: "PDF Vetorial Nativo",
    btnVectorPdfDesc: "Texto e links 100% nítidos sem rasterização",
    featureTag: "Motor Ultra HD • Links Ativos",

    // Preview Topbar
    loadingStatus: "Processando e gerando documento PDF...",
    loadingCapture: "Carregando captura...",
    vectorBadge: "PDF Vetorial de Alta Fidelidade",
    modeLabel: "Modo:",
    engineVectorClean: "⚡ Vetorial Puro Fiel",
    engineVectorCompressed: "⚡ Vetorial Compacto",
    engineVectorHybrid: "📸 Pesquisável HD",
    engineVectorNative: "🖨️ Chromium CDP Print",
    typeSelection: "Seleção Recortada",
    typeFullpage: "Página Inteira",
    typeVisible: "Vista Atual",
    typeVector: "PDF Vetorial Nativo",
    formatLabel: "Formato:",
    optContinuous: "Página Contínua (Ajuste Web Exato)",
    optA4: "Multipágina A4 (Padrão)",
    btnDownloadPdf: "Baixar PDF",
    btnDownloadPdfGenerating: "Gerando PDF...",
    btnDownloadPdfReorganizing: "Reorganizando páginas...",
    btnCopyPng: "Copiar PNG",
    btnCopyLinks: "Copiar Links",
    btnDownloadPng: "Baixar PNG",
    linksCopied: "Links Copiados!",

    // Sidebar
    metricsTitle: "Métricas da Captura",
    statTypeLabel: "Tipo:",
    statEngineLabel: "Motor:",
    statDimensionsLabel: "Dimensões:",
    statWordsLabel: "Texto / Links:",
    statSizeLabel: "Tamanho do PDF:",
    wordsText: "{words} palavras (Texto e Emojis)",
    
    layersTitle: "Inspeção de Camadas",
    layersDesc: "Visualize as caixas de texto e os links extraídos do DOM.",
    toggleWords: "Destacar palavras indexadas",
    toggleLinks: "Destacar links ativos",

    shortcutsTitle: "Atalhos de Teclado",
    copyImageShortcut: "Copiar Imagem:",
    copyLinksShortcut: "Copiar Links:",
    downloadPdfShortcut: "Baixar PDF:",

    helpTitle: "✨ Vantagens do SnapPDF",
    helpDesc: "• <strong>Links Ativos:</strong> Os links continuam clicáveis dentro do PDF.<br>• <strong>Texto Nativo:</strong> Selecione, copie e pesquise com <code>Ctrl + F</code>.<br>• <strong>100% Local:</strong> Processamento seguro no seu navegador.",

    // Alerts / Toasts
    noLinksDetected: "ℹ️ Nenhum link válido detectado nesta captura",
    copiedPngSuccess: "📋 Imagem copiada para a área de transferência!",
    copiedLinksSuccess: "🔗 {count} link(s) copiado(s) para a área de transferência!"
  },
  ja: {
    // Popup
    title: "SnapPDF",
    subtitle: "高解像度・ベクターPDF",
    btnSelectionTitle: "範囲を選択してキャプチャ",
    btnSelectionDesc: "ドラッグしてPDFまたはPNGへ切り抜き",
    btnFullpageTitle: "ページ全体",
    btnFullpageDesc: "リンクを保持した高品質スクロールPDF",
    btnVisibleTitle: "表示領域",
    btnVisibleDesc: "画面に見えている部分をすばやくキャプチャ",
    btnVectorPdfTitle: "ネイティブベクターPDF",
    btnVectorPdfDesc: "画像を挟まず100%鮮明なテキストとリンク",
    featureTag: "Ultra HDエンジン • リンク保持",

    // Preview Topbar
    loadingStatus: "PDFドキュメントを生成中...",
    loadingCapture: "キャプチャを読み込み中...",
    vectorBadge: "高解像度ベクターPDF",
    modeLabel: "モード:",
    engineVectorClean: "⚡ 高解像度ピュアベクター",
    engineVectorCompressed: "⚡ 軽量ベクター",
    engineVectorHybrid: "📸 検索可能HD",
    engineVectorNative: "🖨️ Chromium CDP 印刷",
    typeSelection: "選択範囲",
    typeFullpage: "ページ全体",
    typeVisible: "表示領域",
    typeVector: "ネイティブベクターPDF",
    formatLabel: "レイアウト:",
    optContinuous: "連続ページ (ウェブ表示そのまま)",
    optA4: "A4分割 (標準印刷用)",
    btnDownloadPdf: "PDFをダウンロード",
    btnDownloadPdfGenerating: "PDFを生成中...",
    btnDownloadPdfReorganizing: "ページを再構成中...",
    btnCopyPng: "PNGをコピー",
    btnCopyLinks: "リンクをコピー",
    btnDownloadPng: "PNGをダウンロード",
    linksCopied: "コピー完了!",

    // Sidebar
    metricsTitle: "キャプチャ情報",
    statTypeLabel: "種類:",
    statEngineLabel: "エンジン:",
    statDimensionsLabel: "解像度:",
    statWordsLabel: "テキスト / リンク:",
    statSizeLabel: "PDFファイルサイズ:",
    wordsText: "{words} 単語 (テキスト & 絵文字)",
    
    layersTitle: "レイヤー確認",
    layersDesc: "DOMから抽出したテキスト領域とリンクを確認できます。",
    toggleWords: "テキスト領域をハイライト",
    toggleLinks: "リンク領域をハイライト",

    shortcutsTitle: "キーボードショートカット",
    copyImageShortcut: "画像をコピー:",
    copyLinksShortcut: "リンクをコピー:",
    downloadPdfShortcut: "PDFをダウンロード:",

    helpTitle: "✨ SnapPDFの特長",
    helpDesc: "• <strong>クリック可能なリンク:</strong> PDF内でもリンクがそのまま機能します。<br>• <strong>選択可能なテキスト:</strong> <code>Ctrl + F</code> での検索や文字のコピーに対応。<br>• <strong>完全ローカル:</strong> データが外部へ送信されることはありません。",

    // Alerts / Toasts
    noLinksDetected: "ℹ️ キャプチャ内にリンクが見つかりませんでした",
    copiedPngSuccess: "📋 画像をクリップボードにコピーしました!",
    copiedLinksSuccess: "🔗 {count} 件のリンクをコピーしました!"
  },
  ko: {
    // Popup
    title: "SnapPDF",
    subtitle: "초고화질 및 벡터 PDF",
    btnSelectionTitle: "영역 선택 캡처",
    btnSelectionDesc: "드래그하여 원하는 영역을 PDF/PNG로 저장",
    btnFullpageTitle: "전체 페이지",
    btnFullpageDesc: "링크가 유지되는 스크롤 연속 PDF",
    btnVisibleTitle: "현재 화면",
    btnVisibleDesc: "보이는 화면을 즉시 PDF로 캡처",
    btnVectorPdfTitle: "네이티브 벡터 PDF",
    btnVectorPdfDesc: "래스터 이미지 없이 100% 선명한 텍스트 및 링크",
    featureTag: "Ultra HD 엔진 • 활성 링크 유지",

    // Preview Topbar
    loadingStatus: "PDF 문서를 처리 및 생성하는 중...",
    loadingCapture: "캡처 데이터를 불러오는 중...",
    vectorBadge: "고화질 벡터 PDF",
    modeLabel: "모드:",
    engineVectorClean: "⚡ 고화질 순수 벡터",
    engineVectorCompressed: "⚡ 가벼운 벡터",
    engineVectorHybrid: "📸 검색 가능 HD",
    engineVectorNative: "🖨️ Chromium CDP 인쇄",
    typeSelection: "선택 영역",
    typeFullpage: "전체 페이지",
    typeVisible: "현재 화면",
    typeVector: "네이티브 벡터 PDF",
    formatLabel: "형식:",
    optContinuous: "연속 롤 페이지 (웹 맞춤)",
    optA4: "A4 분할 페이지 (표준 인쇄용)",
    btnDownloadPdf: "PDF 다운로드",
    btnDownloadPdfGenerating: "PDF 생성 중...",
    btnDownloadPdfReorganizing: "페이지 재구성 중...",
    btnCopyPng: "PNG 복사",
    btnCopyLinks: "링크 복사",
    btnDownloadPng: "PNG 다운로드",
    linksCopied: "링크 복사됨!",

    // Sidebar
    metricsTitle: "캡처 정보",
    statTypeLabel: "유형:",
    statEngineLabel: "엔진:",
    statDimensionsLabel: "크기:",
    statWordsLabel: "텍스트 / 링크:",
    statSizeLabel: "PDF 파일 크기:",
    wordsText: "{words}개 단어 (텍스트 및 이모지)",
    
    layersTitle: "레이어 검사",
    layersDesc: "DOM에서 추출된 텍스트 및 링크 영역을 시각화합니다.",
    toggleWords: "색인된 단어 강조",
    toggleLinks: "활성 링크 강조",

    shortcutsTitle: "단축키 안내",
    copyImageShortcut: "이미지 복사:",
    copyLinksShortcut: "링크 복사:",
    downloadPdfShortcut: "PDF 다운로드:",

    helpTitle: "✨ SnapPDF의 특장점",
    helpDesc: "• <strong>클릭 가능한 링크:</strong> PDF 내에서도 웹 링크가 그대로 작동합니다.<br>• <strong>원문 텍스트 유지:</strong> <code>Ctrl + F</code> 검색 및 텍스트/이모지 복사 지원.<br>• <strong>100% 로컬 처리:</strong> 데이터가 외부로 유출되지 않습니다.",

    // Alerts / Toasts
    noLinksDetected: "ℹ️ 유효한 링크를 찾을 수 없습니다",
    copiedPngSuccess: "📋 이미지가 클립보드에 복사되었습니다!",
    copiedLinksSuccess: "🔗 {count}개의 링크가 클립보드에 복사되었습니다!"
  }
};

const I18N_LANGS = [
  { code: 'es', flag: '🇦🇷', name: 'Español (Argentina)' },
  { code: 'en', flag: '🇺🇸', name: 'English (US)' },
  { code: 'pt', flag: '🇧🇷', name: 'Português (Brasil)' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' }
];

async function getCurrentLanguage() {
  try {
    const data = await chrome.storage.local.get('snap_lang');
    if (data && data.snap_lang && SNAP_TRANSLATIONS[data.snap_lang]) {
      return data.snap_lang;
    }
  } catch (e) {}

  const nav = (navigator.language || 'es').toLowerCase();
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

async function setLanguage(langCode) {
  if (!SNAP_TRANSLATIONS[langCode]) return;
  await chrome.storage.local.set({ snap_lang: langCode });
  applyTranslations(langCode);
}

function getTranslation(lang, key, params = {}) {
  const dict = SNAP_TRANSLATIONS[lang] || SNAP_TRANSLATIONS.es;
  let text = dict[key] || SNAP_TRANSLATIONS.es[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = getTranslation(lang, key);
    if (val) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.innerHTML = val;
      }
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = getTranslation(lang, key);
    if (val) el.title = val;
  });

  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}
