import * as THREE from 'three';

export function createAsteroids(planetPos) {
    const group = new THREE.Group();

    const geo = new THREE.IcosahedronGeometry(1, 0);

    for (let i = 0; i < 20; i++) {
        const size = 0.2 + Math.random() * 0.3;
        const asteroid = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8, metalness: 0.2 })
        );
        asteroid.scale.setScalar(size);

        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 12;

        asteroid.position.set(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 3,
            planetPos.z + Math.sin(angle) * dist
        );
        asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        asteroid.userData = {
            rotSpeed: (Math.random() - 0.5) * 0.005,
            orbitSpeed: (Math.random() - 0.5) * 0.0001,
            angle: angle,
            dist: dist,
            planetZ: planetPos.z
        };
        asteroid.castShadow = true;
        group.add(asteroid);
    }

    return group;
}

export function animateAsteroids(asteroids) {
    asteroids.children.forEach(function(a) {
        a.rotation.x += a.userData.rotSpeed;
        a.userData.angle += a.userData.orbitSpeed;
        a.position.x = Math.cos(a.userData.angle) * a.userData.dist;
        a.position.z = a.userData.planetZ + Math.sin(a.userData.angle) * a.userData.dist;
    });
}
