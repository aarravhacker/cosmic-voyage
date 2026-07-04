import * as THREE from 'three';

export function createEarthDetailScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001a33);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    // Mouse tracking for ripples
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // --- Water sphere (BackSide, camera inside) ---
    const waterMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: `
            varying vec3 vWorldPos;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                vViewDir = normalize(cameraPosition - wp.xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uMouse;
            varying vec3 vWorldPos;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;

            void main() {
                vec2 uv = vUv;

                // Wave distortion
                float wave1 = sin(uv.x * 8.0 + uTime * 0.6) * 0.02;
                float wave2 = sin(uv.y * 6.0 + uTime * 0.4) * 0.015;
                float wave3 = sin((uv.x + uv.y) * 10.0 + uTime * 0.8) * 0.01;
                uv.y += wave1 + wave2;
                uv.x += wave3;

                // Mouse ripple
                float mouseDist = length(uv - vec2(0.5 + uMouse.x * 0.3, 0.5 + uMouse.y * 0.3));
                float ripple = sin(mouseDist * 20.0 - uTime * 4.0) * exp(-mouseDist * 5.0) * 0.03;
                uv += ripple;

                // Bright underwater gradient
                float depth = uv.y;
                vec3 deep = vec3(0.01, 0.08, 0.22);
                vec3 mid = vec3(0.03, 0.16, 0.38);
                vec3 surface = vec3(0.06, 0.25, 0.55);
                vec3 col = mix(surface, mid, smoothstep(0.0, 0.5, depth));
                col = mix(col, deep, smoothstep(0.5, 1.0, depth));

                // Caustics
                float c1 = sin(uv.x * 20.0 + uTime * 0.5) * sin(uv.y * 15.0 + uTime * 0.3);
                float c2 = sin(uv.x * 12.0 - uTime * 0.4) * sin(uv.y * 18.0 + uTime * 0.6);
                float caustics = pow(max((c1 + c2) * 0.5, 0.0), 2.0) * 0.45;
                col += vec3(0.12, 0.35, 0.55) * caustics;

                // Light rays
                float ray = sin(uv.x * 4.0 + uTime * 0.2) * 0.5 + 0.5;
                ray *= pow(max(1.0 - uv.y, 0.0), 3.0) * 0.3;
                col += vec3(0.18, 0.35, 0.55) * ray;

                // Fresnel rim glow
                float fresnel = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), 3.0);
                col += vec3(0.1, 0.3, 0.6) * fresnel * 0.3;

                // Brighten
                col *= 2.0;

                gl_FragColor = vec4(col, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 64), waterMat);
    scene.add(sphere);

    // --- Floating particles (bubbles) ---
    const pCount = 300;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pSizes = new Float32Array(pCount);
    const pSpeeds = new Float32Array(pCount);
    const pPhases = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 35;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 25;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 35;
        pSizes[i] = Math.random() * 3.0 + 0.5;
        pSpeeds[i] = Math.random() * 0.3 + 0.08;
        pPhases[i] = Math.random() * Math.PI * 2;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float aSize;
            varying float vAlpha;
            void main() {
                vAlpha = 0.5 + aSize * 0.1;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * (80.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float intensity = smoothstep(0.5, 0.0, d);
                vec3 col = mix(vec3(0.3, 0.7, 1.0), vec3(0.5, 0.9, 1.0), intensity);
                gl_FragColor = vec4(col, vAlpha * intensity * 0.7);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- Floating geometric crystals ---
    const crystals = [];
    for (let i = 0; i < 8; i++) {
        const size = 0.3 + Math.random() * 0.5;
        const geo = i % 2 === 0
            ? new THREE.OctahedronGeometry(size, 0)
            : new THREE.IcosahedronGeometry(size, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.6, 0.5),
            transparent: true,
            opacity: 0.15 + Math.random() * 0.1,
            wireframe: true,
        });
        const crystal = new THREE.Mesh(geo, mat);
        crystal.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15,
            -5 - Math.random() * 20
        );
        crystal.userData = {
            rotSpeed: (Math.random() - 0.5) * 0.01,
            floatSpeed: 0.2 + Math.random() * 0.3,
            floatPhase: Math.random() * Math.PI * 2,
            baseY: crystal.position.y,
        };
        scene.add(crystal);
        crystals.push(crystal);
    }

    // --- Light shafts ---
    for (let i = 0; i < 6; i++) {
        const shaft = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6 + Math.random() * 0.8, 35),
            new THREE.MeshBasicMaterial({
                color: 0x55aadd,
                transparent: true,
                opacity: 0.06 + Math.random() * 0.04,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        shaft.position.set(-10 + i * 4, 6, -8 - i * 2);
        shaft.rotation.z = -0.1 + Math.random() * 0.2;
        scene.add(shaft);
    }

    // --- HTML portfolio overlay ---
    const labelDiv = document.createElement('div');
    labelDiv.className = 'water-label';
    labelDiv.style.cssText = 'z-index:160;pointer-events:none;';
    labelDiv.innerHTML = `
        <div class="wl-splash-left"></div>
        <div class="wl-splash-right"></div>

        <nav class="wl-nav">
            <div class="wl-nav-logo">A<span>.</span></div>
            <ul class="wl-nav-links">
                <li>Home</li>
                <li>About</li>
                <li>Skills</li>
                <li>Projects</li>
                <li>Contact</li>
            </ul>
            <div class="wl-nav-connect">Let's Connect &rarr;</div>
        </nav>

        <div class="wl-hero">
            <div class="wl-hello">Hello, I'm</div>
            <div class="wl-name">AARU</div>
            <div class="wl-subtitle">Developer &amp; Tech Enthusiast</div>

            <div class="wl-section">
                <div class="wl-section-title">Skills</div>
                <div class="wl-tags">
                    <span class="wl-tag">Python</span>
                    <span class="wl-tag">GLSL</span>
                    <span class="wl-tag">HTML</span>
                    <span class="wl-tag">CSS</span>
                    <span class="wl-tag">Git</span>
                </div>
            </div>

            <div class="wl-section">
                <div class="wl-section-title">Interests</div>
                <div class="wl-tags">
                    <span class="wl-tag">AI</span>
                    <span class="wl-tag">Web Dev</span>
                    <span class="wl-tag">Minecraft Shaders</span>
                    <span class="wl-tag">GitHub</span>
                </div>
            </div>

            <div class="wl-section">
                <div class="wl-section-title">Goals</div>
                <div class="wl-text">Lightweight software &bull; Shader dev<br>Modern web apps &bull; New tech</div>
            </div>
        </div>

        <div class="wl-bottom">
            <div class="wl-freelance">
                <div class="wl-freelance-dot"></div>
                Available for Freelance
            </div>
            <div class="wl-scroll-indicator">
                <div class="wl-scroll-text">Scroll to Explore</div>
                <div class="wl-scroll-mouse"></div>
            </div>
            <div class="wl-socials">
                <div class="wl-social-icon">GH</div>
                <div class="wl-social-icon">YT</div>
                <div class="wl-social-icon">IN</div>
            </div>
        </div>
    `;
    document.body.appendChild(labelDiv);

    return { scene, camera, waterMat, pMat, particles, pSpeeds, pPos, pPhases, crystals, mouse, labelDiv };
}

export function animateEarthDetail(data, time) {
    data.waterMat.uniforms.uTime.value = time;
    data.waterMat.uniforms.uMouse.value.set(data.mouse.x, data.mouse.y);

    // Animate particles
    const pos = data.particles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += data.pSpeeds[i] * 0.02;
        pos[i * 3] += Math.sin(time * 0.3 + data.pPhases[i]) * 0.005;
        pos[i * 3 + 2] += Math.cos(time * 0.2 + data.pPhases[i]) * 0.003;
        if (pos[i * 3 + 1] > 12) {
            pos[i * 3 + 1] = -12;
            pos[i * 3] = (Math.random() - 0.5) * 35;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
        }
    }
    data.particles.geometry.attributes.position.needsUpdate = true;

    // Animate crystals
    for (const c of data.crystals) {
        c.rotation.x += c.userData.rotSpeed;
        c.rotation.y += c.userData.rotSpeed * 0.7;
        c.position.y = c.userData.baseY + Math.sin(time * c.userData.floatSpeed + c.userData.floatPhase) * 0.5;
    }

    // Gentle camera sway
    data.camera.position.x = Math.sin(time * 0.15) * 0.3;
    data.camera.position.y = Math.cos(time * 0.12) * 0.2;
}
