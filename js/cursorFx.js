let canvas, ctx;
let mode = 'default';
let mouseX = -100, mouseY = -100;
let ripples = [];
let scanY = 0;
let scanDir = 1;
let trailPoints = [];

export function initCursorCanvas() {
    canvas = document.getElementById('cursor-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        // Add trail point
        trailPoints.push({ x: mouseX, y: mouseY, age: 0 });
        if (trailPoints.length > 20) trailPoints.shift();
    }, { passive: true });
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

export function setCursorMode(newMode) {
    if (mode !== newMode) {
        mode = newMode;
        if (mode === 'water') ripples = [];
        if (mode === 'tech') trailPoints = [];
    }
}

export function getCursorMode() {
    return mode;
}

export function updateCursorFx(time) {
    if (!ctx || mode === 'default') {
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === 'water') drawWaterCursor(time);
    else if (mode === 'tech') drawTechCursor(time);
}

// --- Water Ripple Cursor ---

let lastSpawnTime = 0;

function drawWaterCursor(time) {
    // Spawn ripples periodically
    if (time * 1000 - lastSpawnTime > 80) {
        ripples.push({
            x: mouseX, y: mouseY,
            radius: 0,
            maxRadius: 35 + Math.random() * 25,
            alpha: 0.7,
            speed: 1.0 + Math.random() * 0.4,
        });
        if (ripples.length > 12) ripples.shift();
        lastSpawnTime = time * 1000;
    }

    // Draw water trail
    for (let i = 1; i < trailPoints.length; i++) {
        const p = trailPoints[i];
        const prev = trailPoints[i - 1];
        p.age++;
        if (p.age > 30) continue;
        const trailAlpha = (1 - p.age / 30) * 0.25;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(80, 180, 255, ${trailAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Draw ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.006;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
            ripples.splice(i, 1);
            continue;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(80, 180, 255, ${r.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 200, 255, ${r.alpha * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    // Center glow
    const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 20);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(mouseX - 20, mouseY - 20, 40, 40);

    // Center dot
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140, 220, 255, 0.6)';
    ctx.fill();
}

// --- Tech Crosshair Cursor ---

function drawTechCursor(time) {
    const size = 16;
    const gap = 5;
    const lineLen = 9;

    // Outer brackets
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.25)';
    ctx.lineWidth = 1;
    const bs = 7;

    ctx.beginPath();
    ctx.moveTo(mouseX - size, mouseY - size + bs);
    ctx.lineTo(mouseX - size, mouseY - size);
    ctx.lineTo(mouseX - size + bs, mouseY - size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX + size - bs, mouseY - size);
    ctx.lineTo(mouseX + size, mouseY - size);
    ctx.lineTo(mouseX + size, mouseY - size + bs);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX - size, mouseY + size - bs);
    ctx.lineTo(mouseX - size, mouseY + size);
    ctx.lineTo(mouseX - size + bs, mouseY + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX + size - bs, mouseY + size);
    ctx.lineTo(mouseX + size, mouseY + size);
    ctx.lineTo(mouseX + size, mouseY + size - bs);
    ctx.stroke();

    // Crosshair lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY - gap);
    ctx.lineTo(mouseX, mouseY - gap - lineLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY + gap);
    ctx.lineTo(mouseX, mouseY + gap + lineLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX - gap, mouseY);
    ctx.lineTo(mouseX - gap - lineLen, mouseY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mouseX + gap, mouseY);
    ctx.lineTo(mouseX + gap + lineLen, mouseY);
    ctx.stroke();

    // Scanning line
    scanY += scanDir * 0.6;
    if (scanY > size || scanY < -size) scanDir *= -1;

    ctx.beginPath();
    ctx.moveTo(mouseX - size, mouseY + scanY);
    ctx.lineTo(mouseX + size, mouseY + scanY);
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.fill();

    // Tech trail
    for (let i = 1; i < trailPoints.length; i++) {
        const p = trailPoints[i];
        p.age++;
        if (p.age > 15) continue;
        const alpha = (1 - p.age / 15) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
        ctx.fill();
    }
}
