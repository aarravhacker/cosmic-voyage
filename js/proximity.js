import * as THREE from 'three';

// ==================== EARTH PROXIMITY ====================
function createEarthVFX() {
    const group = new THREE.Group();
    group.position.set(0, 0, -20);

    const orbitCount = 300;
    const orbitGeo = new THREE.BufferGeometry();
    const orbitPos = new Float32Array(orbitCount * 3);
    const orbitVel = new Float32Array(orbitCount * 3);
    for (let i = 0; i < orbitCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * 14;
        orbitPos[i * 3] = Math.cos(a) * r;
        orbitPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
        orbitPos[i * 3 + 2] = Math.sin(a) * r;
        orbitVel[i * 3] = (Math.random() - 0.5) * 0.03;
        orbitVel[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
        orbitVel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
    const orbitPts = new THREE.Points(orbitGeo, new THREE.PointsMaterial({
        color: 0x88aaff, size: 0.35, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(orbitPts);

    const atmosphereCount = 400;
    const atmoGeo = new THREE.BufferGeometry();
    const atmoPos = new Float32Array(atmosphereCount * 3);
    for (let i = 0; i < atmosphereCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 5.2 + Math.random() * 1.5;
        atmoPos[i * 3] = Math.cos(a) * r;
        atmoPos[i * 3 + 1] = (Math.random() - 0.5) * 3;
        atmoPos[i * 3 + 2] = Math.sin(a) * r;
    }
    atmoGeo.setAttribute('position', new THREE.BufferAttribute(atmoPos, 3));
    const atmoPts = new THREE.Points(atmoGeo, new THREE.PointsMaterial({
        color: 0x6699ff, size: 0.2, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(atmoPts);

    const flareCount = 5;
    const flares = [];
    for (let i = 0; i < flareCount; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            color: 0x88aaff, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        const s = 12 + Math.random() * 8;
        sprite.scale.set(s, s, 1);
        const a = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * 4;
        sprite.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 3, Math.sin(a) * r);
        group.add(sprite);
        flares.push(sprite);
    }

    const burstCount = 120;
    const burstGeo = new THREE.BufferGeometry();
    const burstPos = new Float32Array(burstCount * 3);
    const burstVel = new Float32Array(burstCount * 3);
    for (let i = 0; i < burstCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 5.2;
        burstPos[i * 3] = Math.cos(a) * r;
        burstPos[i * 3 + 1] = (Math.random() - 0.5) * 2;
        burstPos[i * 3 + 2] = Math.sin(a) * r;
        burstVel[i * 3] = Math.cos(a) * 0.08;
        burstVel[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
        burstVel[i * 3 + 2] = Math.sin(a) * 0.08;
    }
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
    const burstPts = new THREE.Points(burstGeo, new THREE.PointsMaterial({
        color: 0xaaccff, size: 0.4, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(burstPts);

    const earthGlow = new THREE.PointLight(0x4488ff, 0, 80, 2);
    earthGlow.position.set(0, 0, 0);
    group.add(earthGlow);

    return { group, orbitPts, orbitVel, atmoPts, flares, burstPts, burstVel, earthGlow };
}

function animateEarthVFX(data, intensity, time) {
    const I = Math.pow(intensity, 0.7);

    data.orbitPts.material.opacity = I * 0.9;
    data.orbitPts.material.size = 0.35 + I * 0.3;
    data.atmoPts.material.opacity = I * 0.7;
    data.atmoPts.material.size = 0.2 + I * 0.25;
    data.burstPts.material.opacity = I * 1.0;
    data.burstPts.material.size = 0.4 + I * 0.4;

    data.flares.forEach((f, i) => {
        f.material.opacity = I * 0.25;
        const s = 12 + Math.sin(time * 0.5 + i) * 3;
        f.scale.set(s + I * 6, s + I * 6, 1);
    });

    data.earthGlow.intensity = I * 4;

    const oPos = data.orbitPts.geometry.attributes.position.array;
    for (let i = 0; i < oPos.length / 3; i++) {
        oPos[i * 3] += data.orbitVel[i * 3] * I;
        oPos[i * 3 + 1] += data.orbitVel[i * 3 + 1] * I;
        oPos[i * 3 + 2] += data.orbitVel[i * 3 + 2] * I;
        const d = Math.sqrt(oPos[i * 3] ** 2 + oPos[i * 3 + 2] ** 2);
        if (d > 25) {
            const a = Math.random() * Math.PI * 2;
            const r = 6 + Math.random() * 8;
            oPos[i * 3] = Math.cos(a) * r;
            oPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
            oPos[i * 3 + 2] = Math.sin(a) * r;
        }
    }
    data.orbitPts.geometry.attributes.position.needsUpdate = true;

    data.atmoPts.rotation.y = time * 0.15 * I;

    const bPos = data.burstPts.geometry.attributes.position.array;
    for (let i = 0; i < bPos.length / 3; i++) {
        bPos[i * 3] += data.burstVel[i * 3] * I * 3;
        bPos[i * 3 + 1] += data.burstVel[i * 3 + 1] * I * 3;
        bPos[i * 3 + 2] += data.burstVel[i * 3 + 2] * I * 3;
        const d = Math.sqrt(bPos[i * 3] ** 2 + bPos[i * 3 + 2] ** 2);
        if (d > 12) {
            const a = Math.random() * Math.PI * 2;
            bPos[i * 3] = Math.cos(a) * 5.2;
            bPos[i * 3 + 1] = (Math.random() - 0.5) * 2;
            bPos[i * 3 + 2] = Math.sin(a) * 5.2;
        }
    }
    data.burstPts.geometry.attributes.position.needsUpdate = true;
}

// ==================== STATION PROXIMITY ====================
function createStationVFX() {
    const group = new THREE.Group();
    group.position.set(80, 20, -120);

    const beamCount = 12;
    const beams = [];
    for (let i = 0; i < beamCount; i++) {
        const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 22, 6);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        const a = (i / beamCount) * Math.PI * 2;
        beam.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 7);
        beam.rotation.z = Math.PI / 2;
        beam.rotation.y = a;
        group.add(beam);
        beams.push(beam);
    }

    const sparkCount = 250;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 10;
        sparkPos[i * 3] = Math.cos(a) * r;
        sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        sparkPos[i * 3 + 2] = Math.sin(a) * r;
        sparkVel[i * 3] = (Math.random() - 0.5) * 0.12;
        sparkVel[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
        sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
        color: 0x6699dd, size: 0.25, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(sparks);

    const dockCount = 20;
    const dockGeo = new THREE.BufferGeometry();
    const dockPos = new Float32Array(dockCount * 3);
    for (let i = 0; i < dockCount; i++) {
        const a = (i / dockCount) * Math.PI * 2;
        dockPos[i * 3] = Math.cos(a) * 12;
        dockPos[i * 3 + 1] = (Math.random() - 0.5) * 3;
        dockPos[i * 3 + 2] = Math.sin(a) * 12;
    }
    dockGeo.setAttribute('position', new THREE.BufferAttribute(dockPos, 3));
    const dockPts = new THREE.Points(dockGeo, new THREE.PointsMaterial({
        color: 0xffaa44, size: 0.4, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(dockPts);

    const ringCount = 180;
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const r = 14 + Math.sin(a * 6) * 2;
        ringPos[i * 3] = Math.cos(a) * r;
        ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        ringPos[i * 3 + 2] = Math.sin(a) * r;
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    const ringPts = new THREE.Points(ringGeo, new THREE.PointsMaterial({
        color: 0x5577aa, size: 0.15, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(ringPts);

    const stationGlow = new THREE.PointLight(0x6699cc, 0, 60, 2);
    stationGlow.position.set(0, 0, 0);
    group.add(stationGlow);

    return { group, beams, sparks, sparkVel, dockPts, ringPts, stationGlow };
}

function animateStationVFX(data, intensity, time) {
    const I = Math.pow(intensity, 0.7);

    data.beams.forEach((b, i) => {
        b.material.opacity = I * 0.3;
        b.scale.x = 0.7 + Math.sin(time * 2.5 + i * 0.6) * 0.4 * I;
    });

    data.sparks.material.opacity = I * 0.8;
    data.sparks.material.size = 0.25 + I * 0.2;
    const sPos = data.sparks.geometry.attributes.position.array;
    for (let i = 0; i < sPos.length / 3; i++) {
        sPos[i * 3] += data.sparkVel[i * 3] * I * 2;
        sPos[i * 3 + 1] += data.sparkVel[i * 3 + 1] * I * 2;
        sPos[i * 3 + 2] += data.sparkVel[i * 3 + 2] * I * 2;
        const d = Math.sqrt(sPos[i * 3] ** 2 + sPos[i * 3 + 2] ** 2);
        if (d > 14) {
            const a = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 6;
            sPos[i * 3] = Math.cos(a) * r;
            sPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
            sPos[i * 3 + 2] = Math.sin(a) * r;
        }
    }
    data.sparks.geometry.attributes.position.needsUpdate = true;

    data.dockPts.material.opacity = I * 0.9;
    data.dockPts.material.size = 0.4 + I * 0.2;
    data.dockPts.rotation.y = time * 0.15 * I;

    data.ringPts.material.opacity = I * 0.5;
    data.ringPts.rotation.y = -time * 0.08 * I;

    data.stationGlow.intensity = I * 6;
}

// ==================== PORTAL PROXIMITY ====================
function createPortalVFX() {
    const group = new THREE.Group();
    group.position.set(-30, 5, -80);

    const distortCount = 250;
    const distortGeo = new THREE.BufferGeometry();
    const distortPos = new Float32Array(distortCount * 3);
    const distortVel = new Float32Array(distortCount * 3);
    for (let i = 0; i < distortCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 10;
        distortPos[i * 3] = Math.cos(a) * r;
        distortPos[i * 3 + 1] = Math.sin(a) * r;
        distortPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        distortVel[i * 3] = -Math.cos(a) * 0.06;
        distortVel[i * 3 + 1] = -Math.sin(a) * 0.06;
        distortVel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    distortGeo.setAttribute('position', new THREE.BufferAttribute(distortPos, 3));
    const distortPts = new THREE.Points(distortGeo, new THREE.PointsMaterial({
        color: 0x6644bb, size: 0.3, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(distortPts);

    const waveCount = 120;
    const waveGeo = new THREE.BufferGeometry();
    const wavePos = new Float32Array(waveCount * 3);
    for (let i = 0; i < waveCount; i++) {
        const a = (i / waveCount) * Math.PI * 2;
        wavePos[i * 3] = Math.cos(a) * 4.5;
        wavePos[i * 3 + 1] = Math.sin(a) * 4.5;
        wavePos[i * 3 + 2] = 0;
    }
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3));
    const wavePts = new THREE.Points(waveGeo, new THREE.PointsMaterial({
        color: 0x5533aa, size: 0.2, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(wavePts);

    const riftCount = 80;
    const riftGeo = new THREE.BufferGeometry();
    const riftPos = new Float32Array(riftCount * 3);
    for (let i = 0; i < riftCount; i++) {
        riftPos[i * 3] = (Math.random() - 0.5) * 10;
        riftPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        riftPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    riftGeo.setAttribute('position', new THREE.BufferAttribute(riftPos, 3));
    const riftPts = new THREE.Points(riftGeo, new THREE.PointsMaterial({
        color: 0x8855ee, size: 0.5, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(riftPts);

    const swirlCount = 160;
    const swirlGeo = new THREE.BufferGeometry();
    const swirlPos = new Float32Array(swirlCount * 3);
    for (let i = 0; i < swirlCount; i++) {
        const a = (i / swirlCount) * Math.PI * 2;
        const r = 1.5 + (i / swirlCount) * 3;
        swirlPos[i * 3] = Math.cos(a) * r;
        swirlPos[i * 3 + 1] = Math.sin(a) * r;
        swirlPos[i * 3 + 2] = 0;
    }
    swirlGeo.setAttribute('position', new THREE.BufferAttribute(swirlPos, 3));
    const swirlPts = new THREE.Points(swirlGeo, new THREE.PointsMaterial({
        color: 0x7744cc, size: 0.18, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(swirlPts);

    const portalFlares = [];
    for (let i = 0; i < 3; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            color: 0x6644bb, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        const s = 10 + i * 4;
        sprite.scale.set(s, s, 1);
        sprite.position.set(0, 0, (i - 1) * 0.5);
        group.add(sprite);
        portalFlares.push(sprite);
    }

    const portalGlow = new THREE.PointLight(0x5533aa, 0, 50, 2);
    portalGlow.position.set(0, 0, 0);
    group.add(portalGlow);

    return { group, distortPts, distortVel, wavePts, riftPts, swirlPts, portalFlares, portalGlow };
}

function animatePortalVFX(data, intensity, time) {
    const I = Math.pow(intensity, 0.6);

    data.distortPts.material.opacity = I * 0.8;
    data.distortPts.material.size = 0.3 + I * 0.3;
    const dPos = data.distortPts.geometry.attributes.position.array;
    for (let i = 0; i < dPos.length / 3; i++) {
        dPos[i * 3] += data.distortVel[i * 3] * I * 2;
        dPos[i * 3 + 1] += data.distortVel[i * 3 + 1] * I * 2;
        dPos[i * 3 + 2] += data.distortVel[i * 3 + 2] * I * 2;
        const d = Math.sqrt(dPos[i * 3] ** 2 + dPos[i * 3 + 1] ** 2);
        if (d < 0.3) {
            const a = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 6;
            dPos[i * 3] = Math.cos(a) * r;
            dPos[i * 3 + 1] = Math.sin(a) * r;
            dPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        }
    }
    data.distortPts.geometry.attributes.position.needsUpdate = true;

    data.wavePts.material.opacity = I * 0.7;
    data.wavePts.material.size = 0.2 + I * 0.15;
    const wPos = data.wavePts.geometry.attributes.position.array;
    for (let i = 0; i < wPos.length / 3; i++) {
        const a = (i / (wPos.length / 3)) * Math.PI * 2;
        const r = 4.2 + Math.sin(time * 4 + i * 0.3) * 0.5 * I;
        wPos[i * 3] = Math.cos(a + time * 0.8) * r;
        wPos[i * 3 + 1] = Math.sin(a + time * 0.8) * r;
    }
    data.wavePts.geometry.attributes.position.needsUpdate = true;

    data.riftPts.material.opacity = I * 0.9;
    data.riftPts.material.size = 0.5 + I * 0.4;
    data.riftPts.rotation.z = time * 0.5 * I;
    data.riftPts.rotation.x = Math.sin(time * 0.7) * 0.3 * I;
    const rPos = data.riftPts.geometry.attributes.position.array;
    for (let i = 0; i < rPos.length / 3; i++) {
        rPos[i * 3 + 2] = Math.sin(time * 3 + i * 0.5) * 2 * I;
    }
    data.riftPts.geometry.attributes.position.needsUpdate = true;

    data.swirlPts.material.opacity = I * 0.6;
    data.swirlPts.rotation.z = time * 1.2 * I;

    data.portalFlares.forEach((f, i) => {
        f.material.opacity = I * 0.3;
        const s = 10 + i * 4 + Math.sin(time * 2 + i) * 3;
        f.scale.set(s + I * 8, s + I * 8, 1);
    });

    data.portalGlow.intensity = I * 5;
}

// ==================== MAIN PROXIMITY VFX ====================
export function createProximityVFX() {
    const earth = createEarthVFX();
    const station = createStationVFX();
    const portal = createPortalVFX();
    return { earth, station, portal };
}

export function animateProximityVFX(vfx, scrollProgress, time) {
    const earthIntensity = 1.0 - Math.min(scrollProgress / 0.3, 1.0);
    const stationIntensity = Math.max(0, 1.0 - Math.abs(scrollProgress - 0.45) / 0.2);
    const portalIntensity = Math.max(0, (scrollProgress - 0.6) / 0.4);

    animateEarthVFX(vfx.earth, earthIntensity, time);
    animateStationVFX(vfx.station, stationIntensity, time);
    animatePortalVFX(vfx.portal, portalIntensity, time);
}
