const keyframes = [
  // Earth orbit - close front
  { pos: [0, 3, 5], lookAt: [0, 0, -20], fov: 40 },
  // Earth orbit - close right
  { pos: [12, 4, -15], lookAt: [0, 0, -20], fov: 38 },
  // Earth orbit - behind (wide)
  { pos: [0, 5, -40], lookAt: [0, 0, -20], fov: 42 },
  // Earth orbit - close left
  { pos: [-12, 3, -15], lookAt: [0, 0, -20], fov: 38 },
  // Earth orbit - close front again
  { pos: [0, 3, 5], lookAt: [0, 0, -20], fov: 40 },
  // Fly towards station
  { pos: [35, 16, -70], lookAt: [75, 18, -110], fov: 38 },
  // Station - close front
  { pos: [55, 25, -85], lookAt: [80, 20, -120], fov: 36 },
  // Station - orbit right close
  { pos: [105, 26, -105], lookAt: [80, 20, -120], fov: 36 },
  // Station - orbit back-right
  { pos: [105, 24, -140], lookAt: [80, 20, -120], fov: 38 },
  // Station - orbit behind
  { pos: [80, 26, -160], lookAt: [80, 20, -120], fov: 38 },
  // Station - orbit back-left
  { pos: [50, 24, -140], lookAt: [80, 20, -120], fov: 38 },
  // Station - orbit left close
  { pos: [50, 26, -105], lookAt: [80, 20, -120], fov: 36 },
  // Station - back to front (loops)
  { pos: [55, 25, -85], lookAt: [80, 20, -120], fov: 36 },
];

let cameraProgress = 0;
let targetScrollProgress = 0;
const WHEEL_SENSITIVITY = 0.08;
const TOUCH_SENSITIVITY = 0.12;
const CAMERA_SPEED = 36;
let scrollPaused = false;
let flyInMode = false;

export function setScrollPaused(paused) {
  scrollPaused = paused;
}

export function setFlyInMode(enabled) {
  flyInMode = enabled;
}

export function getCameraState() {
  return {
    position: [...currentPos],
    lookAt: [...currentLookAt],
    fov: currentFov,
  };
}

let currentPos = [0, 3, 5];
let currentLookAt = [0, 0, -20];
let currentFov = 40;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function interpolateVec3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function evaluatePath(t) {
  const total = keyframes.length;
  const segments = total - 1;
  const raw = t * segments;
  const index = clamp(Math.floor(raw), 0, segments - 1);
  const frac = raw - index;
  const nextIndex = (index + 1) % total;
  const s = smootherstep(frac);
  return {
    pos: interpolateVec3(keyframes[index].pos, keyframes[nextIndex].pos, s),
    lookAt: interpolateVec3(keyframes[index].lookAt, keyframes[nextIndex].lookAt, s),
    fov: lerp(keyframes[index].fov, keyframes[nextIndex].fov, s),
  };
}

function dampVec3(current, target, factor) {
  return [
    lerp(current[0], target[0], factor),
    lerp(current[1], target[1], factor),
    lerp(current[2], target[2], factor),
  ];
}

function onWheel(e) {
  if (scrollPaused) return;
  if (e.deltaY > 0) targetScrollProgress += WHEEL_SENSITIVITY;
  else targetScrollProgress -= WHEEL_SENSITIVITY;
}

let touchStartY = 0;

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function onTouchMove(e) {
  if (scrollPaused) return;
  const dy = touchStartY - e.touches[0].clientY;
  touchStartY = e.touches[0].clientY;
  if (dy > 0) targetScrollProgress += TOUCH_SENSITIVITY;
  else if (dy < 0) targetScrollProgress -= TOUCH_SENSITIVITY;
}

export function initScroll() {
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
}

export function updateCamera(camera, time) {
  if (flyInMode) return;

  const maxProgress = keyframes.length - 1;

  if (cameraProgress >= maxProgress) {
    cameraProgress = 0;
    targetScrollProgress = 0;
  }

  const diff = targetScrollProgress - cameraProgress;
  if (Math.abs(diff) > 0.0001) {
    cameraProgress += Math.sign(diff) * Math.min(CAMERA_SPEED * 0.016, Math.abs(diff));
  }

  const pathT = clamp(cameraProgress / maxProgress, 0, 1);
  const { pos, lookAt, fov } = evaluatePath(pathT);

  currentPos = dampVec3(currentPos, pos, 0.12);
  currentLookAt = dampVec3(currentLookAt, lookAt, 0.12);
  currentFov = lerp(currentFov, fov, 0.12);

  camera.position.set(currentPos[0], currentPos[1], currentPos[2]);
  camera.lookAt(currentLookAt[0], currentLookAt[1], currentLookAt[2]);
  camera.fov = currentFov;
  camera.updateProjectionMatrix();
}

export function setCurrentCameraState(pos, lookAt, fov) {
  currentPos = [...pos];
  currentLookAt = [...lookAt];
  currentFov = fov;
}

export function getScrollProgress() {
  return clamp(cameraProgress / (keyframes.length - 1), 0, 1);
}
