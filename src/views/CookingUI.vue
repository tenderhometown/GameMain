<template>
  <div class="cooking-ui">
    <div class="cooking-container">
      <!-- 标题栏 -->
      <div class="cooking-header">
        <h3>🔥 篝火</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div class="cooking-content">
        <!-- 左侧：背包 -->
        <div class="left-panel">
          <!-- 背包区域 -->
          <div class="inventory-section">
            <div class="section-label">🎒 背包</div>
            <div class="inventory-grid">
              <div 
                v-for="(slot, index) in inventorySlots" 
                :key="'inv-' + index"
                :class="['inventory-slot', { 
                  'has-item': slot,
                  'cookable': slot && canCook(slot.itemId),
                  'fuel': slot && isFuel(slot.itemId)
                }]"
                :draggable="!!slot"
                @dragstart="handleInventoryDragStart($event, index)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleInventoryDrop($event, index)"
                @mouseenter="handleSlotHover(slot, $event)"
                @mousemove="handleSlotHover(slot, $event)"
                @mouseleave="hideTooltip"
              >
                <template v-if="slot">
                  <span class="item-icon">{{ getItemIcon(slot.itemId) }}</span>
                  <span v-if="slot.count > 1" class="item-count">{{ slot.count }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="vertical-divider"></div>

        <!-- 右侧：烹饪区域 -->
        <div class="right-panel">
          <div class="cooking-area">
            <!-- 燃料槽 -->
            <div class="fuel-section">
              <div class="section-label">燃料</div>
              <div 
                :class="['cooking-slot', 'fuel-slot', { 
                  'has-item': fuelSlot || burningFuelId,
                  'burning': isBurning
                }]"
                :draggable="!!fuelSlot"
                @dragstart="handleFuelDragStart($event)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleFuelDrop($event)"
                @mouseenter="handleSlotHover(fuelSlot, $event)"
                @mousemove="handleSlotHover(fuelSlot, $event)"
                @mouseleave="hideTooltip"
              >
                <!-- 显示燃料槽中的燃料 -->
                <template v-if="fuelSlot">
                  <span class="item-icon">{{ getItemIcon(fuelSlot.itemId) }}</span>
                  <span v-if="fuelSlot.count > 1" class="item-count">{{ fuelSlot.count }}</span>
                </template>
                <!-- 燃料槽空但有燃烧中的燃料，显示燃烧中的燃料图标（半透明） -->
                <template v-else-if="burningFuelId && isBurning">
                  <span class="item-icon burning-icon">{{ getItemIcon(burningFuelId) }}</span>
                </template>
                <!-- 燃料燃烧进度 -->
                <div v-if="isBurning" class="fuel-progress">
                  <div class="progress-bar fuel-bar" :style="{ width: fuelPercent + '%' }"></div>
                </div>
                <div v-if="isBurning" class="burning-indicator">🔥</div>
              </div>
            </div>

            <!-- 食物槽 -->
            <div class="food-section">
              <div class="section-label">食材</div>
              <div 
                :class="['cooking-slot', 'food-slot', { 
                  'has-item': foodSlot,
                  'cooking': isCooking
                }]"
                :draggable="!!foodSlot"
                @dragstart="handleFoodDragStart($event)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleFoodDrop($event)"
                @mouseenter="handleSlotHover(foodSlot, $event)"
                @mousemove="handleSlotHover(foodSlot, $event)"
                @mouseleave="hideTooltip"
              >
                <template v-if="foodSlot">
                  <span class="item-icon">{{ getItemIcon(foodSlot.itemId) }}</span>
                  <span v-if="foodSlot.count > 1" class="item-count">{{ foodSlot.count }}</span>
                </template>
                <!-- <span v-else class="slot-hint">🥩</span> -->
                <!-- 烹饪进度条 -->
                <div v-if="foodSlot" class="cooking-progress">
                  <div class="progress-bar" :style="{ width: cookingPercent + '%' }"></div>
                </div>
              </div>
            </div>

            <!-- 箭头 -->
            <div class="arrow-section">
              <div :class="['arrow', { active: isCooking }]">→</div>
              <!-- 烹饪倒计时 -->
              <div class="cooking-timer" v-if="foodSlot">
                <span v-if="isCooking">⏱️ {{ remainingTimeText }}</span>
                <span v-else-if="outputBlocked" class="blocked">请先取走成品!</span>
                <span v-else-if="!fuelSlot" class="no-fuel">需要燃料!</span>
                <span v-else-if="!isBurning" class="waiting">等待燃料点燃...</span>
              </div>
            </div>

            <!-- 输出槽 -->
            <div class="output-section">
              <div class="section-label">✨ 完成</div>
              <div 
                :class="['cooking-slot', 'output-slot', { 'has-item': outputSlot }]"
                :draggable="!!outputSlot"
                @dragstart="handleOutputDragStart($event)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @mouseenter="handleSlotHover(outputSlot, $event)"
                @mousemove="handleSlotHover(outputSlot, $event)"
                @mouseleave="hideTooltip"
                @drop="handleOutputDrop($event)"
              >
                <template v-if="outputSlot">
                  <span class="item-icon">{{ getItemIcon(outputSlot.itemId) }}</span>
                  <span v-if="outputSlot.count > 1" class="item-count">{{ outputSlot.count }}</span>
                </template>
                <span v-else class="slot-hint">○</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="controls-hint">
        <span>拖拽 <span class="hint-fuel">🪵燃料</span> 和 <span class="hint-food">🥩食材</span> 到对应槽位 | 快捷栏位于屏幕底部</span>
      </div>
    </div>
    
    <!-- 统一的物品悬浮提示框 -->
    <ItemTooltip
      :visible="tooltipVisible"
      :data="tooltipData"
      :x="tooltipX"
      :y="tooltipY"
      mode="full"
      context="cooking"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ITEM_ICONS, ITEM_NAMES } from '../data/RecipeData.js'
import { logger } from '../utils/logger.js'
import ItemTooltip from '@/components/ui/ItemTooltip.vue'
import { useItemTooltip } from '@/composables/useItemTooltip.js'

const props = defineProps({
  cookingStation: {
    type: Object,
    required: true
  },
  inventory: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

// ========== 响应式数据 ==========
const fuelSlot = ref(null)
const foodSlot = ref(null)
const outputSlot = ref(null)
const inventorySlots = ref([])
const cookingPercent = ref(0)
const fuelPercent = ref(0)
const isCooking = ref(false)
const isBurning = ref(false)
const remainingTime = ref(0)
const outputBlocked = ref(false)
const burningFuelId = ref(null) // 正在燃烧的燃料类型

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
} = useItemTooltip({ context: 'cooking' })

// ========== 计算属性 ==========
const remainingTimeText = computed(() => {
  const seconds = Math.ceil(remainingTime.value)
  return `${seconds}s`
})

// ========== 刷新数据 ==========
function refreshData() {
  if (props.cookingStation) {
    fuelSlot.value = props.cookingStation.fuelSlot ? { ...props.cookingStation.fuelSlot } : null
    foodSlot.value = props.cookingStation.foodSlot ? { ...props.cookingStation.foodSlot } : null
    outputSlot.value = props.cookingStation.outputSlot ? { ...props.cookingStation.outputSlot } : null
    cookingPercent.value = props.cookingStation.getCookingPercent()
    fuelPercent.value = props.cookingStation.getFuelPercent()
    isCooking.value = props.cookingStation.isCooking()
    isBurning.value = props.cookingStation.isBurning()
    remainingTime.value = props.cookingStation.getRemainingTime()
    burningFuelId.value = props.cookingStation.burningFuelId || null
    
    if (foodSlot.value && outputSlot.value) {
      const recipe = props.cookingStation.recipes[foodSlot.value.itemId]
      outputBlocked.value = recipe && outputSlot.value.itemId !== recipe.output
    } else {
      outputBlocked.value = false
    }
  }
  if (props.inventory) {
    inventorySlots.value = props.inventory.getBackpackSlots().map(slot => slot ? { ...slot } : null)
  }
}

// ========== 工具函数 ==========
function getItemIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

function getItemName(itemId) {
  return ITEM_NAMES[itemId] || itemId
}

function canCook(itemId) {
  return props.cookingStation?.canCook(itemId) || false
}

function isFuel(itemId) {
  return props.cookingStation?.isFuel(itemId) || false
}

// ========== 悬浮提示框 ==========
function handleSlotHover(item, event) {
  if (item) {
    showTooltip(item, event)
  } else {
    hideTooltip()
  }
}

// ========== 拖拽开始 ==========
function handleFuelDragStart(e) {
  if (!fuelSlot.value) return
  
  setDragging(true)
  
  const dragData = {
    type: 'cooking-fuel',
    itemId: fuelSlot.value.itemId,
    count: fuelSlot.value.count
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
}

function handleFoodDragStart(e) {
  if (!foodSlot.value) return
  
  setDragging(true)
  
  const dragData = {
    type: 'cooking-food',
    itemId: foodSlot.value.itemId,
    count: foodSlot.value.count
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
}

function handleOutputDragStart(e) {
  if (!outputSlot.value) return
  
  setDragging(true)
  
  const dragData = {
    type: 'cooking-output',
    itemId: outputSlot.value.itemId,
    count: outputSlot.value.count
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
}

function handleInventoryDragStart(e, index) {
  const slot = inventorySlots.value[index]
  if (!slot) return
  
  setDragging(true)
  
  const dragData = {
    type: 'cooking-inventory',
    itemId: slot.itemId,
    count: slot.count,
    sourceIndex: index
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
}

// ========== 通用拖拽事件 ==========
function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  setDragging(false)
}

function handleDragOver(e) {
  const slot = e.target.closest('.cooking-slot, .inventory-slot')
  if (slot) slot.classList.add('drag-over')
}

function handleDragLeave(e) {
  const slot = e.target.closest('.cooking-slot, .inventory-slot')
  if (slot) slot.classList.remove('drag-over')
}

// ========== 拖拽放下 - 燃料槽 ==========
function handleFuelDrop(e) {
  e.target.closest('.cooking-slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (dragData.type === 'cooking-inventory' || dragData.type === 'hotbar') {
      const isFromHotbar = dragData.type === 'hotbar'
      const sourceSlot = isFromHotbar
        ? props.inventory.getHotbarSlots()[dragData.sourceIndex]
        : inventorySlots.value[dragData.sourceIndex]
      if (!sourceSlot || !isFuel(sourceSlot.itemId)) return
      
      // 放入整组燃料
      const result = props.cookingStation.addFuel(sourceSlot.itemId, sourceSlot.count)
      if (result.success && result.added > 0) {
        const setSourceSlot = isFromHotbar
          ? (val) => props.inventory.setHotbarSlot(dragData.sourceIndex, val)
          : (val) => props.inventory.setBackpackSlot(dragData.sourceIndex, val)
        
        if (sourceSlot.count > result.added) {
          sourceSlot.count -= result.added
          setSourceSlot(sourceSlot)
        } else {
          setSourceSlot(null)
        }
        logger.info(`✅ 放入燃料: ${sourceSlot.itemId} x${result.added}`)
        // 通知背包数据变化
        document.dispatchEvent(new CustomEvent('inventoryChanged', {
          detail: { source: 'cooking-fuel-drop', timestamp: Date.now() }
        }))
      }
      refreshData()
    }
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 拖拽放下 - 食物槽 ==========
function handleFoodDrop(e) {
  e.target.closest('.cooking-slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (dragData.type === 'cooking-inventory' || dragData.type === 'hotbar') {
      const isFromHotbar = dragData.type === 'hotbar'
      const sourceSlot = isFromHotbar
        ? props.inventory.getHotbarSlots()[dragData.sourceIndex]
        : inventorySlots.value[dragData.sourceIndex]
      if (!sourceSlot || !canCook(sourceSlot.itemId)) return
      
      // 放入整组食材
      const result = props.cookingStation.addFood(sourceSlot.itemId, sourceSlot.count)
      if (result.success && result.added > 0) {
        const setSourceSlot = isFromHotbar
          ? (val) => props.inventory.setHotbarSlot(dragData.sourceIndex, val)
          : (val) => props.inventory.setBackpackSlot(dragData.sourceIndex, val)
        
        if (sourceSlot.count > result.added) {
          sourceSlot.count -= result.added
          setSourceSlot(sourceSlot)
        } else {
          setSourceSlot(null)
        }
        logger.info(`✅ 放入食材: ${sourceSlot.itemId} x${result.added}`)
        // 通知背包数据变化
        document.dispatchEvent(new CustomEvent('inventoryChanged', {
          detail: { source: 'cooking-food-drop', timestamp: Date.now() }
        }))
      }
      refreshData()
    }
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 拖拽放下 - 输出槽 ==========
function handleOutputDrop(e) {
  e.target.closest('.cooking-slot')?.classList.remove('drag-over')
  // 输出槽不接受外部物品
}

// ========== 拖拽放下 - 背包 ==========
function handleInventoryDrop(e, targetIndex) {
  e.target.closest('.inventory-slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    if (dragData.type === 'cooking-output') {
      // 从输出槽拖到背包指定位置
      const outputItem = outputSlot.value
      if (!outputItem) return
      
      const targetSlot = inventorySlots.value[targetIndex]
      
      if (!targetSlot) {
        props.cookingStation.takeOutput()
        props.inventory.setBackpackSlot(targetIndex, { ...outputItem })
        logger.info(`✅ 取走成品到背包[${targetIndex}]: ${outputItem.itemId} x${outputItem.count}`)
      } else if (targetSlot.itemId === outputItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetSlot.count
        const toStack = Math.min(canStack, outputItem.count)
        
        if (toStack > 0) {
          props.cookingStation.takeOutput()
          targetSlot.count += toStack
          props.inventory.setBackpackSlot(targetIndex, targetSlot)
          logger.info(`✅ 成品堆叠到背包[${targetIndex}]: +${toStack}`)
        }
      }
      refreshData()
    } else if (dragData.type === 'cooking-fuel') {
      const fuelItem = fuelSlot.value
      if (!fuelItem) return
      
      const targetSlot = inventorySlots.value[targetIndex]
      
      if (!targetSlot) {
        props.cookingStation.takeFuel()
        props.inventory.setBackpackSlot(targetIndex, { ...fuelItem })
        logger.info(`✅ 取回燃料到背包[${targetIndex}]`)
      } else if (targetSlot.itemId === fuelItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetSlot.count
        if (canStack > 0) {
          props.cookingStation.takeFuel()
          targetSlot.count += fuelItem.count
          props.inventory.setBackpackSlot(targetIndex, targetSlot)
        }
      } else if (isFuel(targetSlot.itemId)) {
        props.cookingStation.takeFuel()
        props.inventory.setBackpackSlot(targetIndex, { ...fuelItem })
        props.cookingStation.addFuel(targetSlot.itemId, targetSlot.count)
      }
      refreshData()
    } else if (dragData.type === 'cooking-food') {
      // 允许随时取出食材（即使正在烹饪）
      const foodItem = foodSlot.value
      if (!foodItem) return
      
      const targetSlot = inventorySlots.value[targetIndex]
      
      if (!targetSlot) {
        props.cookingStation.takeFood()
        props.inventory.setBackpackSlot(targetIndex, { ...foodItem })
        logger.info(`✅ 取回食材到背包[${targetIndex}]`)
      } else if (targetSlot.itemId === foodItem.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetSlot.count
        if (canStack > 0) {
          props.cookingStation.takeFood()
          targetSlot.count += foodItem.count
          props.inventory.setBackpackSlot(targetIndex, targetSlot)
        }
      } else if (canCook(targetSlot.itemId)) {
        props.cookingStation.takeFood()
        props.inventory.setBackpackSlot(targetIndex, { ...foodItem })
        props.cookingStation.addFood(targetSlot.itemId, targetSlot.count)
      }
      refreshData()
    } else if (dragData.type === 'cooking-inventory') {
      if (dragData.sourceIndex !== targetIndex) {
        const sourceSlot = inventorySlots.value[dragData.sourceIndex]
        const targetSlot = inventorySlots.value[targetIndex]
        
        if (targetSlot && sourceSlot.itemId === targetSlot.itemId) {
          // 堆叠
          const maxStack = 99
          const canStack = maxStack - targetSlot.count
          const toStack = Math.min(canStack, sourceSlot.count)
          if (toStack > 0) {
            targetSlot.count += toStack
            sourceSlot.count -= toStack
            props.inventory.setBackpackSlot(targetIndex, targetSlot)
            props.inventory.setBackpackSlot(dragData.sourceIndex, sourceSlot.count > 0 ? sourceSlot : null)
          }
        } else {
          // 交换
          props.inventory.setBackpackSlot(dragData.sourceIndex, targetSlot)
          props.inventory.setBackpackSlot(targetIndex, sourceSlot)
        }
        refreshData()
      }
    } else if (dragData.type === 'hotbar') {
      // 从快捷栏拖到背包
      const sourceSlot = props.inventory.getHotbarSlots()[dragData.sourceIndex]
      if (!sourceSlot) return
      
      const targetSlot = inventorySlots.value[targetIndex]
      
      if (!targetSlot) {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceSlot })
        props.inventory.setHotbarSlot(dragData.sourceIndex, null)
        logger.info(`✅ 快捷栏[${dragData.sourceIndex}] → 背包[${targetIndex}]`)
      } else if (targetSlot.itemId === sourceSlot.itemId) {
        const maxStack = 99
        const canStack = maxStack - targetSlot.count
        const toStack = Math.min(canStack, sourceSlot.count)
        if (toStack > 0) {
          targetSlot.count += toStack
          sourceSlot.count -= toStack
          props.inventory.setBackpackSlot(targetIndex, targetSlot)
          props.inventory.setHotbarSlot(dragData.sourceIndex, sourceSlot.count > 0 ? sourceSlot : null)
        }
      } else {
        props.inventory.setBackpackSlot(targetIndex, { ...sourceSlot })
        props.inventory.setHotbarSlot(dragData.sourceIndex, { ...targetSlot })
      }
      refreshData()
      document.dispatchEvent(new CustomEvent('inventoryChanged', {
        detail: { source: 'cooking-inventory-drop', timestamp: Date.now() }
      }))
    }
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 关闭 ==========
function close() {
  emit('close')
}

// ========== 处理从烹饪槽拖到快捷栏 ==========
function handleCookingToHotbar(event) {
  const { targetIndex, dragData } = event.detail
  const hotbarSlots = props.inventory.getHotbarSlots()
  const targetSlot = hotbarSlots[targetIndex]
  
  let sourceItem = null
  let takeFromCooking = null
  
  if (dragData.type === 'cooking-output') {
    sourceItem = outputSlot.value
    takeFromCooking = () => props.cookingStation.takeOutput()
  } else if (dragData.type === 'cooking-fuel') {
    sourceItem = fuelSlot.value
    takeFromCooking = () => props.cookingStation.takeFuel()
  } else if (dragData.type === 'cooking-food') {
    sourceItem = foodSlot.value
    takeFromCooking = () => props.cookingStation.takeFood()
  }
  
  if (!sourceItem || !takeFromCooking) return
  
  if (!targetSlot) {
    takeFromCooking()
    props.inventory.setHotbarSlot(targetIndex, { ...sourceItem })
    logger.info(`✅ ${dragData.type} → 快捷栏[${targetIndex}]`)
  } else if (targetSlot.itemId === sourceItem.itemId) {
    const maxStack = 99
    const totalCount = targetSlot.count + sourceItem.count
    if (totalCount <= maxStack) {
      takeFromCooking()
      targetSlot.count = totalCount
      props.inventory.setHotbarSlot(targetIndex, targetSlot)
    } else {
      // 部分堆叠 - 暂不支持，只能全部堆叠
      logger.warn('快捷栏槽位已满，无法堆叠更多')
    }
    logger.info(`✅ ${dragData.type} 堆叠到 快捷栏[${targetIndex}]`)
  } else {
    // 交换 - 检查目标物品是否适合放入对应槽位
    const targetItemId = targetSlot.itemId
    
    if (dragData.type === 'cooking-fuel' && isFuel(targetItemId)) {
      takeFromCooking()
      props.inventory.setHotbarSlot(targetIndex, { ...sourceItem })
      props.cookingStation.addFuel(targetItemId, targetSlot.count)
      logger.info(`✅ 燃料槽 ⇄ 快捷栏[${targetIndex}]`)
    } else if (dragData.type === 'cooking-food' && canCook(targetItemId)) {
      takeFromCooking()
      props.inventory.setHotbarSlot(targetIndex, { ...sourceItem })
      props.cookingStation.addFood(targetItemId, targetSlot.count)
      logger.info(`✅ 食材槽 ⇄ 快捷栏[${targetIndex}]`)
    } else if (dragData.type === 'cooking-output') {
      // 成品槽不支持交换
      logger.warn('成品槽不支持与快捷栏交换')
    } else {
      logger.warn('快捷栏物品不适合放入此槽位')
    }
  }
  
  refreshData()
  document.dispatchEvent(new CustomEvent('inventoryChanged', {
    detail: { source: 'cooking-hotbar', timestamp: Date.now() }
  }))
}

// ========== 定时刷新 ==========
let refreshInterval = null

onMounted(() => {
  refreshData()
  refreshInterval = setInterval(refreshData, 100)
  document.addEventListener('cookingToHotbar', handleCookingToHotbar)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  document.removeEventListener('cookingToHotbar', handleCookingToHotbar)
})
</script>

<style scoped>
.cooking-ui {
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

.cooking-container {
  background: linear-gradient(135deg, #4a3728 0%, #2d1f15 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 200, 100, 0.3);
  pointer-events: auto;
}

.cooking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.cooking-header h3 {
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

.cooking-content {
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
  justify-content: center;
}

.vertical-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 200, 100, 0.3), transparent);
  margin: 0 10px;
}

.inventory-section {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.section-label {
  color: #bdc3c7;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.inventory-slot {
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

.inventory-slot:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.inventory-slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

.inventory-slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.inventory-slot.has-item {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.3);
}

.inventory-slot.cookable {
  border-color: rgba(231, 76, 60, 0.5);
}

.inventory-slot.cookable:hover {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
}

.inventory-slot.fuel {
  border-color: rgba(211, 84, 0, 0.5);
}

.inventory-slot.fuel:hover {
  border-color: #d35400;
  background: rgba(211, 84, 0, 0.2);
}

/* 烹饪区域 */
.cooking-area {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 15px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.fuel-section,
.food-section,
.output-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cooking-slot {
  width: 56px;
  height: 56px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cooking-slot:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.cooking-slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

.cooking-slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* 燃料槽 */
.fuel-slot {
  border-color: rgba(211, 84, 0, 0.5);
}

.fuel-slot.has-item {
  background: rgba(211, 84, 0, 0.2);
  border-color: rgba(211, 84, 0, 0.6);
}

.fuel-slot.burning {
  border-color: #e67e22;
  animation: fuel-burn 0.8s ease-in-out infinite;
}

@keyframes fuel-burn {
  0%, 100% { box-shadow: 0 0 10px rgba(230, 126, 34, 0.4); }
  50% { box-shadow: 0 0 20px rgba(230, 126, 34, 0.7); }
}

.fuel-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 0 0 4px 4px;
  overflow: hidden;
}

.fuel-bar {
  background: linear-gradient(90deg, #d35400, #e67e22);
}

.burning-indicator {
  position: absolute;
  bottom: -8px;
  font-size: 14px;
  animation: fire-dance 0.5s ease-in-out infinite;
}

/* 食物槽 */
.food-slot {
  border-color: rgba(231, 76, 60, 0.5);
}

.food-slot.has-item {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.6);
}

.food-slot.cooking {
  border-color: #e74c3c;
  animation: cooking-glow 1s ease-in-out infinite;
}

@keyframes cooking-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(231, 76, 60, 0.3); }
  50% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.6); }
}

.cooking-progress {
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
  background: linear-gradient(90deg, #e74c3c, #f39c12);
  transition: width 0.1s linear;
}

/* 输出槽 */
.output-slot {
  border-color: rgba(46, 204, 113, 0.4);
}

.output-slot.has-item {
  background: rgba(46, 204, 113, 0.15);
  border-color: #2ecc71;
  animation: output-ready 1s ease-in-out infinite;
}

@keyframes output-ready {
  0%, 100% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.3); }
  50% { box-shadow: 0 0 15px rgba(46, 204, 113, 0.5); }
}

.slot-hint {
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
}

.item-icon {
  font-size: 26px;
  pointer-events: none;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.item-icon.burning-icon {
  opacity: 0.5;
  animation: burning-pulse 1s ease-in-out infinite;
}

@keyframes burning-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
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

@keyframes fire-dance {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.arrow-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  min-width: 60px;
}

.arrow {
  font-size: 28px;
  color: #666;
  transition: all 0.3s;
}

.arrow.active {
  color: #f39c12;
  text-shadow: 0 0 10px rgba(243, 156, 18, 0.5);
}

.cooking-timer {
  margin-top: 10px;
  font-size: 13px;
  color: #f39c12;
  text-align: center;
  min-height: 20px;
  white-space: nowrap;
}

.cooking-timer .waiting {
  color: #7f8c8d;
  font-size: 11px;
}

.cooking-timer .no-fuel {
  color: #e74c3c;
  font-size: 11px;
}

.cooking-timer .blocked {
  color: #f39c12;
  font-size: 11px;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.controls-hint {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 200, 100, 0.1);
  text-align: center;
  color: #7f8c8d;
  font-size: 11px;
}

.hint-fuel {
  color: #d35400;
}

.hint-food {
  color: #e74c3c;
}
</style>
