let hyphaCanvas;
let maskGraphics;
let activeTips = [];
let occupied;
let running = false;
let timeTick = 0;
let backgroundImages = [];
let currentBgIndex = -1;
let activePalette;
const A4_W = 794;
const A4_H = 1123;
const EXPORT_A4_W = 2480;
const EXPORT_A4_H = 3508;
let exportOrientation = 'portrait';

/** @type {null | { gif: any, workerUrl: string, frameAdded: number, maxFrames: number, frameDelay: number, minFramesAfterDone: number, settledFrames: number }} */
let gifExportSession = null;
let gifOriginalGrowthSpeed = null;

const FONT_OPTIONS = [
    { family: 'EDNimpkish', label: 'ED Nimpkish' },
    { family: 'GTPressuraMonoItalic', label: 'GT Pressura Mono Italic' },
    { family: 'TTNormsBold', label: 'TT Norms Bold' },
    { family: 'LettersLavish', label: 'Letters Lavish' },
    { family: 'LettersTorn', label: 'Letters Torn' },
    { family: 'FlorRuinaFlor', label: 'Flor de Ruina Flor' },
    { family: 'FlorRuinaFractura', label: 'Flor de Ruina Fractura' },
    { family: 'FlorRuinaGermen', label: 'Flor de Ruina Germen' },
    { family: 'FlorRuinaRuina', label: 'Flor de Ruina Ruina' },
    { family: 'FlorRuinaSemilla', label: 'Flor de Ruina Semilla' },
    { family: 'OuvrieresGX', label: 'Ouvrieres GX' },
    { family: 'OuvrieresAffamees', label: 'Ouvrieres Affamees' },
    { family: 'OuvrieresAgricultrices', label: 'Ouvrieres Agricultrices' },
    { family: 'OuvrieresExploratrices', label: 'Ouvrieres Exploratrices' },
    { family: 'OuvrieresRassasiees', label: 'Ouvrieres Rassasiees' },
    { family: 'OuvrieresSoldates', label: 'Ouvrieres Soldates' }
];

const state = {
    text: 'GROW',
    fontFamily: 'EDNimpkish',
    fontSizeScale: 1.0,
    mutation: 1,
    growthSpeed: 120,
    branchRate: 0.06,
    letterSpacing: 1.0,
    strokeWeight: 1.2,
    maxTips: 1800,
    showFruiting: true,
    myceliumOn: true,
    colorizeOn: true
};

const GLOW_PALETTES = [
    {
        name: 'electric-blue',
        bg: [7, 10, 22],
        lines: [[78, 228, 255], [28, 126, 255], [163, 91, 255]],
        haze: [58, 124, 255]
    },
    {
        name: 'cyan-violet',
        bg: [8, 10, 24],
        lines: [[131, 246, 255], [58, 178, 255], [197, 120, 255]],
        haze: [80, 98, 245]
    },
    {
        name: 'bioluminescent-sea',
        bg: [5, 13, 20],
        lines: [[114, 255, 238], [32, 195, 255], [88, 116, 255]],
        haze: [30, 146, 221]
    }
];

function setup() {
    const s = getA4Size();
    hyphaCanvas = createCanvas(s.w, s.h);
    hyphaCanvas.parent('canvas-container');
    pixelDensity(1);
    strokeCap(ROUND);

    maskGraphics = createGraphics(width, height);
    maskGraphics.pixelDensity(1);
    occupied = new Uint8Array(width * height);

    initFontList();
    bindControls();
    regenerate();
}

function draw() {
    const capturingGif = gifExportSession != null;

    if (running && state.myceliumOn) {
        timeTick += 0.01;

        for (let i = 0; i < state.growthSpeed && activeTips.length > 0; i++) {
            const idx = floor(random(activeTips.length));
            stepTip(idx);
        }

        if (activeTips.length === 0) {
            running = false;
            updateStatus(capturingGif ? '生长完成，收尾帧中… / Growth done, finishing frames…' : '生长完成 / Growth complete');
        } else {
            updateStatus(`生长中 / Growing: ${activeTips.length} tips`);
        }
    }

    if (capturingGif) {
        const g = gifExportSession;
        g.gif.addFrame(hyphaCanvas.elt, { copy: true, delay: g.frameDelay });
        g.frameAdded++;

        const growthDone = activeTips.length === 0;
        if (growthDone) g.settledFrames++;

        const shouldStop = g.frameAdded >= g.maxFrames;

        if (shouldStop) {
            const session = gifExportSession;
            gifExportSession = null;
            updateStatus('GIF 编码中… / Encoding GIF…');
            session.gif.render();
        }
    } else if (!running || !state.myceliumOn) {
        return;
    }
}

function windowResized() {
    // Keep a fixed A4 drawing/export size across all viewport sizes.
    regenerate();
}

function bindControls() {
    const textInput = document.getElementById('hyphaText');
    const mutationSelect = document.getElementById('mutation');
    const growthInput = document.getElementById('growthSpeed');
    const branchInput = document.getElementById('branchRate');
    const spacingInput = document.getElementById('letterSpacing');
    const fontSizeScaleInput = document.getElementById('fontSizeScale');
    const strokeInput = document.getElementById('strokeWeight');
    const maxTipsInput = document.getElementById('maxTips');
    const growBtn = document.getElementById('growBtn');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const myceliumToggle = document.getElementById('toggleMycelium');
    const fruitingToggle = document.getElementById('toggleFruiting');
    const bgFileInput = document.getElementById('bgFile');
    const prevBgBtn = document.getElementById('prevBg');
    const nextBgBtn = document.getElementById('nextBg');
    const noBgBtn = document.getElementById('noBg');
    const colorizeToggle = document.getElementById('toggleColorize');
    const randomPaletteBtn = document.getElementById('randomPaletteBtn');
    const presetButtons = document.querySelectorAll('[data-preset]');
    const exportBtn = document.getElementById('exportBtn');
    const exportFormat = document.getElementById('exportFormat');
    const exportOrientationSelect = document.getElementById('exportOrientation');

    textInput.addEventListener('input', () => {
        state.text = textInput.value || 'GROW';
        // 输入文本后立即重建遮罩与生长种子，避免“输入后不显示”
        regenerate();
    });
    mutationSelect.addEventListener('change', () => state.mutation = parseFloat(mutationSelect.value));
    growthInput.addEventListener('input', () => state.growthSpeed = parseInt(growthInput.value, 10));
    branchInput.addEventListener('input', () => state.branchRate = parseFloat(branchInput.value));
    spacingInput.addEventListener('input', () => state.letterSpacing = parseFloat(spacingInput.value));
    if (fontSizeScaleInput) {
        fontSizeScaleInput.addEventListener('input', () => {
            state.fontSizeScale = parseFloat(fontSizeScaleInput.value);
            const v = document.getElementById('fontSizeScaleVal');
            if (v) v.textContent = state.fontSizeScale.toFixed(2);
            regenerate();
        });
    }
    strokeInput.addEventListener('input', () => state.strokeWeight = parseFloat(strokeInput.value));
    maxTipsInput.addEventListener('input', () => state.maxTips = parseInt(maxTipsInput.value, 10));

    growBtn.addEventListener('click', () => regenerate());
    resetBtn.addEventListener('click', () => resetScene());
    pauseBtn.addEventListener('click', () => {
        running = !running;
        pauseBtn.textContent = running ? '暂停 / Pause' : '继续 / Resume';
    });
    myceliumToggle.addEventListener('change', () => state.myceliumOn = myceliumToggle.checked);
    fruitingToggle.addEventListener('change', () => state.showFruiting = fruitingToggle.checked);
    colorizeToggle.addEventListener('change', () => {
        state.colorizeOn = colorizeToggle.checked;
        regenerate();
    });
    bgFileInput.addEventListener('change', handleBackgroundImages);
    prevBgBtn.addEventListener('click', prevBackground);
    nextBgBtn.addEventListener('click', nextBackground);
    noBgBtn.addEventListener('click', removeBackground);
    randomPaletteBtn.addEventListener('click', () => {
        activePalette = pickRandomPalette();
        regenerate();
    });

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    if (exportBtn && exportFormat) {
        exportBtn.addEventListener('click', () => {
            exportArtwork(exportFormat.value);
        });
    }
    if (exportOrientationSelect) {
        exportOrientationSelect.addEventListener('change', () => {
            exportOrientation = exportOrientationSelect.value === 'landscape' ? 'landscape' : 'portrait';
            applyOrientationSize();
        });
    }
}

function getA4Size() {
    return exportOrientation === 'landscape'
        ? { w: A4_H, h: A4_W }
        : { w: A4_W, h: A4_H };
}

function getExportA4Size() {
    return exportOrientation === 'landscape'
        ? { w: EXPORT_A4_H, h: EXPORT_A4_W }
        : { w: EXPORT_A4_W, h: EXPORT_A4_H };
}

function getHiResExportCanvas(sourceCanvas, bgHex) {
    const s = getExportA4Size();
    const out = document.createElement('canvas');
    out.width = s.w;
    out.height = s.h;
    const ctx = out.getContext('2d');
    if (bgHex) {
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, s.w, s.h);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, s.w, s.h);
    return out;
}

function applyOrientationSize() {
    const s = getA4Size();
    resizeCanvas(s.w, s.h);
    const container = document.getElementById('canvas-container');
    if (container) {
        container.style.aspectRatio = `${s.w} / ${s.h}`;
    }
    maskGraphics = createGraphics(width, height);
    maskGraphics.pixelDensity(1);
    occupied = new Uint8Array(width * height);
    regenerate();
}

function exportArtwork(format) {
    if (!hyphaCanvas || !hyphaCanvas.elt) {
        updateStatus('导出失败 / Export failed：画布未初始化 / canvas not ready');
        return;
    }

    const canvas = hyphaCanvas.elt;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `hypha-${stamp}`;
    const hi = getHiResExportCanvas(canvas, gifExportBackgroundHex());

    if (format === 'png') {
        downloadDataUrl(hi.toDataURL('image/png'), `${baseName}.png`);
        updateStatus('已导出高清 PNG / High-res PNG exported');
        return;
    }

    if (format === 'jpeg') {
        const jpegUrl = hi.toDataURL('image/jpeg', 0.95);
        downloadDataUrl(jpegUrl, `${baseName}.jpg`);
        updateStatus('已导出高清 JPEG / High-res JPEG exported');
        return;
    }

    if (format === 'gif') {
        exportGifRecording(baseName);
        return;
    }
}

function downloadDataUrl(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportGifRecording(baseName) {
    if (typeof GIF === 'undefined') {
        updateStatus('导出失败 / Failed：GIF 库未加载 / gif.js missing');
        return;
    }
    if (gifExportSession) {
        updateStatus('GIF 导出进行中 / GIF export in progress，请稍候 / please wait');
        return;
    }

    const tryStart = async () => {
        let workerUrl;
        try {
            const res = await fetch('./gif.worker.js');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const workerText = await res.text();
            workerUrl = URL.createObjectURL(new Blob([workerText], { type: 'application/javascript' }));
        } catch (e) {
            updateStatus('无法加载 gif.worker.js / Cannot load worker。请用本地服务器打开 / Use local server，勿用 file://');
            return;
        }

        gifOriginalGrowthSpeed = state.growthSpeed;
        state.growthSpeed = Math.max(20, Math.min(60, Math.round(state.growthSpeed * 0.45)));
        const growthInput = document.getElementById('growthSpeed');
        if (growthInput) growthInput.value = String(state.growthSpeed);
        regenerate();
        running = true;
        state.myceliumOn = true;
        const myc = document.getElementById('toggleMycelium');
        if (myc) myc.checked = true;
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.textContent = '暂停 / Pause';

        // Lock GIF frame size to A4 ratio (portrait/landscape).
        const a4 = getA4Size();
        const w = a4.w;
        const h = a4.h;
        const bgHex = gifExportBackgroundHex();

        const gif = new GIF({
            workers: 4,
            quality: 25,
            width: w,
            height: h,
            workerScript: workerUrl,
            background: bgHex,
            repeat: 0
        });

        gif.on('finished', blob => {
            URL.revokeObjectURL(workerUrl);
            const url = URL.createObjectURL(blob);
            downloadDataUrl(url, `${baseName}.gif`);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            if (gifOriginalGrowthSpeed != null) {
                state.growthSpeed = gifOriginalGrowthSpeed;
                const growthInput = document.getElementById('growthSpeed');
                if (growthInput) growthInput.value = String(gifOriginalGrowthSpeed);
                gifOriginalGrowthSpeed = null;
            }
            updateStatus('已导出生长 GIF / Growth GIF exported');
        });

        gif.on('progress', p => {
            updateStatus(`GIF 编码 / Encoding ${Math.round(p * 100)}%`);
        });

        gif.on('abort', () => {
            URL.revokeObjectURL(workerUrl);
            if (gifOriginalGrowthSpeed != null) {
                state.growthSpeed = gifOriginalGrowthSpeed;
                const growthInput = document.getElementById('growthSpeed');
                if (growthInput) growthInput.value = String(gifOriginalGrowthSpeed);
                gifOriginalGrowthSpeed = null;
            }
            updateStatus('GIF 已取消 / GIF cancelled');
        });

        gifExportSession = {
            gif,
            workerUrl,
            frameAdded: 0,
            maxFrames: 150,
            frameDelay: 67,
            minFramesAfterDone: 0,
            settledFrames: 0
        };

        updateStatus('GIF 录制中 / Recording GIF：10s…');
    };

    tryStart().catch(err => {
        gifExportSession = null;
        const msg = err && err.message ? err.message : String(err);
        updateStatus(`GIF 导出失败 / Export failed: ${msg}`);
    });
}

function gifExportBackgroundHex() {
    if (state.colorizeOn && activePalette && activePalette.bg && activePalette.bg.length >= 3) {
        const [r, g, b] = activePalette.bg;
        return rgbToHex(r, g, b);
    }
    return '#0f1115';
}

function rgbToHex(r, g, b) {
    const x = n => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
    return `#${x(r)}${x(g)}${x(b)}`;
}

function initFontList() {
    const list = document.getElementById('fontList');
    list.innerHTML = '';

    FONT_OPTIONS.forEach(option => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = option.label;
        btn.dataset.family = option.family;
        btn.style.fontFamily = `'${option.family}', sans-serif`;
        if (option.family === state.fontFamily) btn.classList.add('is-active');
        btn.addEventListener('click', async () => {
            state.fontFamily = option.family;
            list.querySelectorAll('button').forEach(b => {
                b.classList.toggle('is-active', b.dataset.family === option.family);
            });
            updateStatus(`加载字体中 / Loading font: ${option.label}`);
            const loaded = await ensureFontReady(option.family);
            if (!loaded) {
                updateStatus(`字体可能未加载 / Font may be unavailable: ${option.label}`);
            }
            regenerate();
        });
        li.appendChild(btn);
        list.appendChild(li);
    });
}

async function ensureFontReady(fontFamily) {
    if (!document.fonts || typeof document.fonts.load !== 'function') {
        return true;
    }
    try {
        await document.fonts.load(`24px "${fontFamily}"`);
        await document.fonts.load(`96px "${fontFamily}"`);
        return document.fonts.check(`24px "${fontFamily}"`);
    } catch (_) {
        return false;
    }
}

function applyPreset(name) {
    if (name === 'regular') {
        state.mutation = 0.8;
        state.growthSpeed = 90;
        state.branchRate = 0.04;
        state.strokeWeight = 1.1;
        state.maxTips = 1200;
    } else if (name === 'wild') {
        state.mutation = 1.3;
        state.growthSpeed = 130;
        state.branchRate = 0.08;
        state.strokeWeight = 1.2;
        state.maxTips = 1800;
    } else if (name === 'overgrown') {
        state.mutation = 1.9;
        state.growthSpeed = 180;
        state.branchRate = 0.12;
        state.strokeWeight = 1.35;
        state.maxTips = 2600;
    }

    document.getElementById('mutation').value = String(state.mutation);
    document.getElementById('growthSpeed').value = String(state.growthSpeed);
    document.getElementById('branchRate').value = String(state.branchRate);
    document.getElementById('strokeWeight').value = String(state.strokeWeight);
    document.getElementById('maxTips').value = String(state.maxTips);
    regenerate();
}

function resetScene() {
    drawBackgroundBase();
    activeTips = [];
    occupied.fill(0);
    updateStatus('已重置 / Reset，点击「生长 / Grow」开始 / tap Grow to start');
}

function regenerate() {
    resetScene();
    activePalette = pickRandomPalette();
    randomSeed(Date.now() % 100000);
    noiseSeed(Date.now() % 100000);
    renderTextMask();
    drawTextGuide();
    seedFromText();
    running = activeTips.length > 0;
    if (!running) {
        updateStatus('未检测到字形边缘 / No glyph edges detected，请更换字体或文字 / try another font or text');
    }
    document.getElementById('pauseBtn').textContent = '暂停 / Pause';
}

function renderTextMask() {
    const textSizePx = getAdaptiveCenteredTextSize(maskGraphics, state.text, state.letterSpacing);
    maskGraphics.background(0);
    maskGraphics.fill(255);
    maskGraphics.noStroke();
    maskGraphics.textAlign(CENTER, CENTER);
    maskGraphics.textFont(state.fontFamily);
    maskGraphics.textSize(textSizePx);
    maskGraphics.textLeading(textSizePx * 1.12);
    drawSpacedText(maskGraphics, state.text, width / 2, height / 2, state.letterSpacing, textSizePx);
    maskGraphics.loadPixels();
}

function drawTextGuide() {
    const textSizePx = getAdaptiveCenteredTextSize(this, state.text, state.letterSpacing);
    push();
    noStroke();
    fill(120, 128, 145, 150);
    textAlign(CENTER, CENTER);
    textFont(state.fontFamily);
    textSize(textSizePx);
    textLeading(textSizePx * 1.12);
    drawSpacedText(this, state.text, width / 2, height / 2, state.letterSpacing, textSizePx);
    pop();
}

function getAdaptiveCenteredTextSize(ctx, content, spacingRatio) {
    const lines = (content || '').split('\n');
    const maxW = width * 0.82;
    const maxH = height * 0.72;
    let size = min(width, height) * 0.28;
    const minSize = 36;

    while (size > minSize) {
        ctx.textSize(size);
        const lineHeight = size * 1.12;
        const totalHeight = max(1, lines.length) * lineHeight;
        let widest = 0;
        for (const line of lines) {
            widest = max(widest, measureLineWidth(ctx, line, spacingRatio));
        }
        if (widest <= maxW && totalHeight <= maxH) {
            break;
        }
        size -= 2;
    }
    const fitted = max(minSize, size);
    const scale = constrain(state.fontSizeScale || 1, 0.4, 2.2);
    const scaled = fitted * scale;
    return constrain(scaled, minSize * 0.5, min(width, height) * 0.75);
}

function drawSpacedText(ctx, content, cx, cy, spacingRatio, sizePx) {
    const lines = content.split('\n');
    const size = sizePx || min(width, height) * 0.28;
    const lineHeight = size * 1.12;
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = cy - totalHeight / 2;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const lineWidth = measureLineWidth(ctx, line, spacingRatio);
        let x = cx - lineWidth / 2;
        const y = startY + lineIdx * lineHeight;

        for (const ch of line) {
            const w = ctx.textWidth(ch);
            ctx.text(ch, x + w / 2, y);
            x += w * spacingRatio;
        }
    }
}

function measureLineWidth(ctx, line, spacingRatio) {
    if (!line || line.length === 0) return 0;
    let total = 0;
    for (const ch of line) {
        total += ctx.textWidth(ch) * spacingRatio;
    }
    return total;
}

function seedFromText() {
    const points = [];
    const cx = width / 2;
    const cy = height / 2;
    const stride = 3;

    for (let y = 2; y < height - 2; y += stride) {
        for (let x = 2; x < width - 2; x += stride) {
            if (!isMaskOn(x, y)) continue;
            if (isEdgePixel(x, y)) {
                points.push({ x, y });
            }
        }
    }

    shuffle(points, true);
    const seedCount = min(points.length, 800);
    for (let i = 0; i < seedCount; i++) {
        const p = points[i];
        const outward = atan2(p.y - cy, p.x - cx);
        const lenFactor = random();
        activeTips.push({
            x: p.x,
            y: p.y,
            sx: p.x,
            sy: p.y,
            angle: outward + random(-0.8, 0.8),
            width: state.strokeWeight + random(-0.2, 0.2),
            // 拉开长度分层：短枝很多，长枝少量
            energy: lenFactor < 0.15 ? random(260, 420) : random(70, 230),
            maxRadius: lenFactor < 0.15 ? random(220, 420) : random(60, 220),
            maxOffMask: floor(random(18, 65)),
            offMaskSteps: 0
        });
    }

    updateStatus(`已播种 / Seeded: ${activeTips.length} tips`);
}

function stepTip(idx) {
    const tip = activeTips[idx];
    if (!tip) return;

    const jitter = state.mutation * 0.35;
    const flow = map(noise(tip.x * 0.005, tip.y * 0.005, timeTick), 0, 1, -0.25, 0.25);
    tip.angle += flow + random(-jitter, jitter) * 0.1;

    const stepLen = random(0.8, 2.2);
    const nx = tip.x + cos(tip.angle) * stepLen;
    const ny = tip.y + sin(tip.angle) * stepLen;

    if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) {
        activeTips.splice(idx, 1);
        return;
    }

    const oidx = floor(ny) * width + floor(nx);
    if (occupied[oidx] > 3 && random() < 0.6) {
        activeTips.splice(idx, 1);
        return;
    }

    const cMain = getLineColor(nx, ny);
    const alphaBase = random(120, 215);
    const mainAlpha = state.colorizeOn ? alphaBase : random(80, 180);

    if (state.colorizeOn) {
        // 柔和晕染底层
        stroke(red(cMain), green(cMain), blue(cMain), mainAlpha * 0.18);
        strokeWeight(max(1.2, tip.width * 2.8));
        line(tip.x, tip.y, nx, ny);
    }

    stroke(state.colorizeOn ? red(cMain) : 255, state.colorizeOn ? green(cMain) : 255, state.colorizeOn ? blue(cMain) : 255, mainAlpha);
    strokeWeight(max(0.5, tip.width));
    line(tip.x, tip.y, nx, ny);
    occupied[oidx] = min(255, occupied[oidx] + 12);

    if (state.showFruiting && random() < 0.004) {
        noStroke();
        const cFruit = state.colorizeOn ? getLineColor(nx + random(-8, 8), ny + random(-8, 8)) : color(255);
        fill(red(cFruit), green(cFruit), blue(cFruit), state.colorizeOn ? 165 : 170);
        circle(nx, ny, random(1.5, 4.5));

        if (state.colorizeOn && random() < 0.7) {
            fill(red(cFruit), green(cFruit), blue(cFruit), 45);
            circle(nx, ny, random(4.5, 10.5));
        }
    }

    tip.x = nx;
    tip.y = ny;
    tip.energy -= 1;
    tip.width *= 0.997;

    const dFromSeed = dist(tip.sx, tip.sy, tip.x, tip.y);
    if (dFromSeed > tip.maxRadius) {
        tip.energy -= 6;
    }

    if (isMaskOn(tip.x, tip.y)) {
        tip.offMaskSteps = max(0, tip.offMaskSteps - 2);
    } else {
        tip.offMaskSteps += 1;
        if (tip.offMaskSteps > tip.maxOffMask) {
            tip.energy = -1;
        }
    }

    if (tip.energy <= 0 || tip.width < 0.35) {
        activeTips.splice(idx, 1);
        return;
    }

    if (activeTips.length < state.maxTips && random() < state.branchRate) {
        const childA = {
            x: tip.x,
            y: tip.y,
            angle: tip.angle + random(0.2, 0.8),
            width: tip.width * random(0.7, 0.95),
            energy: tip.energy * random(0.45, 0.75)
        };
        const childB = {
            x: tip.x,
            y: tip.y,
            angle: tip.angle - random(0.2, 0.8),
            width: tip.width * random(0.7, 0.95),
            energy: tip.energy * random(0.45, 0.75)
        };
        childA.sx = tip.sx;
        childA.sy = tip.sy;
        childA.maxRadius = tip.maxRadius * random(0.72, 1.06);
        childA.maxOffMask = floor(tip.maxOffMask * random(0.7, 1.05));
        childA.offMaskSteps = 0;

        childB.sx = tip.sx;
        childB.sy = tip.sy;
        childB.maxRadius = tip.maxRadius * random(0.72, 1.06);
        childB.maxOffMask = floor(tip.maxOffMask * random(0.7, 1.05));
        childB.offMaskSteps = 0;

        activeTips.push(childA, childB);
    }
}

function isMaskOn(x, y) {
    const idx = (floor(y) * width + floor(x)) * 4;
    const r = maskGraphics.pixels[idx];
    return r > 30;
}

function isEdgePixel(x, y) {
    const n1 = isMaskOn(x - 1, y);
    const n2 = isMaskOn(x + 1, y);
    const n3 = isMaskOn(x, y - 1);
    const n4 = isMaskOn(x, y + 1);
    return !(n1 && n2 && n3 && n4);
}

function updateStatus(text) {
    const status = document.getElementById('statusText');
    if (status) status.textContent = text;
}

function drawBackgroundBase() {
    const bg = (state.colorizeOn && activePalette) ? activePalette.bg : [15, 17, 21];
    background(bg[0], bg[1], bg[2]);
    if (currentBgIndex >= 0 && currentBgIndex < backgroundImages.length) {
        const img = backgroundImages[currentBgIndex];
        drawBackgroundImageCover(img, 0, 0, width, height);
    }
}

function drawBackgroundImageCover(img, x, y, targetW, targetH) {
    if (!img) return;
    const srcW = img.width || 0;
    const srcH = img.height || 0;
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

function handleBackgroundImages(event) {
    const input = event.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    backgroundImages = [];
    let processed = 0;
    let failed = 0;

    const finishOne = () => {
        processed++;
        if (processed !== files.length) return;

        if (backgroundImages.length > 0) {
            currentBgIndex = 0;
            updateBgInfo();
            regenerate();
            if (failed > 0) {
                updateStatus(`背景已载入 ${backgroundImages.length} 张，失败 ${failed} 张 / Loaded ${backgroundImages.length}, failed ${failed}`);
            } else {
                updateStatus(`背景已载入 ${backgroundImages.length} 张 / Loaded ${backgroundImages.length} backgrounds`);
            }
        } else {
            currentBgIndex = -1;
            updateBgInfo();
            regenerate();
            updateStatus('背景加载失败 / Failed to load selected images');
        }

        // Allow selecting the same file(s) again to retrigger change event.
        input.value = '';
    };

    files.forEach(file => {
        const reader = new FileReader();
        reader.onerror = () => {
            failed++;
            finishOne();
        };
        reader.onload = e => {
            loadImage(
                e.target.result,
                img => {
                    backgroundImages.push(img);
                    finishOne();
                },
                () => {
                    failed++;
                    finishOne();
                }
            );
        };
        reader.readAsDataURL(file);
    });
}

function prevBackground() {
    if (backgroundImages.length === 0) return;
    currentBgIndex = (currentBgIndex - 1 + backgroundImages.length) % backgroundImages.length;
    updateBgInfo();
    regenerate();
}

function nextBackground() {
    if (backgroundImages.length === 0) return;
    currentBgIndex = (currentBgIndex + 1) % backgroundImages.length;
    updateBgInfo();
    regenerate();
}

function removeBackground() {
    currentBgIndex = -1;
    updateBgInfo();
    regenerate();
}

function updateBgInfo() {
    const info = document.getElementById('bgInfo');
    if (!info) return;
    if (backgroundImages.length === 0) {
        info.textContent = '无背景 / No background';
        return;
    }
    if (currentBgIndex < 0) {
        info.textContent = `未选用 / None selected · 共 ${backgroundImages.length} 张 / ${backgroundImages.length} images`;
    } else {
        info.textContent = `第 ${currentBgIndex + 1} 张 / ${currentBgIndex + 1} of ${backgroundImages.length}`;
    }
}

function pickRandomPalette() {
    return random(GLOW_PALETTES);
}

function getLineColor(x, y) {
    if (!state.colorizeOn || !activePalette) return color(255);
    const n = noise(x * 0.0045, y * 0.0045, timeTick * 0.65);
    if (n < 0.34) return color(...activePalette.lines[0]);
    if (n < 0.67) return color(...activePalette.lines[1]);
    return color(...activePalette.lines[2]);
}
