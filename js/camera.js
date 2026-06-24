const keyframes = [
  // Earth orbit - front
  { pos: [0, 4, 0], lookAt: [0, 0, -20], fov: 55 },
  // Earth orbit - right
  { pos: [18, 5, -20], lookAt: [0, 0, -20], fov: 52 },
  // Earth orbit - behind
  { pos: [0, 6, -40], lookAt: [0, 0, -20], fov: 50 },
  // Earth orbit - left
  { pos: [-18, 5, -20], lookAt: [0, 0, -20], fov: 52 },
  // Earth orbit - front again
  { pos: [0, 4, 0], lookAt: [0, 0, -20], fov: 55 },
  // Fly towards station
  { pos: [40, 18, -75], lookAt: [70, 20, -108], fov: 52 },
  // Station - wide view from front
  { pos: [60, 30, -90], lookAt: [80, 20, -120], fov: 52 },
  // Station - orbit right (distant)
  { pos: [115, 32, -108], lookAt: [80, 20, -120], fov: 52 },
  // Station - orbit back-right (distant)
  { pos: [115, 30, -140], lookAt: [80, 20, -120], fov: 52 },
  // Station - orbit behind (distant)
  { pos: [80, 32, -158], lookAt: [80, 20, -120], fov: 52 },
  // Station - orbit back-left (distant)
  { pos: [45, 30, -140], lookAt: [80, 20, -120], fov: 52 },
  // Station - orbit left (distant)
  { pos: [45, 32, -108], lookAt: [80, 20, -120], fov: 52 },
  // Station - back to front
  { pos: [60, 30, -90], lookAt: [80, 20, -120], fov: 52 },
  // Fly from station to portal
  { pos: [30, 14, -95], lookAt: [0, 8, -82], fov: 52 },
  // Portal approach
  { pos: [-5, 7, -70], lookAt: [-30, 5, -80], fov: 48 },
  // Portal closeup outside
  { pos: [-18, 6, -68], lookAt: [-30, 5, -80], fov: 42 },
  // Portal final closeup
  { pos: [-22, 5.5, -70], lookAt: [-30, 5, -80], fov: 38 },
  // Portal inside - deep
  { pos: [-28, 5, -76], lookAt: [-32, 5, -82], fov: 32 },
  // Portal center - loop triggers here
  { pos: [-30, 5, -80], lookAt: [-34, 5, -84], fov: 28 },
];

let cameraProgress = 0;
let targetScrollProgress = 0;
const WHEEL_SENSITIVITY = 0.08;
const TOUCH_SENSITIVITY = 0.12;
const CAMERA_SPEED = 36;

let currentPos = [0, 4, 0];
let currentLookAt = [0, 0, -20];
let currentFov = 55;

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
  if (e.deltaY > 0) targetScrollProgress += WHEEL_SENSITIVITY;
  else targetScrollProgress -= WHEEL_SENSITIVITY;
}

let touchStartY = 0;

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function onTouchMove(e) {
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

export function getScrollProgress() {
  return clamp(cameraProgress / (keyframes.length - 1), 0, 1);
}
