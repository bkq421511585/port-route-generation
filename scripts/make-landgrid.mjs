// 一次性构建脚本：把 Natural Earth 50m 陆地边界栅格化为 0.125° 陆海位图，
// 输出 src/assets/landgrid.json（base64 压缩位图），供运行时 O(1) 查询。
// 用法：node scripts/make-landgrid.mjs <input.topojson>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] || '/tmp/land-50m.json';
const outFile = path.join(__dirname, '..', 'src', 'assets', 'landgrid.json');

const RES = 0.125;
const W = Math.round(360 / RES); // 2880
const H = Math.round(180 / RES); // 1440
const bits = new Uint8Array(Math.ceil((W * H) / 8));

const bitIdx = (row, col) => row * W + col;
const setLand = (row, col) => {
  const b = bitIdx(row, col);
  bits[b >> 3] |= 1 << (b & 7);
};
const clearLand = (row, col) => {
  const b = bitIdx(row, col);
  bits[b >> 3] &= ~(1 << (b & 7));
};
const latToRow = (lat) => Math.floor((lat + 90) / RES);
const lngToCol = (lng) => Math.floor((lng + 180) / RES);

/** 对单个环做扫描线填充（setVal=false 时为清除/内环挖湖） */
function rasterizeRing(ring, setVal) {
  let minRow = H, maxRow = -1;
  for (const [, lat] of ring) {
    const r = latToRow(lat);
    if (r < minRow) minRow = r;
    if (r > maxRow) maxRow = r;
  }
  minRow = Math.max(0, minRow);
  maxRow = Math.min(H - 1, maxRow);
  for (let row = minRow; row <= maxRow; row++) {
    const latY = -90 + RES * (row + 0.5);
    const xs = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const y0 = ring[j][1];
      const y1 = ring[i][1];
      if (y0 > latY !== y1 > latY) {
        const x0 = ring[j][0];
        const x1 = ring[i][0];
        xs.push(x0 + ((x1 - x0) * (latY - y0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // 只填充“单元中心”落在跨度内的列，避免边界整格过填把窄海湾填成陆地
      const c0 = Math.ceil((xs[k] + 180) / RES - 0.5);
      const c1 = Math.floor((xs[k + 1] + 180) / RES - 0.5);
      const cs = Math.max(0, c0);
      const ce = Math.min(W - 1, c1);
      for (let col = cs; col <= ce; col++) {
        if (setVal) setLand(row, col);
        else clearLand(row, col);
      }
    }
  }
}

const topo = JSON.parse(fs.readFileSync(input, 'utf8'));
const land = feature(topo, topo.objects.land);
let pieces = 0;
for (const f of land.features) {
  const g = f.geometry;
  const coordsList = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  for (const coords of coordsList) {
    pieces++;
    rasterizeRing(coords[0], true); // 外环填充陆地
    for (let r = 1; r < coords.length; r++) rasterizeRing(coords[r], false); // 内环（湖泊）清除
  }
}

const base64 = Buffer.from(bits).toString('base64');
const out = { res: RES, w: W, h: H, data: base64 };
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`栅格化完成: ${pieces} 个多边形, 网格 ${W}x${H}, 输出 ${outFile} (${(outFile && fs.statSync(outFile).size / 1024).toFixed(0)}KB)`);
