<template>
  <div class="port-manager">
    <el-card shadow="never">
      <div class="toolbar">
        <div class="left">
          <el-input
            v-model="kw"
            placeholder="搜索名称 / 英文名 / 国家 / 备注"
            clearable
            style="width: 260px"
            @keyup.enter="load"
            @clear="load"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="typeFilter" placeholder="全部类型" clearable style="width: 140px" @change="load">
            <el-option label="母港" value="home" />
            <el-option label="访问港" value="visit" />
          </el-select>
          <el-button type="primary" plain @click="load">查询</el-button>
        </div>
        <div class="right">
          <el-tag type="danger" effect="plain">母港 {{ homeCount }} 个</el-tag>
          <el-tag type="primary" effect="plain">港口共 {{ allCount }} 个</el-tag>
          <el-button @click="openReset">恢复默认数据</el-button>
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>新增港口
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="ports" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column label="港口名称" min-width="110">
          <template #default="{ row }"><b>{{ row.name }}</b></template>
        </el-table-column>
        <el-table-column prop="enName" label="英文名" min-width="120" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'home' ? 'danger' : 'primary'" effect="light" size="small">
              {{ row.type === 'home' ? '母港' : '访问港' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="country" label="国家/地区" width="110" show-overflow-tooltip />
        <el-table-column label="纬度" width="100" align="right">
          <template #default="{ row }">{{ Number.isFinite(row.lat) ? row.lat.toFixed(4) : '-' }}</template>
        </el-table-column>
        <el-table-column label="经度" width="100" align="right">
          <template #default="{ row }">{{ Number.isFinite(row.lng) ? row.lng.toFixed(4) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="170" show-overflow-tooltip />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <PortFormDialog v-model:visible="dialogVisible" :port="editingPort" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import { api } from '../api.js';
import PortFormDialog from './PortFormDialog.vue';

const ports = ref([]);
const loading = ref(false);
const kw = ref('');
const typeFilter = ref('');
const homeCount = ref(0);
const allCount = ref(0);

const dialogVisible = ref(false);
const editingPort = ref(null);

async function load() {
  loading.value = true;
  try {
    const data = await api.listPorts({ kw: kw.value, type: typeFilter.value || undefined });
    ports.value = data.ports;
    allCount.value = data.all;
    const home = await api.listPorts({ type: 'home' });
    homeCount.value = home.total;
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingPort.value = null;
  dialogVisible.value = true;
}

function openEdit(row) {
  editingPort.value = row;
  dialogVisible.value = true;
}

function onSaved() {
  load();
}

async function del(row) {
  try {
    await ElMessageBox.confirm(`确定删除港口「${row.name}」吗？`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api.deletePort(row.id);
    ElMessage.success(`已删除「${row.name}」`);
    load();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function openReset() {
  try {
    await ElMessageBox.confirm(
      '将用内置默认港口数据（母港优先）替换当前全部港口配置，确定恢复吗？',
      '恢复默认数据',
      { type: 'warning', confirmButtonText: '恢复' }
    );
  } catch {
    return;
  }
  try {
    const r = await api.resetPorts();
    ElMessage.success(`已恢复默认港口数据，共 ${r.total} 个港口`);
    load();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

onMounted(load);
</script>
