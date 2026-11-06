<template>
  <div ref="el" class="route-map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { wgs84ToGcj02, bearingDeg } from '../utils/geo.js';

const el = ref(null);
let map = null;
let routeGroup = null;
const baseLayers = {};

const ROAD =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const SAT = 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function gcj(lat, lng) {
  const g = wgs84ToGcj02(lat, lng);
  return [g.lat, g.lng];
}

function midPoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function arrowIcon(bearing, isSea) {
  return L.divIcon({
    className: 'route-arrow-wrap',
    html: `<div class="route-arrow${isSea ? ' sea' : ''}" style="transform:rotate(${bearing}deg)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function buildPopup(info, isHome) {
  if (!info || !info.port) return '港口信息缺失';
  const p = info.port;
  return `<div style="font-size:13px;line-height:1.7">
    <b>${p.name}</b>${p.enName ? ` <span style="color:#8a94a6">${p.enName}</span>` : ''}<br/>
    类型：${isHome ? '母港' : '访问港'}${p.country ? ` · ${p.country}` : ''}<br/>
    坐标：${Number.isFinite(p.lat) ? p.lat.toFixed(4) : '-'}, ${Number.isFinite(p.lng) ? p.lng.toFixed(4) : '-'}
    ${p.remark ? `<br/><span style="color:#8a94a6">${p.remark}</span>` : ''}
  </div>`;
}

function drawRoute(geometry, portTypeOf = new Map()) {
  if (!routeGroup) return;
  routeGroup.clearLayers();
  const pts = geometry.points;
  if (!pts.length) return;
  const latlngs = pts.map((p) => gcj(p.lat, p.lng));

  for (const leg of geometry.legs) {
    const a = latlngs[leg.a];
    const b = latlngs[leg.b];
    L.polyline([a, b], {
      color: leg.isSea ? '#ff9f1a' : '#0f80c4',
      weight: leg.isSea ? 3 : 4,
      opacity: 0.95,
      dashArray: leg.isSea ? '8 8' : null,
    }).addTo(routeGroup);
    const brg = bearingDeg(a[0], a[1], b[0], b[1]);
    if (leg.arrow !== false) {
      L.marker(midPoint(a, b), { icon: arrowIcon(brg, leg.isSea), interactive: false }).addTo(routeGroup);
    }
  }

  for (const p of pts.filter((x) => x.kind === 'port')) {
    const pos = gcj(p.lat, p.lng);
    const isHome = portTypeOf.get(p.token) === 'home';
    const icon = L.divIcon({
      className: 'pm',
      html: `<div class="pm-day">D${p.day}</div>
             <span class="pm-ico"><span class="pm-ring ${isHome ? 'home' : 'visit'}"></span><span class="pm-core ${isHome ? 'home' : 'visit'}"></span></span>
             <span class="pm-name">${p.token}</span>`,
      iconSize: [170, 44],
      iconAnchor: [11, 11],
    });
    const m = L.marker(pos, { icon }).addTo(routeGroup);
    m.bindPopup(buildPopup(geometry.portByToken.get(p.token), isHome));
  }

  for (const s of geometry.seaDays) {
    const pos = gcj(s.lat, s.lng);
    L.marker(pos, {
      icon: L.divIcon({
        className: 'pm-sea',
        html: `<div class="pm-sea-chip">海上巡游 D${s.day}</div>`,
        iconSize: [120, 22],
        iconAnchor: [60, 11],
      }),
      interactive: false,
    }).addTo(routeGroup);
  }

  map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 11 });
}

function setBaseLayer(key) {
  Object.entries(baseLayers).forEach(([k, layer]) => {
    if (k === key && !map.hasLayer(layer)) layer.addTo(map);
    if (k !== key && map.hasLayer(layer)) map.removeLayer(layer);
  });
}

onMounted(() => {
  map = L.map(el.value, { zoomControl: true, attributionControl: true }).setView([24, 115], 4);
  baseLayers.gaodeRoad = L.tileLayer(ROAD, { subdomains: '1234', maxZoom: 18, attribution: '© 高德地图' });
  baseLayers.gaodeSat = L.tileLayer(SAT, { subdomains: '1234', maxZoom: 18, attribution: '© 高德地图' });
  baseLayers.osm = L.tileLayer(OSM, { maxZoom: 18, attribution: '© OpenStreetMap contributors' });
  baseLayers.gaodeRoad.addTo(map);
  L.control
    .layers(
      { '高德街道': baseLayers.gaodeRoad, '高德卫星': baseLayers.gaodeSat, 'OpenStreetMap': baseLayers.osm },
      null,
      { position: 'topright' }
    )
    .addTo(map);
  routeGroup = L.layerGroup().addTo(map);

  const ro = new ResizeObserver(() => map && map.invalidateSize());
  ro.observe(el.value);
  setTimeout(() => map && map.invalidateSize(), 100);
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
    routeGroup = null;
  }
});

defineExpose({ drawRoute, setBaseLayer });
</script>
