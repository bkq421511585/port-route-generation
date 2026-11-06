// 行程代码解析与航线几何构建
// 支持：'上海-福冈-长崎-济州-上海'（5天）、'上海-海上巡游-上海'（3天）
// '海上巡游' 表示全天海上巡游（无停靠港）

import { destinationPoint, distanceKm, bearingDeg } from './geo.js';
import { isOnWater } from './land.js';

const SEA_WORDS = ['海上巡游', '海上巡航', '巡游日', '海上日', '巡游', '巡航', 'sea day', 'sea'];

/** 规范化行程代码：统一分隔符、去空格 */
export function normalizeCode(text) {
  return String(text || '')
    .replace(/[－—–,，、;；\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 是否为“海上巡游”节点 */
export function isSeaToken(token) {
  const t = String(token || '').trim().toLowerCase();
  if (!t) return false;
  if (SEA_WORDS.includes(t)) return true;
  return t.includes('巡游') || t.includes('巡航');
}

/** 在港口配置中查找（名称/英文名/别名精确匹配，忽略大小写） */
export function findPort(ports, token) {
  const t = String(token || '').trim().toLowerCase();
  if (!t) return null;
  return (
    ports.find((p) => {
      if (String(p.name || '').toLowerCase() === t) return true;
      if (String(p.enName || '').toLowerCase() === t) return true;
      return (p.alias || []).some((a) => String(a).toLowerCase() === t);
    }) || null
  );
}

/** 解析行程代码 */
export function parseItinerary(code, ports) {
  const rawCode = normalizeCode(code);
  const tokens = rawCode.split('-').map((s) => s.trim()).filter(Boolean);
  const errors = [];
  if (tokens.length < 2) errors.push('行程至少需要 2 个节点（如：上海-福冈-上海）');

  const days = tokens.map((token, i) => {
    const isSea = isSeaToken(token);
    const port = isSea ? null : findPort(ports, token);
    return { day: i + 1, token, isSea, port, located: !isSea && !!port && Number.isFinite(port.lat) && Number.isFinite(port.lng) };
  });

  const missing = [...new Set(days.filter((d) => !d.isSea && !d.port).map((d) => d.token))];
  const unlocated = [...new Set(days.filter((d) => !d.isSea && d.port && !d.located).map((d) => d.token))];
  if (missing.length) errors.push(`以下港口未配置：${missing.join('、')}`);
  if (unlocated.length) errors.push(`以下港口未设置经纬度：${unlocated.join('、')}`);

  const legs = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    legs.push({
      index: i + 1,
      fromToken: tokens[i],
      toToken: tokens[i + 1],
      fromPort: days[i].port,
      toPort: days[i + 1].port,
      isSeaLeg: days[i].isSea || days[i + 1].isSea,
    });
  }

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return {
    ok: errors.length === 0 && tokens.length >= 2,
    errors,
    rawCode,
    tokens,
    days,
    legs,
    missing,
    unlocated,
    dayCount: tokens.length,
    isLoop: !isSeaToken(first) && first.toLowerCase() === last.toLowerCase(),
  };
}

/**
 * 计算两港连线“小弧形”的弯点（控制点）：
 * 沿弦长的中垂线（前进方向左侧）偏移，弧高为弦长的 bend 比例（带上下限），
 * 形成类似椭圆边的柔和弧线，避免直来直去的直线。
 */
export function curveControl(aLat, aLng, bLat, bLng, opts = {}) {
  const bend = opts.bend ?? 0.12; // 弧高比例（弦长的 12%，顶点偏差约 6%）
  const side = opts.side ?? 1; // 1=前进方向左侧
  const dist = distanceKm(aLat, aLng, bLat, bLng);
  const offset = Math.max(6, Math.min(dist * bend, 100)); // km
  const brg = bearingDeg(aLat, aLng, bLat, bLng);
  const mid = destinationPoint(aLat, aLng, brg, dist / 2);
  return destinationPoint(mid.lat, mid.lng, brg - 90 * side, offset);
}

/**
 * 两港之间的柔和弧线点集（二次贝塞尔采样，含端点）
 * @returns {Array<{lat,lng}>} 长度为 samples+1
 */
export function gentleCurve(aLat, aLng, bLat, bLng, opts = {}) {
  const samples = opts.samples ?? 12;
  const control = curveControl(aLat, aLng, bLat, bLng, opts);
  const pts = [];
  for (let k = 0; k <= samples; k++) {
    const t = k / samples;
    const lat = (1 - t) ** 2 * aLat + 2 * (1 - t) * t * control.lat + t ** 2 * bLat;
    const lng = (1 - t) ** 2 * aLng + 2 * (1 - t) * t * control.lng + t ** 2 * bLng;
    pts.push({ lat, lng });
  }
  return pts;
}

/**
 * 计算某一出航方位/距离下“海上巡游”往返弧线落在水域的比例。
 * 直接评估实际绘制路径的全部弧线点（50m 位图精度足以区分近岸水域）。
 */
function scoreOutAndBack(lat, lng, brg, dist) {
  const out = destinationPoint(lat, lng, brg, dist);
  let water = 0;
  let n = 0;
  for (const arc of [
    gentleCurve(lat, lng, out.lat, out.lng, { bend: 0.25, side: 1 }),
    gentleCurve(out.lat, out.lng, lat, lng, { bend: 0.25, side: -1 }),
  ]) {
    for (let k = 1; k < arc.length - 1; k++) {
      n++;
      if (isOnWater(arc[k].lat, arc[k].lng)) water++;
    }
  }
  return n ? water / n : 0;
}

/**
 * 寻找“海上巡游”出海的方向与距离：
 * 扫描 360° 与多个出航距离，选择远段水域占比最高的方案，
 * 保证画出来的出海路径朝向开阔海域、尽量不压到陆地。
 */
export function findSeaBearing(lat, lng) {
  let best = null;
  for (const dist of [70, 50, 35, 25, 18]) {
    for (let b = 0; b < 360; b += 15) {
      const ratio = scoreOutAndBack(lat, lng, b, dist);
      if (!best || ratio > best.ratio || (ratio === best.ratio && dist > best.dist)) {
        best = { bearing: b, ratio, dist };
      }
    }
  }
  return best ? { bearing: best.bearing, dist: best.dist } : { bearing: 120, dist: 70 };
}

// ---------- 平滑样条（Catmull-Rom 风格：切线连续、无折角、轻微弧线） ----------

function segLen(a, b) {
  return Math.hypot(b.lng - a.lng, b.lat - a.lat);
}

/** 锚点 i 处切线方向（单位向量，相邻点差方向），open 时端点用单侧 */
function tangentDir(anchors, i, closed) {
  const n = anchors.length;
  const prev = anchors[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
  const next = anchors[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
  const dx = next.lng - prev.lng;
  const dy = next.lat - prev.lat;
  const m = Math.hypot(dx, dy);
  if (m === 0) return { lat: 0, lng: 0 };
  return { lat: dy / m, lng: dx / m };
}

/** 采样一段三次贝塞尔 a->b（显式控制点 c1/c2），返回含端点的点集 */
function sampleSegment(a, b, c1, c2, samples = 16) {
  const pts = [];
  for (let k = 0; k <= samples; k++) {
    const t = k / samples;
    const u = 1 - t;
    pts.push({
      lat: u * u * u * a.lat + 3 * u * u * t * c1.lat + 3 * u * t * t * c2.lat + t * t * t * b.lat,
      lng: u * u * u * a.lng + 3 * u * u * t * c1.lng + 3 * u * t * t * c2.lng + t * t * t * b.lng,
    });
  }
  return pts;
}

/**
 * 构建航线绘制几何：
 * - points: [{ kind:'port'|'curve'|'sea', lat, lng, token?, day? }]
 * - legs:   [{ a, b, isSea, day, arrow }]（a/b 为 points 下标；arrow 控制是否画方向箭头）
 * - seaDays: [{ day, lat, lng, label }]（海上巡游日标注点）
 * 港口间连线用平滑样条（整条航线一条连续光滑曲线、无折角，形似椭圆边）；
 * 海上巡游 A-海上巡游-A 用两条柔和弧线往返（梭形），A-海上巡游-B 用虚线样条连接。
 */
export function buildRouteGeometry(parsed) {
  const pts = [];
  const legs = [];
  const seaDays = [];
  const portByToken = new Map();
  const tokens = parsed.tokens;
  const days = parsed.days;

  // 1) 唯一港口锚点（环线闭合的起终点只保留一次）
  const anchors = [];
  const tokAnchor = new Map(); // tokenIndex -> anchorIndex
  {
    let ai = 0;
    for (let ti = 0; ti < tokens.length; ti++) {
      const d = days[ti];
      if (d.isSea) continue;
      if (parsed.isLoop && d.token === tokens[0] && ti === tokens.length - 1) {
        tokAnchor.set(ti, 0); // 环线闭合：映射回起点
        continue;
      }
      anchors.push({ lat: d.port.lat, lng: d.port.lng, token: d.token, day: d.day });
      tokAnchor.set(ti, ai);
      portByToken.set(d.token, d);
      ai++;
    }
  }
  const closed = parsed.isLoop && anchors.length >= 3;

  // 2) 逻辑航段（真实港口之间的段，标记海上巡游/出海折返）
  const logicalLegs = [];
  let prevRealTok = null;
  for (let ti = 0; ti < tokens.length; ti++) {
    if (days[ti].isSea) continue;
    if (prevRealTok !== null) {
      const hasSea = days.slice(prevRealTok + 1, ti).some((x) => x.isSea);
      logicalLegs.push({
        a: tokAnchor.get(prevRealTok),
        b: tokAnchor.get(ti),
        isSea: hasSea,
        day: prevRealTok + 1,
        outAndBack: hasSea && tokAnchor.get(prevRealTok) === tokAnchor.get(ti),
      });
    }
    prevRealTok = ti;
  }

  // 3) 港口点
  const portIdx = anchors.map((an, ai) => {
    pts.push({ kind: 'port', token: an.token, lat: an.lat, lng: an.lng, day: an.day });
    return pts.length - 1;
  });

  // 环心（闭环用：把每段向外推离环心，形成椭圆/叶形环）
  const centroid = closed
    ? {
        lat: anchors.reduce((s, x) => s + x.lat, 0) / anchors.length,
        lng: anchors.reduce((s, x) => s + x.lng, 0) / anchors.length,
      }
    : null;

  // 一段航段的控制点：
  //  - 切线分量（相邻点方向，保证港口处无折角、平滑连续）
  //  - 垂直分量（闭环：弧向“环心所在边的反侧”弯，即向外膨胀；开环：前进方向左侧）
  const legCtrl = (a, b) => {
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const L = Math.hypot(dx, dy) || 1e-6;
    let side;
    if (closed) {
      // 环心相对 a 点：crossC>0 → 环心在边左侧 → 弧向右弯；否则向左弯
      const crossC = dx * (centroid.lat - a.lat) - dy * (centroid.lng - a.lng);
      const leftLat = dx / L;
      const leftLng = -dy / L;
      side = { lat: crossC > 0 ? -leftLat : leftLat, lng: crossC > 0 ? -leftLng : leftLng };
    } else {
      // 前进方向左侧（(lng,lat) 平面）
      side = { lat: dx / L, lng: -dy / L };
    }
    const pMag = Math.max(0.12, Math.min(L * 0.18, 2.2)); // 垂直推离幅度（度）
    const tMag = Math.max(0.1, Math.min(L * 0.2, 2.0)); // 切线幅度（度）
    return { side, pMag, tMag };
  };

  // 把一条平滑样条段细分成子段
  const pushSmoothLeg = (aIdx, bIdx, { isSea, day }) => {
    const a = anchors[aIdx];
    const b = anchors[bIdx];
    const ta = tangentDir(anchors, aIdx, closed);
    const tb = tangentDir(anchors, bIdx, closed);
    const { side, pMag, tMag } = legCtrl(a, b);
    const c1 = { lat: a.lat + ta.lat * tMag + side.lat * pMag, lng: a.lng + ta.lng * tMag + side.lng * pMag };
    const c2 = { lat: b.lat - tb.lat * tMag + side.lat * pMag, lng: b.lng - tb.lng * tMag + side.lng * pMag };
    const curve = sampleSegment(a, b, c1, c2);
    const mid = curve.slice(1, -1);
    const startIdx = pts.length;
    mid.forEach((p) => pts.push({ kind: isSea ? 'sea' : 'curve', lat: p.lat, lng: p.lng, day }));
    const segPairs = [{ a: portIdx[aIdx], b: startIdx }];
    for (let k = 0; k < mid.length - 1; k++) segPairs.push({ a: startIdx + k, b: startIdx + k + 1 });
    segPairs.push({ a: startIdx + mid.length - 1, b: portIdx[bIdx] });
    const arrowIdx = Math.floor(segPairs.length / 2);
    segPairs.forEach((s, idx) => {
      legs.push({ ...s, isSea, day, arrow: idx === arrowIdx });
    });
    return curve[Math.floor(curve.length / 2)]; // 段中点（海上巡游标注）
  };

  // 出海折返（A-海上巡游-A）：两条柔和弧线形成梭形
  const pushOutAndBack = (aIdx, day) => {
    const p = anchors[aIdx];
    const { bearing: brg, dist: outDist } = findSeaBearing(p.lat, p.lng);
    const out = destinationPoint(p.lat, p.lng, brg, outDist);
    const outIdx = pts.length;
    pts.push({ kind: 'sea', lat: out.lat, lng: out.lng, day });
    const pushArc = (x, y, side) => {
      const curve = gentleCurve(pts[x].lat, pts[x].lng, pts[y].lat, pts[y].lng, { bend: 0.25, side });
      const mid = curve.slice(1, -1);
      const startIdx = pts.length;
      mid.forEach((q) => pts.push({ kind: 'sea', lat: q.lat, lng: q.lng, day }));
      const segPairs = [{ a: x, b: startIdx }];
      for (let k = 0; k < mid.length - 1; k++) segPairs.push({ a: startIdx + k, b: startIdx + k + 1 });
      segPairs.push({ a: startIdx + mid.length - 1, b: y });
      const arrowIdx = Math.floor(segPairs.length / 2);
      segPairs.forEach((s, idx) => {
        legs.push({ ...s, isSea: true, day, arrow: idx === arrowIdx });
      });
    };
    pushArc(portIdx[aIdx], outIdx, 1);
    pushArc(outIdx, portIdx[aIdx], -1);
    seaDays.push({ day, lat: out.lat, lng: out.lng, label: '海上巡游' });
  };

  // 4) 逐段生成
  for (const lg of logicalLegs) {
    if (lg.outAndBack) {
      pushOutAndBack(lg.a, lg.day);
    } else {
      const mid = pushSmoothLeg(lg.a, lg.b, { isSea: lg.isSea, day: lg.day });
      if (lg.isSea) seaDays.push({ day: lg.day, lat: mid.lat, lng: mid.lng, label: '海上巡游' });
    }
  }

  return {
    points: pts,
    legs,
    seaDays,
    portByToken,
    tokens: parsed.tokens,
    days: parsed.days,
    dayCount: parsed.dayCount,
    isLoop: parsed.isLoop,
    rawCode: parsed.rawCode,
  };
}
