// 世界陆地 / 水域判定
// 数据：src/assets/landgrid.json —— Natural Earth 50m 陆地边界栅格化的 0.125° 陆海位图
// （运行时 O(1) 位图查询；分辨率约 14km，可识别东京湾、淡路岛等中小岛屿/海湾）

import gridData from '../assets/landgrid.json' with { type: 'json' };

const RES = gridData.res;
const W = gridData.w;
const H = gridData.h;

let BITS = null;
function bits() {
  if (BITS) return BITS;
  const bin = atob(gridData.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  BITS = bytes;
  return bytes;
}

/** 点是否在陆地上 */
export function isOnLand(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const row = Math.floor((lat + 90) / RES);
  const col = Math.floor((lng + 180) / RES);
  if (row < 0 || row >= H || col < 0 || col >= W) return false;
  const b = row * W + col;
  return (bits()[b >> 3] & (1 << (b & 7))) !== 0;
}

/** 点是否在水域（海 / 湖） */
export function isOnWater(lat, lng) {
  return !isOnLand(lat, lng);
}
