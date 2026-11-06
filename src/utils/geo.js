// 地理工具：GCJ-02 偏移转换（对齐高德底图）、距离/方位/目标点、Web Mercator 投影

const PI = Math.PI;
const EARTH_R = 6371.0088; // km

export function toRad(d) {
  return (d * PI) / 180;
}

export function toDeg(r) {
  return (r * 180) / PI;
}

/** 两点间距离（km，haversine） */
export function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}

/** 从 A 到 B 的方位角（0-360，正北为 0，顺时针） */
export function bearingDeg(aLat, aLng, bLat, bLng) {
  const y = Math.sin(toRad(bLng - aLng)) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLng - aLng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 从起点按方位/距离求目标点 */
export function destinationPoint(lat, lng, bearing, distKm) {
  const δ = distKm / EARTH_R;
  const θ = toRad(bearing);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

// ---------------- WGS-84 -> GCJ-02（高德坐标偏移） ----------------
const GCJ_A = 6378245.0;
const GCJ_EE = 0.00669342162296594323;

function outOfChina(lat, lng) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x, y) {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
  return ret;
}

/** WGS-84 -> GCJ-02，返回 { lat, lng }（中国大陆境外坐标不变） */
export function wgs84ToGcj02(lat, lng) {
  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

// ---------------- Web Mercator 投影（用于 PNG 导出） ----------------
const TILE = 256;

/** 经纬度 -> 某缩放层级下的世界像素坐标 */
export function tilePixel(lat, lng, z) {
  const n = TILE * Math.pow(2, z);
  const x = ((lng + 180) / 360) * n;
  const latRad = toRad(lat);
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / PI) / 2) * n;
  return { x, y };
}
