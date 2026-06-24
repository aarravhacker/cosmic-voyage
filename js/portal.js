import * as THREE from 'three';

export function createPortal() {
    const group = new THREE.Group();

    const outerRingMat = new THREE.MeshStandardMaterial({
        color: 0x444455,
        roughness: 0.3,
        metalness: 0.85,
        emissive: 0x111120,
        emissiveIntensity: 0.2,
        envMapIntensity: 2.0
    });
    const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.0, 0.3, 16, 64),
        outerRingMat
    );
    outerRing.castShadow = true;
    outerRing.receiveShadow = true;
    group.add(outerRing);

    const innerRingMat = new THREE.MeshStandardMaterial({
        color: 0x333344,
        roughness: 0.25,
        metalness: 0.88,
        emissive: 0x0a0a18,
        emissiveIntensity: 0.15,
        envMapIntensity: 1.8
    });
    const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.7, 0.12, 12, 48),
        innerRingMat
    );
    innerRing.castShadow = true;
    group.add(innerRing);

    const runeRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.3, 0.03, 6, 48),
        new THREE.MeshStandardMaterial({
            color: 0x555566,
            roughness: 0.35,
            metalness: 0.8,
            emissive: 0x151525,
            emissiveIntensity: 0.3
        })
    );
    group.add(runeRing);

    const runeRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(4.6, 0.02, 6, 48),
        new THREE.MeshStandardMaterial({
            color: 0x444455,
            roughness: 0.4,
            metalness: 0.75,
            emissive: 0x0a0a15,
            emissiveIntensity: 0.2
        })
    );
    group.add(runeRing2);

    const innerMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;

            vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

            float snoise(vec2 v){
                const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
                vec2 i=floor(v+dot(v,C.yy));
                vec2 x0=v-i+dot(i,C.xx);
                vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
                vec4 x12=x0.xyxy+C.xxzz;
                x12.xy-=i1;
                i=mod289(i);
                vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
                vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
                m=m*m;m=m*m;
                vec3 x=2.0*fract(p*C.www)-1.0;
                vec3 h=abs(x)-0.5;
                vec3 ox=floor(x+0.5);
                vec3 a0=x-ox;
                m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
                vec3 g;
                g.x=a0.x*x0.x+h.x*x0.y;
                g.yz=a0.yz*x12.xz+h.yz*x12.yw;
                return 130.0*dot(m,g);
            }

            void main(){
                vec2 c=vUv-0.5;
                float d=length(c);
                float angle=atan(c.y,c.x);

                float swirl=sin(angle*2.0+uTime*0.5+d*6.0)*0.5+0.5;
                float n1=snoise(vec2(angle*1.5,d*3.0)+uTime*0.2)*0.5+0.5;
                float n2=snoise(vec2(angle*3.0,d*5.0)-uTime*0.15)*0.5+0.5;

                float pattern=n1*0.6+swirl*0.25+n2*0.15;

                vec3 deepBlack=vec3(0.005,0.005,0.015);
                vec3 darkPurple=vec3(0.03,0.02,0.06);
                vec3 dimBlue=vec3(0.02,0.03,0.06);

                vec3 col=mix(deepBlack,darkPurple,pattern);
                col=mix(col,dimBlue,n2*0.2);

                float edge=smoothstep(0.48,0.2,d);
                float center=pow(max(1.0-d*2.8,0.0),8.0)*0.06;
                col+=vec3(0.08,0.06,0.15)*center;

                float rim=smoothstep(0.48,0.32,d)*smoothstep(0.12,0.32,d);
                float rimPulse=sin(uTime*1.0+d*4.0)*0.5+0.5;
                col+=vec3(0.06,0.05,0.12)*rim*rimPulse*0.2;

                float vortex=sin(angle*4.0+uTime*0.8+d*10.0)*0.5+0.5;
                vortex=pow(vortex,8.0)*smoothstep(0.42,0.08,d)*0.08;
                col+=vec3(0.06,0.04,0.12)*vortex;

                float singularity=pow(max(1.0-d*3.2,0.0),16.0);
                col+=vec3(0.12,0.1,0.2)*singularity*0.15;

                float stars=step(0.998,fract(sin(dot(vUv*200.0,vec2(12.9898,78.233)))*43758.5453));
                col+=vec3(0.15,0.15,0.2)*stars*edge*0.3;

                float alpha=smoothstep(0.48,0.25,d)*0.7;
                alpha+=center*0.4;
                alpha=max(alpha,singularity*0.5);

                gl_FragColor=vec4(col,alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.0, 64), innerMat);
    disc.position.z = 0.01;
    group.add(disc);

    const disc2 = new THREE.Mesh(new THREE.CircleGeometry(4.0, 64), innerMat.clone());
    disc2.position.z = -0.01;
    disc2.rotation.y = Math.PI;
    group.add(disc2);

    const orbitCount = 80;
    const orbitGeo = new THREE.BufferGeometry();
    const orbitPos = new Float32Array(orbitCount * 3);
    const orbitSpeeds = new Float32Array(orbitCount);
    for (let i = 0; i < orbitCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 4.2 + Math.random() * 1.2;
        orbitPos[i * 3] = Math.cos(a) * r;
        orbitPos[i * 3 + 1] = Math.sin(a) * r;
        orbitPos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        orbitSpeeds[i] = 0.2 + Math.random() * 0.8;
    }
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
    const orbitParticles = new THREE.Points(orbitGeo, new THREE.PointsMaterial({
        color: 0x6666aa, size: 0.06, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(orbitParticles);

    const innerParticleCount = 40;
    const innerGeo = new THREE.BufferGeometry();
    const innerPos = new Float32Array(innerParticleCount * 3);
    const innerSpeeds = new Float32Array(innerParticleCount);
    for (let i = 0; i < innerParticleCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 3.0;
        innerPos[i * 3] = Math.cos(a) * r;
        innerPos[i * 3 + 1] = Math.sin(a) * r;
        innerPos[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        innerSpeeds[i] = 0.3 + Math.random() * 1.5;
    }
    innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPos, 3));
    const innerParticles = new THREE.Points(innerGeo, new THREE.PointsMaterial({
        color: 0x444477, size: 0.04, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(innerParticles);

    const beamCount = 4;
    const beams = [];
    for (let i = 0; i < beamCount; i++) {
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 10, 4),
            new THREE.MeshBasicMaterial({
                color: 0x333355, transparent: true, opacity: 0.08,
                blending: THREE.AdditiveBlending, depthWrite: false
            })
        );
        beam.position.z = -5;
        beam.rotation.z = (i / beamCount) * Math.PI;
        group.add(beam);
        beams.push(beam);
    }

    const portalLight = new THREE.PointLight(0x222244, 1.5, 35, 2);
    portalLight.position.set(0, 0, 1);
    group.add(portalLight);

    const portalLight2 = new THREE.PointLight(0x1a1a33, 1, 25, 2);
    portalLight2.position.set(0, 0, -1);
    group.add(portalLight2);

    const rimLight = new THREE.PointLight(0x333366, 0.8, 20, 2);
    rimLight.position.set(3, 3, 0);
    group.add(rimLight);

    group.position.set(-30, 5, -80);

    return { group, innerMat, orbitParticles, orbitSpeeds, runeRing, runeRing2, beams, innerParticles, innerSpeeds, portalLight, portalLight2 };
}

export function animatePortal(data, time, camera) {
    data.innerMat.uniforms.uTime.value = time;
    data.group.lookAt(camera.position);
    data.runeRing.rotation.z += 0.002;
    if (data.runeRing2) data.runeRing2.rotation.z -= 0.0015;

    const posArr = data.orbitParticles.geometry.attributes.position.array;
    for (let i = 0; i < posArr.length / 3; i++) {
        const a = time * data.orbitSpeeds[i] + i;
        const r = 4.2 + Math.sin(time * 0.3 + i) * 0.3;
        posArr[i * 3] = Math.cos(a) * r;
        posArr[i * 3 + 1] = Math.sin(a) * r;
    }
    data.orbitParticles.geometry.attributes.position.needsUpdate = true;

    if (data.innerParticles) {
        const innerArr = data.innerParticles.geometry.attributes.position.array;
        for (let i = 0; i < innerArr.length / 3; i++) {
            const a = time * data.innerSpeeds[i] + i * 2;
            const r = 0.3 + Math.abs(Math.sin(time * 0.2 + i)) * 2.2;
            innerArr[i * 3] = Math.cos(a) * r;
            innerArr[i * 3 + 1] = Math.sin(a) * r;
        }
        data.innerParticles.geometry.attributes.position.needsUpdate = true;
    }

    data.beams.forEach((b, i) => {
        b.material.opacity = 0.04 + Math.sin(time * 1.0 + i * 0.8) * 0.04;
        b.scale.y = 0.8 + Math.sin(time * 0.8 + i) * 0.2;
    });

    if (data.portalLight) {
        data.portalLight.intensity = 1.0 + Math.sin(time * 1.5) * 0.5;
        data.portalLight2.intensity = 0.7 + Math.sin(time * 2.0 + 1) * 0.3;
    }
}
