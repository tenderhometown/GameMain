<template>
  <div id="hotbar-ui">
    <div class="hotbar-container">
      <div
        v-for="(slot, index) in hotbarSlots"
        :key="index"
        :class="['hotbar-slot', {
          selected: index === selectedIndex,
          empty: !slot,
          'drag-over': dragOverIndex === index
        }]"
        :draggable="!!slot"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver(index)"
        @dragleave="handleDragLeave(index)"
        @drop="handleDrop($event, index)"
        @mouseenter="handleSlotHover(slot, $event)"
        @mousemove="handleSlotHover(slot, $event)"
        @mouseleave="hideTooltip"
      >
        <div class="hotbar-slot-number">{{ index + 1 }}</div>
        
        <div v-if="slot" class="hotbar-slot-icon">
          {{ getIcon(slot.itemId) }}
        </div>
        
        <div v-if="slot && slot.count > 1" class="hotbar-slot-count">
          {{ slot.count }}
        </div>
      </div>
    </div>
    
    <!-- 统一的物品悬浮提示框 -->
    <ItemTooltip
      :visible="tooltipVisible"
      :data="tooltipData"
      :x="tooltipX"
      :y="tooltipY"
      mode="compact"
      context="hotbar"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ITEM_ICONS, ITEM_NAMES } from '@/data/RecipeData.js'
import { logger } from '@/utils/logger.js'
import ItemTooltip from '@/components/ui/ItemTooltip.vue'
import { useItemTooltip } from '@/composables/useItemTooltip.js'

// ========== Props ==========
const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  selectedIndex: {
    type: Number,
    default: 0
  },
  uiOpen: {
    type: Boolean,
    default: false
  }
})

// ========== 响应式数据 ==========
const hotbarSlots = ref([])
const dragOverIndex = ref(-1)  // 拖拽悬停的索引

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
} = useItemTooltip({ context: 'hotbar', offsetY: -80 })

// ========== 获取图标 ==========
function getIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

// ========== 获取物品名称 ==========
function getItemName(itemId) {
  return ITEM_NAMES[itemId] || itemId
}

// ========== 悬浮提示框 ==========
function handleSlotHover(slot, event) {
  if (slot) {
    showTooltip(slot, event)
  } else {
    hideTooltip()
  }
}

// ========== 更新快捷栏 ==========
function updateHotbar() {
  // 使用浅拷贝强制触发 Vue 响应式更新
  const newSlots = props.inventory.getHotbarSlots()
  hotbarSlots.value = [...newSlots]
  logger.debug('🔄 快捷栏数据已更新')
}

// ========== 拖拽处理 ==========
function handleDragStart(e, index) {
  const slot = hotbarSlots.value[index]
  if (!slot) return
  
  // 隐藏tooltip并设置拖拽状态
  setDragging(true)
  
  const dragData = {
    type: 'hotbar',
    itemId: slot.itemId,
    count: slot.count,
    sourceIndex: index
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
  
  logger.debug(`开始拖拽快捷栏[${index}]: ${slot.itemId} x${slot.count}`)
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  setDragging(false)
}

function handleDragOver(index) {
  dragOverIndex.value = index
}

function handleDragLeave(index) {
  // 只有当离开的是当前高亮的槽位时才清除
  if (dragOverIndex.value === index) {
    dragOverIndex.value = -1
  }
}

function handleDrop(e, targetIndex) {
  // 清除高亮状态
  dragOverIndex.value = -1
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    handleDropLogic(dragData, targetIndex)
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 拖放逻辑 ==========
function handleDropLogic(dragData, targetIndex) {
  const { type, sourceIndex, sourceSlot } = dragData
  const slots = props.inventory.getHotbarSlots()
  const backpackSlots = props.inventory.getBackpackSlots()
  
  logger.debug(`快捷栏接收拖拽: type=${type}, target=${targetIndex}`)
  
  // 1.从背包拖到快捷栏
  if (type === 'backpack') {
    const sourceSlotData = backpackSlots[sourceIndex]
    if (! sourceSlotData) return
    
    const targetSlot = slots[targetIndex]
    
    if (! targetSlot) {
      // 目标为空 - 移动
      slots[targetIndex] = { itemId: sourceSlotData.itemId, count: sourceSlotData.count }
      backpackSlots[sourceIndex] = null
      logger.info(`✅ 背包[${sourceIndex}] → 快捷栏[${targetIndex}]`)
    } else if (targetSlot.itemId === sourceSlotData.itemId) {
      // 相同物品 - 堆叠
      const maxStack = props.inventory.getMaxStackSize(sourceSlotData.itemId)
      const totalCount = targetSlot.count + sourceSlotData.count
      
      if (totalCount <= maxStack) {
        targetSlot.count = totalCount
        backpackSlots[sourceIndex] = null
      } else {
        const canAdd = maxStack - targetSlot.count
        targetSlot.count = maxStack
        sourceSlotData.count -= canAdd
      }
      logger.info(`✅ 背包[${sourceIndex}] 堆叠到 快捷栏[${targetIndex}]`)
    } else {
      // 不同物品 - 交换
      [slots[targetIndex], backpackSlots[sourceIndex]] = 
        [backpackSlots[sourceIndex], slots[targetIndex]]
      logger.info(`✅ 背包[${sourceIndex}] ⇄ 快捷栏[${targetIndex}]`)
    }
    
    // 自动选中拖拽目标格子
    props.inventory.selectHotbarSlot(targetIndex)
    
    updateHotbar()
    notifyInventoryChanged()
    return
  }
  
  // 2.从装备区拖到快捷栏
  if (type === 'equipment') {
    const equippedItem = props.inventory.getEquippedItem(sourceSlot)
    if (!equippedItem) return
    
    const targetSlot = slots[targetIndex]
    
    if (!targetSlot) {
      slots[targetIndex] = { itemId: equippedItem, count: 1 }
    } else {
      props.inventory.addItem(targetSlot.itemId, targetSlot.count)
      slots[targetIndex] = { itemId: equippedItem, count: 1 }
    }
    
    props.inventory.setEquipmentSlot(sourceSlot, null)
    
    logger.info(`✅ 装备区[${sourceSlot}] → 快捷栏[${targetIndex}]`)
    updateHotbar()
    notifyInventoryChanged()
    return
  }
  
  // 3.快捷栏内部拖拽
  if (type === 'hotbar' && sourceIndex !== undefined && sourceIndex !== targetIndex) {
    const sourceSlotData = slots[sourceIndex]
    const targetSlot = slots[targetIndex]
    
    if (! targetSlot) {
      // 目标为空 - 移动
      slots[targetIndex] = sourceSlotData
      slots[sourceIndex] = null
      logger.info(`✅ 快捷栏移动: [${sourceIndex}] → [${targetIndex}]`)
    } else if (sourceSlotData.itemId === targetSlot.itemId) {
      // 相同物品 - 堆叠
      const maxStack = props.inventory.getMaxStackSize(sourceSlotData.itemId)
      const totalCount = sourceSlotData.count + targetSlot.count
      
      if (totalCount <= maxStack) {
        slots[sourceIndex] = null
        targetSlot.count = totalCount
      } else {
        targetSlot.count = maxStack
        sourceSlotData.count = totalCount - maxStack
      }
      logger.info(`✅ 快捷栏堆叠: [${sourceIndex}] + [${targetIndex}]`)
    } else {
      // 不同物品 - 交换
      [slots[sourceIndex], slots[targetIndex]] = 
        [slots[targetIndex], slots[sourceIndex]]
      logger.info(`✅ 快捷栏交换: [${sourceIndex}] ⇄ [${targetIndex}]`)
    }
    
    updateHotbar()
    return
  }
  
  // 4.从箱子/烹饪界面的背包拖到快捷栏
  if (type === 'storage-inventory' || type === 'cooking-inventory') {
    const sourceSlotData = backpackSlots[sourceIndex]
    if (!sourceSlotData) return
    
    const targetSlot = slots[targetIndex]
    
    if (!targetSlot) {
      slots[targetIndex] = { itemId: sourceSlotData.itemId, count: sourceSlotData.count }
      backpackSlots[sourceIndex] = null
      logger.info(`✅ ${type}[${sourceIndex}] → 快捷栏[${targetIndex}]`)
    } else if (targetSlot.itemId === sourceSlotData.itemId) {
      const maxStack = props.inventory.getMaxStackSize(sourceSlotData.itemId)
      const totalCount = targetSlot.count + sourceSlotData.count
      
      if (totalCount <= maxStack) {
        targetSlot.count = totalCount
        backpackSlots[sourceIndex] = null
      } else {
        const canAdd = maxStack - targetSlot.count
        targetSlot.count = maxStack
        sourceSlotData.count -= canAdd
      }
      logger.info(`✅ ${type}[${sourceIndex}] 堆叠到 快捷栏[${targetIndex}]`)
    } else {
      [slots[targetIndex], backpackSlots[sourceIndex]] = 
        [backpackSlots[sourceIndex], slots[targetIndex]]
      logger.info(`✅ ${type}[${sourceIndex}] ⇄ 快捷栏[${targetIndex}]`)
    }
    
    props.inventory.selectHotbarSlot(targetIndex)
    updateHotbar()
    notifyInventoryChanged()
    return
  }
  
  // 5.从箱子存储槽拖到快捷栏
  if (type === 'storage') {
    // 箱子物品需要通过事件通知 StorageUI 处理
    const event = new CustomEvent('storageToHotbar', {
      detail: { sourceIndex, targetIndex, dragData }
    })
    document.dispatchEvent(event)
    // 自动选中目标槽位
    props.inventory.selectHotbarSlot(targetIndex)
    return
  }
  
  // 6.从烹饪槽拖到快捷栏 (燃料/食材/成品)
  if (type === 'cooking-fuel' || type === 'cooking-food' || type === 'cooking-output') {
    // 烹饪物品需要通过事件通知 CookingUI 处理
    const event = new CustomEvent('cookingToHotbar', {
      detail: { sourceIndex, targetIndex, dragData }
    })
    document.dispatchEvent(event)
    // 自动选中目标槽位
    props.inventory.selectHotbarSlot(targetIndex)
    return
  }
}

// ========== 通知背包数据变化 ==========
function notifyInventoryChanged() {
  const event = new CustomEvent('inventoryChanged', {
    detail: { source: 'hotbar', timestamp: Date.now() }
  })
  document.dispatchEvent(event)
  logger.debug('🔔 已触发 inventoryChanged 事件')
}

// ========== 监听背包变化 ==========
function onInventoryChanged(event) {
  logger.debug('📦 HotbarUI 收到 inventoryChanged 事件', event.detail)
  updateHotbar()
}

// ========== 鼠标滚轮切换 ==========
function onWheel(event) {
  // 打开背包时禁用滚轮切换
  if (props.uiOpen) {
    return
  }
  
  event.preventDefault()
  const currentIndex = props.inventory.getSelectedHotbarIndex()
  let newIndex
  
  if (event.deltaY > 0) {
    // 向下滚 - 选中下一个
    newIndex = (currentIndex + 1) % 6
  } else {
    // 向上滚 - 选中上一个
    newIndex = (currentIndex - 1 + 6) % 6
  }
  
  props.inventory.selectHotbarSlot(newIndex)
  logger.debug(`🖱️ 滚轮切换快捷栏: ${currentIndex} → ${newIndex}`)
}

// ========== 生命周期 ==========
onMounted(() => {
  updateHotbar()
  document.addEventListener('inventoryChanged', onInventoryChanged)
  window.addEventListener('wheel', onWheel, { passive: false })
  logger.info('✅ HotbarUI 已挂载')
})

onUnmounted(() => {
  document.removeEventListener('inventoryChanged', onInventoryChanged)
  window.removeEventListener('wheel', onWheel)
  logger.info('HotbarUI 已卸载')
})

// ========== 监听 props 变化 ==========
watch(() => props.inventory, updateHotbar, { deep: true })
watch(() => props.selectedIndex, () => {
  logger.debug(`快捷栏选中: ${props.selectedIndex}`)
})
</script>

<style scoped>
#hotbar-ui {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2100;
  pointer-events: auto;
}

.hotbar-container {
  display: flex;
  gap: 6px;
  background: linear-gradient(135deg, #4a3728 0%, #2d1f15 100%);
  padding: 10px;
  border-radius: 10px;
  border: 2px solid rgba(255, 200, 100, 0.3);
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hotbar-slot {
  position: relative;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  cursor: pointer;
}

.hotbar-slot:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.hotbar-slot.selected {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  transform: translateY(-3px);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.5), inset 0 0 10px rgba(243, 156, 18, 0.2);
}

.hotbar-slot.empty {
  opacity: 0.6;
}

.hotbar-slot:not(.empty) {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.3);
}

.hotbar-slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.25);
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.5);
}

.hotbar-slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.hotbar-slot[draggable="true"] {
  cursor: grab;
}

.hotbar-slot-number {
  position: absolute;
  top: 1px;
  left: 3px;
  font-size: 9px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.hotbar-slot-icon {
  font-size: 26px;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.hotbar-slot-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}
</style>