import * as THREE from 'three';
import { createPanelNormalMap, createWearMap, createEmissiveMap, createColorMap, createDishTexture } from './stationTextures.js';

function makeMat(color, metalness, roughness, opts) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        normalMap: opts && opts.normal || null,
        normalScale: opts && opts.ns || new THREE.Vector2(0.7, 0.7),
        roughnessMap: opts && opts.wear || null,
        map: opts && opts.colormap || null,
        emissive: opts && opts.emissive || 0x000000,
        emissiveIntensity: opts && opts.ei || 0,
        emissiveMap: opts && opts.emissiveMap || null,
        side: opts && opts.side || THREE.FrontSide,
        envMapIntensity: opts && opts.env || 2.0,
    });
}

function addBox(group, w, h, d, x, y, z, mat, ry, rx, rz) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    if (rx) m.rotation.x = rx;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
}

function addCyl(group, rT, rB, h, seg, x, y, z, mat, rx, ry) {
    const g = new THREE.CylinderGeometry(rT, rB, h, seg);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
}

function addSphere(group, r, wSeg, hSeg, x, y, z, mat) {
    const g = new THREE.SphereGeometry(r, wSeg, hSeg);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
}

function addTorus(group, R, r, rS, tS, x, y, z, mat, rx, ry, rz) {
    const g = new THREE.TorusGeometry(R, r, rS, tS);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    group.add(m);
    return m;
}

function addLight(group, color, intensity, dist, x, y, z, decay) {
    const l = new THREE.PointLight(color, intensity, dist, decay || 2);
    l.position.set(x, y, z);
    group.add(l);
    return l;
}

function buildArm(group, angle, length, mat, detailMat, redMat, normalMap, wearMap) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Arm spine
    addBox(group, 0.5, 0.35, length, cos * length * 0.5, 0, sin * length * 0.5, mat, angle);

    // Arm upper plate
    addBox(group, 0.35, 0.12, length * 0.6, cos * length * 0.5, 0.25, sin * length * 0.5, detailMat, angle);

    // Antenna masts along arm
    for (let i = 0; i < 3; i++) {
        const t = 0.3 + i * 0.25;
        const px = cos * length * t;
        const pz = sin * length * t;
        addBox(group, 0.08, 0.5, 0.08, px, 0.35, pz, mat);
        addBox(group, 0.12, 0.25, 0.02, px, 0.6, pz, redMat);
    }

    // Arm tip module
    const tipX = cos * length;
    const tipZ = sin * length;
    addBox(group, 0.7, 0.4, 0.5, tipX, 0, tipZ, detailMat, angle);
    addBox(group, 0.4, 0.25, 0.35, tipX, 0.35, tipZ, mat);
    addSphere(group, 0.12, 16, 8, tipX, 0.6, tipZ, redMat);
    addSphere(group, 0.1, 16, 8, tipX, -0.25, tipZ, makeMat(0x00ff88, 0.2, 0.1, { emissive: 0x00ff88, ei: 2.0 }));

    // Solar panels on arm
    for (let i = 0; i < 2; i++) {
        const sx = cos * length * (0.4 + i * 0.35);
        const sz = sin * length * (0.4 + i * 0.35);
        addBox(group, 1.1, 0.03, 0.55, sx, 0.45, sz, makeMat(0x2244aa, 0.95, 0.15, { emissive: 0x112233, ei: 0.3, normal: normalMap, wear: wearMap, env: 2.5 }), angle);
        addBox(group, 1.2, 0.04, 0.6, sx, 0.43, sz, mat, angle);
    }
}

function buildModule(group, x, y, z, w, h, d, mat, detailMat) {
    addBox(group, w, h, d, x, y, z, mat);
    addBox(group, w * 0.8, h * 0.1, d * 0.8, x, y + h / 2 + 0.02, z, detailMat);
    addBox(group, w * 0.8, h * 0.1, d * 0.8, x, y - h / 2 - 0.02, z, detailMat);
    for (let i = 0; i < 3; i++) {
        addBox(group, 0.02, h * 0.5, 0.02, x - w / 3 + (i * w / 3), y, z + d / 2 + 0.01, detailMat);
    }
}

export function createStation() {
    const group = new THREE.Group();

    const normalMap = createPanelNormalMap(1024);
    const wearMap = createWearMap(1024);
    const colorMap = createColorMap(1024);
    const emissiveMap = createEmissiveMap(1024);
    const dishTex = createDishTexture(512);

    const mainMat = makeMat(0x778899, 0.9, 0.3, { normal: normalMap, wear: wearMap, colormap: colorMap, emissive: 0x111822, ei: 0.15, emissiveMap: emissiveMap, env: 3.0 });
    const darkMat = makeMat(0x5a6a7a, 0.95, 0.25, { normal: normalMap, wear: wearMap, emissive: 0x0a1018, ei: 0.1, emissiveMap: emissiveMap, env: 3.0 });
    const lightMat = makeMat(0x99aabb, 0.85, 0.35, { normal: normalMap, wear: wearMap, emissive: 0x0a0f15, ei: 0.08, env: 2.5 });
    const rodMat = makeMat(0x889999, 0.88, 0.35, { normal: normalMap, emissive: 0x0a0f15, ei: 0.1, env: 2.5 });
    const redMat = makeMat(0xdd5555, 0.7, 0.4, { emissive: 0x662222, ei: 0.5, env: 2.5 });
    const orangeMat = makeMat(0xee8855, 0.7, 0.4, { emissive: 0x663311, ei: 0.5, env: 2.5 });
    const panelMat = makeMat(0x4466cc, 0.95, 0.15, { emissive: 0x223366, ei: 0.5, emissiveMap: emissiveMap, normal: normalMap, wear: wearMap, side: THREE.DoubleSide, env: 4.0 });
    const glowMat = makeMat(0x66eeff, 0.3, 0.1, { emissive: 0x44aadd, ei: 2.5 });
    const thrusterMat = makeMat(0x444444, 0.85, 0.6, { normal: normalMap, wear: wearMap, emissive: 0xff6622, ei: 0.8 });
    const hullMat = makeMat(0x667788, 0.92, 0.35, { normal: normalMap, wear: wearMap, colormap: colorMap, emissive: 0x0a1018, ei: 0.1, env: 3.0 });

    // === CENTRAL HUB ===
    addCyl(group, 2.5, 2.5, 1.2, 48, 0, 0, 0, hullMat);
    addCyl(group, 2.8, 2.8, 0.4, 48, 0, 0.8, 0, darkMat);
    addCyl(group, 2.0, 2.0, 0.6, 40, 0, -0.9, 0, lightMat);
    addCyl(group, 1.5, 1.5, 0.5, 32, 0, 1.3, 0, mainMat);
    addCyl(group, 1.0, 1.0, 0.4, 24, 0, -1.5, 0, darkMat);
    addCyl(group, 0.7, 0.7, 0.8, 20, 0, 1.9, 0, lightMat);
    addCyl(group, 0.5, 0.5, 0.6, 16, 0, -2.0, 0, rodMat);

    // Hub detail rings
    addTorus(group, 2.55, 0.04, 12, 48, 0, 0.3, 0, darkMat, Math.PI / 2, 0, 0);
    addTorus(group, 2.55, 0.04, 12, 48, 0, -0.3, 0, darkMat, Math.PI / 2, 0, 0);

    // === TOP TOWER ===
    addCyl(group, 0.4, 0.5, 1.5, 24, 0, 2.8, 0, darkMat);
    addCyl(group, 0.3, 0.3, 0.8, 20, 0, 3.8, 0, mainMat);
    addCyl(group, 0.2, 0.2, 1.0, 16, 0, 4.6, 0, rodMat);
    addSphere(group, 0.35, 32, 16, 0, 5.3, 0, mainMat);

    // === BOTTOM TOWER ===
    addCyl(group, 0.4, 0.5, 1.2, 24, 0, -2.8, 0, darkMat);
    addCyl(group, 0.3, 0.3, 0.6, 20, 0, -3.5, 0, mainMat);

    // === THRUSTERS ===
    const thrusterAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    thrusterAngles.forEach(function(a) {
        const tx = Math.cos(a) * 1.8;
        const tz = Math.sin(a) * 1.8;
        addCyl(group, 0.4, 0.25, 0.6, 24, tx, -2.3, tz, thrusterMat);
        addCyl(group, 0.25, 0.35, 0.15, 24, tx, -2.65, tz, makeMat(0xff8833, 0.7, 0.3, { emissive: 0xff4400, ei: 1.5 }));
    });

    // === MAIN RING ===
    addTorus(group, 3.5, 0.18, 24, 96, 0, 0, 0, mainMat, Math.PI / 2, 0, 0);
    addTorus(group, 3.2, 0.08, 16, 72, 0, 0, 0, darkMat, Math.PI / 2, 0, 0);

    // Ring supports
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rx = Math.cos(a) * 3.5;
        const rz = Math.sin(a) * 3.5;
        addBox(group, 0.08, 0.5, 0.08, rx, 0, rz, rodMat);
    }

    // === 6 MAIN ARMS ===
    const armMat = makeMat(0x5a6a7a, 0.92, 0.28, { normal: normalMap, wear: wearMap, env: 2.5 });
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        buildArm(group, angle, 10, armMat, darkMat, redMat, normalMap, wearMap);
    }

    // === EXTENDED LONGER ARMS ===
    const longArmAngles = [0, Math.PI * 0.66, Math.PI * 1.33];
    longArmAngles.forEach(function(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Arm spine
        addBox(group, 0.4, 0.3, 12, cos * 7, 0, sin * 7, armMat, angle);

        // Truss supports
        for (let i = 0; i < 4; i++) {
            const t = 0.2 + i * 0.2;
            const px = cos * 14 * t;
            const pz = sin * 14 * t;
            addBox(group, 0.06, 0.7, 0.06, px, 0.45, pz, rodMat);
            addBox(group, 0.06, 0.7, 0.06, px, -0.45, pz, rodMat);
            addBox(group, 0.5, 0.05, 0.05, px, 0.45, pz, lightMat, 0, angle);
            addBox(group, 0.5, 0.05, 0.05, px, -0.45, pz, lightMat, 0, angle);
        }

        // End module
        const tipX = cos * 14;
        const tipZ = sin * 14;
        addBox(group, 1.3, 0.7, 0.9, tipX, 0, tipZ, darkMat, angle);
        addBox(group, 1.0, 0.5, 0.7, tipX, 0.5, tipZ, mainMat, angle);
        addBox(group, 0.7, 0.25, 0.5, tipX, 0.85, tipZ, lightMat, angle);
        addSphere(group, 0.18, 16, 8, tipX, 1.0, tipZ, glowMat);

        // Solar panels on long arms
        for (let i = 0; i < 3; i++) {
            const pt = 0.25 + i * 0.25;
            const px = cos * 14 * pt;
            const pz = sin * 14 * pt;
            addBox(group, 1.6, 0.03, 0.7, px, 0.8, pz, panelMat, angle);
            addBox(group, 1.7, 0.04, 0.75, px, 0.78, pz, lightMat, angle);
        }
    });

    // === MODULE PODS ===
    const modulePositions = [
        { x: 3, y: 0, z: 2, w: 1.5, h: 0.8, d: 1.0 },
        { x: -3, y: 0, z: 2, w: 1.2, h: 0.6, d: 0.8 },
        { x: 2, y: 0, z: -3, w: 1.0, h: 0.7, d: 1.2 },
        { x: -2, y: 0, z: -3, w: 1.3, h: 0.5, d: 0.9 },
        { x: 4, y: 0.5, z: 0, w: 0.8, h: 0.6, d: 0.8 },
        { x: -4, y: -0.5, z: 0, w: 0.9, h: 0.7, d: 0.7 },
        { x: 0, y: 0, z: 4, w: 1.1, h: 0.6, d: 0.8 },
        { x: 0, y: 0, z: -4, w: 1.0, h: 0.5, d: 1.0 },
    ];
    modulePositions.forEach(function(p) {
        buildModule(group, p.x, p.y, p.z, p.w, p.h, p.d, darkMat, lightMat);
    });

    // === ACCENT PANELS ===
    const accentPositions = [
        { x: 1.5, y: 0.65, z: 0, w: 0.8, d: 0.5, m: redMat },
        { x: -1.5, y: 0.65, z: 0, w: 0.7, d: 0.4, m: orangeMat },
        { x: 0, y: 0.65, z: 1.5, w: 0.6, d: 0.7, m: redMat },
        { x: 0, y: 0.65, z: -1.5, w: 0.5, d: 0.6, m: orangeMat },
    ];
    accentPositions.forEach(function(p) {
        addBox(group, p.w, 0.08, p.d, p.x, p.y, p.z, p.m);
    });

    // === ANTENNAS ===
    addCyl(group, 0.04, 0.04, 2.5, 8, 1.0, 5.5, 0, rodMat);
    addCyl(group, 0.04, 0.04, 2.0, 8, -0.8, 5.2, 0.5, rodMat);
    addCyl(group, 0.03, 0.03, 1.8, 8, 0.3, 5.0, -0.8, rodMat);

    // Dish antennas
    const dish1Mat = new THREE.MeshStandardMaterial({ map: dishTex, roughness: 0.4, metalness: 0.8, envMapIntensity: 3.0 });
    const dish1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        dish1Mat
    );
    dish1.position.set(1.5, 5.0, 0);
    dish1.rotation.x = Math.PI;
    dish1.castShadow = true;
    group.add(dish1);

    const dish2Mat = new THREE.MeshStandardMaterial({ map: dishTex, roughness: 0.45, metalness: 0.75, envMapIntensity: 2.5 });
    const dish2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        dish2Mat
    );
    dish2.position.set(-1.0, 4.8, 0.5);
    dish2.rotation.x = Math.PI;
    dish2.rotation.z = 0.3;
    dish2.castShadow = true;
    group.add(dish2);

    // Cross-bar antennas
    addBox(group, 2.0, 0.04, 0.04, 0, 6.5, 0, rodMat);
    addBox(group, 0.04, 0.04, 2.0, 0, 6.5, 0, rodMat);
    addSphere(group, 0.15, 12, 8, 1.0, 6.5, 0, glowMat);
    addSphere(group, 0.15, 12, 8, -1.0, 6.5, 0, glowMat);
    addSphere(group, 0.15, 12, 8, 0, 6.5, 1.0, glowMat);
    addSphere(group, 0.15, 12, 8, 0, 6.5, -1.0, glowMat);

    // === SOLAR PANELS ===
    const panelSets = [
        { x: 5, y: 1, z: 0, ry: 0, count: 3 },
        { x: -5, y: 1, z: 0, ry: Math.PI, count: 3 },
        { x: 0, y: 1, z: 5, ry: Math.PI / 2, count: 3 },
        { x: 0, y: 1, z: -5, ry: -Math.PI / 2, count: 3 },
    ];
    panelSets.forEach(function(ps) {
        for (let i = 0; i < ps.count; i++) {
            const offset = (i - (ps.count - 1) / 2) * 1.5;
            const cosP = Math.cos(ps.ry);
            const sinP = Math.sin(ps.ry);
            const px = ps.x + cosP * offset;
            const pz = ps.z + sinP * offset;
            addBox(group, 1.6, 0.03, 0.8, px, ps.y, pz, panelMat, ps.ry);
            addBox(group, 1.7, 0.04, 0.85, px, ps.y - 0.02, pz, lightMat, ps.ry);
        }
    });

    // === BLINKING LIGHTS ===
    const redLightMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5,
        roughness: 0.1, metalness: 0.3,
    });
    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), redLightMat);
    redLight.position.set(0, 0.9, 0);
    redLight.name = 'redLight';
    group.add(redLight);
    const redGlow = addLight(group, 0xff0000, 3, 20, 0, 0.9, 0);
    redLight.userData.glow = redGlow;

    const greenLightMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2.5,
        roughness: 0.1, metalness: 0.3,
    });
    const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), greenLightMat);
    greenLight.position.set(0, -0.9, 0);
    greenLight.name = 'greenLight';
    group.add(greenLight);
    const greenGlow = addLight(group, 0x00ff00, 3, 20, 0, -0.9, 0);
    greenLight.userData.glow = greenGlow;

    // Blue running lights along arms
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const lx = Math.cos(a) * 6;
        const lz = Math.sin(a) * 6;
        const blueLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 8),
            new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 3.0 })
        );
        blueLight.position.set(lx, 0.3, lz);
        group.add(blueLight);
        addLight(group, 0x4488ff, 2, 15, lx, 0.3, lz);
    }

    // === MAIN LIGHTS ===
    addLight(group, 0xaabbff, 10, 80, 0, 0, 0);
    addLight(group, 0xffeedd, 8, 60, 5, 0, 0);
    addLight(group, 0xffeedd, 8, 60, -5, 0, 0);
    addLight(group, 0xffeedd, 8, 60, 0, 0, 5);
    addLight(group, 0xffeedd, 8, 60, 0, 0, -5);
    addLight(group, 0x6688cc, 6, 50, 0, 5, 0);
    addLight(group, 0x88aaff, 5, 40, 0, -3, 0);

    // === DOCKING PORTS ===
    const dockAngles = [Math.PI / 4, -Math.PI / 4, Math.PI * 0.75, -Math.PI * 0.75];
    dockAngles.forEach(function(a) {
        const dx = Math.cos(a) * 2.5;
        const dz = Math.sin(a) * 2.5;
        addCyl(group, 0.3, 0.3, 0.4, 12, dx, 0, dz, darkMat, Math.PI / 2);
        addCyl(group, 0.2, 0.2, 0.15, 12, dx + Math.cos(a) * 0.25, 0, dz + Math.sin(a) * 0.25, lightMat, Math.PI / 2);
    });

    group.position.set(80, 20, -120);
    group.scale.set(2.8, 2.8, 2.8);

    return group;
}

export function animateStation(station, time) {
    var ring = station.getObjectByName('stationRing');
    if (ring) ring.rotation.z = time * 0.3;

    var redLight = station.getObjectByName('redLight');
    if (redLight) {
        const v = 1.0 + Math.abs(Math.sin(time * 3)) * 2.5;
        redLight.material.emissiveIntensity = v;
        if (redLight.userData.glow) redLight.userData.glow.intensity = v * 0.5;
    }

    var greenLight = station.getObjectByName('greenLight');
    if (greenLight) {
        const v = 1.0 + Math.abs(Math.cos(time * 2.5)) * 2.5;
        greenLight.material.emissiveIntensity = v;
        if (greenLight.userData.glow) greenLight.userData.glow.intensity = v * 0.5;
    }

    station.children.forEach(function(child) {
        if (child.material && child.material.emissive) {
            const e = child.material.emissive;
            if (e.r > 0.5 && e.g < 0.3 && e.b < 0.1) {
                child.material.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.4;
            }
        }
    });
}
