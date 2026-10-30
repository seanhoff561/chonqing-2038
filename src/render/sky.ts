// Sky, sun, moon, ambient and fog colour from the game clock; the painted sky dome (M3-49) over it all.
import * as THREE from 'three';
import { daylight, hourOf } from '../sim/clock';
import { SHADOW_R, type View } from './view';
import { setNight, setWet } from './materials';
import { SkyDome } from './skydome';

const DAY_SKY = new THREE.Color(0x9fabb2), DUSK_SKY = new THREE.Color(0x6b5a58), NIGHT_SKY = new THREE.Color(0x151a27);
const OVERCAST = new THREE.Color(0xb4b8b8), RAIN_SKY = new THREE.Color(0x5a6268);
const NIGHT_GROUND = new THREE.Color(0x3a2a18), DAY_GROUND = new THREE.Color(0x7a7266);
const c = new THREE.Color(), sunDir = new THREE.Vector3();

export class Sky {
  readonly moon = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xd8dce6, fog: false }));
  /** fog density multiplier set by weather (1 = clear haze) */
  fogMul = 1;
  /** 0 clear to 1 overcast: flat light, no sun, pale haze */
  overcast = 0;

  /** The painted sky, clouds and stars (M3-49). */
  readonly dome = new SkyDome();

  constructor(private view: View) { view.scene.add(this.moon, this.dome.mesh); }

  /** under: 0 in the open, 1 deep underground (sky light shut out); weather fog and rain 0..1 (M3-13) */
  update(time: number, camPos: THREE.Vector3, farBase: number, under = 0, weather = { fog: 0, rain: 0 }) {
    const v = this.view, d = daylight(time), h = hourOf(time);
    // Fog and rain flatten the light like an overcast sky, and fog closes the view from kilometres to ~120 m.
    const flat = Math.max(this.overcast, weather.fog * 0.9, weather.rain);
    const fogK = Math.exp(-3.1 * weather.fog);
    setWet(weather.rain, d);
    const duskness = Math.max(0, 1 - Math.abs(d - 0.5) * 2) * (d < 1 && d > 0 ? 1 : 0);
    c.copy(NIGHT_SKY).lerp(DAY_SKY, d).lerp(DUSK_SKY, duskness * 0.6);
    (v.scene.background as THREE.Color).copy(c);
    const fog = v.scene.fog as THREE.Fog;
    c.lerp(OVERCAST, flat * d * 0.6);
    // Rain darkens (U-019): low cloud and a grey-blue murk, never a white wash.
    c.lerp(RAIN_SKY, weather.rain * 0.75 * d);
    (v.scene.background as THREE.Color).copy(c);
    fog.color.copy(c);
    fog.far = Math.min(Math.max(Math.min(farBase, 110), farBase * fogK), farBase + (380 - farBase) * weather.rain) / this.fogMul;
    // Overcast haze builds slowly with distance; otherwise the fog closes in near the draw distance.
    fog.near = flat > 0.3 ? fog.far * (weather.fog > 0.3 ? 0.05 : 0.14) : Math.min(fog.far * 0.15, 25);
    // Sun arcs east to west through the day; below the horizon at night.
    const a = ((h - 6) / 12) * Math.PI;
    // The shadow area follows him in whole shadow texels, so edges don't shimmer as he moves.
    // Its height follows in 4 m steps and the sun turns in steps of a tenth of a degree, so the map is redrawn only
    // when something about it has moved (View.render).
    const tx = (2 * SHADOW_R) / v.sun.shadow.mapSize.x, cx = Math.round(camPos.x / tx) * tx, cz = Math.round(camPos.z / tx) * tx, cy = Math.round(camPos.y / 4) * 4;
    const as = Math.round(a / 0.0017) * 0.0017;
    v.sun.target.position.set(cx, cy, cz);
    v.sun.position.set(cx + Math.cos(as) * 160, cy + Math.max(20, Math.sin(as) * 180), cz + 60);
    v.sun.castShadow = d > 0.05 && under < 0.5;
    v.sun.intensity = 1.7 * d * (1 - under) * (1 - 0.7 * flat) * (1 - 0.5 * weather.rain);
    v.sun.color.setHSL(0.09, 0.5 - 0.3 * d, 0.85 + 0.1 * d);
    v.hemi.intensity = (1.4 - 0.15 * d) * (1 - under * 0.85) * (1 + 0.1 * flat) * (1 - 0.3 * weather.rain);
    v.hemi.color.copy(NIGHT_SKY).lerp(new THREE.Color(0xc8d4e0), d).lerp(new THREE.Color(0x5f74a8), (1 - d) * 0.9);
    v.hemi.groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, d);
    setNight(Math.max(0, 1 - d * 1.6));
    // Cloud: some every day (how much, by the day), closing in with overcast, rain and fog.
    const day = Math.floor(time / 86400), base = 0.25 + 0.4 * Math.abs(Math.sin(day * 12.9898) * 43758.5453 % 1);
    const cover = Math.min(1, Math.max(base, this.overcast * 0.95, weather.rain * 0.9 + 0.1, weather.fog * 0.7));
    this.dome.update(camPos, sunDir.copy(v.sun.position).sub(v.sun.target.position), d, duskness, cover, weather.rain, weather.fog, fog.color, performance.now() / 1000);
    const ma = ((h - 18) / 12) * Math.PI;
    this.moon.visible = d < 0.6;
    this.moon.position.set(camPos.x - Math.cos(ma) * 300, camPos.y + Math.max(40, Math.sin(ma) * 260), camPos.z - 200);
  }
}
