let mask3d;
let fruitCanvas;
let fruitParticles = [];
let poreParticles = [];
let blotchParticles = [];
let startMillis = 0;
let autoRotate = true;
let yaw = 0;
let pitch = -0.18;
let camDist = 760;
let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let regenTimer = null;
let backgroundImages3d = [];
let currentBgIndex3d = -1;
let currentBgImage3d = null;
let sampledPalette3d = null;
const A4_W_3D = 794;
const A4_H_3D = 1123;
const EXPORT_A4_W_3D = 2480;
const EXPORT_A4_H_3D = 3508;
let exportOrientation3d = 'portrait';
let gifExportSession3d = null;
let gifPrevAutoRotate3d = null;
let gifFrameCanvas3d = null;
let gifFrameCtx3d = null;

const FONT_OPTIONS_3D = [
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

const state3d = {
    text: 'BOOM',
    fontFamily: 'EDNimpkish',
    fontSizeScale: 1.0,
    spacing: 0.95,
    density: 8,
    depth: 72,
    bulge: 8,
    poreRate: 0.26,
    growTime: 4,
    surfaceCtrl: 0.8,
    growthCtrl: 0.7
};

function setup() {
    const s = getA4Size3D();
    fruitCanvas = createCanvas(s.w, s.h, WEBGL);
    fruitCanvas.parent('canvas-container');
    pixelDensity(1);
    noStroke();

    mask3d = createGraphics(width, height);
    mask3d.pixelDensity(1);
    initUI3D();
    applyBackground3D();
    updateBgInfo3D();
    regenerate3D();
}

function draw() {
    // 透明清屏，让 canvasWrap3d 的 CSS 背景图可见
    clear();

    if (autoRotate) yaw += 0.0032;
    const camX = sin(yaw) * cos(pitch) * camDist;
    const camY = sin(pitch) * camDist * 0.82;
    const camZ = cos(yaw) * cos(pitch) * camDist;
    camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);

    ambientLight(150, 132, 120);
    directionalLight(255, 243, 230, -0.3, -0.2, -1);
    directionalLight(255, 190, 145, 0.5, 0.25, 0.6);
    pointLight(255, 140, 96, 220, -200, 280);

    const growthSpeedFactor = map(state3d.growthCtrl, 0, 1, 0.55, 1.75);
    const t = min(1, ((millis() - startMillis) * growthSpeedFactor) / (state3d.growTime * 1000));
    const ease = easeOutCubic(t);

    drawFruitingBodies(ease);
    drawBlotches(ease);
    drawPores(ease);

    if (gifExportSession3d) {
        const g = gifExportSession3d;
        if (gifFrameCanvas3d && gifFrameCtx3d) {
            renderCompositeFrame3D(gifFrameCtx3d, gifFrameCanvas3d.width, gifFrameCanvas3d.height, fruitCanvas.elt);
            g.gif.addFrame(gifFrameCanvas3d, { copy: true, delay: g.frameDelay });
        }
        g.frameAdded++;
        if (g.frameAdded >= g.maxFrames) {
            const session = gifExportSession3d;
            gifExportSession3d = null;
            gifFrameCanvas3d = null;
            gifFrameCtx3d = null;
            updateStatus3D('GIF 编码中… / Encoding GIF…');
            session.gif.render();
        }
    }
}

function windowResized() {
    // Keep a fixed A4 drawing/export size across all viewport sizes.
    regenerate3D();
}

function mousePressed() {
    dragging = true;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function mouseReleased() {
    dragging = false;
}

function mouseDragged() {
    if (!dragging) return;
    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;
    yaw += dx * 0.006;
    pitch = constrain(pitch + dy * 0.004, -0.85, 0.55);
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function initUI3D() {
    const list = document.getElementById('fontList');
    list.innerHTML = '';
    FONT_OPTIONS_3D.forEach(option => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = option.label;
        btn.dataset.family = option.family;
        btn.style.fontFamily = `'${option.family}', sans-serif`;
        if (option.family === state3d.fontFamily) btn.classList.add('is-active');
        btn.addEventListener('click', () => {
            state3d.fontFamily = option.family;
            list.querySelectorAll('button').forEach(b => {
                b.classList.toggle('is-active', b.dataset.family === option.family);
            });
            regenerate3D();
        });
        li.appendChild(btn);
        list.appendChild(li);
    });

    bindControl('fruitText', 'text', { isText: true, regenerate: true });
    bindControl('fontSize3d', 'fontSizeScale', { regenerate: true, displayId: 'fontSize3dVal', formatter: v => Number(v).toFixed(2) });
    bindControl('letterSpacing3d', 'spacing', { regenerate: true, displayId: 'letterSpacing3dVal', formatter: v => Number(v).toFixed(2) });
    bindControl('density3d', 'density', { regenerate: true, displayId: 'density3dVal', formatter: v => String(Math.round(v)) });
    bindControl('depth3d', 'depth', { regenerate: true, displayId: 'depth3dVal', formatter: v => String(Math.round(v)) });
    bindControl('bulge3d', 'bulge', { regenerate: true, displayId: 'bulge3dVal', formatter: v => Number(v).toFixed(1) });
    bindControl('poreRate3d', 'poreRate', { regenerate: true, displayId: 'poreRate3dVal', formatter: v => Number(v).toFixed(2) });
    bindControl('growTime3d', 'growTime', { regenerate: false, displayId: 'growTime3dVal', formatter: v => Number(v).toFixed(1) });
    bindControl('surfaceCtrl', 'surfaceCtrl', { regenerate: false, displayId: 'surfaceCtrlVal', formatter: v => Number(v).toFixed(2) });
    bindControl('growthCtrl', 'growthCtrl', { regenerate: false, displayId: 'growthCtrlVal', formatter: v => Number(v).toFixed(2) });

    document.getElementById('grow3dBtn').addEventListener('click', regenerate3D);
    document.getElementById('random3dBtn').addEventListener('click', randomize3D);
    document.getElementById('toggleRotateBtn').addEventListener('click', () => {
        autoRotate = !autoRotate;
        document.getElementById('toggleRotateBtn').textContent = autoRotate ? '暂停旋转 / Pause spin' : '继续旋转 / Resume spin';
    });
    const exportBtn = document.getElementById('exportBtn3d');
    const exportFormat = document.getElementById('exportFormat3d');
    const exportOrientation = document.getElementById('exportOrientation3d');
    if (exportBtn && exportFormat) {
        exportBtn.addEventListener('click', () => exportArtwork3D(exportFormat.value));
    }
    if (exportOrientation) {
        exportOrientation.addEventListener('change', () => {
            exportOrientation3d = exportOrientation.value === 'landscape' ? 'landscape' : 'portrait';
            applyOrientationSize3D();
        });
    }

    const bgFileInput = document.getElementById('bgFile3d');
    const prevBgBtn = document.getElementById('prevBg3d');
    const nextBgBtn = document.getElementById('nextBg3d');
    const noBgBtn = document.getElementById('noBg3d');
    if (bgFileInput) bgFileInput.addEventListener('change', handleBackgroundImages3D);
    if (prevBgBtn) prevBgBtn.addEventListener('click', prevBackground3D);
    if (nextBgBtn) nextBgBtn.addEventListener('click', nextBackground3D);
    if (noBgBtn) noBgBtn.addEventListener('click', removeBackground3D);

    syncControlDisplays();
}

function bindControl(id, key, options = {}) {
    const el = document.getElementById(id);
    if (!el) return;

    const isText = !!options.isText;
    const shouldRegenerate = !!options.regenerate;
    const displayId = options.displayId;
    const formatter = options.formatter || (v => String(v));

    el.addEventListener('input', () => {
        state3d[key] = isText ? (el.value || 'BOOM') : parseFloat(el.value);
        if (displayId) {
            const label = document.getElementById(displayId);
            if (label) label.textContent = formatter(el.value);
        }
        if (key === 'surfaceCtrl') {
            // Surface: 拉动时重采样背景色，更新菌斑/表面色系
            if (currentBgImage3d) {
                sampledPalette3d = extractPaletteFromImage3D(currentBgImage3d);
            }
            scheduleRegenerate();
            return;
        }
        if (key === 'growthCtrl') {
            // Growth: 只影响动态，不重建几何
            return;
        }
        if (shouldRegenerate) scheduleRegenerate();
    });
}

function randomize3D() {
    state3d.density = random([6, 7, 8, 9, 10, 11]);
    state3d.depth = random(52, 118);
    state3d.bulge = random(5, 14);
    state3d.poreRate = random(0.12, 0.48);
    state3d.growTime = random(2.2, 6.6);
    state3d.spacing = random(0.82, 1.2);
    state3d.fontSizeScale = random(0.8, 1.25);

    document.getElementById('density3d').value = String(floor(state3d.density));
    document.getElementById('depth3d').value = String(floor(state3d.depth));
    document.getElementById('bulge3d').value = state3d.bulge.toFixed(1);
    document.getElementById('poreRate3d').value = state3d.poreRate.toFixed(2);
    document.getElementById('growTime3d').value = state3d.growTime.toFixed(1);
    document.getElementById('letterSpacing3d').value = state3d.spacing.toFixed(2);
    document.getElementById('fontSize3d').value = state3d.fontSizeScale.toFixed(2);
    syncControlDisplays();
    regenerate3D();
}

function regenerate3D() {
    buildTextMask();
    buildFruitingGeometry();
    buildBlotchGeometry();
    startMillis = millis();
    updateStatus3D(`颗粒 / Particles ${fruitParticles.length} | 菌斑 / Blotch ${blotchParticles.length} | 孔洞 / Pores ${poreParticles.length}`);
}

function scheduleRegenerate() {
    if (regenTimer) clearTimeout(regenTimer);
    regenTimer = setTimeout(() => {
        regenerate3D();
        regenTimer = null;
    }, 140);
}

function syncControlDisplays() {
    setText('fontSize3dVal', Number(state3d.fontSizeScale).toFixed(2));
    setText('letterSpacing3dVal', Number(state3d.spacing).toFixed(2));
    setText('density3dVal', String(Math.round(state3d.density)));
    setText('depth3dVal', String(Math.round(state3d.depth)));
    setText('bulge3dVal', Number(state3d.bulge).toFixed(1));
    setText('poreRate3dVal', Number(state3d.poreRate).toFixed(2));
    setText('growTime3dVal', Number(state3d.growTime).toFixed(1));
    setText('surfaceCtrlVal', Number(state3d.surfaceCtrl).toFixed(2));
    setText('growthCtrlVal', Number(state3d.growthCtrl).toFixed(2));
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function handleBackgroundImages3D(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    backgroundImages3d = [];
    let loaded = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            backgroundImages3d.push(e.target.result);
            loaded++;
            if (loaded === files.length) {
                currentBgIndex3d = 0;
                applyBackground3D(true);
            }
        };
        reader.readAsDataURL(file);
    });
}

function prevBackground3D() {
    if (backgroundImages3d.length === 0) return;
    currentBgIndex3d = (currentBgIndex3d - 1 + backgroundImages3d.length) % backgroundImages3d.length;
    applyBackground3D(true);
}

function nextBackground3D() {
    if (backgroundImages3d.length === 0) return;
    currentBgIndex3d = (currentBgIndex3d + 1) % backgroundImages3d.length;
    applyBackground3D(true);
}

function removeBackground3D() {
    currentBgIndex3d = -1;
    currentBgImage3d = null;
    sampledPalette3d = null;
    applyBackground3D(false);
    updateBgInfo3D();
}

function applyBackground3D(extractPalette = false) {
    const wrap = document.getElementById('canvasWrap3d');
    if (!wrap) return;

    if (currentBgIndex3d < 0 || currentBgIndex3d >= backgroundImages3d.length) {
        wrap.style.backgroundImage = 'none';
        wrap.style.backgroundColor = '#f9733f';
        wrap.style.backgroundSize = 'cover';
        wrap.style.backgroundPosition = 'center';
        wrap.style.backgroundRepeat = 'no-repeat';
        updateBgInfo3D();
        return;
    }

    wrap.style.backgroundImage = `url("${backgroundImages3d[currentBgIndex3d]}")`;
    wrap.style.backgroundSize = 'cover';
    wrap.style.backgroundPosition = 'center';
    wrap.style.backgroundRepeat = 'no-repeat';
    updateBgInfo3D();

    if (extractPalette) {
        loadImage(backgroundImages3d[currentBgIndex3d], img => {
            currentBgImage3d = img;
            sampledPalette3d = extractPaletteFromImage3D(img);
            updateStatus3D(`已从背景取色 / Sampled ${sampledPalette3d.length} swatches from background`);
            regenerate3D();
        });
    }
}

function updateBgInfo3D() {
    const info = document.getElementById('bgInfo3d');
    if (!info) return;
    if (backgroundImages3d.length === 0) {
        info.textContent = '无背景 / No background';
        return;
    }
    if (currentBgIndex3d < 0) {
        info.textContent = `未选用 / None selected · 共 ${backgroundImages3d.length} 张 / ${backgroundImages3d.length} images`;
    } else {
        info.textContent = `第 ${currentBgIndex3d + 1} 张 / ${currentBgIndex3d + 1} of ${backgroundImages3d.length}`;
    }
}

function buildTextMask() {
    const textSizePx = getAdaptiveCenteredTextSize3D(mask3d, state3d.text, state3d.spacing);
    mask3d.background(0);
    mask3d.fill(255);
    mask3d.noStroke();
    mask3d.textAlign(CENTER, CENTER);
    mask3d.textFont(state3d.fontFamily);
    mask3d.textSize(textSizePx);
    drawSpacedText2D(mask3d, state3d.text, width / 2, height / 2, state3d.spacing, textSizePx);
    mask3d.loadPixels();
}

function buildFruitingGeometry() {
    fruitParticles = [];
    poreParticles = [];
    blotchParticles = [];
    randomSeed((Date.now() % 100000) + 17);
    noiseSeed((Date.now() % 100000) + 53);

    const step = floor(state3d.density);
    const zAmp = state3d.depth;

    for (let y = 3; y < height - 3; y += step) {
        for (let x = 3; x < width - 3; x += step) {
            if (!isMask3D(x, y)) continue;

            const nA = noise(x * 0.016, y * 0.016);
            const nB = noise(x * 0.032 + 120, y * 0.032 + 210);
            const keep = nA > map(state3d.poreRate, 0.05, 0.6, 0.12, 0.68);
            const px = x - width / 2;
            const py = y - height / 2;
            const pz = (nB - 0.5) * zAmp;

            if (keep) {
                fruitParticles.push({
                    x: px + random(-1.4, 1.4),
                    y: py + random(-1.4, 1.4),
                    z: pz,
                    s: state3d.bulge * random(0.8, 1.7),
                    t: random(0, 1)
                });
            } else if (random() < 0.85) {
                poreParticles.push({
                    x: px + random(-1.2, 1.2),
                    y: py + random(-1.2, 1.2),
                    z: pz + random(-2, 4),
                    s: state3d.bulge * random(0.25, 0.72),
                    t: random(0.1, 1)
                });
            }
        }
    }
}

function buildBlotchGeometry() {
    const strength = constrain(state3d.surfaceCtrl, 0, 1);
    if (strength < 0.05 || fruitParticles.length === 0) return;
    const count = floor(260 + strength * 980);
    for (let i = 0; i < count; i++) {
        const p = fruitParticles[floor(random(fruitParticles.length))];
        if (!p) continue;
        blotchParticles.push({
            x: p.x + random(-6, 6),
            y: p.y + random(-6, 6),
            z: p.z + random(-10, 10),
            s: random(2.8, 11.8) * (0.8 + strength * 1.8),
            t: random(0.02, 1)
        });
    }
}

function drawFruitingBodies(easeT) {
    // 主体保持白色，不再整体染色
    const base = color(245, 241, 235);
    ambientMaterial(red(base), green(base), blue(base));
    const spec = lerpColor(base, color(255, 250, 245), 0.35);
    specularMaterial(red(spec), green(spec), blue(spec));
    shininess(22);

    for (let i = 0; i < fruitParticles.length; i++) {
        const p = fruitParticles[i];
        const local = constrain((easeT - p.t) / 0.28, 0, 1);
        if (local <= 0) continue;
        const g = easeOutBack(local);
        const pulse = 1 + sin((frameCount + i) * 0.06) * 0.03;
        const growthShift = map(state3d.growthCtrl, 0, 1, 0.04, 0.45);
        const growthOffset = sin((frameCount * 0.02) + (p.x * 0.002) + (p.y * 0.002)) * growthShift;

        push();
        translate(p.x, p.y, p.z);
        ambientMaterial(red(base), green(base), blue(base));
        sphere(max(0.01, p.s * (g + growthOffset) * pulse), 10, 8);
        pop();
    }
}

function drawPores(easeT) {
    const poreBase = getPoreColor3D();
    ambientMaterial(red(poreBase), green(poreBase), blue(poreBase));
    const poreSpec = lerpColor(poreBase, color(255, 205, 170), 0.3);
    specularMaterial(red(poreSpec), green(poreSpec), blue(poreSpec));
    shininess(12);

    for (let i = 0; i < poreParticles.length; i++) {
        const p = poreParticles[i];
        const local = constrain((easeT - p.t) / 0.25, 0, 1);
        if (local <= 0) continue;
        const g = easeOutCubic(local);
        const growthPulse = 1 + sin((frameCount + i) * (0.03 + state3d.growthCtrl * 0.05)) * (0.03 + state3d.growthCtrl * 0.06);
        push();
        translate(p.x, p.y, p.z);
        sphere(max(0.01, p.s * g * growthPulse), 8, 6);
        pop();
    }
}

function drawBlotches(easeT) {
    if (!sampledPalette3d || blotchParticles.length === 0) return;
    const c = getPoreColor3D();
    const cHi = lerpColor(c, color(255, 238, 220), 0.1);
    ambientMaterial(red(cHi), green(cHi), blue(cHi));
    specularMaterial(red(c), green(c), blue(c));
    shininess(28);

    for (let i = 0; i < blotchParticles.length; i++) {
        const p = blotchParticles[i];
        const local = constrain((easeT - p.t) / 0.2, 0, 1);
        if (local <= 0) continue;
        const grow = easeOutCubic(local);
        const wobble = 1 + sin((frameCount + i) * (0.018 + state3d.growthCtrl * 0.08)) * (0.015 + state3d.growthCtrl * 0.1);
        push();
        translate(p.x, p.y, p.z);
        emissiveMaterial(red(c) * 0.2, green(c) * 0.2, blue(c) * 0.2);
        sphere(max(0.01, p.s * grow * wobble), 8, 7);
        pop();
    }
}

function getAdaptiveCenteredTextSize3D(ctx, content, spacingRatio) {
    const lines = (content || '').split('\n');
    const maxW = width * 0.82;
    const maxH = height * 0.72;
    let size = min(width, height) * 0.28;
    const minSize = 36;

    while (size > minSize) {
        ctx.textSize(size);
        const lineHeight = size * 1.1;
        const totalHeight = max(1, lines.length) * lineHeight;
        let widest = 0;
        for (const line of lines) {
            widest = max(widest, measureLineWidth2D(ctx, line, spacingRatio));
        }
        if (widest <= maxW && totalHeight <= maxH) {
            break;
        }
        size -= 2;
    }
    const fitted = max(minSize, size);
    const scale = constrain(state3d.fontSizeScale || 1, 0.4, 2.2);
    const scaled = fitted * scale;
    return constrain(scaled, minSize * 0.5, min(width, height) * 0.75);
}

function drawSpacedText2D(ctx, content, cx, cy, spacingRatio, sizePx) {
    const lines = content.split('\n');
    const size = sizePx || min(width, height) * 0.28;
    const lineHeight = size * 1.1;
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = cy - totalHeight / 2;

    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineWidth = measureLineWidth2D(ctx, line, spacingRatio);
        let x = cx - lineWidth / 2;
        const y = startY + li * lineHeight;

        for (const ch of line) {
            const w = ctx.textWidth(ch);
            ctx.text(ch, x + w / 2, y);
            x += w * spacingRatio;
        }
    }
}

function measureLineWidth2D(ctx, line, spacingRatio) {
    if (!line) return 0;
    let total = 0;
    for (const ch of line) total += ctx.textWidth(ch) * spacingRatio;
    return total;
}

function isMask3D(x, y) {
    const idx = (floor(y) * width + floor(x)) * 4;
    return mask3d.pixels[idx] > 30;
}

function easeOutCubic(t) {
    return 1 - pow(1 - t, 3);
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

function updateStatus3D(text) {
    const el = document.getElementById('status3d');
    if (el) el.textContent = text;
}

function exportArtwork3D(format) {
    if (!fruitCanvas || !fruitCanvas.elt) {
        updateStatus3D('导出失败 / Export failed：画布未初始化 / canvas not ready');
        return;
    }
    const canvas = fruitCanvas.elt;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `popcorn-a4-${stamp}`;
    const hi = getHiResExportCanvas3D(canvas);
    if (format === 'png') {
        downloadDataUrl3D(hi.toDataURL('image/png'), `${baseName}.png`);
        updateStatus3D('已导出高清 A4 PNG / High-res A4 PNG exported');
        return;
    }
    if (format === 'jpeg') {
        const jpegUrl = hi.toDataURL('image/jpeg', 0.95);
        downloadDataUrl3D(jpegUrl, `${baseName}.jpg`);
        updateStatus3D('已导出高清 A4 JPEG / High-res A4 JPEG exported');
        return;
    }
    if (format === 'gif') {
        exportGif3D(`${baseName}-10s`);
    }
}

function downloadDataUrl3D(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getA4Size3D() {
    return exportOrientation3d === 'landscape'
        ? { w: A4_H_3D, h: A4_W_3D }
        : { w: A4_W_3D, h: A4_H_3D };
}

function getExportA4Size3D() {
    return exportOrientation3d === 'landscape'
        ? { w: EXPORT_A4_H_3D, h: EXPORT_A4_W_3D }
        : { w: EXPORT_A4_W_3D, h: EXPORT_A4_H_3D };
}

function getHiResExportCanvas3D(sourceCanvas) {
    const s = getExportA4Size3D();
    const out = document.createElement('canvas');
    out.width = s.w;
    out.height = s.h;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    renderCompositeFrame3D(ctx, s.w, s.h, sourceCanvas);
    return out;
}

function getCanvasWrapBackgroundColor3D() {
    const wrap = document.getElementById('canvasWrap3d');
    if (!wrap) return '#f9733f';
    const css = window.getComputedStyle(wrap).backgroundColor;
    return css && css !== 'rgba(0, 0, 0, 0)' ? css : '#f9733f';
}

function drawBackgroundImageCover3D(ctx, img, targetW, targetH) {
    if (!img) return;
    const srcW = img.width || 0;
    const srcH = img.height || 0;
    if (!srcW || !srcH) return;
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
    const source = img.canvas || img.elt || img;
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

function renderCompositeFrame3D(ctx, targetW, targetH, sourceCanvas) {
    ctx.fillStyle = getCanvasWrapBackgroundColor3D();
    ctx.fillRect(0, 0, targetW, targetH);
    if (currentBgIndex3d >= 0 && currentBgImage3d) {
        drawBackgroundImageCover3D(ctx, currentBgImage3d, targetW, targetH);
    }
    ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
}

function applyOrientationSize3D() {
    const s = getA4Size3D();
    resizeCanvas(s.w, s.h);
    const container = document.getElementById('canvas-container');
    if (container) {
        container.style.aspectRatio = `${s.w} / ${s.h}`;
    }
    mask3d = createGraphics(width, height);
    mask3d.pixelDensity(1);
    regenerate3D();
}

function exportGif3D(baseName) {
    if (typeof GIF === 'undefined') {
        updateStatus3D('导出失败 / Failed：GIF 库未加载 / gif.js missing');
        return;
    }
    if (gifExportSession3d) {
        updateStatus3D('GIF 导出进行中 / GIF export in progress，请稍候 / please wait');
        return;
    }
    const tryStart = async () => {
        let workerUrl;
        try {
            const res = await fetch('../hypha-01-new/gif.worker.js');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const workerText = await res.text();
            workerUrl = URL.createObjectURL(new Blob([workerText], { type: 'application/javascript' }));
        } catch (e) {
            updateStatus3D('无法加载 gif.worker.js / Cannot load worker。请用本地服务器打开 / Use local server');
            return;
        }

        gifPrevAutoRotate3d = autoRotate;
        autoRotate = true;
        const rotateBtn = document.getElementById('toggleRotateBtn');
        if (rotateBtn) rotateBtn.textContent = '暂停旋转 / Pause spin';
        regenerate3D();
        const gif = new GIF({
            workers: 4,
            quality: 25,
            width: fruitCanvas.width,
            height: fruitCanvas.height,
            workerScript: workerUrl,
            repeat: 0
        });
        gifFrameCanvas3d = document.createElement('canvas');
        gifFrameCanvas3d.width = fruitCanvas.width;
        gifFrameCanvas3d.height = fruitCanvas.height;
        gifFrameCtx3d = gifFrameCanvas3d.getContext('2d', { alpha: true });
        gif.on('finished', blob => {
            URL.revokeObjectURL(workerUrl);
            gifFrameCanvas3d = null;
            gifFrameCtx3d = null;
            const url = URL.createObjectURL(blob);
            downloadDataUrl3D(url, `${baseName}.gif`);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            if (gifPrevAutoRotate3d != null) {
                autoRotate = gifPrevAutoRotate3d;
                gifPrevAutoRotate3d = null;
                const btn = document.getElementById('toggleRotateBtn');
                if (btn) btn.textContent = autoRotate ? '暂停旋转 / Pause spin' : '继续旋转 / Resume spin';
            }
            updateStatus3D('已导出 10s GIF / 10s GIF exported');
        });
        gif.on('progress', p => {
            updateStatus3D(`GIF 编码 / Encoding ${Math.round(p * 100)}%`);
        });
        gifExportSession3d = {
            gif,
            frameAdded: 0,
            maxFrames: 150,
            frameDelay: 67
        };
        updateStatus3D('GIF 录制中 / Recording GIF：10s…');
    };
    tryStart().catch(err => {
        gifExportSession3d = null;
        gifFrameCanvas3d = null;
        gifFrameCtx3d = null;
        if (gifPrevAutoRotate3d != null) {
            autoRotate = gifPrevAutoRotate3d;
            gifPrevAutoRotate3d = null;
            const btn = document.getElementById('toggleRotateBtn');
            if (btn) btn.textContent = autoRotate ? '暂停旋转 / Pause spin' : '继续旋转 / Resume spin';
        }
        updateStatus3D(`GIF 导出失败 / Export failed: ${err && err.message ? err.message : String(err)}`);
    });
}

function extractPaletteFromImage3D(img) {
    img.loadPixels();
    const samples = [];
    const tries = min(2200, floor((img.width * img.height) / 8));
    for (let i = 0; i < tries; i++) {
        const x = floor(random(img.width));
        const y = floor(random(img.height));
        const idx = (y * img.width + x) * 4;
        const r = img.pixels[idx];
        const g = img.pixels[idx + 1];
        const b = img.pixels[idx + 2];
        const a = img.pixels[idx + 3];
        if (a < 20) continue;
        const c = color(r, g, b);
        const sat = saturation(c);
        const bri = brightness(c);
        if (bri < 12) continue;
        samples.push({ c, sat, bri });
    }

    if (samples.length < 12) {
        return [color(243, 236, 226), color(255, 248, 238), color(245, 125, 72)];
    }

    samples.sort((a, b) => (b.sat * 0.8 + b.bri * 0.2) - (a.sat * 0.8 + a.bri * 0.2));
    const vivid = samples.slice(0, min(360, samples.length));
    const warm = vivid.filter(v => hue(v.c) < 55 || hue(v.c) > 340);
    const bright = samples.slice().sort((a, b) => b.bri - a.bri).slice(0, min(260, samples.length));

    const c1 = vivid[floor(random(vivid.length))].c;
    const c2 = (warm.length > 0 ? warm[floor(random(warm.length))].c : vivid[floor(random(vivid.length))].c);
    const c3 = bright[floor(random(bright.length))].c;
    return [c1, c2, c3];
}

function getSurfaceColor3D(seedOffset) {
    // 保留函数签名，主体固定白色
    return color(245, 241, 235);
}

function getPoreColor3D() {
    const fallback = color(241, 110, 56);
    if (!sampledPalette3d || sampledPalette3d.length < 3) return fallback;
    const k = constrain(state3d.surfaceCtrl * 0.92 + 0.22, 0, 1);
    const warm = sampledPalette3d[2];
    const shifted = lerpColor(warm, color(255, 120, 68), 0.22);
    return lerpColor(fallback, shifted, k);
}

