<template>
  <div class="route-builder">
    <el-row :gutter="16">
      <!-- 左栏：行程设置 / 解析结果 / 已保存航线 -->
      <el-col :span="9">
        <el-card shadow="never" class="mb16">
          <template #header><b>行程设置</b></template>
          <el-form label-position="top">
            <el-form-item label="航线名称">
              <el-input v-model="title" placeholder="如：上海—福冈—长崎—济州 5 天" />
            </el-form-item>
            <el-form-item label="行程代码（港口用 - 分隔；海上巡游日写“海上巡游”）">
              <el-input
                v-model="code"
                type="textarea"
                :rows="3"
                placeholder="上海-福冈-长崎-济州-上海&#10;上海-海上巡游-上海"
              />
            </el-form-item>
            <div class="samples">
              <span class="samples-label">示例：</span>
              <el-tag v-for="s in samples" :key="s" size="small" class="sample-tag" @click="code = s">
                {{ s }}
              </el-tag>
            </div>
            <div class="actions">
              <el-button type="primary" :loading="generating" @click="generate">解析并生成航线图</el-button>
              <el-button :disabled="!geometry" @click="saveItinerary">保存航线</el-button>
            </div>
          </el-form>
        </el-card>

        <el-card v-if="parsed" shadow="never" class="mb16">
          <template #header>
            <b>行程解析结果</b>
            <el-tag v-if="parsed.ok" size="small" type="success" class="ml8">
              {{ parsed.dayCount }} 天{{ parsed.isLoop ? ' · 环线' : '' }}
            </el-tag>
          </template>
          <el-alert
            v-for="e in parsed.errors"
            :key="e"
            :title="e"
            type="error"
            :closable="false"
            class="mb8"
            show-icon
          >
            <template v-if="parsed.missing.length" #default>
              <el-button size="small" type="primary" plain @click="openQuickAdd">添加缺失港口</el-button>
            </template>
          </el-alert>
          <el-timeline v-if="parsed.ok" class="day-timeline">
            <el-timeline-item
              v-for="d in parsed.days"
              :key="d.day"
              :type="d.isSea ? 'warning' : d.day === 1 ? 'danger' : 'primary'"
              :hollow="d.isSea"
            >
              <b>Day {{ d.day }}</b>
              <span v-if="d.isSea" class="sea-token">⚓ 海上巡游（全天航行）</span>
              <template v-else>
                <span class="port-token">{{ d.token }}</span>
                <span v-if="d.port" class="port-meta">
                  （{{ d.port.type === 'home' ? '母港' : '访问港' }} · {{ d.port.country }}）
                </span>
                <span v-if="d.day === 1" class="port-meta">登船</span>
                <span v-if="d.day === parsed.dayCount && parsed.isLoop" class="port-meta">下船</span>
              </template>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <el-card shadow="never">
          <template #header><b>已保存航线</b>（{{ saved.length }}）</template>
          <div v-if="!saved.length" class="empty">暂无保存的航线</div>
          <el-collapse v-else>
            <el-collapse-item v-for="it in saved" :key="it.id" :name="it.id">
              <template #title>
                <span class="it-name">{{ it.name }}</span>
                <el-tag size="small" type="info" class="ml8">{{ daysOf(it.code) }} 天</el-tag>
              </template>
              <div class="it-code">{{ it.code }}</div>
              <div class="it-actions">
                <el-button size="small" type="primary" plain @click="loadItinerary(it)">加载</el-button>
                <el-button size="small" type="danger" plain @click="delItinerary(it)">删除</el-button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>

      <!-- 右栏：航线图预览 -->
      <el-col :span="15">
        <el-card shadow="never">
          <template #header>
            <div class="map-header">
              <b>航线图预览</b>
              <div class="map-tools">
                <el-radio-group v-model="baseLayer" size="small" @change="onBaseChange">
                  <el-radio-button value="gaodeRoad">高德街道</el-radio-button>
                  <el-radio-button value="gaodeSat">高德卫星</el-radio-button>
                  <el-radio-button value="osm">OpenStreetMap</el-radio-button>
                </el-radio-group>
                <el-button
                  size="small"
                  type="success"
                  :disabled="!geometry"
                  :loading="exporting"
                  @click="doExport"
                >
                  <el-icon><Download /></el-icon> 下载 PNG 航线图
                </el-button>
              </div>
            </div>
          </template>
          <div class="map-holder">
            <RouteMap ref="mapRef" />
            <div v-if="!geometry" class="map-empty">输入行程代码后点击「解析并生成航线图」</div>
          </div>
          <div class="map-note">
            底图 © 高德地图（OSM 在部分网络下不可达）；PNG 导出会合成当前所选底图瓦片，可直接下载用于排版 / 打印。
          </div>
        </el-card>
      </el-col>
    </el-row>

    <PortFormDialog
      v-model:visible="quickAddVisible"
      :port="null"
      :default-name="quickAddName"
      @saved="onQuickAdded"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import { api } from '../api.js';
import { parseItinerary, buildRouteGeometry, normalizeCode } from '../utils/parseItinerary.js';
import { exportRoutePng, downloadBlob } from '../utils/exportPng.js';
import RouteMap from './RouteMap.vue';
import PortFormDialog from './PortFormDialog.vue';

const props = defineProps({
  active: { type: Boolean, default: true },
});

const samples = [
  '上海-福冈-长崎-济州-上海',
  '上海-海上巡游-上海',
  '上海-冲绳那霸-上海',
  '天津-福冈-长崎-天津',
  '深圳-香港-马尼拉-深圳',
  '新加坡-普吉岛-巴生港-新加坡',
];

const title = ref('');
const code = ref('上海-福冈-长崎-济州-上海');
const parsed = ref(null);
const geometry = ref(null);
const portTypeOf = ref(new Map());
const generating = ref(false);
const exporting = ref(false);
const baseLayer = ref('gaodeRoad');
const saved = ref([]);

const mapRef = ref(null);
const quickAddVisible = ref(false);
const quickAddName = ref('');

let portsCache = [];

// 标签页切回时地图容器尺寸恢复，重新适配航线范围
watch(
  () => props.active,
  (active) => {
    if (active && geometry.value) {
      setTimeout(() => mapRef.value?.drawRoute(geometry.value, portTypeOf.value), 50);
    }
  }
);

async function loadPorts() {
  const data = await api.listPorts();
  portsCache = data.ports;
  return portsCache;
}

async function generate() {
  if (!code.value.trim()) {
    ElMessage.warning('请输入行程代码');
    return;
  }
  generating.value = true;
  try {
    await loadPorts();
    const p = parseItinerary(code.value, portsCache);
    parsed.value = p;
    if (p.ok) {
      const g = buildRouteGeometry(p);
      geometry.value = g;
      portTypeOf.value = new Map(
        p.days.filter((d) => d.port).map((d) => [d.token, d.port.type])
      );
      mapRef.value?.drawRoute(g, portTypeOf.value);
      if (!title.value) title.value = `${p.dayCount} 天行程`;
      ElMessage.success(`解析成功：${p.dayCount} 天行程`);
    } else {
      geometry.value = null;
      mapRef.value?.drawRoute({ points: [], legs: [], seaDays: [], portByToken: new Map() }, new Map());
    }
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    generating.value = false;
  }
}

function onBaseChange() {
  mapRef.value?.setBaseLayer(baseLayer.value);
}

async function doExport() {
  if (!geometry.value) return;
  exporting.value = true;
  try {
    const providerKey = baseLayer.value;
    const blob = await exportRoutePng({
      title: title.value || `${parsed.value.dayCount} 天邮轮航线`,
      subtitle: `${parsed.value.dayCount} 天行程 · ${parsed.value.rawCode}`,
      geometry: geometry.value,
      portTypeOf: portTypeOf.value,
      providerKey,
    });
    downloadBlob(blob, `邮轮航线图_${parsed.value.dayCount}天_${Date.now()}.png`);
    ElMessage.success('PNG 航线图已生成并开始下载');
  } catch (e) {
    ElMessage.error(`导出失败：${e.message}`);
  } finally {
    exporting.value = false;
  }
}

async function saveItinerary() {
  try {
    await api.createItinerary({ name: title.value || code.value, code: parsed.value?.rawCode || code.value });
    ElMessage.success('航线已保存');
    loadSaved();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function loadSaved() {
  try {
    const data = await api.listItineraries();
    saved.value = data.itineraries;
  } catch {
    /* 忽略 */
  }
}

function daysOf(c) {
  const t = normalizeCode(c);
  return t ? t.split('-').length : 0;
}

async function loadItinerary(it) {
  code.value = it.code;
  title.value = it.name;
  await generate();
}

async function delItinerary(it) {
  try {
    await ElMessageBox.confirm(`确定删除航线「${it.name}」吗？`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api.deleteItinerary(it.id);
    ElMessage.success('已删除');
    loadSaved();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

function openQuickAdd() {
  quickAddName.value = parsed.value?.missing?.[0] || '';
  quickAddVisible.value = true;
}

async function onQuickAdded() {
  await loadPorts();
  await generate();
}

onMounted(() => {
  // 支持 URL 参数直达：?code=上海-海上巡游-上海
  const c = new URLSearchParams(location.search).get('code');
  if (c) code.value = c;
  loadSaved();
  generate();
});
</script>
