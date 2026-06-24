import * as THREE from 'three';

function snoise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

function fbmNoise(x, y, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += snoise(x * freq, y * freq) * amp;
        amp *= 0.5;
        freq *= 2.0;
    }
    return val;
}

function createRingTexture() {
    const size = 1024;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const imgData = ctx.createImageData(size, height);

    const bands = [
        { start: 0.00, end: 0.04, alpha: 0.0 },
        { start: 0.04, end: 0.08, alpha: 0.10 },
        { start: 0.08, end: 0.10, alpha: 0.0 },
        { start: 0.10, end: 0.15, alpha: 0.18 },
        { start: 0.15, end: 0.17, alpha: 0.0 },
        { start: 0.17, end: 0.28, alpha: 0.50 },
        { start: 0.28, end: 0.30, alpha: 0.05 },
        { start: 0.30, end: 0.38, alpha: 0.35 },
        { start: 0.38, end: 0.40, alpha: 0.0 },
        { start: 0.40, end: 0.50, alpha: 0.60 },
        { start: 0.50, end: 0.52, alpha: 0.06 },
        { start: 0.52, end: 0.60, alpha: 0.55 },
        { start: 0.60, end: 0.62, alpha: 0.0 },
        { start: 0.62, end: 0.72, alpha: 0.42 },
        { start: 0.72, end: 0.74, alpha: 0.0 },
        { start: 0.74, end: 0.82, alpha: 0.30 },
        { start: 0.82, end: 0.84, alpha: 0.0 },
        { start: 0.84, end: 0.92, alpha: 0.18 },
        { start: 0.92, end: 0.96, alpha: 0.08 },
        { start: 0.96, end: 1.00, alpha: 0.0 }
    ];

    for (let x = 0; x < size; x++) {
        const t = x / size;
        let alpha = 0;

        for (const band of bands) {
            if (t >= band.start && t < band.end) {
                const bt = (t - band.start) / (band.end - band.start);
                const edgeFade = Math.sin(bt * Math.PI);
                alpha = band.alpha * edgeFade;
                break;
            }
        }

        if (alpha < 0.01) {
            for (let y = 0; y < height; y++) {
                const idx = (y * size + x) * 4;
                imgData.data[idx] = 0;
                imgData.data[idx + 1] = 0;
                imgData.data[idx + 2] = 0;
                imgData.data[idx + 3] = 0;
            }
            continue;
        }

        for (let y = 0; y < height; y++) {
            const yt = y / height;

            const n1 = fbmNoise(x * 0.015 + yt * 3.0, yt * 8.0, 4);
            const n2 = fbmNoise(x * 0.04 + 100.0, yt * 12.0 + 50.0, 3);
            const n3 = snoise(x * 0.003 + n1 * 2.0, yt * 5.0);

            const detail = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

            const warmth = t * 0.15;
            const baseR = 155 + detail * 55 + warmth * 40;
            const baseG = 135 + detail * 45 + warmth * 25;
            const baseB = 100 + detail * 30;

            const grain = (Math.random() - 0.5) * 12;

            const edgeFadeY = 1.0 - Math.abs(yt - 0.5) * 2.0;
            const edgeFade = edgeFadeY * edgeFadeY;

            const finalAlpha = alpha * edgeFade;

            const idx = (y * size + x) * 4;
            imgData.data[idx] = Math.max(0, Math.min(255, baseR + grain));
            imgData.data[idx + 1] = Math.max(0, Math.min(255, baseG + grain));
            imgData.data[idx + 2] = Math.max(0, Math.min(255, baseB + grain));
            imgData.data[idx + 3] = Math.floor(finalAlpha * 255);
        }
    }

    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
}

export function createRings(planetPos) {
    const group = new THREE.Group();
    group.position.copy(planetPos);

    const ringTex = createRingTexture();

    const ringGeo = new THREE.RingGeometry(6.5, 14, 128, 16);

    const uv = ringGeo.attributes.uv;
    const pos = ringGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) {
        const x = pos.getX(i);
        const z = pos.getY(i);
        const r = Math.sqrt(x * x + z * z);
        const u = (r - 6.5) / (14 - 6.5);
        uv.setXY(i, u, 0.5);
    }

    const ringMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.92,
        metalness: 0.0,
        envMapIntensity: 0.3
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2.15;
    group.add(ring);

    const shadowGeo = new THREE.RingGeometry(6.5, 14, 128, 4);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2.15;
    shadow.position.y = -0.3;
    group.add(shadow);

    return group;
}

export function animateRings(rings) {
    rings.rotation.y += 0.001;
}
