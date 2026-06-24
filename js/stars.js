import * as THREE from 'three';

export function createStars() {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const twinklePhase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const r = 80 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        pos[i3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i3 + 2] = r * Math.cos(phi);

        const temp = Math.random();
        const c = new THREE.Color();
        if (temp < 0.3) c.setHSL(0.6, 0.15, 0.9);
        else if (temp < 0.6) c.setHSL(0.1, 0.08, 0.95);
        else if (temp < 0.8) c.setHSL(0.0, 0.2, 0.9);
        else c.setHSL(0.65, 0.3, 0.95);

        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        sizes[i] = 1.5 + Math.random() * 4.0;
        twinklePhase[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('twinkle', new THREE.BufferAttribute(twinklePhase, 1));

    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute float twinkle;
            varying vec3 vColor;
            varying float vTwinkle;
            uniform float uTime;
            void main(){
                vColor=color;
                vTwinkle=twinkle;
                float pulse=sin(uTime*2.0+twinkle)*0.3+0.7;
                vec4 mvPos=modelViewMatrix*vec4(position,1.0);
                gl_PointSize=size*pulse*(500.0/-mvPos.z);
                gl_Position=projectionMatrix*mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vTwinkle;
            void main(){
                float d=length(gl_PointCoord-0.5)*2.0;
                float alpha=1.0-smoothstep(0.0,1.0,d);
                alpha*=alpha;
                gl_FragColor=vec4(vColor,alpha);
            }
        `,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geo, mat);
}

// Shooting stars
export function createShootingStars() {
    const count = 5;
    const group = new THREE.Group();
    const streaks = [];

    for (let i = 0; i < count; i++) {
        const geo = new THREE.BufferGeometry();
        const trail = new Float32Array(20 * 3);
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
}

export function animateStars(stars, shootingData, dt) {
    stars.material.uniforms.uTime.value += dt;
    stars.rotation.y += 0.00002;

    if (!shootingData) return;

    shootingData.streaks.forEach(s => {
        if (!s.active) {
            if (Math.random() < 0.002) spawnShootingStar(s);
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

        const tailLength = 15;
        const posArr = s.geometry.attributes.position.array;

        for (let i = 0; i < 20; i++) {
            const t = i / 19;
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
