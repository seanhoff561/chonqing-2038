// Sky, sun, moon, ambient and fog colour from the game clock.
import * as THREE from 'three';
import { daylight, hourOf } from '../sim/clock';
import { SHADOW_R, type View } from './view';
import { setNight } from './materials';

const DAY_SKY = new THREE.Color(0x9fabb2), DUSK_SKY = new THREE.Color(0x6b5a58), NIGHT_SKY = new THREE.Color(0x151a27);
const OVERCAST = new THREE.Color(0xb4b8b8);
const NIGHT_GROUND = new THREE.Color(0x3a2a18), DAY_GROUND = new THREE.Color(0x4a4438);
const c = new THREE.Color();

export class Sky {
  readonly moon = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xd8dce6, fog: false }));
  /** fog density multiplier set by weather (1 = clear haze) */
  fogMul = 1;
  /** 0 clear to 1 overcast: flat light, no sun, pale haze */
  overcast = 0;

  constructor(private view: View) { view.scene.add(this.moon); }

  /** under: 0 in the open, 1 deep underground (sky light shut out) */
  update(time: number, camPos: THREE.Vector3, farBase: number, under = 0) {
    const v = this.view, d = daylight(time), h = hourOf(time);
    const duskness = Math.max(0, 1 - Math.abs(d - 0.5) * 2) * (d < 1 && d > 0 ? 1 : 0);
    c.copy(NIGHT_SKY).lerp(DAY_SKY, d).lerp(DUSK_SKY, duskness * 0.6);
    (v.scene.background as THREE.Color).copy(c);
    const fog = v.scene.fog as THREE.Fog;
    c.lerp(OVERCAST, this.overcast * d * 0.6);
    (v.scene.background as THREE.Color).copy(c);
    fog.color.copy(c);
    fog.far = farBase / this.fogMul;
    // Overcast haze builds slowly with distance; otherwise the fog closes in near the draw distance.
    fog.near = this.overcast ? fog.far * 0.14 : Math.min(fog.far * 0.15, 25);
    // Sun arcs east to west through the day; below the horizon at night.
    const a = ((h - 6) / 12) * Math.PI;
    // The shadow area follows him in whole shadow texels, so edges don't shimmer as he moves.
    const tx = (2 * SHADOW_R) / v.sun.shadow.mapSize.x, cx = Math.round(camPos.x / tx) * tx, cz = Math.round(camPos.z / tx) * tx;
    v.sun.target.position.set(cx, camPos.y, cz);
    v.sun.position.set(cx + Math.cos(a) * 160, camPos.y + Math.max(20, Math.sin(a) * 180), cz + 60);
    v.sun.castShadow = d > 0.05 && under < 0.5;
    v.sun.intensity = 1.7 * d * (1 - under) * (1 - 0.7 * this.overcast);
    v.sun.color.setHSL(0.09, 0.5 - 0.3 * d, 0.85 + 0.1 * d);
    v.hemi.intensity = (1.4 - 0.15 * d) * (1 - under * 0.92) * (1 + 0.1 * this.overcast);
    v.hemi.color.copy(NIGHT_SKY).lerp(new THREE.Color(0xc8d4e0), d).lerp(new THREE.Color(0x5f74a8), (1 - d) * 0.9);
    v.hemi.groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, d);
    setNight(Math.max(0, 1 - d * 1.6));
    const ma = ((h - 18) / 12) * Math.PI;
    this.moon.visible = d < 0.6;
    this.moon.position.set(camPos.x - Math.cos(ma) * 300, camPos.y + Math.max(40, Math.sin(ma) * 260), camPos.z - 200);
  }
}
