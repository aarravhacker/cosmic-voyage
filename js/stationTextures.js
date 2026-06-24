import * as THREE from 'three';

// === Simplex-style 2D noise (ported from shader) ===
function _mod289(x) { return x - Math.floor(x * (1 / 289)) * 289; }
function _permute(x) { return _mod289(((x * 34) + 1) * x); }

function snoise2D(vx, vy) {
    const Cx = 0.211324865405187;
    const Cy = 0.366025403784439;
    const Gx = -0.577350269189626;
    const Gy = 0.024390243902439;

    const i0 = Math.floor(vx + (vy * Cy));
    const j0 = Math.floor(vy + (vx * Cy));

    const x0 = vx - i0 + (i0 * Cx) + (j0 * Gx);
    const y0 = vy - j0 + (j0 * Cy) + (i0 * Gy);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + Cx;
    const y1 = y0 - j1 + Cy;
    const x2 = x0 - 1 + 2 * Cx;
    const y2 = y0 - 1 + 2 * Cy;

    const ii = _mod289(i0);
    const jj = _mod289(j0);

    let p0 = _permute(ii + _permute(jj));
    let p1 = _permute(ii + i1 + _permute(jj + j1));
    let p2 = _permute(ii + 1 + _permute(jj + 1));

    p0 = _mod289(p0);
    p1 = _mod289(p1);
    p2 = _mod289(p2);

    function grad(hash, gx, gy) {
        const h = hash & 7;
        const u = h < 4 ? gx : gy;
        const v = h < 4 ? gy : gx;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    let m0 = Math.max(0.5 - x0 * x0 - y0 * y0, 0);
    let m1 = Math.max(0.5 - x1 * x1 - y1 * y1, 0);
    let m2 = Math.max(0.5 - x2 * x2 - y2 * y2, 0);

    m0 *= m0; m0 *= m0;
    m1 *= m1; m1 *= m1;
    m2 *= m2; m2 *= m2;

    const t0 = 79.140625 * (grad(p0, x0, y0));
    const t1 = 79.140625 * (grad(p1, x1, y1));
    const t2 = 79.140625 * (grad(p2, x2, y2));

    return m0 * t0 + m1 * t1 + m2 * t2;
}

function fbm(x, y, octaves, lacunarity, gain) {
    octaves = octaves || 5;
    lacunarity = lacunarity || 2.0;
    gain = gain || 0.5;
    let value = 0;
    let amplitude = 0.5;
    let freq = 1;
    let shiftX = 100;
    let shiftY = 100;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * snoise2D(x * freq + shiftX, y * freq + shiftY);
        freq *= lacunarity;
        amplitude *= gain;
        shiftX += 31.7;
        shiftY += 47.3;
    }
    return value;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

// Seeded pseudo-random
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// === 1. createPanelNormalMap(size) ===
export function createPanelNormalMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base fill
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    const rng = seededRandom(42);

    // Large hull plates: 4x4 grid
    const gridCount = 4;
    const gridStep = size / gridCount;
    const thickBorder = Math.max(3, size / 200);

    for (let gy = 0; gy < gridCount; gy++) {
        for (let gx = 0; gx < gridCount; gx++) {
            // Slight color variation per plate
            const baseR = 120 + Math.floor(rng() * 16);
            const baseG = 120 + Math.floor(rng() * 16);
            const baseB = 240 + Math.floor(rng() * 15);
            const fillR = clamp(baseR, 0, 255);
            const fillG = clamp(baseG, 0, 255);
            const fillB = clamp(baseB, 0, 255);

            const px = gx * gridStep + thickBorder;
            const py = gy * gridStep + thickBorder;
            const pw = gridStep - thickBorder * 2;
            const ph = gridStep - thickBorder * 2;

            // Fill plate area with color variation
            ctx.fillStyle = `rgb(${fillR},${fillG},${fillB})`;
            ctx.fillRect(px, py, pw, ph);

            // 3x3 sub-panels inside each large plate
            const subGrid = 3;
            const subStepX = pw / subGrid;
            const subStepY = ph / subGrid;
            const thinBorder = Math.max(1, size / 600);

            ctx.strokeStyle = '#6666dd';
            ctx.lineWidth = thinBorder;

            for (let sy = 0; sy < subGrid; sy++) {
                for (let sx = 0; sx < subGrid; sx++) {
                    const spx = px + sx * subStepX + thinBorder;
                    const spy = py + sy * subStepY + thinBorder;
                    const spw = subStepX - thinBorder * 2;
                    const sph = subStepY - thinBorder * 2;

                    // Subtle per-sub-panel shade
                    const subShift = Math.floor(rng() * 6) - 3;
                    const sr = clamp(fillR + subShift, 0, 255);
                    const sg = clamp(fillG + subShift, 0, 255);
                    const sb = clamp(fillB + subShift, 0, 255);
                    ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
                    ctx.fillRect(spx, spy, spw, sph);

                    // Thin sub-panel border
                    ctx.strokeRect(spx, spy, spw, sph);
                }
            }

            // Large plate thick border
            ctx.strokeStyle = '#5555cc';
            ctx.lineWidth = thickBorder;
            ctx.strokeRect(px, py, pw, ph);
        }
    }

    // Rivet dots along panel edges
    const rivetSpacing = Math.max(12, size / 50);
    const rivetRadius = Math.max(1, size / 500);
    ctx.fillStyle = '#7070ee';

    for (let gy = 0; gy <= gridCount; gy++) {
        const y = gy * gridStep;
        for (let x = 0; x < size; x += rivetSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, rivetRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for (let gx = 0; gx <= gridCount; gx++) {
        const x = gx * gridStep;
        for (let y = 0; y < size; y += rivetSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, rivetRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Maintenance hatch panels: ~5% of area
    const hatchCount = Math.floor(0.05 * gridCount * gridCount);
    ctx.strokeStyle = '#5050bb';
    ctx.lineWidth = Math.max(1, size / 400);
    for (let h = 0; h < hatchCount; h++) {
        const hx = Math.floor(rng() * gridCount);
        const hy = Math.floor(rng() * gridCount);
        const cx = hx * gridStep + gridStep * 0.25 + rng() * gridStep * 0.3;
        const cy = hy * gridStep + gridStep * 0.25 + rng() * gridStep * 0.3;
        const hw = gridStep * (0.15 + rng() * 0.2);
        const hh = gridStep * (0.1 + rng() * 0.15);

        // Double-line border
        ctx.strokeRect(cx, cy, hw, hh);
        const inset = Math.max(2, size / 300);
        ctx.strokeRect(cx + inset, cy + inset, hw - inset * 2, hh - inset * 2);
    }

    // Micro detail: ~100 tiny random bumps
    ctx.fillStyle = '#7575f5';
    for (let i = 0; i < 100; i++) {
        const bx = rng() * size;
        const by = rng() * size;
        ctx.fillRect(bx, by, Math.max(1, size / 1024), Math.max(1, size / 1024));
    }

    // Subtle height variation using linear gradient overlay
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(130,130,255,0.06)');
    grad.addColorStop(0.5, 'rgba(110,110,240,0.03)');
    grad.addColorStop(1, 'rgba(140,140,255,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// === 2. createWearMap(size) ===
export function createWearMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base mid roughness
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    const rng = seededRandom(123);

    // Flow lines along X-axis: ~200 horizontal wavy paths
    for (let i = 0; i < 200; i++) {
        const baseY = rng() * size;
        const lineGray = 50 + Math.floor(rng() * 51);
        const lineWidth = 0.5 + rng() * 1.5;
        ctx.strokeStyle = `rgb(${lineGray},${lineGray},${lineGray})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        let x = 0;
        let y = baseY;
        ctx.moveTo(x, y);
        while (x < size) {
            x += 4 + rng() * 8;
            y = baseY + Math.sin(x * 0.02 + rng() * 6) * (3 + rng() * 5);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Heat discoloration zones: 3-4 circular areas
    const heatZones = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < heatZones; i++) {
        const hx = rng() * size;
        const hy = rng() * size;
        const hr = 30 + rng() * 30;
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        grad.addColorStop(0, '#606060');
        grad.addColorStop(1, '#909090');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Micro-meteorite pitting: ~150 random small dots
    for (let i = 0; i < 150; i++) {
        const dx = rng() * size;
        const dy = rng() * size;
        const dr = 1 + rng() * 2;
        ctx.fillStyle = '#404040';
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grime accumulation: darker patches in lower portions using fbm-like pattern
    for (let y = Math.floor(size * 0.5); y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
            const nx = x / size * 6;
            const ny = y / size * 6;
            const n = fbm(nx, ny, 4, 2.0, 0.5);
            const factor = smoothstep(0.5, 1.5, n + (y / size - 0.5) * 2);
            if (factor > 0.1) {
                const darkness = Math.floor(80 * factor);
                ctx.fillStyle = `rgba(80,80,80,${factor * 0.5})`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    // Scratches: ~100 random angled lines
    for (let i = 0; i < 100; i++) {
        const sx = rng() * size;
        const sy = rng() * size;
        const sLen = 5 + rng() * 25;
        const sAngle = rng() * Math.PI * 2;
        ctx.strokeStyle = '#707070';
        ctx.lineWidth = 0.5 + rng() * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(sAngle) * sLen, sy + Math.sin(sAngle) * sLen);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// === 3. createEmissiveMap(size) ===
export function createEmissiveMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base: no emissive
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const rng = seededRandom(777);

    // Window strips: horizontal rectangles in rows, warm white
    const windowRows = 6 + Math.floor(rng() * 4);
    for (let r = 0; r < windowRows; r++) {
        const rowY = Math.floor(rng() * size);
        const windowHeight = 2 + Math.floor(rng() * 3);
        const clusterCount = 3 + Math.floor(rng() * 3);
        let cx = Math.floor(rng() * size * 0.3);
        for (let c = 0; c < clusterCount; c++) {
            const windowWidth = 8 + Math.floor(rng() * 12);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx, rowY, windowWidth, windowHeight);
            cx += windowWidth + 2;
            if (cx >= size) break;
        }
    }

    // Status LEDs: ~30 dots in line patterns, alternating green/orange
    const ledGroups = 6;
    for (let g = 0; g < ledGroups; g++) {
        const gx = Math.floor(rng() * size * 0.6) + Math.floor(size * 0.1);
        const gy = Math.floor(rng() * size * 0.6) + Math.floor(size * 0.1);
        const ledCount = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < ledCount; i++) {
            const lx = gx + i * 5;
            const ly = gy;
            const color = i % 2 === 0 ? '#00ff44' : '#ff4400';
            ctx.fillStyle = color;
            ctx.fillRect(lx, ly, 2, 2);
        }
    }

    // Navigation lights: 3 larger circles
    const navLights = [
        { color: '#ff0000', x: 0, y: 0 },
        { color: '#00ff00', x: size - 1, y: 0 },
        { color: '#4488ff', x: size / 2, y: size / 2 }
    ];
    navLights.forEach(function(nl) {
        ctx.fillStyle = nl.color;
        ctx.beginPath();
        ctx.arc(nl.x, nl.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Docking guide: circular ring pattern at center
    const centerX = size / 2;
    const centerY = size / 2;
    const ringRadius = size * 0.15;
    const ringWidth = Math.max(1, size / 200);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = ringWidth * 0.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Cross hairs
    ctx.beginPath();
    ctx.moveTo(centerX - ringRadius * 0.8, centerY);
    ctx.lineTo(centerX + ringRadius * 0.8, centerY);
    ctx.moveTo(centerX, centerY - ringRadius * 0.8);
    ctx.lineTo(centerX, centerY + ringRadius * 0.8);
    ctx.stroke();

    // Landing pad indicators: rectangular outline near bottom
    const padWidth = size * 0.2;
    const padHeight = size * 0.1;
    const padX = (size - padWidth) / 2;
    const padY = size * 0.82;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, size / 300);
    ctx.strokeRect(padX, padY, padWidth, padHeight);

    // Inner rectangle
    const padInset = padWidth * 0.1;
    ctx.strokeRect(padX + padInset, padY + padInset, padWidth - padInset * 2, padHeight - padInset * 2);

    // Corner marks
    const markLen = padWidth * 0.08;
    ctx.lineWidth = Math.max(1, size / 256);
    ctx.beginPath();
    // Top-left
    ctx.moveTo(padX - markLen, padY); ctx.lineTo(padX + markLen, padY);
    ctx.moveTo(padX, padY - markLen); ctx.lineTo(padX, padY + markLen);
    // Top-right
    ctx.moveTo(padX + padWidth - markLen, padY); ctx.lineTo(padX + padWidth + markLen, padY);
    ctx.moveTo(padX + padWidth, padY - markLen); ctx.lineTo(padX + padWidth, padY + markLen);
    // Bottom-left
    ctx.moveTo(padX - markLen, padY + padHeight); ctx.lineTo(padX + markLen, padY + padHeight);
    ctx.moveTo(padX, padY + padHeight - markLen); ctx.lineTo(padX, padY + padHeight + markLen);
    // Bottom-right
    ctx.moveTo(padX + padWidth - markLen, padY + padHeight); ctx.lineTo(padX + padWidth + markLen, padY + padHeight);
    ctx.moveTo(padX + padWidth, padY + padHeight - markLen); ctx.lineTo(padX + padWidth, padY + padHeight + markLen);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// === 4. createColorMap(size) ===
export function createColorMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base gradient: top bluer, bottom warmer
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#556688');
    grad.addColorStop(0.45, '#445577');
    grad.addColorStop(0.55, '#556677');
    grad.addColorStop(1, '#4a5a6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const rng = seededRandom(555);

    // Panel variation: irregular rectangular regions with slight color offset
    const regionCount = 25 + Math.floor(rng() * 15);
    for (let i = 0; i < regionCount; i++) {
        const rx = Math.floor(rng() * size);
        const ry = Math.floor(rng() * size);
        const rw = 20 + Math.floor(rng() * 80);
        const rh = 20 + Math.floor(rng() * 80);
        const cr = Math.floor((rng() - 0.5) * 20);
        const cg = Math.floor((rng() - 0.5) * 20);
        const cb = Math.floor((rng() - 0.5) * 20);
        ctx.fillStyle = `rgba(${clamp(128 + cr, 0, 255)},${clamp(128 + cg, 0, 255)},${clamp(140 + cb, 0, 255)},0.15)`;
        ctx.fillRect(rx, ry, rw, rh);
    }

    // Grime streaks: ~30 vertical dark streaks
    for (let i = 0; i < 30; i++) {
        const sx = Math.floor(rng() * size);
        const sw = 3 + Math.floor(rng() * 6);
        const sLen = size * (0.15 + rng() * 0.35);
        const sy = Math.floor(rng() * (size - sLen));
        ctx.fillStyle = 'rgba(58,64,80,0.3)';
        for (let y = sy; y < sy + sLen; y += 2) {
            const widthVar = sw + Math.floor(Math.sin(y * 0.05) * 2);
            ctx.fillRect(sx - widthVar / 2, y, widthVar, 2);
        }
    }

    // Rust spots: ~15 orange-brown patches near "joints"
    for (let i = 0; i < 15; i++) {
        const rx = Math.floor(rng() * size);
        const ry = Math.floor(rng() * size);
        const rr = 3 + Math.floor(rng() * 6);
        const rustGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        rustGrad.addColorStop(0, 'rgba(138,96,64,0.7)');
        rustGrad.addColorStop(0.6, 'rgba(120,80,50,0.4)');
        rustGrad.addColorStop(1, 'rgba(100,70,45,0)');
        ctx.fillStyle = rustGrad;
        ctx.beginPath();
        ctx.arc(rx, ry, rr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Heat tinting: subtle blue-purple gradient patches (~5 areas)
    for (let i = 0; i < 5; i++) {
        const hx = Math.floor(rng() * size);
        const hy = Math.floor(rng() * size);
        const hr = 30 + Math.floor(rng() * 40);
        const hGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hGrad.addColorStop(0, 'rgba(74,85,128,0.12)');
        hGrad.addColorStop(1, 'rgba(74,85,128,0)');
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Weld lines: bright thin lines connecting some panels
    ctx.strokeStyle = '#708090';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        const wx1 = Math.floor(rng() * size);
        const wy1 = Math.floor(rng() * size);
        const wx2 = wx1 + Math.floor((rng() - 0.5) * 200);
        const wy2 = wy1 + Math.floor((rng() - 0.5) * 200);
        ctx.beginPath();
        ctx.moveTo(wx1, wy1);
        ctx.lineTo(wx2, wy2);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// === 5. createDishTexture(size) ===
export function createDishTexture(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base
    ctx.fillStyle = '#667788';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = Math.min(cx, cy) * 0.95;
    const rng = seededRandom(999);

    // Concentric rings: ~15 rings from center to edge
    const ringCount = 15;
    for (let i = 0; i < ringCount; i++) {
        const t = (i + 0.5) / ringCount;
        const r = t * maxR;
        const ringWidth = maxR / ringCount;
        const light = i % 2 === 0;
        ctx.strokeStyle = light ? '#889aab' : '#556677';
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Central dot: 5% of radius
    ctx.fillStyle = '#99aabb';
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Subtle radial gradient: brighter toward center
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    radGrad.addColorStop(0, 'rgba(180,190,200,0.15)');
    radGrad.addColorStop(0.5, 'rgba(160,170,180,0.05)');
    radGrad.addColorStop(1, 'rgba(140,150,160,0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();

    // Fine grain noise overlay using pixel manipulation
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist < maxR) {
                const noise = Math.floor((rng() - 0.5) * 10);
                data[idx] = clamp(data[idx] + noise, 0, 255);
                data[idx + 1] = clamp(data[idx + 1] + noise, 0, 255);
                data[idx + 2] = clamp(data[idx + 2] + noise, 0, 255);
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
