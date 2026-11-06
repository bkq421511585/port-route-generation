// 瓦片底图源：高德街道 / 高德卫星 / OpenStreetMap
// 说明：当前网络环境下高德瓦片可用且支持 CORS（可直接合成进导出 PNG），OSM 官方瓦片不可达时自动留空。

export const TILE_PROVIDERS = {
  gaodeRoad: {
    name: '高德街道',
    attr: '© 高德地图',
    url: (x, y, z) =>
      `https://webrd0${((x + y) % 4) + 1}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}`,
  },
  gaodeSat: {
    name: '高德卫星',
    attr: '© 高德地图',
    url: (x, y, z) =>
      `https://webst0${((x + y) % 4) + 1}.is.autonavi.com/appmaptile?style=6&x=${x}&y=${y}&z=${z}`,
  },
  osm: {
    name: 'OpenStreetMap',
    attr: '© OpenStreetMap contributors',
    url: (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
};
