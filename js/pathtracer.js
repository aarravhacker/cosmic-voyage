import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';

let pathTracer = null;
let isEnabled = false;
let isLoading = false;
let lastCamPos = new THREE.Vector3();
let lastCamQuat = new THREE.Quaternion();
let hiddenObjects = [];

export function initPathTracer(renderer) {
    pathTracer = new WebGLPathTracer(renderer);

    // Conservative settings — avoid freezing the browser
    pathTracer.bounces = 2;
    pathTracer.tiles.set(3, 3);
    pathTracer.minSamples = 2;
    pathTracer.fadeDuration = 300;
    pathTracer.renderDelay = 200;
    pathTracer.dynamicLowRes = true;
    pathTracer.lowResScale = 0.1;
    pathTracer.filterGlossyFactor = 1.0;
    pathTracer.renderScale = 0.5; // Half resolution for performance
    pathTracer.renderToCanvas = true;
    pathTracer.rasterizeScene = false;

    return pathTracer;
}

function hideIncompatibleObjects(scene) {
    hiddenObjects = [];
    scene.traverse(obj => {
        if (!obj.isMesh) return;
        const mat = obj.material;
        if (!mat) return;
        const isStandard = mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial;
        if (!isStandard || mat.blending === THREE.AdditiveBlending) {
            obj.visible = false;
            hiddenObjects.push(obj);
        }
    });
    console.log('[PT] Hidden', hiddenObjects.length, 'objects');
}

function restoreHiddenObjects() {
    for (const obj of hiddenObjects) {
        obj.visible = true;
    }
    hiddenObjects = [];
}

export function enablePathTracer(scene, camera) {
    if (!pathTracer || isLoading) return false;

    isLoading = true;
    console.log('[PT] Loading... (this may freeze for a moment)');

    // Use setTimeout to let the UI update before heavy work
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                hideIncompatibleObjects(scene);

                const savedEnv = scene.environment;
                scene.environment = null;

                pathTracer.setScene(scene, camera);
                scene.environment = savedEnv;

                pathTracer.reset();
                lastCamPos.copy(camera.position);
                lastCamQuat.copy(camera.quaternion);
                isEnabled = true;
                isLoading = false;
                console.log('[PT] ON');
                resolve(true);
            } catch (e) {
                console.error('[PT] Failed:', e);
                restoreHiddenObjects();
                isLoading = false;
                isEnabled = false;
                resolve(false);
            }
        }, 50);
    });
}

export function disablePathTracer() {
    restoreHiddenObjects();
    isEnabled = false;
    isLoading = false;
}

export function isPathTracerEnabled() {
    return isEnabled;
}

export function isPathTracerLoading() {
    return isLoading;
}

export function updatePathTracer(camera) {
    if (!pathTracer || !isEnabled) return;

    const posDelta = camera.position.distanceTo(lastCamPos);
    const quatDelta = lastCamQuat.angleTo(camera.quaternion);

    if (posDelta > 0.001 || quatDelta > 0.0001) {
        try { pathTracer.updateCamera(); } catch (e) { /* ignore */ }
        lastCamPos.copy(camera.position);
        lastCamQuat.copy(camera.quaternion);
    }
}

export function renderPathTracer() {
    if (!pathTracer || !isEnabled) return;
    try {
        pathTracer.renderSample();
    } catch (e) { /* ignore */ }
}

export function resetPathTracer() {
    if (!pathTracer) return;
    try { pathTracer.reset(); } catch (e) { /* ignore */ }
}

export function getPathTracer() {
    return pathTracer;
}

export function disposePathTracer() {
    restoreHiddenObjects();
    if (pathTracer) {
        pathTracer.dispose();
        pathTracer = null;
        isEnabled = false;
    }
}
