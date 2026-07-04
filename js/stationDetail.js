import * as THREE from 'three';

export function createStationDetailScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    const tunnelLen = 60;
    const tunnelW = 4;
    const tunnelH = 3.5;

    // --- Tunnel walls ---
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x080818 });
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x060612 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(tunnelW, tunnelLen), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -tunnelH / 2, -tunnelLen / 2);
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(tunnelW, tunnelLen), wallMat.clone());
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, tunnelH / 2, -tunnelLen / 2);
    scene.add(ceiling);

    const sideGeo = new THREE.PlaneGeometry(tunnelLen, tunnelH);
    const left = new THREE.Mesh(sideGeo, wallMat.clone());
    left.rotation.y = Math.PI / 2;
    left.position.set(-tunnelW / 2, 0, -tunnelLen / 2);
    scene.add(left);

    const right = new THREE.Mesh(sideGeo.clone(), wallMat.clone());
    right.rotation.y = -Math.PI / 2;
    right.position.set(tunnelW / 2, 0, -tunnelLen / 2);
    scene.add(right);

    // --- Neon light strips (bright glow) ---
    const lights = [];
    for (let i = 0; i < 15; i++) {
        const z = -i * 4;
        const isBlue = i % 3 === 0;
        const color = isBlue ? 0x3388ff : 0xffffff;
        const intensity = isBlue ? 1.0 : 0.7;

        // Top strip
        const strip = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.08, 0.5),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity })
        );
        strip.position.set(0, tunnelH / 2 - 0.04, z);
        scene.add(strip);

        // Side strips
        const sideL = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.5),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity * 0.5 })
        );
        sideL.position.set(-tunnelW / 2 + 0.04, 0, z);
        scene.add(sideL);

        const sideR = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.5),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity * 0.5 })
        );
        sideR.position.set(tunnelW / 2 - 0.04, 0, z);
        scene.add(sideR);

        // Glow sprites behind strips
        const glowGeo = new THREE.PlaneGeometry(1.5, 0.3);
        const glowMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: intensity * 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, tunnelH / 2 - 0.1, z);
        scene.add(glow);

        lights.push({ strip, sideL, sideR, glow, isBlue, base: intensity });
    }

    // --- Grid floor ---
    const gridMat = new THREE.LineBasicMaterial({ color: 0x2244aa, transparent: true, opacity: 0.4 });
    for (let i = -8; i <= 8; i++) {
        const pts = [new THREE.Vector3(i * 0.4, -tunnelH / 2 + 0.01, 10), new THREE.Vector3(i * 0.4, -tunnelH / 2 + 0.01, -tunnelLen + 10)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let z = 10; z > -tunnelLen + 10; z -= 3) {
        const pts = [new THREE.Vector3(-tunnelW / 2, -tunnelH / 2 + 0.01, z), new THREE.Vector3(tunnelW / 2, -tunnelH / 2 + 0.01, z)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // --- End wall glow ---
    const endGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(tunnelW, tunnelH),
        new THREE.MeshBasicMaterial({ color: 0x1144aa, transparent: true, opacity: 0.2 })
    );
    endGlow.position.set(0, 0, -tunnelLen);
    scene.add(endGlow);

    // --- Floating particles in tunnel ---
    const pCount = 150;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pSizes = new Float32Array(pCount);
    const pSpeeds = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * tunnelW;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * tunnelH;
        pPos[i * 3 + 2] = -Math.random() * tunnelLen;
        pSizes[i] = Math.random() * 2.0 + 0.5;
        pSpeeds[i] = 0.1 + Math.random() * 0.3;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float aSize;
            varying float vAlpha;
            void main() {
                vAlpha = 0.6;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * (60.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float intensity = smoothstep(0.5, 0.0, d);
                gl_FragColor = vec4(0.3, 0.6, 1.0, vAlpha * intensity * 0.5);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const tunnelParticles = new THREE.Points(pGeo, pMat);
    scene.add(tunnelParticles);

    // --- HUD labels ---
    const labels = [];

    const leftDiv = document.createElement('div');
    leftDiv.className = 'system-label';
    leftDiv.style.cssText = 'position:fixed;top:20%;left:5%;z-index:160;pointer-events:none;';
    leftDiv.innerHTML = `
        <div class="sl-header"><div class="sl-dot"></div><div class="sl-title">System // Profile</div></div>
        <div class="sl-section">
            <div class="sl-section-title">Identity</div>
            <ul class="sl-list"><li>Name: Aaru</li><li>Role: Developer</li><li>Location: India</li></ul>
        </div>
        <div class="sl-section">
            <div class="sl-section-title">Status</div>
            <ul class="sl-list"><li>Active: Building shaders</li><li>Focus: Lightweight code<span class="sl-cursor"></span></li></ul>
        </div>`;
    document.body.appendChild(leftDiv);
    labels.push(leftDiv);

    const rightDiv = document.createElement('div');
    rightDiv.className = 'system-label';
    rightDiv.style.cssText = 'position:fixed;top:25%;right:5%;z-index:160;pointer-events:none;';
    rightDiv.innerHTML = `
        <div class="sl-header"><div class="sl-dot"></div><div class="sl-title">System // Projects</div></div>
        <div class="sl-section">
            <div class="sl-section-title">Shaders</div>
            <ul class="sl-list"><li>Minecraft Shader Pack</li><li>UltraLite FPS Shader</li><li>Intel HD Optimized</li></ul>
        </div>
        <div class="sl-section">
            <div class="sl-section-title">Tools</div>
            <ul class="sl-list"><li>Loan Portal UI</li><li>PDF Generator</li><li>Map File Creator</li></ul>
        </div>`;
    document.body.appendChild(rightDiv);
    labels.push(rightDiv);

    const botDiv = document.createElement('div');
    botDiv.className = 'system-label';
    botDiv.style.cssText = 'position:fixed;bottom:15%;left:50%;transform:translateX(-50%);z-index:160;pointer-events:none;';
    botDiv.innerHTML = `
        <div class="sl-header"><div class="sl-dot"></div><div class="sl-title">System // Contact</div></div>
        <div class="sl-section"><ul class="sl-list">
            <li><a class="sl-link" href="https://github.com/aarravhacker" target="_blank">github.com/aarravhacker</a></li>
            <li>Creative: Video, Graphic, UI/UX<span class="sl-cursor"></span></li>
        </ul></div>`;
    document.body.appendChild(botDiv);
    labels.push(botDiv);

    return { scene, camera, lights, labels, tunnelParticles, pSpeeds, pPos };
}

export function animateStationDetail(data, time) {
    // Pulse lights
    for (let i = 0; i < data.lights.length; i++) {
        const l = data.lights[i];
        const pulse = Math.sin(time * 2.0 + i * 0.7) * 0.3 + 0.7;
        const alpha = l.base * pulse;
        l.strip.material.opacity = alpha;
        l.sideL.material.opacity = alpha * 0.5;
        l.sideR.material.opacity = alpha * 0.5;
        l.glow.material.opacity = alpha * 0.15;
    }

    // Animate tunnel particles drifting forward
    const pos = data.tunnelParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 2] += data.pSpeeds[i] * 0.05;
        pos[i * 3] += Math.sin(time * 0.5 + i) * 0.002;
        if (pos[i * 3 + 2] > 5) {
            pos[i * 3 + 2] = -60;
            pos[i * 3] = (Math.random() - 0.5) * 4;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
        }
    }
    data.tunnelParticles.geometry.attributes.position.needsUpdate = true;

    // Gentle camera drift
    data.camera.position.x = Math.sin(time * 0.1) * 0.15;
    data.camera.position.y = Math.cos(time * 0.08) * 0.1;
}
