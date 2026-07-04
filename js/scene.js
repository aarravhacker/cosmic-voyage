import * as THREE from 'three';

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000005);
    return scene;
}

export function createCamera() {
    return new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
}

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
}

export function createLights(scene) {
    const sunPos = new THREE.Vector3(300, 150, -400);

    const sunDir = new THREE.DirectionalLight(0xfff0dd, 6);
    sunDir.position.copy(sunPos);
    sunDir.castShadow = true;
    sunDir.shadow.mapSize.width = 2048;
    sunDir.shadow.mapSize.height = 2048;
    sunDir.shadow.camera.near = 0.1;
    sunDir.shadow.camera.far = 1000;
    sunDir.shadow.camera.left = -200;
    sunDir.shadow.camera.right = 200;
    sunDir.shadow.camera.top = 200;
    sunDir.shadow.camera.bottom = -200;
    sunDir.shadow.bias = -0.0005;
    sunDir.shadow.radius = 1;
    scene.add(sunDir);

    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x6688bb, 0x221133, 0.6);
    hemiLight.position.set(0, 100, 0);
    scene.add(hemiLight);

    const blueRim = new THREE.PointLight(0x4466ff, 1.5, 600, 1.5);
    blueRim.position.set(-50, 30, 50);
    scene.add(blueRim);

    const fillLight = new THREE.PointLight(0x2a2255, 0.6, 400, 1.5);
    fillLight.position.set(30, -25, -50);
    scene.add(fillLight);

    const portalGlow = new THREE.PointLight(0x222244, 0.8, 120, 2);
    portalGlow.position.set(-30, 5, -80);
    scene.add(portalGlow);

    const stationFill = new THREE.DirectionalLight(0xffeedd, 3);
    stationFill.position.set(300, 150, -400);
    stationFill.target.position.set(80, 20, -120);
    scene.add(stationFill);
    scene.add(stationFill.target);
}

export function createEnvMap(renderer, scene) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x020208);

    const sphereGeo = new THREE.SphereGeometry(50, 32, 32);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x080818, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(sphereGeo, bgMat));

    const sunGeo = new THREE.SphereGeometry(3, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(50, 30, -60);
    envScene.add(sunMesh);

    const sunGlowGeo = new THREE.SphereGeometry(8, 16, 16);
    const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.4, side: THREE.BackSide, blending: THREE.AdditiveBlending });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunGlow.position.copy(sunMesh.position);
    envScene.add(sunGlow);

    const sunHaloGeo = new THREE.SphereGeometry(15, 16, 16);
    const sunHaloMat = new THREE.MeshBasicMaterial({ color: 0xff8822, transparent: true, opacity: 0.1, side: THREE.BackSide, blending: THREE.AdditiveBlending });
    const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
    sunHalo.position.copy(sunMesh.position);
    envScene.add(sunHalo);

    const nebulaColors = [0x1a0a2e, 0x0a1a3e, 0x2a0a1e, 0x0a2a2e];
    for (let i = 0; i < 4; i++) {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 60),
            new THREE.MeshBasicMaterial({ color: nebulaColors[i], transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        const angle = (i / 4) * Math.PI * 2;
        plane.position.set(Math.cos(angle) * 30, (Math.random() - 0.5) * 20, Math.sin(angle) * 30 - 30);
        plane.lookAt(0, 0, -30);
        envScene.add(plane);
    }

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 40 + Math.random() * 8;
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 });
    envScene.add(new THREE.Points(starGeo, starMat));

    const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    pmremGenerator.dispose();
    scene.environment = envMap;
    return envMap;
}
