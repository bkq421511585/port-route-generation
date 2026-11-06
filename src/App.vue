<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <span class="logo">🚢</span>
        <div>
          <h1>邮轮航线后台管理系统</h1>
          <p>航线港口配置 · 航线图生成 · PNG 导出下载</p>
        </div>
      </div>
    </header>

    <main class="app-main">
      <el-tabs v-model="tab" type="border-card" class="app-tabs">
        <el-tab-pane label="港口配置" name="ports">
          <PortManager v-show="tab === 'ports'" />
        </el-tab-pane>
        <el-tab-pane label="航线图" name="route">
          <RouteBuilder v-show="tab === 'route'" :active="tab === 'route'" />
        </el-tab-pane>
      </el-tabs>
    </main>

    <footer class="app-footer">
      数据存储于 <code>data/db.json</code> · 底图 © 高德地图 · 港口坐标系 WGS-84（展示时自动转换为 GCJ-02 对齐高德）
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import PortManager from './components/PortManager.vue';
import RouteBuilder from './components/RouteBuilder.vue';

const tab = ref('route');

// 支持 URL hash 直达标签页：/#ports 或 /#route
onMounted(() => {
  const h = location.hash.replace('#', '');
  if (h === 'ports' || h === 'route') tab.value = h;
});

watch(tab, (v) => {
  history.replaceState(null, '', `#${v}`);
});
</script>
