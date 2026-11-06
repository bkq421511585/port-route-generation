// PNG 导出：拉取当前底图瓦片合成到画布，再叠加绘制航线、港口、图例，输出可下载 PNG
// 依赖瓦片服务支持 CORS（高德瓦片已支持）；瓦片加载失败时以海蓝色底兜底，航线仍可正常绘制。

import { wgs84ToGcj02, tilePixel } from './geo.js';
import { TILE_PROVIDERS } from './tiles.js';

const TILE = 256;
const FONT = '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif';
const COLOR_ROUTE = '#0f80c4';
const COLOR_SEA = '#ff9f1a';
const COLOR_HOME = '#e64545';

function loadTile(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawArrow(ctx, x1, y1, x2, y2, color, size = 11) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const x = x1 + (x2 - x1) * 0.55;
  const y = y1 + (y2 - y1) * 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.62);
  ctx.lineTo(-size * 0.7, size * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 导出航线图 PNG
 * @param {object} opts
 *  - title/subtitle: 图上标题
 *  - geometry: buildRouteGeometry 的结果
 *  - portTypeOf: Map<token, 'home'|'visit'>
 *  - providerKey: TILE_PROVIDERS 的 key
 *  - maxWidth/maxHeight/maxTiles: 画布与瓦片数量上限
 * @returns {Promise<Blob>}
 */
export async function exportRoutePng({
  title = '邮轮航线图',
  subtitle = '',
  geometry,
  portTypeOf = new Map(),
  providerKey = 'gaodeRoad',
  maxWidth = 2048,
  maxHeight = 1600,
  maxTiles = 160,
  onProgress = () => {},
} = {}) {
  const provider = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.gaodeRoad;
  const pts = geometry.points;
  if (!pts.length) throw new Error('没有可绘制的航线点');

  // 1. 包围盒
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const p of [...pts, ...geometry.seaDays]) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const padLat = (maxLat - minLat) * 0.2 || 1.5;
  const padLng = (maxLng - minLng) * 0.2 || 1.5;
  minLat -= padLat;
  maxLat += padLat;
  minLng -= padLng;
  maxLng += padLng;

  // 2. 选缩放层级：取满足画布尺寸且瓦片数不超限的最大层级
  const fitAt = (zz) => {
    const a = tilePixel(maxLat, minLng, zz);
    const b = tilePixel(minLat, maxLng, zz);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    const tX0 = Math.floor(Math.min(a.x, b.x) / TILE);
    const tX1 = Math.floor(Math.max(a.x, b.x) / TILE);
    const tY0 = Math.floor(Math.min(a.y, b.y) / TILE);
    const tY1 = Math.floor(Math.max(a.y, b.y) / TILE);
    const count = (tX1 - tX0 + 1) * (tY1 - tY0 + 1);
    return { fits: w <= maxWidth && h <= maxHeight && count <= maxTiles, tX0, tX1, tY0, tY1 };
  };
  let z = 3;
  for (let zz = 17; zz >= 3; zz--) {
    const r = fitAt(zz);
    if (r.fits) {
      z = zz;
      break;
    }
  }
  const grid = fitAt(z);

  // 3. 画布与底图瓦片
  const canvas = document.createElement('canvas');
  const cw = (grid.tX1 - grid.tX0 + 1) * TILE;
  const ch = (grid.tY1 - grid.tY0 + 1) * TILE;
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfe3ef';
  ctx.fillRect(0, 0, cw, ch);

  const jobs = [];
  for (let tx = grid.tX0; tx <= grid.tX1; tx++) {
    for (let ty = grid.tY0; ty <= grid.tY1; ty++) jobs.push({ tx, ty });
  }
  let done = 0;
  await Promise.all(
    jobs.map(async ({ tx, ty }) => {
      const img = await loadTile(provider.url(tx, ty, z));
      if (img) ctx.drawImage(img, (tx - grid.tX0) * TILE, (ty - grid.tY0) * TILE);
      done++;
      onProgress(done / jobs.length);
    })
  );

  // 4. 投影（瓦片为 GCJ-02，坐标先偏移再投影）
  const toPx = (lat, lng) => {
    const g = wgs84ToGcj02(lat, lng);
    const p = tilePixel(g.lat, g.lng, z);
    return { x: p.x - grid.tX0 * TILE, y: p.y - grid.tY0 * TILE };
  };

  // 5. 航段
  for (const leg of geometry.legs) {
    const pa = pts[leg.a];
    const pb = pts[leg.b];
    const A = toPx(pa.lat, pa.lng);
    const B = toPx(pb.lat, pb.lng);
    const color = leg.isSea ? COLOR_SEA : COLOR_ROUTE;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash(leg.isSea ? [12, 10] : []);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (leg.arrow !== false) drawArrow(ctx, A.x, A.y, B.x, B.y, color);
  }

  // 6. 港口标记（参考图 ◎ 圆环点样式）+ 天数角标 + 名称
  for (const p of pts.filter((x) => x.kind === 'port')) {
    const c = toPx(p.lat, p.lng);
    const isHome = portTypeOf.get(p.token) === 'home';
    const color = isHome ? COLOR_HOME : COLOR_ROUTE;
    // ◎ 外环
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    // ◎ 内点
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // 天数角标（环上方）
    ctx.font = `bold 11px ${FONT}`;
    const dayTxt = `D${p.day}`;
    const tw = ctx.measureText(dayTxt).width + 10;
    const cy = c.y - 24;
    roundRect(ctx, c.x - tw / 2, cy - 10, tw, 18, 9);
    ctx.fillStyle = '#7a8699';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dayTxt, c.x, cy);
    // 名称（环右侧）
    ctx.font = `600 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(p.token, c.x + 16, c.y);
    ctx.fillStyle = '#1f2d3d';
    ctx.fillText(p.token, c.x + 16, c.y);
  }

  // 7. 海上巡游标注
  for (const s of geometry.seaDays) {
    const c = toPx(s.lat, s.lng);
    ctx.font = `bold 12px ${FONT}`;
    const label = `${s.label} D${s.day}`;
    const tw = ctx.measureText(label).width + 16;
    roundRect(ctx, c.x - tw / 2, c.y - 12, tw, 24, 12);
    ctx.fillStyle = COLOR_SEA;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, c.x, c.y + 1);
  }

  // 8. 标题 / 图例 / 版权
  const pad = 18;
  ctx.textBaseline = 'alphabetic';
  const titleText = title || '邮轮航线图';
  ctx.font = `700 26px ${FONT}`;
  const ttW = ctx.measureText(titleText).width;
  const subText = subtitle || `${geometry.dayCount} 天行程 · 航线图`;
  ctx.font = `500 14px ${FONT}`;
  const stW = ctx.measureText(subText).width;
  const boxW = Math.max(ttW, stW) + 44;
  roundRect(ctx, pad, pad, boxW, 86, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,111,217,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = '#1f2d3d';
  ctx.fillText(titleText, pad + 18, pad + 34);
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = '#6b7785';
  ctx.fillText(subText, pad + 18, pad + 60);

  const legendItems = [
    ['母港', COLOR_HOME],
    ['访问港', COLOR_ROUTE],
    ['海上巡游', COLOR_SEA],
  ];
  const lw = legendItems.length * 86 + 30;
  const ly = canvas.height - pad - 46;
  roundRect(ctx, pad, ly, lw, 40, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  let lx = pad + 18;
  ctx.textBaseline = 'middle';
  for (const [label, color] of legendItems) {
    ctx.beginPath();
    ctx.arc(lx + 6, ly + 20, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = `500 13px ${FONT}`;
    ctx.fillStyle = '#3c4a5a';
    ctx.textAlign = 'left';
    ctx.fillText(label, lx + 18, ly + 20);
    lx += 86;
  }

  ctx.font = `400 12px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(60,74,90,0.75)';
  ctx.fillText(`${provider.attr} · 坐标 GCJ-02`, canvas.width - pad, canvas.height - pad - 4);

  // 9. 输出
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('PNG 生成失败');
  return blob;
}

/** 触发浏览器下载 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
