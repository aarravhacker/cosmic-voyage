import * as THREE from 'three';

export function createSun() {
    const group = new THREE.Group();

    const coreMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPos;
            void main(){
                vUv=uv;
                vNormal=normalize(normalMatrix*normal);
                vPos=(modelViewMatrix*vec4(position,1.0)).xyz;
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPos;

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
                vec2 uv=vUv;
                float t=uTime;

                float n1=snoise(uv*3.0+t*0.15)*0.5+0.5;
                float n2=snoise(uv*6.0-t*0.25)*0.5+0.5;
                float n3=snoise(uv*12.0+t*0.4)*0.5+0.5;
                float n4=snoise(uv*24.0-t*0.6)*0.5+0.5;

                float pattern=n1*0.4+n2*0.3+n3*0.2+n4*0.1;

                float spots=pow(snoise(uv*15.0+t*0.1),4.0)*0.3;

                vec3 core=vec3(1.0,0.98,0.9);
                vec3 hot=vec3(1.0,0.85,0.5);
                vec3 warm=vec3(1.0,0.6,0.2);
                vec3 cool=vec3(0.95,0.35,0.08);

                vec3 col=mix(warm,hot,pattern);
                col=mix(col,core,pow(pattern,2.0)*0.6);
                col=mix(col,cool,pow(1.0-pattern,4.0)*0.4);
                col-=spots;

                float fresnel=pow(1.0-max(dot(normalize(vPos),vNormal),0.0),1.5);
                col+=vec3(1.0,0.7,0.3)*fresnel*0.4;

                float limb=pow(max(dot(vNormal,vec3(0.0,0.0,1.0)),0.0),0.3);
                col*=mix(0.6,1.0,limb);

                gl_FragColor=vec4(col*1.8,1.0);
            }
        `
    });

    const core = new THREE.Mesh(new THREE.SphereGeometry(5, 48, 48), coreMat);
    group.add(core);

    function makeGlowCanvas(size, stops) {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        stops.forEach(([offset, color]) => g.addColorStop(offset, color));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
    }

    const glowTex = makeGlowCanvas(1024, [
        [0.0,   'rgba(255,240,200,1.0)'],
        [0.06,  'rgba(255,220,150,0.8)'],
        [0.12,  'rgba(255,180,80,0.45)'],
        [0.22,  'rgba(255,140,40,0.2)'],
        [0.35,  'rgba(255,100,20,0.08)'],
        [0.55,  'rgba(200,60,10,0.025)'],
        [0.75,  'rgba(150,40,5,0.008)'],
        [1.0,   'rgba(80,20,0,0)']
    ]);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(40, 40, 1);
    group.add(glow);

    const outerTex = makeGlowCanvas(1024, [
        [0.0,   'rgba(255,200,100,0.3)'],
        [0.1,   'rgba(255,160,60,0.15)'],
        [0.25,  'rgba(200,100,30,0.06)'],
        [0.45,  'rgba(150,60,15,0.02)'],
        [0.7,   'rgba(100,30,5,0.005)'],
        [1.0,   'rgba(50,10,0,0)']
    ]);
    const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: outerTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    outerGlow.scale.set(80, 80, 1);
    group.add(outerGlow);

    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 512;
    flareCanvas.height = 512;
    const fctx = flareCanvas.getContext('2d');
    const gradient = fctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255,250,200,1)');
    gradient.addColorStop(0.08, 'rgba(255,230,150,0.9)');
    gradient.addColorStop(0.2, 'rgba(255,180,80,0.5)');
    gradient.addColorStop(0.4, 'rgba(255,120,30,0.15)');
    gradient.addColorStop(0.7, 'rgba(255,80,10,0.04)');
    gradient.addColorStop(1, 'rgba(255,50,0,0)');
    fctx.fillStyle = gradient;
    fctx.fillRect(0, 0, 512, 512);
    const flareTex = new THREE.CanvasTexture(flareCanvas);
    const flareMat = new THREE.SpriteMaterial({
        map: flareTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const flare = new THREE.Sprite(flareMat);
    flare.scale.set(50, 50, 1);
    group.add(flare);

    const flareCanvas2 = document.createElement('canvas');
    flareCanvas2.width = 256;
    flareCanvas2.height = 256;
    const fctx2 = flareCanvas2.getContext('2d');
    const g2 = fctx2.createRadialGradient(128, 128, 0, 128, 128, 128);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(0.15, 'rgba(255,220,180,0.7)');
    g2.addColorStop(0.5, 'rgba(255,150,50,0.1)');
    g2.addColorStop(1, 'rgba(255,100,20,0)');
    fctx2.fillStyle = g2;
    fctx2.fillRect(0, 0, 256, 256);
    const flareTex2 = new THREE.CanvasTexture(flareCanvas2);
    const flareMat2 = new THREE.SpriteMaterial({
        map: flareTex2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5
    });
    const innerFlare = new THREE.Sprite(flareMat2);
    innerFlare.scale.set(15, 15, 1);
    group.add(innerFlare);

    const sunPointLight = new THREE.PointLight(0xffeedd, 15, 2000, 0.8);
    sunPointLight.position.set(0, 0, 0);
    group.add(sunPointLight);

    const sunWarmLight = new THREE.PointLight(0xffcc88, 8, 1500, 1);
    sunWarmLight.position.set(0, 0, 0);
    group.add(sunWarmLight);

    group.scale.setScalar(20);
    group.position.set(300, 150, -400);

    return { group, coreMat, glow, outerGlow, flare, innerFlare, sunPointLight, sunWarmLight };
}

export function animateSun(data, time) {
    data.coreMat.uniforms.uTime.value = time;

    const pulse = 1.0 + Math.sin(time * 0.5) * 0.03;
    data.flare.scale.set(50 * pulse, 50 * pulse, 1);

    const innerPulse = 1.0 + Math.sin(time * 1.2) * 0.08;
    data.innerFlare.scale.set(15 * innerPulse, 15 * innerPulse, 1);

    const glowPulse = 1.0 + Math.sin(time * 0.3) * 0.02;
    data.glow.scale.set(40 * glowPulse, 40 * glowPulse, 1);
    data.outerGlow.scale.set(80 * glowPulse, 80 * glowPulse, 1);

    data.sunPointLight.intensity = 14 + Math.sin(time * 0.7) * 2;
    data.sunWarmLight.intensity = 7 + Math.sin(time * 0.5 + 1) * 1.5;
}
