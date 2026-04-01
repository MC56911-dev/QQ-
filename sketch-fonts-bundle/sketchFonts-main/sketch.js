/*
 * SPDX-FileCopyrightText: 2025 明明有点Tan
 * SPDX-License-Identifier: MIT
 */

let textInput, generateBtn, export3sBtn, exportStaticBtn, exportFormatStatic, fontSelect;
let exportOrientationSelect;
let fontList;
let fontSizeSlider, lineSpacingSlider, letterSpacingSlider, alignSelect;
let offsetXSlider, offsetYSlider;
let frameCounter, wordInfo, bgFileInput, bgColorPicker, colorPicker;
let prevBgBtn, nextBgBtn, noBgBtn, bgInfo, bgControls;
let waterMaterialCheckbox, waterStrengthSlider, waterSpeedSlider;
let handFxSlider;
let circleGrowCheckbox, circleGrowSpeedSlider;
let dotCountInput;
let refreshDotsBtn;
let dotColorPicker;
let dotGridRowsInput;
let dotGridColsInput;
let dotGridTotalValue;
let dotRowGapSlider;
let dotColGapSlider;
let explosionCheckbox;
let explosionStrengthSlider;
let explosionSpeedSlider;
let explodeNowBtn;
let depth3dCheckbox;
let depth3dLayersSlider;
let depth3dAngleSlider;
let depth3dShadeSlider;
let depth3dMotionCheckbox;
let depth3dHighlightCheckbox;

/** 与 fonts/ttf 目录一致；缺文件时不可放在 preload（会整站失败），改由 setup 内逐个尝试加载 */
const BUNDLED_TTF_NAMES = [
  'Fungal-Grow100Thickness1000.ttf',
  'Fungal-Grow200Thickness500.ttf',
  'Fungal-Grow200Thickness1000.ttf',
  'Fungal-Grow300Thickness500.ttf',
  'Fungal-Grow300Thickness1000.ttf',
  'Fungal-Grow400Thickness500.ttf',
  'Fungal-Grow400Thickness1000.ttf',
  'Fungal-Grow500Thickness500.ttf',
  'Fungal-Grow500Thickness1000.ttf',
  'Fungal-Grow600Thickness500.ttf',
  'Fungal-Grow600Thickness1000.ttf',
  'Fungal-Grow700Thickness500.ttf',
  'Fungal-Grow700Thickness1000.ttf',
  'Fungal-Grow800Thickness500.ttf',
  'Fungal-Grow800Thickness1000.ttf',
  'Fungal-Grow900Thickness500.ttf',
  'Fungal-Grow900Thickness1000.ttf',
  'Fungal-Grow1000Thickness500.ttf',
  'Fungal-Grow1000Thickness1000.ttf',
  'FlorDeRuina-Flor.ttf',
  'FlorDeRuina-Fractura.ttf',
  'FlorDeRuina-Germen.ttf',
  'FlorDeRuina-Ruina.ttf',
  'FlorDeRuina-Semilla.ttf',
];

let currentSeed = 12345;
let needsRedraw = false;
let isRecording = false;
let availableFonts = [];
let fontFileNames = [];
let currentFontIndex = 0;
const FONT_INDEX_STORAGE_KEY = 'sketchFonts:selectedFontIndex:v3';
let backgroundImages = [];
let currentBgIndex = -1;
let textColor = '#000000';
let backgroundColor = '#ffd54f';
let fontPreviewStyleEl = null;
let motionDots = [];
let builtinBackgroundImages = [];
const BUILTIN_BG_FILES = [
  '1d03e2d7421a8cce956813754a38c58f.jpg',
  '495dc6c7c63d37bf2f313a75e8fb6315.jpg',
  '6ed804592aa307c38c765cda3dae1d25.jpg',
  '73afef64377d2f2af09a79ecac3751f0.jpg',
  'f35116c5d5e07e0487283177b02ac361.jpg',
];

const CANVAS_A4_W = 794;
const CANVAS_A4_H = 1123;
const EXPORT_A4_W = 2480;
const EXPORT_A4_H = 3508;
let mainCanvas;
let exportOrientation = 'portrait';
let gifExportSession = null;
let gifFrameCanvas = null;
let gifFrameCtx = null;
let explosionParticles = [];
let lastExplosionTriggerFrame = -9999;
const EXPLOSION_LOOP_FRAMES = 72;
let explosionQueuedAtMs = null;
const EXPLOSION_HOLD_MS = 3000;

function loadBundledFontsSequentially(done) {
  fontFileNames = BUNDLED_TTF_NAMES.slice();
  const n = fontFileNames.length;
  availableFonts = new Array(n);
  let i = 0;
  function next() {
    if (i >= n) {
      done();
      return;
    }
    const idx = i++;
    loadFont(
      `fonts/ttf/${fontFileNames[idx]}`,
      (f) => {
        availableFonts[idx] = f;
        next();
      },
      () => {
        availableFonts[idx] = null;
        next();
      }
    );
  }
  next();
}

/** 当前选中的 TTF 若未加载成功，则回退到任意已成功加载的字体 */
function pickLayoutFont() {
  if (!availableFonts || !availableFonts.length) return null;
  const at = availableFonts[currentFontIndex];
  if (at) return at;
  for (let j = 0; j < availableFonts.length; j++) {
    if (availableFonts[j]) return availableFonts[j];
  }
  return null;
}

function setup() {
  const s = getA4SizeSketch();
  mainCanvas = createCanvas(s.w, s.h);
  mainCanvas.parent('canvas-container');
  noLoop();
  loadBundledFontsSequentially(() => {
    finishSketchSetup();
    loop();
  });
}

function finishSketchSetup() {
  textInput = select('#textInput');
  generateBtn = select('#generateBtn');
  export3sBtn = select('#export3sBtn');
  exportStaticBtn = select('#exportStaticBtn');
  exportFormatStatic = select('#exportFormatStatic');
  exportOrientationSelect = select('#exportOrientation');
  fontSelect = select('#fontSelect');
  fontList = select('#fontList');
  fontSizeSlider = select('#fontSizeSlider');
  lineSpacingSlider = select('#lineSpacingSlider');
  letterSpacingSlider = select('#letterSpacingSlider');
  alignSelect = select('#alignSelect');
  offsetXSlider = select('#offsetXSlider');
  offsetYSlider = select('#offsetYSlider');
  frameCounter = select('#frameCounter');
  wordInfo = select('#wordInfo');
  colorPicker = select('#colorPicker');
  waterMaterialCheckbox = select('#waterMaterialCheckbox');
  waterStrengthSlider = select('#waterStrengthSlider');
  waterSpeedSlider = select('#waterSpeedSlider');
  handFxSlider = select('#handFxSlider');
  circleGrowCheckbox = select('#circleGrowCheckbox');
  circleGrowSpeedSlider = select('#circleGrowSpeedSlider');
  dotCountInput = select('#dotCountInput');
  dotColorPicker = select('#dotColorPicker');
  dotGridRowsInput = select('#dotGridRowsInput');
  dotGridColsInput = select('#dotGridColsInput');
  dotGridTotalValue = select('#dotGridTotalValue');
  dotRowGapSlider = select('#dotRowGapSlider');
  dotColGapSlider = select('#dotColGapSlider');
  refreshDotsBtn = select('#refreshDotsBtn');
  explosionCheckbox = select('#explosionCheckbox');
  explosionStrengthSlider = select('#explosionStrengthSlider');
  explosionSpeedSlider = select('#explosionSpeedSlider');
  explodeNowBtn = select('#explodeNowBtn');
  depth3dCheckbox = select('#depth3dCheckbox');
  depth3dLayersSlider = select('#depth3dLayersSlider');
  depth3dAngleSlider = select('#depth3dAngleSlider');
  depth3dShadeSlider = select('#depth3dShadeSlider');
  depth3dMotionCheckbox = select('#depth3dMotionCheckbox');
  depth3dHighlightCheckbox = select('#depth3dHighlightCheckbox');

  bgFileInput = select('#bgFile');
  bgColorPicker = select('#bgColorPicker');
  bgControls = select('#bgControls');
  prevBgBtn = select('#prevBg');
  nextBgBtn = select('#nextBg');
  noBgBtn = select('#noBg');
  bgInfo = select('#bgInfo');

  backgroundImages = [];
  currentBgIndex = -1;
  updateBgControls();
  loadBuiltinBackgroundsAsync();

  if (textInput) textInput.input(handleTextChange);
  if (generateBtn) generateBtn.mousePressed(regenerateLayout);
  if (export3sBtn) export3sBtn.mousePressed(exportDynamicPoster3s);
  if (exportStaticBtn) exportStaticBtn.mousePressed(exportStaticPoster);
  if (exportOrientationSelect) {
    exportOrientationSelect.changed(() => {
      exportOrientation = exportOrientationSelect.value() === 'landscape' ? 'landscape' : 'portrait';
      applyOrientationSizeSketch();
    });
  }
  if (fontSelect) {
    fontSelect.changed(handleFontChange);
  }
  if (colorPicker) colorPicker.input(handleColorChange);
  if (waterMaterialCheckbox) waterMaterialCheckbox.changed(handleWaterControlChange);
  if (waterStrengthSlider) waterStrengthSlider.input(handleWaterControlChange);
  if (waterSpeedSlider) waterSpeedSlider.input(handleWaterControlChange);
  if (handFxSlider) handFxSlider.input(handleWaterControlChange);
  if (circleGrowCheckbox) circleGrowCheckbox.changed(handleCircleGrowControlChange);
  if (circleGrowSpeedSlider) circleGrowSpeedSlider.input(handleCircleGrowControlChange);
  if (dotCountInput) dotCountInput.input(handleCircleGrowControlChange);
  if (refreshDotsBtn) refreshDotsBtn.mousePressed(adjustDots);
  if (dotGridRowsInput) dotGridRowsInput.input(handleDotGridChange);
  if (dotGridColsInput) dotGridColsInput.input(handleDotGridChange);
  if (dotRowGapSlider) dotRowGapSlider.input(handleDotGridChange);
  if (dotColGapSlider) dotColGapSlider.input(handleDotGridChange);
  if (explosionCheckbox) {
    explosionCheckbox.changed(() => {
      if (isExplosionEnabled()) {
        queueExplosion();
      } else {
        explosionParticles = [];
        explosionQueuedAtMs = null;
      }
      needsRedraw = true;
    });
  }
  if (explosionStrengthSlider) {
    explosionStrengthSlider.input(() => {
      select('#explosionStrengthValue')?.html(explosionStrengthSlider.value());
      needsRedraw = true;
    });
  }
  if (explosionSpeedSlider) {
    explosionSpeedSlider.input(() => {
      select('#explosionSpeedValue')?.html(Number(explosionSpeedSlider.value()).toFixed(1));
      needsRedraw = true;
    });
  }
  if (explodeNowBtn) explodeNowBtn.mousePressed(triggerExplosion);
  if (dotColorPicker) dotColorPicker.input(() => { needsRedraw = true; });
  if (depth3dCheckbox) depth3dCheckbox.changed(handleDepth3dChange);
  if (depth3dLayersSlider) depth3dLayersSlider.input(handleDepth3dChange);
  if (depth3dAngleSlider) depth3dAngleSlider.input(handleDepth3dChange);
  if (depth3dShadeSlider) depth3dShadeSlider.input(handleDepth3dChange);
  if (depth3dMotionCheckbox) depth3dMotionCheckbox.changed(handleDepth3dChange);
  if (depth3dHighlightCheckbox) depth3dHighlightCheckbox.changed(handleDepth3dChange);
  if (bgFileInput) bgFileInput.changed(handleBackgroundImages);
  if (bgColorPicker) bgColorPicker.input(handleBgColorChange);

  if (prevBgBtn) prevBgBtn.mousePressed(prevBackground);
  if (nextBgBtn) nextBgBtn.mousePressed(nextBackground);
  if (noBgBtn) noBgBtn.mousePressed(removeBackground);

  if (fontSizeSlider) fontSizeSlider.input(updateSliderValues);
  if (lineSpacingSlider) lineSpacingSlider.input(updateSliderValues);
  if (letterSpacingSlider) letterSpacingSlider.input(updateSliderValues);
  if (alignSelect) alignSelect.changed(updateSliderValues);
  if (offsetXSlider) offsetXSlider.input(updateSliderValues);
  if (offsetYSlider) offsetYSlider.input(updateSliderValues);

  initFontSelect();
  handleCircleGrowControlChange();
  handleWaterControlChange();
  handleDepth3dChange();
  updateSliderValues();
  regenerateLayout();
}

function clampInt(n, min, max) {
  const v = Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.max(min, Math.min(max, v));
}

function getDotGridRowsCols() {
  // rows/cols: 由 UI 输入控制；同时确保总数不超过 2000
  const rowsRaw = dotGridRowsInput ? parseInt(dotGridRowsInput.value(), 10) : 4;
  const colsRaw = dotGridColsInput ? parseInt(dotGridColsInput.value(), 10) : 4;
  let rows = clampInt(rowsRaw, 1, 200);
  let cols = clampInt(colsRaw, 1, 200);

  let total = rows * cols;
  if (total > 2000) {
    cols = Math.max(1, Math.floor(2000 / rows));
    total = rows * cols;
  }
  return { rows, cols, total };
}

function syncDotGridTotal() {
  const { total } = getDotGridRowsCols();
  if (dotCountInput) dotCountInput.value(String(total));
  if (dotGridTotalValue) dotGridTotalValue.html(String(total));
}

function handleDotGridChange() {
  if (dotRowGapSlider) select('#dotRowGapValue')?.html(Number(dotRowGapSlider.value()).toFixed(2));
  if (dotColGapSlider) select('#dotColGapValue')?.html(Number(dotColGapSlider.value()).toFixed(2));
  syncDotGridTotal();
  if (!isCircleGrowEnabled()) return;
  initMotionDots();
  needsRedraw = true;
}

function draw() {
  const animate =
    isWaterMaterialEnabled() ||
    isRecording ||
    gifExportSession !== null ||
    explosionParticles.length > 0 ||
    explosionQueuedAtMs !== null ||
    isCircleGrowEnabled() ||
    (is3dDepthEnabled() && is3dMotionEnabled()) ||
    false;
  if (!needsRedraw && !animate) {
    frameCounter.html('静态模式 / Static');
    return;
  }

  needsRedraw = animate ? true : false;
  background(backgroundColor);

  if (currentBgIndex >= 0 && currentBgIndex < backgroundImages.length) {
    drawBackgroundImageCover(backgroundImages[currentBgIndex], 0, 0, width, height);
  }

  updateAndDrawGrowingCircles();
  if (isExplosionEnabled() && explosionParticles.length === 0 && explosionQueuedAtMs == null) {
    queueExplosion();
  }
  if (explosionQueuedAtMs != null && millis() >= explosionQueuedAtMs) {
    startExplosionNow();
  }
  drawAllLetters();
  updateAndDrawExplosionParticles();
  updateWordInfo();
  frameCounter.html(animate ? '动态模式 / Dynamic' : '静态模式 / Static');

  if (gifExportSession) {
    const g = gifExportSession;
    if (gifFrameCanvas && gifFrameCtx) {
      gifFrameCtx.clearRect(0, 0, gifFrameCanvas.width, gifFrameCanvas.height);
      gifFrameCtx.drawImage(mainCanvas.elt, 0, 0, gifFrameCanvas.width, gifFrameCanvas.height);
      g.gif.addFrame(gifFrameCanvas, { copy: true, delay: g.frameDelay });
    }
    g.frameAdded++;
    if (g.frameAdded >= g.maxFrames) {
      const session = gifExportSession;
      gifExportSession = null;
      gifFrameCanvas = null;
      gifFrameCtx = null;
      frameCounter.html('GIF 编码中… / Encoding GIF…');
      session.gif.render();
    }
  }
}

function drawBackgroundImageCover(img, x, y, targetW, targetH) {
  if (!img) return;
  const source = img.elt || img;
  const srcW = source.naturalWidth || source.videoWidth || source.width || img.width || 0;
  const srcH = source.naturalHeight || source.videoHeight || source.height || img.height || 0;
  if (!srcW || !srcH) {
    image(img, x, y, targetW, targetH);
    return;
  }

  const srcRatio = srcW / srcH;
  const dstRatio = targetW / targetH;
  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (srcRatio > dstRatio) {
    sw = srcH * dstRatio;
    sx = (srcW - sw) * 0.5;
  } else {
    sh = srcW / dstRatio;
    sy = (srcH - sh) * 0.5;
  }

  image(img, x, y, targetW, targetH, sx, sy, sw, sh);
}

function exportDynamicPoster3s() {
  if (!mainCanvas || !mainCanvas.elt || isRecording) return;
  const stream = mainCanvas.elt.captureStream(30);
  const chunks = [];
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }
  const recorder = new MediaRecorder(stream, { mimeType });
  isRecording = true;
  needsRedraw = true;
  if (export3sBtn) {
    export3sBtn.elt.disabled = true;
    export3sBtn.html('录制中 3s… / Recording 3s…');
  }

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dynamic-poster-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    isRecording = false;
    if (export3sBtn) {
      export3sBtn.elt.disabled = false;
      export3sBtn.html('导出动态海报 3s / Export motion 3s');
    }
    needsRedraw = true;
  };

  recorder.start();
  setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop();
  }, 3000);
}

function exportStaticPoster() {
  if (!mainCanvas || !mainCanvas.elt) return;
  const format = exportFormatStatic ? exportFormatStatic.value() : 'png';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `dot-a4-${stamp}`;
  const hi = getHiResExportCanvasSketch(mainCanvas.elt);
  if (format === 'gif') {
    exportGifSketch(`${baseName}-10s`);
    return;
  }
  if (format === 'jpeg') {
    const jpegUrl = hi.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = jpegUrl;
    a.download = `${baseName}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const a = document.createElement('a');
  a.href = hi.toDataURL('image/png');
  a.download = `${baseName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function getA4SizeSketch() {
  return exportOrientation === 'landscape'
    ? { w: CANVAS_A4_H, h: CANVAS_A4_W }
    : { w: CANVAS_A4_W, h: CANVAS_A4_H };
}

function getExportA4SizeSketch() {
  return exportOrientation === 'landscape'
    ? { w: EXPORT_A4_H, h: EXPORT_A4_W }
    : { w: EXPORT_A4_W, h: EXPORT_A4_H };
}

function getHiResExportCanvasSketch(sourceCanvas) {
  const s = getExportA4SizeSketch();
  const out = document.createElement('canvas');
  out.width = s.w;
  out.height = s.h;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, s.w, s.h);
  return out;
}

function applyOrientationSizeSketch() {
  const s = getA4SizeSketch();
  resizeCanvas(s.w, s.h);
  const container = document.getElementById('canvas-container');
  if (container) {
    container.style.aspectRatio = `${s.w} / ${s.h}`;
  }
  regenerateLayout();
  needsRedraw = true;
}

function exportGifSketch(baseName) {
  if (typeof GIF === 'undefined') {
    frameCounter.html('导出失败 / Failed：GIF 库未加载 / gif.js missing');
    return;
  }
  if (gifExportSession) {
    frameCounter.html('GIF 导出进行中 / GIF export in progress');
    return;
  }
  const tryStart = async () => {
    let workerUrl;
    try {
      const res = await fetch('../../hypha-01-new/gif.worker.js');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const workerText = await res.text();
      workerUrl = URL.createObjectURL(new Blob([workerText], { type: 'application/javascript' }));
    } catch (e) {
      frameCounter.html('无法加载 gif.worker.js / Cannot load worker');
      return;
    }
    const workerCount = Math.min(8, Math.max(4, navigator.hardwareConcurrency || 4));
    const gif = new GIF({
      workers: workerCount,
      quality: 12,
      width: mainCanvas.width,
      height: mainCanvas.height,
      workerScript: workerUrl,
      dither: 'FloydSteinberg-serpentine',
      repeat: 0
    });
    gifFrameCanvas = document.createElement('canvas');
    gifFrameCanvas.width = mainCanvas.width;
    gifFrameCanvas.height = mainCanvas.height;
    gifFrameCtx = gifFrameCanvas.getContext('2d', { alpha: true });
    gif.on('finished', blob => {
      URL.revokeObjectURL(workerUrl);
      gifFrameCanvas = null;
      gifFrameCtx = null;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      frameCounter.html('已导出 10s GIF / 10s GIF exported');
    });
    gif.on('progress', p => {
      frameCounter.html(`GIF 编码 / Encoding ${Math.round(p * 100)}%`);
    });
    gifExportSession = {
      gif,
      frameAdded: 0,
      maxFrames: 120,
      frameDelay: 83
    };
    needsRedraw = true;
    frameCounter.html('GIF 录制中 / Recording GIF：10s…');
  };
  tryStart().catch(err => {
    gifExportSession = null;
    gifFrameCanvas = null;
    gifFrameCtx = null;
    frameCounter.html(`GIF 导出失败 / Export failed: ${err && err.message ? err.message : String(err)}`);
  });
}

function handleTextChange() {
  layoutManager.parseText(textInput.value());
  regenerateLayout();
}

function handleColorChange() {
  textColor = colorPicker.value();
  needsRedraw = true;
}

function handleBgColorChange() {
  backgroundColor = bgColorPicker ? bgColorPicker.value() : '#ffffff';
  needsRedraw = true;
}

function handleWaterControlChange() {
  if (waterStrengthSlider) {
    select('#waterStrengthValue').html(waterStrengthSlider.value());
  }
  if (waterSpeedSlider) {
    select('#waterSpeedValue').html(waterSpeedSlider.value());
  }
  if (handFxSlider) {
    select('#handFxValue').html(handFxSlider.value());
  }
  needsRedraw = true;
}

function is3dDepthEnabled() {
  return !!(depth3dCheckbox && depth3dCheckbox.checked());
}

function is3dMotionEnabled() {
  return !!(depth3dMotionCheckbox && depth3dMotionCheckbox.checked());
}

function isBalloonEnabled() {
  return false;
}

function isBalloonBreathEnabled() {
  return false;
}

function isBalloonShineEnabled() {
  return false;
}

function getBalloonBreathScale() {
  return 1;
}

function handleBalloonChange() {
  // Balloon effect removed.
}

function getDepthLightAngleDegrees() {
  let base = parseFloat(depth3dAngleSlider?.value() || 128);
  if (is3dDepthEnabled() && is3dMotionEnabled()) {
    base += sin(millis() * 0.0007) * 22;
    base += sin(millis() * 0.0013 + 1.7) * 11;
  }
  return base;
}

function handleDepth3dChange() {
  const vLayers = select('#depth3dLayersValue');
  const vAngle = select('#depth3dAngleValue');
  const vShade = select('#depth3dShadeValue');
  if (vLayers && depth3dLayersSlider) vLayers.html(depth3dLayersSlider.value());
  if (vAngle && depth3dAngleSlider) vAngle.html(depth3dAngleSlider.value());
  if (vShade && depth3dShadeSlider) vShade.html(depth3dShadeSlider.value());
  needsRedraw = true;
}

function handleCircleGrowControlChange() {
  if (circleGrowSpeedSlider) {
    select('#circleGrowSpeedValue').html(circleGrowSpeedSlider.value());
  }
  // 用 rows*cols 自动同步 dotCountInput（由 grid 控制数量）
  syncDotGridTotal();
  if (!isCircleGrowEnabled()) {
    motionDots = [];
  } else {
    initMotionDots();
  }
  needsRedraw = true;
}

function adjustDots() {
  currentSeed = Math.floor(random(1, 1000000000));
  initMotionDots();
  needsRedraw = true;
}

function isWaterMaterialEnabled() {
  return !!(waterMaterialCheckbox && waterMaterialCheckbox.checked());
}

function isCircleGrowEnabled() {
  return !!(circleGrowCheckbox && circleGrowCheckbox.checked());
}

function isExplosionEnabled() {
  return !!(explosionCheckbox && explosionCheckbox.checked());
}

function triggerExplosion() {
  if (!isExplosionEnabled()) return;
  queueExplosion();
}

function queueExplosion() {
  explosionParticles = [];
  explosionQueuedAtMs = millis() + EXPLOSION_HOLD_MS;
  needsRedraw = true;
}

function startExplosionNow() {
  if (!isExplosionEnabled()) return;
  explosionParticles = [];
  explosionQueuedAtMs = null;
  lastExplosionTriggerFrame = frameCount;
  const strength = parseFloat(explosionStrengthSlider?.value() || '90');
  const speedMul = parseFloat(explosionSpeedSlider?.value() || '1.2');
  const baseCol = color(dotColorPicker ? dotColorPicker.value() : textColor || '#111111');
  const cr = red(baseCol);
  const cg = green(baseCol);
  const cb = blue(baseCol);
  const cfgs = layoutManager?.letterConfigs || [];
  if (!cfgs.length) return;
  const cx = width * 0.5;
  const cy = height * 0.5;
  for (const cfg of cfgs) {
    const font = cfg.font || pickLayoutFont();
    if (!font || typeof font.textToPoints !== 'function' || typeof font.textBounds !== 'function') continue;
    const glyph = cfg.letter || '';
    if (!glyph.trim()) continue;
    const size = layoutManager.fontSize;
    const bounds = font.textBounds(glyph, 0, 0, size);
    const originX = cfg.x - (bounds.x + bounds.w * 0.5);
    const originY = cfg.y - (bounds.y + bounds.h * 0.5);
    const pts = font.textToPoints(glyph, originX, originY, size, {
      sampleFactor: 0.22,
      simplifyThreshold: 0
    });
    for (const pt of pts) {
      const px = pt.x;
      const py = pt.y;
      const ang = atan2(py - cy, px - cx) + random(-0.5, 0.5);
      const spd = random(strength * 0.02, strength * 0.06) * speedMul;
      explosionParticles.push({
        x: px,
        y: py,
        vx: cos(ang) * spd + random(-0.6, 0.6),
        vy: sin(ang) * spd + random(-0.6, 0.6),
        g: random(0.02, 0.06) * speedMul,
        life: random(36, 68),
        age: 0,
        sz: random(2.2, 6.5),
        c: [cr, cg, cb]
      });
    }
  }
  needsRedraw = true;
}

function updateAndDrawExplosionParticles() {
  if (!explosionParticles.length) return;
  noStroke();
  const next = [];
  for (const p of explosionParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.g;
    p.vx *= 0.992;
    p.age += 1;
    const k = 1 - (p.age / p.life);
    if (k <= 0) continue;
    fill(p.c[0], p.c[1], p.c[2], 210 * k);
    circle(p.x, p.y, p.sz * (0.65 + k));
    next.push(p);
  }
  explosionParticles = next;
}

function updateAndDrawGrowingCircles() {
  if (!isCircleGrowEnabled()) return;

  const dotSize = parseFloat(circleGrowSpeedSlider?.value() || '18');
  const circleCol = dotColorPicker ? color(dotColorPicker.value()) : color(textColor || '#111111');
  const cr = red(circleCol);
  const cg = green(circleCol);
  const cb = blue(circleCol);

  if (motionDots.length === 0) {
    initMotionDots();
  }

  noStroke();
  for (let i = 0; i < motionDots.length; i++) {
    const d = motionDots[i];
    fill(cr, cg, cb, d.a * 0.25);
    circle(d.x + 1.2, d.y + 1.2, dotSize + 2);
    fill(cr, cg, cb, d.a);
    circle(d.x, d.y, dotSize);
  }
}

function initMotionDots() {
  motionDots = [];
  randomSeed(currentSeed + 177);
  const { rows, cols, total } = getDotGridRowsCols();
  const rowGapScale = dotRowGapSlider ? parseFloat(dotRowGapSlider.value()) : 1;
  const colGapScale = dotColGapSlider ? parseFloat(dotColGapSlider.value()) : 1;

  // 用字形分布来决定网格 bbox，保证“行列整齐”同时落在字附近。
  let x0 = 4;
  let x1 = width - 4;
  let y0 = 4;
  let y1 = height - 4;
  const cfgs = layoutManager?.letterConfigs || [];
  if (cfgs.length) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of cfgs) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
    const padX = Math.max(60, layoutManager.fontSize * 0.7);
    const padY = Math.max(60, layoutManager.fontSize * 0.9);
    x0 = constrain(minX - padX, 4, width - 4);
    x1 = constrain(maxX + padX, 4, width - 4);
    y0 = constrain(minY - padY, 4, height - 4);
    y1 = constrain(maxY + padY, 4, height - 4);
  }

  // 为了“行/列严格对齐”，这里不做任何随机抖动。
  const jitter = 0;
  const centerX = (x0 + x1) * 0.5;
  const centerY = (y0 + y1) * 0.5;
  const spanX = Math.max(8, x1 - x0);
  const spanY = Math.max(8, y1 - y0);
  const baseStepX = spanX / Math.max(1, cols);
  const baseStepY = spanY / Math.max(1, rows);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const rowOffset = (r - (rows - 1) * 0.5) * baseStepY * rowGapScale;
    for (let c = 0; c < cols; c++) {
      const colOffset = (c - (cols - 1) * 0.5) * baseStepX * colGapScale;
      let cx = centerX + colOffset;
      let cy = centerY + rowOffset;
      // cx/cy 保持在网格中心点，无随机偏移。

      // 防止越界
      cx = constrain(cx, 4, width - 4);
      cy = constrain(cy, 4, height - 4);

      motionDots.push({
        x: cx,
        y: cy,
        a: random(120, 220),
      });

      idx++;
      if (idx >= total) break;
    }
    if (idx >= total) break;
  }
}

function initFontSelect() {
  // 侧栏只依赖 #fontList；勿因隐藏 select 未取到就整段跳过（否则样张列表为空）
  if (fontSelect) fontSelect.elt.innerHTML = '';
  if (fontList) fontList.elt.innerHTML = '';
  if (!fontFileNames.length) return;

  ensureFontPreviewFaces();
  fontFileNames.forEach((name, index) => {
    const cleanName = name.replace(/\.ttf$/i, '');
    if (fontSelect) fontSelect.option(cleanName, String(index));
    if (fontList) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cleanName;
      btn.style.fontFamily = `"font-preview-${index}", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      btn.dataset.index = String(index);
      btn.addEventListener('click', () => {
        currentFontIndex = index;
        if (fontSelect) fontSelect.value(String(index));
        persistSelectedFontIndex(currentFontIndex);
        updateFontListActiveState();
        regenerateLayout();
      });
      li.appendChild(btn);
      fontList.elt.appendChild(li);
    }
  });
  const savedIndex = getSavedFontIndex();
  currentFontIndex = clampFontIndex(savedIndex);
  if (fontSelect) fontSelect.value(String(currentFontIndex));
  persistSelectedFontIndex(currentFontIndex);
  updateFontListActiveState();
}

function ensureFontPreviewFaces() {
  const base = new URL('fonts/ttf/', window.location.href).href;
  const css = fontFileNames.map((fileName, index) => {
    const u = new URL(fileName, base).href;
    return `@font-face { font-family: "font-preview-${index}"; src: url("${u}") format("truetype"); font-display: swap; }`;
  }).join('\n');
  if (!fontPreviewStyleEl) {
    fontPreviewStyleEl = document.createElement('style');
    document.head.appendChild(fontPreviewStyleEl);
  }
  fontPreviewStyleEl.textContent = css;
}

function handleFontChange() {
  if (!fontSelect) return;
  const selectedIndex = parseInt(fontSelect.value(), 10);
  currentFontIndex = clampFontIndex(Number.isNaN(selectedIndex) ? 0 : selectedIndex);
  persistSelectedFontIndex(currentFontIndex);
  updateFontListActiveState();
  regenerateLayout();
}

function clampFontIndex(index) {
  if (!fontFileNames.length) return 0;
  const n = Number.isInteger(index) ? index : 0;
  return Math.max(0, Math.min(fontFileNames.length - 1, n));
}

function getSavedFontIndex() {
  try {
    const raw = window.localStorage.getItem(FONT_INDEX_STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch (_) {
    return 0;
  }
}

function persistSelectedFontIndex(index) {
  try {
    window.localStorage.setItem(FONT_INDEX_STORAGE_KEY, String(index));
  } catch (_) {
    // Ignore storage write errors (e.g. private mode).
  }
}

function updateFontListActiveState() {
  if (!fontList) return;
  const items = fontList.elt.querySelectorAll('button');
  items.forEach((item) => {
    item.classList.toggle('is-active', parseInt(item.dataset.index, 10) === currentFontIndex);
  });
}

function updateSliderValues() {
  const fontSize = fontSizeSlider ? parseInt(fontSizeSlider.value()) : 200;
  const lineSpacing = lineSpacingSlider ? parseFloat(lineSpacingSlider.value()) : 1.2;
  const letterSpacing = letterSpacingSlider ? parseFloat(letterSpacingSlider.value()) : 1.0;
  const alignment = alignSelect ? alignSelect.value() : 'center';
  const offsetX = offsetXSlider ? parseInt(offsetXSlider.value()) : 0;
  const offsetY = offsetYSlider ? parseInt(offsetYSlider.value()) : 0;

  const fontSizeValue = select('#fontSizeValue');
  const lineSpacingValue = select('#lineSpacingValue');
  const letterSpacingValue = select('#letterSpacingValue');
  const offsetXValue = select('#offsetXValue');
  const offsetYValue = select('#offsetYValue');
  if (fontSizeValue) fontSizeValue.html(fontSize);
  if (lineSpacingValue) lineSpacingValue.html(lineSpacing);
  if (letterSpacingValue) letterSpacingValue.html(letterSpacing);
  if (offsetXValue) offsetXValue.html(offsetX);
  if (offsetYValue) offsetYValue.html(offsetY);

  layoutManager.updateSettings(fontSize, lineSpacing, letterSpacing, alignment);
  layoutManager.updateOffsets(offsetX, offsetY);
  regenerateLayout();
}

function regenerateLayout() {
  layoutManager.parseText(textInput.value());
  if (layoutManager.textLines.length === 0) {
    layoutManager.parseText('DOT');
  }
  const selectedFont = pickLayoutFont();
  layoutManager.calculateLayout(width, height, currentSeed, false, selectedFont ? [selectedFont] : []);
  needsRedraw = true;
  // 字形布局变了时，如果圆点开启则同步重建网格圆点位置
  if (isCircleGrowEnabled()) {
    initMotionDots();
  }
}

function drawAllLetters() {
  if (isExplosionEnabled() && explosionParticles.length > 0) {
    return;
  }
  for (const config of layoutManager.letterConfigs) {
    push();
    if (gifExportSession) {
      const driftX = sin(frameCount * 0.11 + config.x * 0.01) * 1.8;
      const driftY = cos(frameCount * 0.09 + config.y * 0.01) * 1.3;
      translate(config.x + driftX, config.y + driftY);
    } else {
      translate(config.x, config.y);
    }
    if (isWaterMaterialEnabled()) {
      drawHandDrawnHoleLetter(config.letter, config.font, color(textColor));
    } else {
      drawPlainLetter(config.letter, config.font, color(textColor));
    }
    pop();
  }
}

function drawPlainLetter(letter, font, letterColor) {
  textSize(layoutManager.fontSize);
  textAlign(CENTER, CENTER);
  if (font) textFont(font);

  if (is3dDepthEnabled()) {
    drawExtrudedGlyph(letter, letterColor);
  } else {
    noStroke();
    fill(letterColor);
    text(letter, 0, 0);
  }
}

/**
 * 气球材质：由小到大多层半透明字形，模拟橡胶鼓胀（2D，非物理模拟）。
 */
function drawBalloonVolume(letter, letterColor) {
  // balloon removed: kept as dead code
  return;
  const puff01 = constrain(parseFloat(balloonPuffSlider?.value() || 52) / 100, 0.08, 1);
  const layerCount = Math.round(constrain(parseFloat(balloonLayersSlider?.value() || 10), 3, 26));
  const breath = getBalloonBreathScale();

  // 参考立体挤出：用同一个“光向角度”，让气球层也沿光向错位。
  const lightDeg = parseFloat(depth3dAngleSlider?.value() || 128) + (isBalloonBreathEnabled() ? sin(millis() * 0.0007) * 10 : 0);
  const angle = radians(lightDeg);
  const step = Math.max(0.35, layoutManager.fontSize * 0.0042) * puff01;
  const stepX = cos(angle) * step;
  const stepY = sin(angle) * step;

  const tr = red(letterColor);
  const tg = green(letterColor);
  const tb = blue(letterColor);
  const seed = (letter.charCodeAt(0) || 65) * 0.07;

  // 前大后小：前景（靠近观者）尺度更大、颜色更亮；背景层更小、更暗、更透明。
  const maxScale = 1 + puff01 * 0.24 * breath;
  const minScale = 1 + puff01 * 0.03;

  noStroke();
  for (let i = layerCount; i >= 1; i--) {
    const backT = i / layerCount; // back: 1 -> front: ~0
    const frontT = 1 - backT; // front: 1

    const wobble = 1 + (noise(seed, backT * 3.5, millis() * 0.00025) - 0.5) * 0.05;
    const s = lerp(minScale, maxScale, pow(frontT, 1.05)) * wobble;
    const ox = stepX * pow(backT, 0.9);
    const oy = stepY * pow(backT, 0.9);

    const bodyCol = lerpColor(
      color(constrain(tr * 0.62, 0, 255), constrain(tg * 0.62, 0, 255), constrain(tb * 0.62, 0, 255)),
      color(tr, tg, tb),
      pow(frontT, 0.55)
    );

    const alpha = constrain(20 + pow(frontT, 0.65) * 200, 18, 220);

    push();
    translate(ox, oy);
    scale(s);
    fill(red(bodyCol), green(bodyCol), blue(bodyCol), alpha);
    text(letter, 0, 0);
    pop();
  }

  // 额外一圈“回边”暗影：让气球边缘更像你图里的立体胶面。
  const backEdgeOx = stepX * 0.55;
  const backEdgeOy = stepY * 0.55;
  push();
  translate(backEdgeOx, backEdgeOy);
  noStroke();
  fill(constrain(tr * 0.25, 0, 255), constrain(tg * 0.25, 0, 255), constrain(tb * 0.25, 0, 255), 55);
  text(letter, 0, 0);
  pop();
}

/** 气球受光：沿光向移动的柔光斑（SCREEN），略偏粉白像乳胶气球。 */
function drawBalloonSpecular(letter, letterColor) {
  // balloon removed: kept as dead code
  return;
  const fs = layoutManager.fontSize;
  const tr = red(letterColor);
  const tg = green(letterColor);
  const tb = blue(letterColor);

  const lightDeg = parseFloat(depth3dAngleSlider?.value() || 128);
  const angle = radians(lightDeg);
  const breathDrift = isBalloonBreathEnabled()
    ? sin(millis() * 0.0014 + (letter.charCodeAt(0) || 0) * 0.02) * fs * 0.02
    : 0;

  // 类似立体版：把高光放到“与挤出方向相反”的一侧。
  const cx = -cos(angle) * fs * 0.115 + breathDrift;
  const cy = -sin(angle) * fs * 0.205 + breathDrift * 0.6;

  push();
  translate(cx, cy);
  blendMode(SCREEN);
  noStroke();

  // 主柔光
  fill(255, 218, 236, 78);
  ellipse(0, 0, fs * 0.46, fs * 0.31);

  // 白色亮斑
  fill(255, 255, 255, 110);
  ellipse(-fs * 0.05, -fs * 0.06, fs * 0.23, fs * 0.15);

  // 彩色余光
  fill(min(255, tr + 125), min(255, tg + 135), min(255, tb + 145), 42);
  ellipse(fs * 0.03, fs * 0.02, fs * 0.13, fs * 0.085);

  // 边缘高光细条（更像胶面反射）
  // 用“高光文本”代替矩形，让反射只出现在字形里。
  blendMode(ADD);
  fill(255, 245, 250, 55);
  textSize(fs * 1.01);
  text(letter, -fs * 0.028, -fs * 0.018);
  fill(255, 255, 255, 35);
  textSize(fs * 1.00);
  text(letter, -fs * 0.012, -fs * 0.010);

  blendMode(BLEND);
  pop();
}

/**
 * 2.5D 挤出：多层阴影模拟斜光下的厚字块，与圆点/有机轮廓气质接近（非真 WEBGL 网格）。
 */
function drawExtrudedGlyph(letter, letterColor) {
  const layers = Math.round(constrain(parseFloat(depth3dLayersSlider?.value() || 9), 2, 24));
  const angle = radians(getDepthLightAngleDegrees());
  const shadeAmt = constrain(parseFloat(depth3dShadeSlider?.value() || 58) / 100, 0.12, 0.96);
  const step = Math.max(0.32, layoutManager.fontSize * 0.0115);
  const stepX = cos(angle) * step;
  const stepY = sin(angle) * step;
  const tr = red(letterColor);
  const tg = green(letterColor);
  const tb = blue(letterColor);
  const specOn = !!(depth3dHighlightCheckbox && depth3dHighlightCheckbox.checked());

  noStroke();
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const dark = lerpColor(
      color(tr, tg, tb),
      color(constrain(tr * 0.14, 0, 255), constrain(tg * 0.14, 0, 255), constrain(tb * 0.14, 0, 255)),
      t * shadeAmt
    );
    fill(dark);
    text(letter, i * stepX, i * stepY);
  }

  fill(letterColor);
  text(letter, 0, 0);

  if (specOn) {
    push();
    blendMode(ADD);
    noStroke();
    fill(min(255, tr + 55), min(255, tg + 70), min(255, tb + 85), 32);
    text(letter, -stepX * 0.42, -stepY * 0.42);
    fill(min(255, tr + 35), min(255, tg + 45), min(255, tb + 55), 18);
    text(letter, -stepX * 0.22, -stepY * 0.22);
    blendMode(BLEND);
    pop();
  }
}

function drawHandDrawnHoleLetter(letter, font, baseColor) {
  const jitterStrength = (parseFloat(waterStrengthSlider?.value() || 55) / 100);
  const edgeDensity = (parseFloat(waterSpeedSlider?.value() || 45) / 100);
  const handFxStrength = (parseFloat(handFxSlider?.value() || 55) / 100);
  const t = millis() * 0.001;
  const r = red(baseColor);
  const g = green(baseColor);
  const b = blue(baseColor);
  const jitter = 0.8 + jitterStrength * 4.6;
  const loops = 2 + Math.round(edgeDensity * 4);
  const sampleStep = Math.max(0.02, 0.08 - edgeDensity * 0.05);

  textSize(layoutManager.fontSize);
  textAlign(CENTER, CENTER);
  if (font) textFont(font);

  const pts = font?.textToPoints
    ? font.textToPoints(letter, -layoutManager.fontSize * 0.3, layoutManager.fontSize * 0.32, layoutManager.fontSize, {
        sampleFactor: sampleStep,
        simplifyThreshold: 0,
      })
    : [];

  if (!pts.length) {
    drawPlainLetter(letter, font, baseColor);
    return;
  }

  // Decorative layers first.
  noFill();
  for (let layer = 0; layer < loops; layer++) {
    beginShape();
    stroke(r, g, b, 120 - layer * 16);
    strokeWeight(1.0 + jitterStrength * 1.8 - layer * 0.15);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const n = noise(p.x * 0.03, p.y * 0.03, t + layer * 0.2);
      const a = TWO_PI * n;
      const ox = cos(a) * jitter * (0.45 + layer * 0.15);
      const oy = sin(a) * jitter * (0.45 + layer * 0.15);
      curveVertex(p.x + ox, p.y + oy);
    }
    endShape(CLOSE);
  }

  // Tiny specks near contour.
  noStroke();
  const specks = Math.floor(20 + edgeDensity * 70);
  for (let i = 0; i < specks; i++) {
    const idx = Math.floor(random(pts.length));
    const p = pts[idx];
    fill(r, g, b, random(24, 80));
    circle(
      p.x + random(-jitter * 0.9, jitter * 0.9),
      p.y + random(-jitter * 0.9, jitter * 0.9),
      random(0.7, 1.8)
    );
  }

  // Always keep the base glyph unchanged and readable.
  drawPlainLetter(letter, font, baseColor);
}

function updateWordInfo() {
  if (!wordInfo) return;
  wordInfo.html(layoutManager.getLayoutInfo());
}

function handleBackgroundImages() {
  const files = bgFileInput.elt.files;
  if (!files.length) return;

  backgroundImages = builtinBackgroundImages.slice();
  let processedCount = 0;
  let successCount = 0;
  const builtinCount = backgroundImages.length;
  const inputEl = bgFileInput.elt;

  const finalizeOne = () => {
    processedCount++;
    if (processedCount !== files.length) return;
    currentBgIndex = successCount > 0 ? builtinCount : -1;
    updateBgControls();
    needsRedraw = true;
    // 允许再次选择同一文件时也能触发 change 事件
    inputEl.value = '';
  };

  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.onload = function (e) {
      loadImage(
        e.target.result,
        (img) => {
          backgroundImages.push(img);
          successCount++;
          finalizeOne();
        },
        () => {
          finalizeOne();
        }
      );
    };
    reader.onerror = finalizeOne;
    reader.readAsDataURL(files[i]);
  }
}

function loadBuiltinBackgroundsAsync() {
  if (!BUILTIN_BG_FILES.length) return;
  const loaded = new Array(BUILTIN_BG_FILES.length);
  let done = 0;

  const finalizeOne = () => {
    done++;
    if (done !== BUILTIN_BG_FILES.length) return;
    builtinBackgroundImages = loaded.filter(Boolean);
    // 仅在用户尚未上传背景时注入内置背景，避免覆盖用户操作
    if (backgroundImages.length === 0 && currentBgIndex < 0) {
      backgroundImages = builtinBackgroundImages.slice();
      updateBgControls();
      needsRedraw = true;
    }
  };

  for (let i = 0; i < BUILTIN_BG_FILES.length; i++) {
    const bg = BUILTIN_BG_FILES[i];
    loadImage(
      `backgrounds/${bg}`,
      (img) => {
        loaded[i] = img;
        finalizeOne();
      },
      () => finalizeOne()
    );
  }
}

function prevBackground() {
  if (!backgroundImages.length) return;
  currentBgIndex = (currentBgIndex - 1 + backgroundImages.length) % backgroundImages.length;
  updateBgControls();
  needsRedraw = true;
}

function nextBackground() {
  if (!backgroundImages.length) return;
  currentBgIndex = (currentBgIndex + 1) % backgroundImages.length;
  updateBgControls();
  needsRedraw = true;
}

function removeBackground() {
  currentBgIndex = -1;
  updateBgControls();
  needsRedraw = true;
}

function updateBgControls() {
  if (backgroundImages.length > 0) {
    bgControls.style('display', 'block');
    if (currentBgIndex >= 0) {
      bgInfo.html(`第 ${currentBgIndex + 1} 张 / ${currentBgIndex + 1} of ${backgroundImages.length}`);
    } else {
      bgInfo.html(`未选用 / None · 共 ${backgroundImages.length} 张 / ${backgroundImages.length} images`);
    }
  } else {
    bgControls.style('display', 'none');
  }
}
