<template>
  <div
    :class="[
      'item-slot',
      {
        'has-item': item,
        'selected': selected,
        'drag-over': isDragOver,
        'dragging': isDragging,
        'disabled': disabled,
        'highlight-fuel': highlightType === 'fuel',
        'highlight-food': highlightType === 'food',
        'highlight-equipment': highlightType === 'equipment'
      },
      sizeClass
    ]"
    :draggable="item && !disabled"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onClick"
    @contextmenu.prevent="onRightClick"
  >
    <!-- 槽位编号 -->
    <div v-if="slotNumber !== null" class="slot-number">{{ slotNumber }}</div>
    
    <!-- 物品图标 -->
    <div v-if="item" class="item-icon">{{ getIcon(item.itemId) }}</div>
    
    <!-- 物品数量 -->
    <div v-if="item && item.count > 1" class="item-count">{{ item.count }}</div>
    
    <!-- 槽位标签 -->
    <div v-if="label && !item" class="slot-label">{{ label }}</div>
    
    <!-- 进度条（用于烹饪等） -->
    <div v-if="progress !== null" class="progress-overlay">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ITEM_ICONS } from '@/data/RecipeData.js'

// ========== Props ==========
const props = defineProps({
  // 物品数据 { itemId, count }
  item: {
    type: Object,
    default: null
  },
  // 槽位编号显示
  slotNumber: {
    type: [Number, String],
    default: null
  },
  // 是否选中状态
  selected: {
    type: Boolean,
    default: false
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 槽位标签（空槽时显示）
  label: {
    type: String,
    default: ''
  },
  // 高亮类型：fuel, food, equipment
  highlightType: {
    type: String,
    default: ''
  },
  // 尺寸：small, normal, large
  size: {
    type: String,
    default: 'normal'
  },
  // 进度条 0-100
  progress: {
    type: Number,
    default: null
  }
})

// ========== Emits ==========
const emit = defineEmits([
  'drag-start',
  'drag-end', 
  'drag-over',
  'drag-leave',
  'drop',
  'click',
  'right-click'
])

// ========== 响应式状态 ==========
const isDragOver = ref(false)
const isDragging = ref(false)

// ========== 计算属性 ==========
const sizeClass = computed(() => {
  return `size-${props.size}`
})

// ========== 方法 ==========
function getIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

function onDragStart(e) {
  if (!props.item || props.disabled) {
    e.preventDefault()
    return
  }
  isDragging.value = true
  emit('drag-start', e, props.item)
}

function onDragEnd(e) {
  isDragging.value = false
  emit('drag-end', e)
}

function onDragOver(e) {
  if (props.disabled) return
  isDragOver.value = true
  emit('drag-over', e)
}

function onDragLeave(e) {
  isDragOver.value = false
  emit('drag-leave', e)
}

function onDrop(e) {
  isDragOver.value = false
  if (props.disabled) return
  emit('drop', e)
}

function onClick(e) {
  if (props.disabled) return
  emit('click', e, props.item)
}

function onRightClick(e) {
  if (props.disabled) return
  emit('right-click', e, props.item)
}
</script>

<style scoped>
.item-slot {
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

/* 尺寸变体 */
.size-small {
  width: 40px;
  height: 40px;
}

.size-normal {
  width: 50px;
  height: 50px;
}

.size-large {
  width: 60px;
  height: 60px;
}

/* 有物品 */
.item-slot.has-item {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.3);
}

/* 选中状态 */
.item-slot.selected {
  border-color: #f39c12;
  box-shadow: 0 0 10px rgba(243, 156, 18, 0.5), inset 0 0 15px rgba(243, 156, 18, 0.2);
}

/* 悬停 */
.item-slot:hover:not(.disabled) {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
  transform: translateY(-1px);
}

/* 拖拽悬停 */
.item-slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

/* 正在拖拽 */
.item-slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* 禁用 */
.item-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 高亮类型 - 燃料 */
.item-slot.highlight-fuel {
  border-color: rgba(139, 90, 43, 0.6);
}

.item-slot.highlight-fuel:hover:not(.disabled) {
  border-color: #d35400;
  background: rgba(211, 84, 0, 0.2);
}

/* 高亮类型 - 食物 */
.item-slot.highlight-food {
  border-color: rgba(231, 76, 60, 0.5);
}

.item-slot.highlight-food:hover:not(.disabled) {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
}

/* 高亮类型 - 装备 */
.item-slot.highlight-equipment {
  border-color: rgba(155, 89, 182, 0.5);
}

.item-slot.highlight-equipment:hover:not(.disabled) {
  border-color: #9b59b6;
  background: rgba(155, 89, 182, 0.2);
}

/* 槽位编号 */
.slot-number {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: bold;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
}

/* 物品图标 */
.item-icon {
  font-size: 24px;
  line-height: 1;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.size-small .item-icon {
  font-size: 20px;
}

.size-large .item-icon {
  font-size: 28px;
}

/* 物品数量 */
.item-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 槽位标签 */
.slot-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 2px;
}

/* 进度条 */
.progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 0 0 4px 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e67e22);
  transition: width 0.1s ease;
}
</style>
