// The sky (M3-49, U-021), painted in code on a dome round the camera: a gradient from the haze at the horizon to
// the zenith, the sun's disc and its warm glow at dawn and dusk, layers of cloud drifting on the wind (broken
// on a fair day, closing to a grey lid when it's overcast, dark and low in rain), fog banks along the horizon,
// stars on a clear night, and a faint grey on the underside of low cloud at night (the city's emptied: no orange
// glow, U-031).
import * as THREE from 'three';

const VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = `
uniform vec3 uSun, uHorizon, uZenith, uGlow;
uniform float uDay, uDusk, uCover, uRain, uFog, uTime;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0), sd = max(dot(d, uSun), 0.0);
  vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));
  // Dawn and dusk: warm light round the sun, low down.
  sky += uDusk * vec3(1.0, 0.42, 0.18) * pow(sd, 5.0) * (1.0 - h) * (1.0 - 0.7 * uCover);
  sky += vec3(1.0, 0.92, 0.8) * (pow(sd, 900.0) * 6.0 + pow(sd, 40.0) * 0.25) * uDay * (1.0 - uCover) * step(0.0, uSun.y);
  // Stars, where the night is clear: pinpoints of differing brightness, fewer toward the hazy horizon.
  vec2 sp = d.xz / (d.y + 0.3) * 260.0, cell = floor(sp);
  float star = step(0.9978, hash(cell)) * (0.4 + 1.1 * hash(cell + 7.3)) * smoothstep(0.35, 0.05, length(fract(sp) - 0.5));
  sky += vec3(0.85, 0.88, 1.0) * star * (1.0 - uDay) * (1.0 - uCover) * smoothstep(0.1, 0.45, d.y);
  // Cloud on a layer overhead, drifting.
  vec2 uv = d.xz / (d.y + 0.12) * 0.9 + vec2(uTime * 0.0035, uTime * 0.0015);
  float n = fbm(uv * 1.4), cover = smoothstep(1.0 - uCover - 0.18, 1.0 - uCover + 0.22, n);
  vec3 lit = mix(vec3(0.96, 0.96, 0.95), vec3(1.0, 0.62, 0.42), uDusk) * (0.08 + 0.92 * uDay);
  vec3 dark = mix(lit * 0.62, vec3(0.3, 0.32, 0.35) * (0.15 + 0.85 * uDay), uRain);
  vec3 cloud = mix(dark, lit, smoothstep(0.35, 0.95, n)) + uGlow * (1.0 - uDay) * (0.5 + 0.5 * uCover);
  sky = mix(sky, cloud, cover * smoothstep(0.0, 0.15, d.y));
  // Haze and fog banks down to the horizon, into the fog the city stands in.
  sky = mix(sky, uHorizon, smoothstep(0.18 + 0.3 * uFog, 0.0, d.y));
  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
}`;

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly u = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uGlow: { value: new THREE.Color(0x1c2026) },
    uDay: { value: 1 }, uDusk: { value: 0 }, uCover: { value: 0.4 }, uRain: { value: 0 }, uFog: { value: 0 }, uTime: { value: 0 },
  };

  constructor() {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  /** day: daylight 0..1; dusk 0..1; cover: cloud 0 clear to 1 a solid lid; horizon: the fog's colour. */
  update(cam: THREE.Vector3, sun: THREE.Vector3, day: number, dusk: number, cover: number, rain: number, fog: number, horizon: THREE.Color, t: number) {
    const u = this.u;
    this.mesh.position.copy(cam);
    u.uSun.value.copy(sun).normalize();
    u.uDay.value = day; u.uDusk.value = dusk; u.uCover.value = cover; u.uRain.value = rain; u.uFog.value = fog; u.uTime.value = t;
    u.uHorizon.value.copy(horizon);
    // The zenith: a deeper blue-grey by day, near black at night, greyer as the cloud closes in.
    u.uZenith.value.setRGB(0.05 + 0.25 * day, 0.07 + 0.33 * day, 0.12 + 0.42 * day).lerp(horizon, 0.35 + 0.5 * cover);
  }
}
