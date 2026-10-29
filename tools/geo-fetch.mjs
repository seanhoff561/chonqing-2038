// Geo data for the 1:1 map (M3-39, U-017). Downloads public elevation tiles (Terrarium PNGs on AWS open data:
// SRTM, GMTED and others) and OpenStreetMap data (ODbL) for the eastern Yuzhong peninsula, and writes them in
// local metres (x east, z south from the north-west corner) to src/data/geo/. Downloads are cached in geo-cache/.
//   node tools/geo-fetch.mjs            fetch what's missing, then build
//   node tools/geo-fetch.mjs build      build from the cache only
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execFileSync } from 'child_process';

export const BBOX = { lon0: 106.564, lat0: 29.5735, lon1: 106.593, lat1: 29.548 };
const LAT = (BBOX.lat0 + BBOX.lat1) / 2, RAD = Math.PI / 180;
// Metres per degree at this latitude (WGS-84 series).
const M_LAT = 111132.954 - 559.822 * Math.cos(2 * LAT * RAD) + 1.175 * Math.cos(4 * LAT * RAD);
const M_LON = 111412.84 * Math.cos(LAT * RAD) - 93.5 * Math.cos(3 * LAT * RAD);
export const toLocal = (lon, lat) => [(lon - BBOX.lon0) * M_LON, (BBOX.lat0 - lat) * M_LAT];
export const SIZE = toLocal(BBOX.lon1, BBOX.lat1);

const CACHE = 'geo-cache', OUT = 'src/data/geo', UA = 'chongqing-2038-build/0.1 (game map reference tool)';
const Z = 15, CELL = 5, GROUND = 10, OPEN = 120, OSM_STEP = 0.004, VOID = 100;
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const offline = process.argv[2] === 'build';

function get(url, file) {
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (offline) throw new Error('not cached: ' + file);
  execFileSync('curl', ['-sS', '-f', '-m', '120', '-A', UA, '-o', file, url]);
  execFileSync('sleep', ['0.5']);
  return fs.readFileSync(file);
}

/** A minimal PNG decoder: 8-bit RGB or RGBA, not interlaced (what the elevation tiles are). */
function png(buf) {
  let p = 8, w = 0, h = 0, ch = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ch = { 2: 3, 6: 4 }[d[9]]; if (d[8] !== 8 || !ch || d[12]) throw new Error('unsupported png'); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * ch), stride = w * ch;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[y * stride + x] = (raw[src + x] + pred) & 255;
    }
  }
  return { w, h, ch, data: out };
}

// Web Mercator tile maths.
const tileX = lon => ((lon + 180) / 360) * 2 ** Z;
const tileY = lat => ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** Z;

/** Elevation in metres on a CELL-metre grid over the box, bilinear from the tiles. */
function dem() {
  const tiles = new Map();
  const tile = (tx, ty) => {
    const k = `${tx}_${ty}`;
    if (!tiles.has(k)) tiles.set(k, png(get(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`, `${CACHE}/t${Z}_${k}.png`)));
    return tiles.get(k);
  };
  const at = (px, py) => {
    const tx = Math.floor(px / 256), ty = Math.floor(py / 256), t = tile(tx, ty), i = ((py - ty * 256) * 256 + (px - tx * 256)) * t.ch;
    return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
  };
  const w = Math.ceil(SIZE[0] / CELL) + 1, h = Math.ceil(SIZE[1] / CELL) + 1, out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const lon = BBOX.lon0 + (i * CELL) / M_LON, lat = BBOX.lat0 - (j * CELL) / M_LAT;
    const fx = tileX(lon) * 256 - 0.5, fy = tileY(lat) * 256 - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const v = [at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1)];
    // Voids in the source read as deep holes: leave them for the fill below.
    out[j * w + i] = v.some(z => z < VOID) ? NaN : (v[0] * (1 - ax) + v[1] * ax) * (1 - ay) + (v[2] * (1 - ax) + v[3] * ax) * ay;
  }
  // Fill voids from their filled neighbours, ring by ring.
  for (let left = out.filter(Number.isNaN).length; left;) {
    const next = Float32Array.from(out);
    for (let k = 0; k < out.length; k++) if (Number.isNaN(out[k])) {
      const i = k % w, j = (k / w) | 0, around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => i + di >= 0 && i + di < w && j + dj >= 0 && j + dj < h ? out[(j + dj) * w + i + di] : NaN).filter(z => !Number.isNaN(z));
      if (around.length) next[k] = around.reduce((a, z) => a + z, 0) / around.length;
    }
    out.set(next);
    left = out.filter(Number.isNaN).length;
  }
  return { w, h, cell: CELL, data: out };
}

/** OpenStreetMap elements over the box, fetched in small cells from the main API, deduplicated by id. */
function osm() {
  const nodes = new Map(), ways = new Map(), rels = new Map();
  for (let lon = BBOX.lon0; lon < BBOX.lon1; lon += OSM_STEP) for (let lat = BBOX.lat1; lat < BBOX.lat0; lat += OSM_STEP) {
    const b = [lon, lat, Math.min(lon + OSM_STEP, BBOX.lon1), Math.min(lat + OSM_STEP, BBOX.lat0)].map(v => v.toFixed(5));
    const j = JSON.parse(get(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${b.join(',')}`, `${CACHE}/osm_${b.join('_')}.json`).toString());
    for (const e of j.elements) (e.type === 'node' ? nodes : e.type === 'way' ? ways : rels).set(e.id, e);
  }
  return { nodes, ways, rels };
}

/** Bare ground: an opening (min then max over OPEN metres) strips the bumps buildings leave in the radar
 *  surface, a blur rounds what's left; resampled to GROUND metres. */
function ground(d) {
  const { w, h } = d, r = Math.round(OPEN / 2 / d.cell);
  const pass = (src, f, horiz) => {
    const out = new Float32Array(src.length);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let v = f === 'min' ? Infinity : f === 'max' ? -Infinity : 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const ii = horiz ? i + k : i, jj = horiz ? j : j + k;
        if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
        const z = src[jj * w + ii];
        v = f === 'min' ? Math.min(v, z) : f === 'max' ? Math.max(v, z) : v + z; n++;
      }
      out[j * w + i] = f === 'avg' ? v / n : v;
    }
    return out;
  };
  let g = d.data;
  for (const f of ['min', 'max', 'avg']) g = pass(pass(g, f, true), f, false);
  const k = GROUND / d.cell, gw = Math.floor((w - 1) / k) + 1, gh = Math.floor((h - 1) / k) + 1, dm = new Int16Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) dm[j * gw + i] = Math.round(g[j * k * w + i * k] * 10);
  return { w: gw, h: gh, cell: GROUND, dm, at: (x, z) => g[Math.round(z / d.cell) * w + Math.round(x / d.cell)] };
}

const WIDTH = { motorway: 14, trunk: 14, primary: 14, secondary: 10, tertiary: 8, unclassified: 6, residential: 6, living_street: 5, service: 4, pedestrian: 6, footway: 2.5, steps: 3, path: 1.5, corridor: 2.5, cycleway: 2.5, track: 3 };
const dm = v => Math.round(v * 10);
const centroid = pts => { let x = 0, z = 0; for (let i = 0; i < pts.length; i += 2) { x += pts[i]; z += pts[i + 1]; } return [x / (pts.length / 2), z / (pts.length / 2)]; };

/** The parts of the OSM data the city is built from, in decimetres. */
function extract({ nodes, ways, rels }) {
  const at = id => { const n = nodes.get(id); return n ? toLocal(n.lon, n.lat).map(dm) : null; };
  const line = w => w.nodes.map(at).filter(Boolean).flat();
  const out = { streets: [], buildings: [], areas: [], rails: [], stations: [], aerial: [], landmarks: {} };
  const asBuilding = (t, pts) => out.buildings.push([+(t['building:levels'] ?? 0) || 0, dm(parseFloat(t.height ?? '0') || 0), t.building === 'yes' ? '' : t.building ?? '', t.name ?? '', pts]);
  for (const w of ways.values()) {
    const t = w.tags ?? {}, pts = line(w);
    if (pts.length < 4) continue;
    if (t.building) asBuilding(t, pts);
    else if (t.highway && WIDTH[t.highway] !== undefined) {
      const width = t.width ? parseFloat(t.width) : t.lanes ? +t.lanes * 3.25 + 1 : WIDTH[t.highway];
      out.streets.push([t.highway, dm(width || WIDTH[t.highway]), (t.highway === 'steps' ? 1 : 0) | (t.bridge ? 2 : 0) | (t.tunnel || t.highway === 'corridor' ? 4 : 0), +(t.layer ?? 0) || 0, t.name ?? '', pts]);
    } else if (t.railway && ['monorail', 'subway', 'construction', 'abandoned', 'disused', 'platform'].includes(t.railway)) out.rails.push([t.railway, (t.bridge ? 2 : 0) | (t.tunnel ? 4 : 0), +(t.layer ?? 0) || 0, t.name ?? '', pts]);
    else if (t.aerialway || t['abandoned:aerialway']) out.aerial.push([t.name ?? '', pts]);
    else {
      const kind = t.leisure === 'park' || t.leisure === 'garden' || ['grass', 'forest', 'meadow', 'village_green', 'recreation_ground'].includes(t.landuse) || ['scrub', 'wood', 'grassland', 'wetland'].includes(t.natural) ? 'park' : t.natural === 'water' ? 'water' : t.natural === 'cliff' ? 'cliff' : t.man_made === 'pier' ? 'pier' : t.man_made === 'bridge' ? 'bridge' : t.leisure === 'pitch' ? 'pitch' : t.landuse ?? null;
      if (kind) out.areas.push([kind, t.name ?? '', pts]);
    }
  }
  // Multipolygon buildings and water: their outer rings.
  for (const r of rels.values()) {
    const t = r.tags ?? {};
    if (t.type !== 'multipolygon' || !(t.building || t.natural === 'water')) continue;
    for (const m of r.members) if (m.type === 'way' && m.role === 'outer' && ways.has(m.ref)) {
      const pts = line(ways.get(m.ref));
      if (pts.length >= 6) t.building ? asBuilding(t, pts) : out.areas.push(['water', t.name ?? '', pts]);
    }
  }
  for (const n of nodes.values()) {
    const t = n.tags ?? {};
    if ((t.railway === 'station' || t.railway === 'subway_entrance' || t.aerialway === 'station' || (t.aerialway && t.public_transport)) && t.name) out.stations.push([t.name, t.railway ?? 'aerialway', ...toLocal(n.lon, n.lat).map(dm)]);
  }
  // Landmarks, by OSM id: [x, z] in metres plus the lon/lat they came from.
  const mark = (name, type, id) => {
    const e = (type === 'way' ? ways : nodes).get(id);
    if (!e) throw new Error('landmark missing: ' + name);
    const pts = type === 'way' ? line(e) : at(id);
    const [x, z] = centroid(pts).map(v => v / 10);
    const ll = type === 'way' ? e.nodes.map(i => nodes.get(i)).filter(Boolean) : [e];
    out.landmarks[name] = { x: +x.toFixed(1), z: +z.toFixed(1), lon: +(ll.reduce((a, n) => a + n.lon, 0) / ll.length).toFixed(7), lat: +(ll.reduce((a, n) => a + n.lat, 0) / ll.length).toFixed(7) };
  };
  mark('jiefangbei', 'way', 589752618);
  mark('shibati', 'way', 312090245);
  mark('grandTunnel', 'way', 1017606326);
  mark('qiansimenBridge', 'way', 1257167362);
  mark('cablewayNorth', 'node', 1872567849);
  mark('xinhuaIntl', 'way', 486221602);
  const byName = (name, test) => [...ways.values(), ...nodes.values()].find(e => e.tags?.name === name && test(e.tags));
  for (const [key, name, test] of [['hongyadong', '洪崖洞', t => t.landuse], ['chaotianmen', '朝天门', t => t.railway === 'station'], ['jiaochangkou', '较场口', t => t.railway === 'station'], ['xiaoshizi', '小什字', t => t.railway === 'station'], ['dongshuimenBridge', '东水门长江大桥', t => t.man_made]]) {
    const e = byName(name, test);
    if (!e) throw new Error('landmark missing: ' + name);
    mark(key, e.type, e.id);
  }
  return out;
}

if (process.argv[1].endsWith('geo-fetch.mjs')) {
  const d = dem(), o = osm(), g = ground(d), data = extract(o);
  for (const l of Object.values(data.landmarks)) l.ground = +g.at(l.x, l.z).toFixed(1);
  const b64 = Buffer.from(g.dm.buffer).toString('base64');
  fs.writeFileSync(path.join(OUT, 'ground.ts'), `// Bare-ground elevation of the eastern Yuzhong peninsula (M3-39): ${g.w} x ${g.h} samples every ${g.cell} m from the\n// north-west corner, decimetres above sea level as little-endian Int16, base64. Made by tools/geo-fetch.mjs\n// from Terrarium elevation tiles (AWS open data; SRTM and others). Don't edit by hand.\nexport const GROUND = { w: ${g.w}, h: ${g.h}, cell: ${g.cell}, data: '${b64}' };\n`);
  fs.writeFileSync(path.join(OUT, 'osm.json'), JSON.stringify({ size: SIZE.map(v => +v.toFixed(1)), bbox: BBOX, ...data }));
  console.log(`ground ${g.w}x${g.h}; ${data.streets.length} streets, ${data.buildings.length} buildings, ${data.areas.length} areas, ${data.rails.length} rails, ${data.stations.length} stations; osm.json ${(fs.statSync(path.join(OUT, 'osm.json')).size / 1024) | 0} KB`);
}
