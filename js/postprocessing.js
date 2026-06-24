import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FilmShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        chromatic: { value: 0.0025 },
        vignette: { value: 0.45 },
        grain: { value: 0.06 },
        motionBlur: { value: 0.0 },
        motionDirX: { value: 0.0 },
        motionDirY: { value: 0.0 },
        exposure: { value: 1.1 },
        warmth: { value: 0.08 },
        coolShadows: { value: 0.12 }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        uniform float chromatic;
        uniform float vignette;
        uniform float grain;
        uniform float motionBlur;
        uniform float motionDirX;
        uniform float motionDirY;
        uniform float exposure;
        uniform float warmth;
        uniform float coolShadows;
        varying vec2 vUv;

        float rand(vec2 co){
            return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
        }

        void main(){
            vec2 center=vUv-0.5;
            float d=length(center);

            vec3 col = vec3(0.0);
            float totalWeight = 0.0;

            vec2 mDir = vec2(motionDirX, motionDirY);
            float mLen = length(mDir);
            vec2 mNorm = mLen > 0.0001 ? mDir / mLen : vec2(0.0);

            for(float i = -4.0; i <= 4.0; i += 1.0){
                float w = 1.0 - abs(i) / 4.0;
                w *= w;
                vec2 offset = mNorm * i * 0.005 * motionBlur;
                float spread = abs(i) * 0.0012 * motionBlur;
                float r = texture2D(tDiffuse, vUv + offset + vec2(spread, 0.0)).r;
                float g = texture2D(tDiffuse, vUv + offset).g;
                float b = texture2D(tDiffuse, vUv + offset - vec2(spread, 0.0)).b;
                col += vec3(r, g, b) * w;
                totalWeight += w;
            }
            col /= totalWeight;

            vec2 caDir = center * chromatic;
            col.r = mix(col.r, texture2D(tDiffuse, vUv + caDir).r, 0.5);
            col.b = mix(col.b, texture2D(tDiffuse, vUv - caDir).b, 0.5);

            float lum=dot(col,vec3(0.299,0.587,0.114));
            vec3 warmHighlight=vec3(1.08,1.02,0.95);
            vec3 coolShadow=vec3(0.92,0.95,1.08);
            float highlightMask=smoothstep(0.3,0.8,lum);
            float shadowMask=1.0-smoothstep(0.0,0.35,lum);
            col*=mix(vec3(1.0),warmHighlight,highlightMask*warmth*2.0);
            col*=mix(vec3(1.0),coolShadow,shadowMask*coolShadows*2.0);

            col*=exposure;

            float vigGrad=1.0-d*d*vignette*2.2;
            vigGrad=smoothstep(0.0,1.0,vigGrad);
            col*=vigGrad;

            float n=rand(vUv+fract(time))*grain;
            col+=vec3(n)-vec3(grain*0.5);

            col=max(col,vec3(0.0));

            gl_FragColor=vec4(col,1.0);
        }
    `
};

const DOFShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        focalDist: { value: 0.85 },
        focalRange: { value: 0.25 },
        maxBlur: { value: 2.0 }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float focalDist;
        uniform float focalRange;
        uniform float maxBlur;
        varying vec2 vUv;

        void main(){
            vec2 texel=1.0/resolution;
            vec3 center=texture2D(tDiffuse,vUv).rgb;

            float depth=1.0-length(vUv-0.5)*1.4;
            float blur=abs(depth-focalDist);
            blur=smoothstep(0.0,focalRange,blur)*maxBlur;

            vec3 col=vec3(0.0);
            float total=0.0;

            for(float x=-3.0;x<=3.0;x+=1.0){
                for(float y=-3.0;y<=3.0;y+=1.0){
                    float w=1.0-length(vec2(x,y))/4.24;
                    w=max(w,0.0);
                    w*=w;
                    vec2 offset=vec2(x,y)*texel*blur;
                    col+=texture2D(tDiffuse,vUv+offset).rgb*w;
                    total+=w;
                }
            }
            col/=total;

            float sharp=1.0-blur/maxBlur;
            col=mix(col,center,sharp*0.3);

            gl_FragColor=vec4(col,1.0);
        }
    `
};

export function createPostProcessing(renderer, scene, camera) {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(size, 0.6, 0.4, 0.82);
    composer.addPass(bloomPass);

    const dofPass = new ShaderPass(DOFShader);
    composer.addPass(dofPass);

    const filmPass = new ShaderPass(FilmShader);
    composer.addPass(filmPass);

    return { composer, bloomPass, filmPass, dofPass };
}
