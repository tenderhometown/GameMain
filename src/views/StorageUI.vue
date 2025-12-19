<template>
  <div class="storage-ui" v-if="isOpen">
    <div class="storage-container">
      <!-- 标题栏 -->
      <div class="storage-header">
        <h3>📦 {{ title }}</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div class="storage-content">
        <!-- 左侧：背包 -->
        <div class="left-panel">
          <!-- 背包区域 -->
          <div class="inventory-section">
            <div class="section-title">🎒 背包</div>
            <div class="inventory-grid">
              <div 
                v-for="(item, index) in inventoryItems" 
                :key="'inv-' + index"
                :class="['slot', { 'has-item': item !== null }]"
                :draggable="!!item"
                @dragstart="handleInventoryDragStart($event, index)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleInventoryDrop($event, index)"
                @mouseenter="handleSlotHover(item, $event)"
                @mousemove="handleSlotHover(item, $event)"
                @mouseleave="hideTooltip"
              >
                <template v-if="item">
                  <span class="item-icon">{{ getItemIcon(item.itemId) }}</span>
                  <span class="item-count" v-if="item.count > 1">{{ item.count }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="vertical-divider"></div>

        <!-- 右侧：箱子存储区 -->
        <div class="right-panel">
          <div class="storage-section">
            <div class="section-title">📦 箱子</div>
            <div class="storage-grid">
              <div 
                v-for="(item, index) in storageItems" 
                :key="'storage-' + index"
                :class="['slot', { 'has-item': item !== null }]"
                :draggable="!!item"
                @dragstart="handleStorageDragStart($event, index)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleStorageDrop($event, index)"
                @mouseenter="handleSlotHover(item, $event)"
                @mousemove="handleSlotHover(item, $event)"
                @mouseleave="hideTooltip"
              >
                <template v-if="item">
                  <span class="item-icon">{{ getItemIcon(item.itemId) }}</span>
                  <span class="item-count" v-if="item.count > 1">{{ item.count }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="controls-hint">
        <span>拖拽物品在箱子和背包之间转移 | 快捷栏位于屏幕底部</span>
      </div>
    </div>
    
    <!-- 统一的物品悬浮提示框 -->
    <ItemTooltip
      :visible="tooltipVisible"
      :data="tooltipData"
      :x="tooltipX"
      :y="tooltipY"
      mode="full"
      context="storage"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getItem, ITEM_ICONS, ITEM_NAMES } from '../data/RecipeData.js'
import { logger } from '../utils/logger.js'
import ItemTooltip from '@/components/ui/ItemTooltip.vue'
import { useItemTooltip } from '@/composables/useItemTooltip.js'

const props = defineProps({
  storage: Object,
  inventory: Object,
  title: {
    type: String,
    default: '箱子'
  }
})

const emit = defineEmits(['close'])

const isOpen = ref(true)
const storageItems = ref([])
const inventoryItems = ref([])

// 使用统一的tooltip composable
const {
  tooltipVisible,
  tooltipData,
  tooltipX,
  tooltipY,
  isDragging,
  showTooltip,
  hideTooltip,
  setDragging,
} = useItemTooltip({ context: 'storage' })

// ========== 获取物品图标 ==========
function getItemIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

// ========== 获取物品名称 ==========
function getItemName(itemId) {
  return ITEM_NAMES[itemId] || itemId
}

// ========== 悬浮提示框 ==========
function handleSlotHover(item, event) {
  if (item) {
    showTooltip(item, event)
  } else {
    hideTooltip()
  }
}

// ========== 刷新数据 ==========
function refreshData() {
  if (props.storage) {
    storageItems.value = props.storage.getItems().map(item => item ? { ...item } : null)
  }
  if (props.inventory) {
    inventoryItems.value = props.inventory.getBackpackSlots().map(item => item ? { ...item } : null)
  }
}

// ========== 拖拽开始 - 箱子 ==========
function handleStorageDragStart(e, index) {
  const item = storageItems.value[index]
  if (!item) return
  
  // 隐藏tooltip并设置拖拽状态
  setDragging(true)
  
  const dragData = {
    type: 'storage',
    itemId: item.itemId,
    count: item.count,
    sourceIndex: index
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
  
  logger.debug(`开始拖拽箱子[${index}]: ${item.itemId} x${item.count}`)
}

// ========== 拖拽开始 - 背包 ==========
function handleInventoryDragStart(e, index) {
  const item = inventoryItems.value[index]
  if (!item) return
  
  // 隐藏tooltip并设置拖拽状态
  setDragging(true)
  
  const dragData = {
    type: 'storage-inventory',
    itemId: item.itemId,
    count: item.count,
    sourceIndex: index
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
  
  logger.debug(`开始拖拽背包[${index}]: ${item.itemId} x${item.count}`)
}

// ========== 通用拖拽事件 ==========
function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  setDragging(false)
}

function handleDragOver(e) {
  const slot = e.target.closest('.slot')
  if (slot) slot.classList.add('drag-over')
}

function handleDragLeave(e) {
  const slot = e.target.closest('.slot')
  if (slot) slot.classList.remove('drag-over')
}

// ========== 拖拽放下 - 箱子 ==========
function handleStorageDrop(e, targetIndex) {
  e.target.closest('.slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (dragData.type === 'storage-inventory' || dragData.type === 'hotbar') {
      // 从背包或快捷栏拖到箱子
      const isFromHotbar = dragData.type === 'hotbar'
      const sourceItem = isFromHotbar 
        ? props.inventory.getHotbarSlots()[dragData.sourceIndex]
        : inventoryItems.value[dragData.sourceIndex]
      if (!sourceItem) return
      
      const targetItem = storageItems.value[targetIndex]
      
      const setSourceSlot = isFromHotbar
        ? (val) => props.inventory.setHotbarSlot(dragData.sourceIndex, val)
        : (val) => props.inventory.setBackpackSlot(dragData.sourceIndex, val)
      
      if (!targetItem) {
        props.storage.setItem(targetIndex, { ...sourceItem })
        setSourceSlot(null)
        logger.info(`✅ ${isFromHotbar ? '快捷栏' : '背包'}[${dragData.sourceIndex}] → 箱子[${targetIndex}]`)
      } else if (targetItem.itemId === sourceItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetItem.count
        const toStack = Math.min(canStack, sourceItem.count)
        
        if (toStack > 0) {
          targetItem.count += toStack
          sourceItem.count -= toStack
          props.storage.setItem(targetIndex, targetItem)
          setSourceSlot(sourceItem.count > 0 ? sourceItem : null)
        }
      } else {
        props.storage.setItem(targetIndex, { ...sourceItem })
        setSourceSlot({ ...targetItem })
      }
      refreshData()
      // 通知背包数据变化
      document.dispatchEvent(new CustomEvent('inventoryChanged', {
        detail: { source: 'storage-drop', timestamp: Date.now() }
      }))
    } else if (dragData.type === 'storage') {
      // 箱子内部交换
      if (dragData.sourceIndex !== targetIndex) {
        const sourceItem = storageItems.value[dragData.sourceIndex]
        const targetItem = storageItems.value[targetIndex]
        
        if (targetItem && sourceItem.itemId === targetItem.itemId) {
          const maxStack = 99
          const canStack = maxStack - targetItem.count
          const toStack = Math.min(canStack, sourceItem.count)
          
          if (toStack > 0) {
            targetItem.count += toStack
            sourceItem.count -= toStack
            props.storage.setItem(targetIndex, targetItem)
            props.storage.setItem(dragData.sourceIndex, sourceItem.count > 0 ? sourceItem : null)
          }
        } else {
          props.storage.setItem(dragData.sourceIndex, targetItem)
          props.storage.setItem(targetIndex, sourceItem)
        }
        refreshData()
      }
    }
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 拖拽放下 - 背包 ==========
function handleInventoryDrop(e, targetIndex) {
  e.target.closest('.slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (dragData.type === 'storage') {
      // 从箱子拖到背包
      const sourceItem = storageItems.value[dragData.sourceIndex]
      if (!sourceItem) return
      
      const targetItem = inventoryItems.value[targetIndex]
      
      if (!targetItem) {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceItem })
        props.storage.setItem(dragData.sourceIndex, null)
        logger.info(`✅ 箱子[${dragData.sourceIndex}] → 背包[${targetIndex}]`)
      } else if (targetItem.itemId === sourceItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetItem.count
        const toStack = Math.min(canStack, sourceItem.count)
        
        if (toStack > 0) {
          targetItem.count += toStack
          sourceItem.count -= toStack
          props.inventory.setBackpackSlot(targetIndex, targetItem)
          props.storage.setItem(dragData.sourceIndex, sourceItem.count > 0 ? sourceItem : null)
        }
      } else {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceItem })
        props.storage.setItem(dragData.sourceIndex, { ...targetItem })
      }
      refreshData()
      document.dispatchEvent(new CustomEvent('inventoryChanged', {
        detail: { source: 'storage-to-inventory', timestamp: Date.now() }
      }))
    } else if (dragData.type === 'hotbar') {
      // 从快捷栏拖到背包
      const sourceItem = props.inventory.getHotbarSlots()[dragData.sourceIndex]
      if (!sourceItem) return
      
      const targetItem = inventoryItems.value[targetIndex]
      
      if (!targetItem) {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceItem })
        props.inventory.setHotbarSlot(dragData.sourceIndex, null)
        logger.info(`✅ 快捷栏[${dragData.sourceIndex}] → 背包[${targetIndex}]`)
      } else if (targetItem.itemId === sourceItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetItem.count
        const toStack = Math.min(canStack, sourceItem.count)
        
        if (toStack > 0) {
          targetItem.count += toStack
          sourceItem.count -= toStack
          props.inventory.setBackpackSlot(targetIndex, targetItem)
          props.inventory.setHotbarSlot(dragData.sourceIndex, sourceItem.count > 0 ? sourceItem : null)
        }
      } else {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceItem })
        props.inventory.setHotbarSlot(dragData.sourceIndex, { ...targetItem })
      }
      refreshData()
      document.dispatchEvent(new CustomEvent('inventoryChanged', {
        detail: { source: 'storage-inventory-drop', timestamp: Date.now() }
      }))
    } else if (dragData.type === 'storage-inventory') {
      // 背包内部交换
      if (dragData.sourceIndex !== targetIndex) {
        const sourceItem = inventoryItems.value[dragData.sourceIndex]
        const targetItem = inventoryItems.value[targetIndex]
        
        if (targetItem && sourceItem.itemId === targetItem.itemId) {
          const maxStack = 99
          const canStack = maxStack - targetItem.count
          const toStack = Math.min(canStack, sourceItem.count)
          
          if (toStack > 0) {
            targetItem.count += toStack
            sourceItem.count -= toStack
            props.inventory.setBackpackSlot(targetIndex, targetItem)
            props.inventory.setBackpackSlot(dragData.sourceIndex, sourceItem.count > 0 ? sourceItem : null)
          }
        } else {
          props.inventory.setBackpackSlot(dragData.sourceIndex, targetItem)
          props.inventory.setBackpackSlot(targetIndex, sourceItem)
        }
        refreshData()
      }
    }
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 关闭 ==========
function close() {
  isOpen.value = false
  emit('close')
}

// ========== 监听和生命周期 ==========
watch(() => props.storage, refreshData, { deep: true })
watch(() => props.inventory, refreshData, { deep: true })

let refreshInterval = null

// ========== 处理从箱子拖到快捷栏 ==========
function handleStorageToHotbar(event) {
  const { sourceIndex, targetIndex, dragData } = event.detail
  if (dragData.type !== 'storage') return
  
  const sourceItem = storageItems.value[sourceIndex]
  if (!sourceItem) return
  
  const hotbarSlots = props.inventory.getHotbarSlots()
  const targetSlot = hotbarSlots[targetIndex]
  
  if (!targetSlot) {
    props.inventory.setHotbarSlot(targetIndex, { ...sourceItem })
    props.storage.setItem(sourceIndex, null)
    logger.info(`✅ 箱子[${sourceIndex}] → 快捷栏[${targetIndex}]`)
  } else if (targetSlot.itemId === sourceItem.itemId) {
    const maxStack = 99
    const totalCount = targetSlot.count + sourceItem.count
    if (totalCount <= maxStack) {
      targetSlot.count = totalCount
      props.inventory.setHotbarSlot(targetIndex, targetSlot)
      props.storage.setItem(sourceIndex, null)
    } else {
      targetSlot.count = maxStack
      sourceItem.count = totalCount - maxStack
      props.inventory.setHotbarSlot(targetIndex, targetSlot)
      props.storage.setItem(sourceIndex, sourceItem)
    }
    logger.info(`✅ 箱子[${sourceIndex}] 堆叠到 快捷栏[${targetIndex}]`)
  } else {
    props.storage.setItem(sourceIndex, { ...targetSlot })
    props.inventory.setHotbarSlot(targetIndex, { ...sourceItem })
    logger.info(`✅ 箱子[${sourceIndex}] ⇄ 快捷栏[${targetIndex}]`)
  }
  
  refreshData()
  // 通知背包数据变化
  document.dispatchEvent(new CustomEvent('inventoryChanged', {
    detail: { source: 'storage-hotbar', timestamp: Date.now() }
  }))
}

onMounted(() => {
  refreshData()
  refreshInterval = setInterval(refreshData, 500)
  document.addEventListener('storageToHotbar', handleStorageToHotbar)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  document.removeEventListener('storageToHotbar', handleStorageToHotbar)
})

defineExpose({
  open: () => { isOpen.value = true; refreshData() },
  close,
  refresh: refreshData
})
</script>

<style scoped>
.storage-ui {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  pointer-events: none;
}

.storage-container {
  background: linear-gradient(135deg, #4a3728 0%, #2d1f15 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 200, 100, 0.3);
  pointer-events: auto;
}

.storage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.storage-header h3 {
  margin: 0;
  color: #f4d03f;
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #bdc3c7;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.6);
  color: #fff;
}

.storage-content {
  display: flex;
  flex-direction: row;
  gap: 15px;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 280px;
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  min-width: 280px;
}

.vertical-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 200, 100, 0.3), transparent);
  margin: 0 10px;
}

.inventory-section,
.storage-section {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.section-title {
  color: #bdc3c7;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.storage-grid,
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.slot {
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 50px;
  height: 50px;
}

.slot:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

.slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.slot.has-item {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.3);
}

.item-icon {
  font-size: 26px;
  pointer-events: none;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.item-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

.controls-hint {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 200, 100, 0.1);
  text-align: center;
  color: #7f8c8d;
  font-size: 11px;
}
</style>
