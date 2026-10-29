import * as THREE from 'three';

// Boot: a renderer and an empty scene. The game loop arrives with M1-20.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080a);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 500);
renderer.render(scene, camera);

(window as unknown as { __cq: unknown }).__cq = {
  ready: true,
  scenarios: [] as string[],
  runFrames: (n: number) => { for (let i = 0; i < n; i++) renderer.render(scene, camera); },
};
