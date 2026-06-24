import * as THREE from 'three';

const TRAIL_MAX = 60;
const TRAIL_FADE_SPEED = 0.015;

function createShip() {
  const ship = new THREE.Group();

  const bodyGeo = new THREE.ConeGeometry(0.4, 2.5, 8);
  bodyGeo.rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x88aacc,
    emissive: 0x112244,
    roughness: 0.15,
    metalness: 0.85,
    envMapIntensity: 2.0,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  ship.add(body);

  const wingGeo = new THREE.BoxGeometry(1.8, 0.06, 0.6);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x6688aa,
    emissive: 0x0a1a33,
    roughness: 0.1,
    metalness: 0.9,
    envMapIntensity: 2.5,
  });
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.2, 0, 0.1);
  ship.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(-0.2, 0, -0.1);
  ship.add(rightWing);

  const cockpitGeo = new THREE.CylinderGeometry(0.15, 0.22, 0.6, 8);
  cockpitGeo.rotateX(Math.PI / 2);
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x224466,
    emissive: 0x003355,
    transparent: true,
    opacity: 0.7,
    roughness: 0.05,
    metalness: 0.9,
    envMapIntensity: 3.0,
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0.3, 0.25, 0);
  ship.add(cockpit);

  const cockpitGlowGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const cockpitGlowMat = new THREE.MeshBasicMaterial({
    color: 0x44aaff,
    transparent: true,
    opacity: 0.8,
  });
  const cockpitGlow = new THREE.Mesh(cockpitGlowGeo, cockpitGlowMat);
  cockpitGlow.position.set(0.3, 0.25, 0);
  ship.add(cockpitGlow);
  ship.userData.cockpitGlow = cockpitGlow;

  const engineGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const engineMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.9,
  });
  const leftEngine = new THREE.Mesh(engineGeo, engineMat);
  leftEngine.position.set(-0.5, 0, 0.95);
  ship.add(leftEngine);

  const rightEngine = new THREE.Mesh(engineGeo, engineMat);
  rightEngine.position.set(-0.5, 0, -0.95);
  ship.add(rightEngine);

  const glowTexture = createGlowTexture();

  const glowLeft = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0x00aaff, transparent: true,
    blending: THREE.AdditiveBlending, opacity: 0.6, depthWrite: false,
  }));
  glowLeft.scale.set(0.5, 0.5, 1);
  glowLeft.position.set(-0.5, 0, 0.95);
  ship.add(glowLeft);
  ship.userData.glowLeft = glowLeft;

  const glowRight = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0x00aaff, transparent: true,
    blending: THREE.AdditiveBlending, opacity: 0.6, depthWrite: false,
  }));
  glowRight.scale.set(0.5, 0.5, 1);
  glowRight.position.set(-0.5, 0, -0.95);
  ship.add(glowRight);
  ship.userData.glowRight = glowRight;

  const exhaustGeo = new THREE.ConeGeometry(0.12, 0.8, 8, 1, true);
  exhaustGeo.rotateX(-Math.PI / 2);
  const exhaustMatL = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main(){
        float core=1.0-vUv.y;
        core=pow(core,2.0);
        float flicker=0.85+sin(uTime*20.0+vUv.y*10.0)*0.15;
        vec3 innerCol=vec3(0.5,0.8,1.0)*flicker;
        vec3 outerCol=vec3(0.1,0.3,0.8)*flicker;
        vec3 col=mix(outerCol,innerCol,core);
        float alpha=core*0.8*flicker;
        alpha*=smoothstep(0.0,0.2,vUv.y);
        gl_FragColor=vec4(col,alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const exhaustL = new THREE.Mesh(exhaustGeo, exhaustMatL);
  exhaustL.position.set(-0.9, 0, 0.95);
  ship.add(exhaustL);
  ship.userData.exhaustL = exhaustL;

  const exhaustMatR = exhaustMatL.clone();
  const exhaustR = new THREE.Mesh(exhaustGeo.clone(), exhaustMatR);
  exhaustR.position.set(-0.9, 0, -0.95);
  ship.add(exhaustR);
  ship.userData.exhaustR = exhaustR;

  const navRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2200 })
  );
  navRed.position.set(0.6, 0, 0.9);
  ship.add(navRed);
  ship.userData.navRed = navRed;

  const navGreen = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x00ff44 })
  );
  navGreen.position.set(0.6, 0, -0.9);
  ship.add(navGreen);
  ship.userData.navGreen = navGreen;

  const navWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  navWhite.position.set(1.2, 0, 0);
  ship.add(navWhite);
  ship.userData.navWhite = navWhite;

  const navRedSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0xff2200, transparent: true,
    blending: THREE.AdditiveBlending, opacity: 0.5, depthWrite: false,
  }));
  navRedSprite.scale.set(0.15, 0.15, 1);
  navRedSprite.position.set(0.6, 0, 0.9);
  ship.add(navRedSprite);
  ship.userData.navRedSprite = navRedSprite;

  const navGreenSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0x00ff44, transparent: true,
    blending: THREE.AdditiveBlending, opacity: 0.5, depthWrite: false,
  }));
  navGreenSprite.scale.set(0.15, 0.15, 1);
  navGreenSprite.position.set(0.6, 0, -0.9);
  ship.add(navGreenSprite);
  ship.userData.navGreenSprite = navGreenSprite;

  const trailPositions = new Float32Array(TRAIL_MAX * 3);
  const trailAlphas = new Float32Array(TRAIL_MAX);
  const trailSizes = new Float32Array(TRAIL_MAX);

  for (let i = 0; i < TRAIL_MAX; i++) {
    trailAlphas[i] = 0;
    trailSizes[i] = 0;
  }

  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));
  trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

  const trailMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float alpha;
      attribute float size;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float intensity = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(0.3, 0.7, 1.0, vAlpha * intensity * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const trail = new THREE.Points(trailGeo, trailMat);
  ship.add(trail);

  ship.userData.trail = trail;
  ship.userData.trailIndex = 0;
  ship.userData.trailPositions = trailPositions;
  ship.userData.trailAlphas = trailAlphas;
  ship.userData.trailSizes = trailSizes;

  return ship;
}

function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(100, 200, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(0, 100, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 50, 200, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function animateShip(ship, time) {
  const t = time;

  const progress = (t * 0.5) % 4;
  ship.position.x = -50 + progress * 30;
  ship.position.y = Math.sin(t * 2) * 1.5 + Math.sin(t * 0.7) * 0.5;
  ship.position.z = Math.cos(t * 1.3) * 2 + Math.sin(t * 0.9) * 0.8;

  ship.rotation.z = Math.sin(t * 2) * 0.08;
  ship.rotation.x = Math.cos(t * 1.3) * 0.04;

  const pulse = 0.5 + Math.sin(t * 8) * 0.15;
  if (ship.userData.glowLeft) {
    ship.userData.glowLeft.material.opacity = pulse * 0.7;
    ship.userData.glowLeft.scale.setScalar(0.4 + Math.sin(t * 10) * 0.1);
  }
  if (ship.userData.glowRight) {
    ship.userData.glowRight.material.opacity = pulse * 0.7;
    ship.userData.glowRight.scale.setScalar(0.4 + Math.sin(t * 10 + 1) * 0.1);
  }

  if (ship.userData.cockpitGlow) {
    ship.userData.cockpitGlow.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
  }

  if (ship.userData.exhaustL) {
    ship.userData.exhaustL.material.uniforms.uTime.value = t;
    ship.userData.exhaustL.scale.set(1, 1, 0.7 + Math.sin(t * 15) * 0.3);
  }
  if (ship.userData.exhaustR) {
    ship.userData.exhaustR.material.uniforms.uTime.value = t;
    ship.userData.exhaustR.scale.set(1, 1, 0.7 + Math.sin(t * 15 + 1) * 0.3);
  }

  const navBlink = Math.sin(t * 3) > 0;
  if (ship.userData.navRed) ship.userData.navRed.material.emissiveIntensity = navBlink ? 2 : 0;
  if (ship.userData.navGreen) ship.userData.navGreen.material.emissiveIntensity = navBlink ? 2 : 0;
  if (ship.userData.navWhite) ship.userData.navWhite.material.emissiveIntensity = Math.sin(t * 2) > 0.5 ? 1.5 : 0;
  if (ship.userData.navRedSprite) ship.userData.navRedSprite.material.opacity = navBlink ? 0.6 : 0.05;
  if (ship.userData.navGreenSprite) ship.userData.navGreenSprite.material.opacity = navBlink ? 0.6 : 0.05;

  updateTrail(ship, t);
}

function updateTrail(ship, time) {
  const trailPositions = ship.userData.trailPositions;
  const trailAlphas = ship.userData.trailAlphas;
  const trailSizes = ship.userData.trailSizes;
  const idx = ship.userData.trailIndex;
  const trail = ship.userData.trail;

  trailPositions[idx * 3] = ship.position.x;
  trailPositions[idx * 3 + 1] = ship.position.y;
  trailPositions[idx * 3 + 2] = ship.position.z;
  trailAlphas[idx] = 1.0;
  trailSizes[idx] = 0.3 + Math.random() * 0.15;

  for (let i = 0; i < TRAIL_MAX; i++) {
    if (trailAlphas[i] > 0) {
      trailAlphas[i] -= TRAIL_FADE_SPEED;
      if (trailAlphas[i] < 0) trailAlphas[i] = 0;
      trailSizes[i] *= 0.97;
    }
  }

  ship.userData.trailIndex = (idx + 1) % TRAIL_MAX;
  trail.geometry.attributes.position.needsUpdate = true;
  trail.geometry.attributes.alpha.needsUpdate = true;
  trail.geometry.attributes.size.needsUpdate = true;
}

export { createShip, animateShip };
