<template>
  <div ref="el" class="picker-map"></div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';

const props = defineProps({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
});
const emit = defineEmits(['update']);

const el = ref(null);
let map = null;
let marker = null;
let lastEmitKey = null;

const ROAD =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

function setMarker(lat, lng, emitChange) {
  if (!marker) marker = L.marker([lat, lng]).addTo(map);
  else marker.setLatLng([lat, lng]);
  if (emitChange) {
    lastEmitKey = `${lat},${lng}`;
    emit('update', { lat, lng });
  }
}

onMounted(() => {
  map = L.map(el.value, { zoomControl: true, attributionControl: true }).setView([24, 115], 4);
  L.tileLayer(ROAD, { subdomains: '1234', maxZoom: 18, attribution: '© 高德地图' }).addTo(map);
  map.on('click', (e) => {
    setMarker(e.latlng.lat, e.latlng.lng, true);
  });
  if (Number.isFinite(props.lat) && Number.isFinite(props.lng)) {
    setMarker(props.lat, props.lng, false);
  }
  // 容器尺寸变化（弹窗打开等）时修正地图
  const ro = new ResizeObserver(() => map && map.invalidateSize());
  ro.observe(el.value);
  setTimeout(() => map && map.invalidateSize(), 80);
});

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (!map) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${lat},${lng}`;
    if (key === lastEmitKey) return;
    setMarker(lat, lng, false);
    map.setView([lat, lng], Math.max(map.getZoom(), 8));
  }
);

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>
