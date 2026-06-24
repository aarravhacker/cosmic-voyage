import * as THREE from 'three';

export function createDust() {
    const count = 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 300;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
        pos[i * 3 + 2] = -Math.random() * 300;
        sizes[i] = 0.3 + Math.random() * 0.6;
        speeds[i] = 0.1 + Math.random() * 0.3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            varying float vAlpha;
            void main(){
                vAlpha=0.15+0.25*size;
                vec4 mv=modelViewMatrix*vec4(position,1.0);
                gl_PointSize=size*(300.0/-mv.z);
                gl_Position=projectionMatrix*mv;
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            void main(){
                float d=length(gl_PointCoord-0.5);
                float a=1.0-smoothstep(0.0,0.5,d);
                a*=a;
                gl_FragColor=vec4(0.6,0.6,0.7,a*vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    return { points, speeds };
}

export function animateDust(data, time) {
    const pos = data.points.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += Math.sin(time * data.speeds[i] + i) * 0.02;
        pos[i * 3 + 1] += Math.cos(time * data.speeds[i] * 0.7 + i) * 0.015;
    }
    data.points.geometry.attributes.position.needsUpdate = true;
    data.points.material.uniforms.uTime.value = time;
}
