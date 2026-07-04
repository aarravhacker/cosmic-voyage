import * as THREE from 'three';

function showError(msg, stack) {
    const el = document.getElementById('error-display');
    if (el) {
        el.style.display = 'block';
        el.innerHTML = 'Error: ' + msg + '<br>' + (stack || '').replace(/\n/g, '<br>');
    }
    console.error('SCENE ERROR:', msg, stack);
}

try {
    const { createScene, createCamera, createRenderer, createLights, createEnvMap } = await import('./js/scene.js');
    const { createStars, createShootingStars, animateStars } = await import('./js/stars.js');
    const { createNebula, animateNebula } = await import('./js/nebula.js');
    const { createPlanet, animatePlanet } = await import('./js/planet.js');
    const { createRings, animateRings } = await import('./js/rings.js');
    const { createAsteroids, animateAsteroids } = await import('./js/asteroids.js');
    const { createStation, animateStation } = await import('./js/station.js');
    const { createShip, animateShip } = await import('./js/ship.js');
    const { createSun, animateSun } = await import('./js/sun.js');
    const { createDust, animateDust } = await import('./js/dust.js');
    const { createStationEnergy, animateStationEnergy } = await import('./js/effects.js');
    const { createPostProcessing } = await import('./js/postprocessing.js');
    const { initScroll, updateCamera, getScrollProgress } = await import('./js/camera.js');

    const canvas = document.getElementById('scene');

    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer(canvas);

    createLights(scene);
    createEnvMap(renderer, scene);

    const { composer, filmPass } = createPostProcessing(renderer, scene, camera);

    const stars = createStars();
    scene.add(stars.group);

    const shootingStars = createShootingStars();
    scene.add(shootingStars.group);

    const nebula = createNebula();
    scene.add(nebula);

    const { group: planetGroup, mesh: planetMesh, planetMat, clouds, cloudMat } = createPlanet();
    scene.add(planetGroup);

    const rings = createRings(planetGroup.position);
    scene.add(rings);

    const asteroids = createAsteroids(planetGroup.position);
    scene.add(asteroids);

    const station = createStation();
    scene.add(station);

    const ship = createShip();
    scene.add(ship);

    const sunData = createSun();
    scene.add(sunData.group);

    const dust = createDust();
    scene.add(dust.points);

    const stationEnergy = createStationEnergy();
    scene.add(stationEnergy.points);

    initScroll();

    // ============================================
    // RESIZE
    // ============================================

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    // ============================================
    // ANIMATION LOOP
    // ============================================

    const prevCamPos = new THREE.Vector3();
    prevCamPos.copy(camera.position);
    const prevCamDir = new THREE.Vector3();
    camera.getWorldDirection(prevCamDir);
    let prevScroll = 0;

    const clock = new THREE.Clock();
    let lastTime = 0;

    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const dt = Math.min(t - lastTime, 0.05);
        lastTime = t;

        updateCamera(camera, t);

        const scrollProgress = getScrollProgress();
        const scrollDelta = Math.abs(scrollProgress - prevScroll);
        prevScroll = scrollProgress;

        const camDelta = camera.position.distanceTo(prevCamPos);
        prevCamPos.copy(camera.position);

        const currentDir = new THREE.Vector3();
        camera.getWorldDirection(currentDir);
        const dirDelta = currentDir.clone().sub(prevCamDir);
        prevCamDir.copy(currentDir);

        const motionIntensity = Math.min(camDelta * 3.0 + scrollDelta * 10.0 + dirDelta.length() * 2.0, 1.0);
        const projDir = new THREE.Vector2(dirDelta.x, dirDelta.y).normalize();
        if (filmPass) {
            filmPass.uniforms.motionBlur.value = motionIntensity;
            filmPass.uniforms.motionDirX.value = isFinite(projDir.x) ? projDir.x : 0;
            filmPass.uniforms.motionDirY.value = isFinite(projDir.y) ? projDir.y : 0;
        }

        animateStars(stars, shootingStars, dt);
        animateNebula(nebula);
        animatePlanet(planetMesh, planetMat, clouds, cloudMat, t);
        animateRings(rings);
        animateAsteroids(asteroids);
        animateStation(station, t);
        animateShip(ship, t);
        animateSun(sunData, t);
        animateDust(dust, t);
        animateStationEnergy(stationEnergy, t);

        filmPass.uniforms.time.value = t;

        composer.render();
    }

    document.getElementById('loading').classList.add('hidden');
    animate();

} catch (err) {
    showError(err.message, err.stack);
}
