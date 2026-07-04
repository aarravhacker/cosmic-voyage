import * as THREE from 'three';

// ============================================
// MAIN STAR FIELD (twinkling, multi-layer)
// ============================================

function createStarTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Soft glow star
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.35, 'rgba(200, 220, 255, 0.15)');
    gradient.addColorStop(0.6, 'rgba(150, 180, 255, 0.04)');
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

function createBrightStarTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Bright star with cross spikes
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.03, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.08, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.25)');
    gradient.addColorStop(0.4, 'rgba(150, 180, 255, 0.06)');
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Cross spike lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Diagonal spikes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

export function createStars() {
    const group = new THREE.Group();

    const starTexture = createStarTexture();
    const brightStarTexture = createBrightStarTexture();

    // ============================================
    // LAYER 1: Dense background (3000 tiny dim stars)
    // ============================================
    const bgCount = 3000;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgCount * 3);
    const bgColors = new Float32Array(bgCount * 3);
    const bgSizes = new Float32Array(bgCount);
    const bgTwinkle = new Float32Array(bgCount);

    for (let i = 0; i < bgCount; i++) {
        const i3 = i * 3;
        const r = 150 + Math.random() * 500;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        bgPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        bgPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        bgPos[i3 + 2] = r * Math.cos(phi);

        const temp = Math.random();
        const c = new THREE.Color();
        if (temp < 0.4) c.setHSL(0.6, 0.1, 0.7);       // cool blue-white
        else if (temp < 0.7) c.setHSL(0.12, 0.06, 0.8);  // warm white
        else if (temp < 0.85) c.setHSL(0.08, 0.15, 0.75); // yellow
        else c.setHSL(0.65, 0.2, 0.8);                     // blue

        bgColors[i3] = c.r;
        bgColors[i3 + 1] = c.g;
        bgColors[i3 + 2] = c.b;

        bgSizes[i] = 0.8 + Math.random() * 1.5;
        bgTwinkle[i] = Math.random() * Math.PI * 2;
    }

    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
    bgGeo.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
    bgGeo.setAttribute('twinkle', new THREE.BufferAttribute(bgTwinkle, 1));

    const bgMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: starTexture },
        },
        vertexShader: `
            attribute float size;
            attribute float twinkle;
            varying vec3 vColor;
            varying float vTwinkle;
            uniform float uTime;
            void main(){
                vColor = color;
                vTwinkle = twinkle;
                float pulse = sin(uTime * 1.5 + twinkle) * 0.2 + 0.8;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pulse * (300.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            varying vec3 vColor;
            varying float vTwinkle;
            void main(){
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * 0.6);
            }
        `,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const bgStars = new THREE.Points(bgGeo, bgMat);
    group.add(bgStars);

    // ============================================
    // LAYER 2: Mid-range stars (1500 medium stars)
    // ============================================
    const midCount = 1500;
    const midGeo = new THREE.BufferGeometry();
    const midPos = new Float32Array(midCount * 3);
    const midColors = new Float32Array(midCount * 3);
    const midSizes = new Float32Array(midCount);
    const midTwinkle = new Float32Array(midCount);

    for (let i = 0; i < midCount; i++) {
        const i3 = i * 3;
        const r = 80 + Math.random() * 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        midPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        midPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        midPos[i3 + 2] = r * Math.cos(phi);

        const temp = Math.random();
        const c = new THREE.Color();
        if (temp < 0.25) c.setHSL(0.6, 0.15, 0.9);       // blue-white
        else if (temp < 0.5) c.setHSL(0.1, 0.08, 0.95);   // warm white
        else if (temp < 0.7) c.setHSL(0.0, 0.2, 0.9);      // red-ish
        else if (temp < 0.85) c.setHSL(0.15, 0.3, 0.92);   // yellow
        else c.setHSL(0.65, 0.3, 0.95);                     // blue

        midColors[i3] = c.r;
        midColors[i3 + 1] = c.g;
        midColors[i3 + 2] = c.b;

        midSizes[i] = 1.5 + Math.random() * 4.0;
        midTwinkle[i] = Math.random() * Math.PI * 2;
    }

    midGeo.setAttribute('position', new THREE.BufferAttribute(midPos, 3));
    midGeo.setAttribute('color', new THREE.BufferAttribute(midColors, 3));
    midGeo.setAttribute('size', new THREE.BufferAttribute(midSizes, 1));
    midGeo.setAttribute('twinkle', new THREE.BufferAttribute(midTwinkle, 1));

    const midMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: starTexture },
        },
        vertexShader: `
            attribute float size;
            attribute float twinkle;
            varying vec3 vColor;
            varying float vTwinkle;
            uniform float uTime;
            void main(){
                vColor = color;
                vTwinkle = twinkle;
                float pulse = sin(uTime * 2.0 + twinkle) * 0.3 + 0.7;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pulse * (500.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            varying vec3 vColor;
            varying float vTwinkle;
            void main(){
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * 0.8);
            }
        `,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const midStars = new THREE.Points(midGeo, midMat);
    group.add(midStars);

    // ============================================
    // LAYER 3: Bright foreground stars (200 bright stars with glow)
    // ============================================
    const brightCount = 200;
    const brightGeo = new THREE.BufferGeometry();
    const brightPos = new Float32Array(brightCount * 3);
    const brightColors = new Float32Array(brightCount * 3);
    const brightSizes = new Float32Array(brightCount);
    const brightTwinkle = new Float32Array(brightCount);

    for (let i = 0; i < brightCount; i++) {
        const i3 = i * 3;
        const r = 60 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        brightPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        brightPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        brightPos[i3 + 2] = r * Math.cos(phi);

        const temp = Math.random();
        const c = new THREE.Color();
        if (temp < 0.3) c.setHSL(0.6, 0.2, 1.0);          // bright blue-white
        else if (temp < 0.55) c.setHSL(0.12, 0.1, 1.0);    // bright white
        else if (temp < 0.7) c.setHSL(0.1, 0.35, 0.95);    // warm yellow
        else if (temp < 0.85) c.setHSL(0.05, 0.5, 0.9);    // orange
        else c.setHSL(0.0, 0.6, 0.85);                       // red

        brightColors[i3] = c.r;
        brightColors[i3 + 1] = c.g;
        brightColors[i3 + 2] = c.b;

        brightSizes[i] = 5.0 + Math.random() * 8.0;
        brightTwinkle[i] = Math.random() * Math.PI * 2;
    }

    brightGeo.setAttribute('position', new THREE.BufferAttribute(brightPos, 3));
    brightGeo.setAttribute('color', new THREE.BufferAttribute(brightColors, 3));
    brightGeo.setAttribute('size', new THREE.BufferAttribute(brightSizes, 1));
    brightGeo.setAttribute('twinkle', new THREE.BufferAttribute(brightTwinkle, 1));

    const brightMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: brightStarTexture },
        },
        vertexShader: `
            attribute float size;
            attribute float twinkle;
            varying vec3 vColor;
            varying float vTwinkle;
            uniform float uTime;
            void main(){
                vColor = color;
                vTwinkle = twinkle;
                float pulse = sin(uTime * 1.2 + twinkle * 2.0) * 0.25 + 0.75;
                float bigPulse = sin(uTime * 0.3 + twinkle) * 0.1 + 0.9;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pulse * bigPulse * (600.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            varying vec3 vColor;
            varying float vTwinkle;
            void main(){
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                float glow = texColor.a;
                vec3 col = vColor * texColor.rgb + vColor * glow * 0.3;
                gl_FragColor = vec4(col, texColor.a);
            }
        `,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const brightStars = new THREE.Points(brightGeo, brightMat);
    group.add(brightStars);

    // ============================================
    // LAYER 4: Distant dust/star clusters (500 very dim points)
    // ============================================
    const dustCount = 500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        const r = 300 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        dustPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        dustPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dustPos[i3 + 2] = r * Math.cos(phi);

        const temp = Math.random();
        const c = new THREE.Color();
        if (temp < 0.4) c.setHSL(0.6, 0.3, 0.5);
        else if (temp < 0.7) c.setHSL(0.08, 0.25, 0.45);
        else c.setHSL(0.75, 0.2, 0.4);

        dustColors[i3] = c.r;
        dustColors[i3 + 1] = c.g;
        dustColors[i3 + 2] = c.b;

        dustSizes[i] = 3.0 + Math.random() * 6.0;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    const dustMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float uTime;
            void main(){
                vColor = color;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (400.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main(){
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float alpha = 1.0 - smoothstep(0.0, 1.0, d);
                alpha = alpha * alpha * alpha * 0.15;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const dustStars = new THREE.Points(dustGeo, dustMat);
    group.add(dustStars);

    return {
        group: group,
        layers: [
            { points: bgStars, mat: bgMat },
            { points: midStars, mat: midMat },
            { points: brightStars, mat: brightMat },
            { points: dustStars, mat: dustMat },
        ]
    };
}

// ============================================
// SHOOTING STARS (8 streaks)
// ============================================

export function createShootingStars() {
    const count = 8;
    const group = new THREE.Group();
    const streaks = [];

    for (let i = 0; i < count; i++) {
        const geo = new THREE.BufferGeometry();
        const trail = new Float32Array(25 * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(trail, 3));

        const mat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        const line = new THREE.Line(geo, mat);
        group.add(line);

        streaks.push({
            line: line,
            material: mat,
            geometry: geo,
            active: false,
            time: 0,
            speed: 0,
            direction: new THREE.Vector3(),
            start: new THREE.Vector3()
        });
    }

    return { group, streaks };
}

function spawnShootingStar(streak) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 200;
    streak.start.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 100,
        Math.sin(angle) * dist
    );
    streak.direction.set(
        (Math.random() - 0.5) * 2,
        -0.5 - Math.random() * 0.5,
        (Math.random() - 0.5) * 2
    ).normalize();
    streak.speed = 80 + Math.random() * 60;
    streak.time = 0;
    streak.active = true;
    streak.material.opacity = 1;

    // Randomize color: white, blue-white, or warm
    const temp = Math.random();
    if (temp < 0.5) streak.material.color.setHex(0xffffff);
    else if (temp < 0.8) streak.material.color.setHex(0xaaccff);
    else streak.material.color.setHex(0xffeedd);
}

// ============================================
// ANIMATE ALL STAR LAYERS
// ============================================

export function animateStars(stars, shootingData, dt) {
    // Animate all star layers
    if (stars.layers) {
        for (let i = 0; i < stars.layers.length; i++) {
            const layer = stars.layers[i];
            layer.mat.uniforms.uTime.value += dt;
        }
        stars.group.rotation.y += 0.00002;
    }

    if (!shootingData) return;

    shootingData.streaks.forEach(s => {
        if (!s.active) {
            if (Math.random() < 0.003) spawnShootingStar(s);
            return;
        }

        s.time += dt;
        const life = 1.5;
        const progress = s.time / life;

        if (progress >= 1) {
            s.active = false;
            s.material.opacity = 0;
            return;
        }

        const posArr = s.geometry.attributes.position.array;

        for (let i = 0; i < 25; i++) {
            const t = i / 24;
            const trailProgress = Math.max(0, progress - t * 0.3);
            const p = s.start.clone().addScaledVector(s.direction, s.speed * trailProgress);
            posArr[i * 3] = p.x;
            posArr[i * 3 + 1] = p.y;
            posArr[i * 3 + 2] = p.z;
        }
        s.geometry.attributes.position.needsUpdate = true;
        s.material.opacity = (1 - progress) * 0.8;
    });
}
