<template>
  <div class="item-grid-container">
    <!-- 标题 -->
    <div v-if="title" class="grid-title">{{ title }}</div>
    
    <!-- 格子网格 -->
    <div 
      class="item-grid" 
      :style="gridStyle"
    >
      <ItemSlot
        v-for="(item, index) in slots"
        :key="index"
        :item="item"
        :slot-number="showNumbers ? index + 1 : null"
        :selected="selectedIndex === index"
        :size="slotSize"
        :highlight-type="getHighlightType(item, index)"
        :disabled="isSlotDisabled(index)"
        @drag-start="(e, item) => onDragStart(e, index, item)"
        @drag-end="onDragEnd"
        @drop="(e) => onDrop(e, index)"
        @click="(e, item) => onClick(e, index, item)"
        @right-click="(e, item) => onRightClick(e, index, item)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ItemSlot from './ItemSlot.vue'

// ========== Props ==========
const props = defineProps({
  // 槽位数组
  slots: {
    type: Array,
    required: true
  },
  // 网格标题
  title: {
    type: String,
    default: ''
  },
  // 列数
  columns: {
    type: Number,
    default: 6
  },
  // 是否显示槽位编号
  showNumbers: {
    type: Boolean,
    default: false
  },
  // 选中的索引
  selectedIndex: {
    type: Number,
    default: -1
  },
  // 槽位尺寸
  slotSize: {
    type: String,
    default: 'normal'
  },
  // 禁用的槽位索引数组
  disabledSlots: {
    type: Array,
    default: () => []
  },
  // 高亮判断函数 (item, index) => 'fuel' | 'food' | 'equipment' | ''
  highlightFn: {
    type: Function,
    default: null
  }
})

// ========== Emits ==========
const emit = defineEmits([
  'drag-start',
  'drag-end',
  'drop',
  'click',
  'right-click'
])

// ========== 计算属性 ==========
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`
}))

// ========== 方法 ==========
function getHighlightType(item, index) {
  if (props.highlightFn) {
    return props.highlightFn(item, index)
  }
  return ''
}

function isSlotDisabled(index) {
  return props.disabledSlots.includes(index)
}

function onDragStart(e, index, item) {
  emit('drag-start', e, index, item)
}

function onDragEnd(e) {
  emit('drag-end', e)
}

function onDrop(e, index) {
  emit('drop', e, index)
}

function onClick(e, index, item) {
  emit('click', e, index, item)
}

function onRightClick(e, index, item) {
  emit('right-click', e, index, item)
}
</script>

<style scoped>
.item-grid-container {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.grid-title {
  color: #bdc3c7;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.item-grid {
  display: grid;
  gap: 6px;
}
</style>
