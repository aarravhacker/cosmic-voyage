import * as THREE from 'three';

export function createNebula() {
    const group = new THREE.Group();
    const cols = [0x1a0a2e, 0x0a1a3e, 0x2a0a1e, 0x0a2a2e];

    for (let i = 0; i < 4; i++) {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(300, 300),
            new THREE.MeshBasicMaterial({
                color: cols[i % cols.length],
                transparent: true,
                opacity: 0.08,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        plane.position.set(
            (Math.random() - 0.5) * 400,
            (Math.random() - 0.5) * 200,
            -200 - Math.random() * 200
        );
        plane.rotation.z = Math.random() * Math.PI;
        group.add(plane);
    }
    return group;
}

export function animateNebula(nebula) {
    nebula.rotation.y += 0.00003;
}
