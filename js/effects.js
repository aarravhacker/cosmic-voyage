import * as THREE from 'three';

export function createStationEnergy() {
    const count = 40;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 10;
        pos[i * 3] = 80 + Math.cos(a) * r;
        pos[i * 3 + 1] = 20 + (Math.random() - 0.5) * 8;
        pos[i * 3 + 2] = -120 + Math.sin(a) * r;
        speeds[i] = 0.3 + Math.random() * 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: 0x6688bb, size: 0.15, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false
    });

    return { points: new THREE.Points(geo, mat), speeds };
}

export function animateStationEnergy(data, time) {
    const pos = data.points.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += Math.sin(time * data.speeds[i] + i * 0.5) * 0.01;
        pos[i * 3 + 1] += Math.cos(time * data.speeds[i] * 0.8 + i) * 0.008;
    }
    data.points.geometry.attributes.position.needsUpdate = true;
}
