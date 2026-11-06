<template>
  <el-dialog
    :model-value="visible"
    :title="port ? '编辑港口' : '新增港口'"
    width="720px"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="(v) => emit('update:visible', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="港口名称" prop="name">
            <el-input v-model="form.name" placeholder="如：上海 / 福冈" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="英文名">
            <el-input v-model="form.enName" placeholder="如：Shanghai" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="港口类型" prop="type">
            <el-select v-model="form.type" style="width: 100%">
              <el-option label="母港（始发 / 终点港）" value="home" />
              <el-option label="访问港" value="visit" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="国家/地区">
            <el-input v-model="form.country" placeholder="如：中国 / 日本" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="纬度" prop="lat">
            <el-input-number
              v-model="form.lat"
              :min="-90"
              :max="90"
              :precision="6"
              :step="0.001"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="经度" prop="lng">
            <el-input-number
              v-model="form.lng"
              :min="-180"
              :max="180"
              :precision="6"
              :step="0.001"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="别名">
        <el-input v-model="form.alias" placeholder="逗号分隔，如：那霸,冲绳,Naha（用于行程代码匹配）" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="港口说明 / 母港航线提示" />
      </el-form-item>
      <el-form-item label="地图点选">
        <PortPickerMap :lat="form.lat" :lng="form.lng" @update="onPicked" />
        <div class="pick-tip">在地图上点击即可自动填入经纬度（坐标系 WGS-84，展示时自动对齐高德底图）</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../api.js';
import PortPickerMap from './PortPickerMap.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  port: { type: Object, default: null },
  defaultName: { type: String, default: '' },
});
const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);
const saving = ref(false);
const form = reactive({
  name: '',
  enName: '',
  type: 'visit',
  country: '',
  lat: null,
  lng: null,
  alias: '',
  remark: '',
});

const rules = {
  name: [{ required: true, message: '请输入港口名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择港口类型', trigger: 'change' }],
  lat: [{ required: true, type: 'number', message: '请设置纬度（可在地图上点选）', trigger: 'blur' }],
  lng: [{ required: true, type: 'number', message: '请设置经度（可在地图上点选）', trigger: 'blur' }],
};

watch(
  () => [props.visible, props.port, props.defaultName],
  () => {
    if (!props.visible) return;
    const p = props.port;
    form.name = p?.name || props.defaultName || '';
    form.enName = p?.enName || '';
    form.type = p?.type || 'visit';
    form.country = p?.country || '';
    form.lat = p?.lat ?? null;
    form.lng = p?.lng ?? null;
    form.alias = (p?.alias || []).join(',');
    form.remark = p?.remark || '';
  },
  { immediate: true }
);

function onPicked({ lat, lng }) {
  form.lat = Number(lat.toFixed(6));
  form.lng = Number(lng.toFixed(6));
}

async function save() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const body = {
      ...form,
      alias: form.alias
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (props.port) {
      const { port } = await api.updatePort(props.port.id, body);
      ElMessage.success(`已更新港口「${port.name}」`);
      emit('saved', port);
    } else {
      const { port } = await api.createPort(body);
      ElMessage.success(`已新增港口「${port.name}」`);
      emit('saved', port);
    }
    emit('update:visible', false);
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    saving.value = false;
  }
}
</script>
