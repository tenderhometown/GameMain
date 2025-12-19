<template>
  <div class="inventory-content">
    <!-- 左侧：装备栏 + 操作指南 -->
    <div class="equipment-panel">
      <h3>👤 装备</h3>
      
      <div class="equipment-slots">
        <div 
          v-for="slotName in equipmentSlots" 
          :key="slotName"
          class="equipment-slot"
        >
          <div class="slot-label">{{ getSlotLabel(slotName) }}</div>
          <div 
            :class="['slot-box', { 'has-item': getEquippedItem(slotName) }]"
            :draggable="!!  getEquippedItem(slotName)"
            @dragstart="handleEquipmentDragStart($event, slotName)"
            @dragend="handleDragEnd"
            @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleEquipmentDrop($event, slotName)"
            @click="handleEquipmentClick(slotName)"
          >
            <span class="slot-icon">
              {{ getEquippedItem(slotName) ? getIcon(getEquippedItem(slotName)) : '' }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 当前装备效果 -->
      <div class="equipment-stats">
        <h4>⚡ 当前效果</h4>
        <div class="effects-list">
          <div 
            v-for="(effect, index) in currentEffects" 
            :key="index"
            class="effect-item"
          >
            {{ effect }}
          </div>
          <div v-if="currentEffects.length === 0" class="effect-item empty">
            暂无装备效果
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧：背包区域 -->
    <div class="backpack-panel">
      <div class="backpack-header">
        <h3>🎒 背包</h3>
      </div>
      
      <!-- 背包网格 -->
      <div class="backpack-grid">
        <div
          v-for="(slot, index) in backpackSlots"
          :key="index"
          :class="['backpack-slot', {
            'has-item': slot,
            'equippable': slot && isEquippable(slot.itemId),
            'selected': index === selectedIndex
          }]"
          :draggable="!! slot"
          @dragstart="handleBackpackDragStart($event, index)"
          @dragend="handleDragEnd"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleBackpackDrop($event, index)"
          @click="handleSlotClick(slot, index)"
          @dblclick="handleSlotDoubleClick(slot, index)"
          @mouseenter="handleSlotHover(slot, $event)"
          @mousemove="handleSlotHover(slot, $event)"
          @mouseleave="hideTooltip"
        >
          <span v-if="slot" class="slot-icon">{{ getIcon(slot.itemId) }}</span>
          <span v-if="slot && slot.count > 1" class="slot-count">{{ slot.count }}</span>
        </div>
      </div>
      
      <div class="backpack-footer">
        <span class="backpack-capacity">{{ usedSlots }} / {{ backpackSlots.length }}</span>
        <span class="backpack-hint">💡 悬停查看详情 | 双击装备 | 拖拽移动</span>
      </div>
    </div>
    
    <!-- 统一的物品悬浮提示框 -->
    <ItemTooltip
      :visible="tooltipVisible"
      :data="tooltipData"
      :x="tooltipX"
      :y="tooltipY"
      mode="full"
      context="inventory"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ITEM_ICONS, ITEM_NAMES, ITEMS } from '@/data/RecipeData.js'
import { logger } from '@/utils/logger.js'
import ItemTooltip from '@/components/ui/ItemTooltip.vue'
import { useItemTooltip } from '@/composables/useItemTooltip.js'

// ========== Props ==========
const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  equipmentSystem: {
    type: Object,
    required: true
  },
  player: {
    type: Object,
    required: true
  }
})

// ========== 响应式数据 ==========
const backpackSlots = ref([])
const selectedIndex = ref(-1)  // 选中的格子索引，-1 表示未选中

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
} = useItemTooltip({ context: 'inventory' })

const equipmentSlots = ['head', 'chest', 'legs', 'feet']

// ========== 计算属性 ==========
const usedSlots = computed(() => {
  return backpackSlots.value.filter(slot => slot !== null).length
})

// 选中的格子数据
const selectedSlot = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < backpackSlots.value.length) {
    return backpackSlots.value[selectedIndex.value]
  }
  return null
})

const currentEffects = computed(() => {
  const effects = props.equipmentSystem.getCurrentEffects()
  const result = []
  
  if (effects.woodGatherSpeed > 1.0) {
    const bonus = ((effects.woodGatherSpeed - 1) * 100).toFixed(0)
    result.push(`🪵 木材采集 +${bonus}%`)
  }
  
  if (effects.stoneGatherSpeed > 1.0) {
    const bonus = ((effects.stoneGatherSpeed - 1) * 100).toFixed(0)
    result.push(`🪨 石头采集 +${bonus}%`)
  }
  
  if (effects.damage > 0) {
    result.push(`⚔️ 攻击伤害 ${effects.damage}`)
  }
  
  if (effects.defense > 0) {
    result.push(`🛡️ 防御 +${effects.defense}`)
  }
  
  return result
})

// ========== 工具函数 ==========
function getIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

function getItemName(itemId) {
  return ITEM_NAMES[itemId] || itemId
}

function getItemType(itemId) {
  if (props.equipmentSystem.isEquippable(itemId)) {
    const slotType = props.equipmentSystem.getItemSlot(itemId)
    return slotType === 'hand' ? '工具/武器' : '装备'
  }
  return '资源'
}

function getItemCount(itemId) {
  return props.inventory.getItemCount(itemId)
}

function getItemEffects(itemId) {
  if (props.equipmentSystem.isEquippable(itemId)) {
    return props.equipmentSystem.getItemEffectDescription(itemId)
  }
  return []
}

function getItemDescription(itemId) {
  if (props.equipmentSystem.isEquippable(itemId)) {
    const effects = props.equipmentSystem.getItemEffectDescription(itemId)
    return effects.length > 0 ? '可装备物品，提供额外属性加成' : '可装备物品'
  }
  return '基础资源材料'
}

function isEquippable(itemId) {
  return props.equipmentSystem.isEquippable(itemId)
}

function isEdible(itemId) {
  const item = getItemData(itemId)
  return item && item.edible === true
}

function getItemData(itemId) {
  return ITEMS[itemId] || null
}

function getSlotLabel(slotName) {
  const labels = {
    head: '头部',
    chest: '身体',
    legs: '腿部',
    feet: '脚部'
  }
  return labels[slotName] || slotName
}

function getEquippedItem(slotName) {
  return props.inventory.getEquippedItem(slotName)
}

// ========== 悬浮提示框 ==========
function handleSlotHover(slot, event) {
  if (slot) {
    showTooltip(slot, event)
  } else {
    hideTooltip()
  }
}

// ========== 更新数据 ==========
function updateBackpack() {
  backpackSlots.value = props.inventory.getBackpackSlots()
}

// ========== 点击事件 ==========
function handleSlotClick(slot, index) {
  if (slot) {
    selectedIndex.value = index
    logger.debug(`选中格子[${index}]: ${slot.itemId}`)
  } else {
    selectedIndex.value = -1
  }
}

function handleSlotDoubleClick(slot, index) {
  if (!slot) return
  
  // 双击装备
  if (isEquippable(slot.itemId)) {
    props.equipmentSystem.equip(slot.itemId)
    selectedIndex.value = -1
    updateBackpack()
    notifyInventoryChanged()
    logger.info(`✅ 双击装备: ${slot.itemId}`)
  }
}

function handleEquipmentClick(slotName) {
  const item = getEquippedItem(slotName)
  if (item) {
    props.equipmentSystem.unequip(slotName)
    selectedIndex.value = -1
    updateBackpack()
    notifyInventoryChanged()
    logger.info(`✅ 卸下装备: ${slotName}`)
  }
}

function handleEquipItem() {
  if (selectedSlot.value) {
    props.equipmentSystem.equip(selectedSlot.value.itemId)
    selectedIndex.value = -1
    updateBackpack()
    notifyInventoryChanged()
    logger.info(`✅ 装备物品: ${selectedSlot.value.itemId}`)
  }
}

function handleUseItem() {
  if (!selectedSlot.value) return
  
  if (isEdible(selectedSlot.value.itemId)) {
    const foodData = getItemData(selectedSlot.value.itemId)
    const restored = props.player.eat(foodData.hungerRestore)
    
    if (restored > 0) {
      // 消耗一个食物
      props.inventory.removeItem(selectedSlot.value.itemId, 1)
      const itemName = getItemName(selectedSlot.value.itemId)
      selectedIndex.value = -1
      updateBackpack()
      notifyInventoryChanged()
      logger.info(`🍖 食用: ${itemName}, 恢复饥饿度 +${restored}`)
    }
  }
}

// ========== 拖拽事件 - 背包 ==========
function handleBackpackDragStart(e, index) {
  const slot = backpackSlots.value[index]
  if (!  slot) return
  
  // 隐藏tooltip并设置拖拽状态
  setDragging(true)
  
  const dragData = {
    type: 'backpack',
    itemId: slot.itemId,
    count: slot.count,
    sourceIndex: index
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
  
  logger.debug(`开始拖拽背包[${index}]: ${slot.itemId} x${slot.count}`)
}

function handleBackpackDrop(e, targetIndex) {
  e.target.closest('.backpack-slot')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    handleDropToBackpack(dragData, targetIndex)
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 拖拽事件 - 装备区 ==========
function handleEquipmentDragStart(e, slotName) {
  const itemId = getEquippedItem(slotName)
  if (! itemId) return
  
  // 隐藏tooltip并设置拖拽状态
  setDragging(true)
  
  const dragData = {
    type: 'equipment',
    itemId: itemId,
    count: 1,
    sourceSlot: slotName
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.target.classList.add('dragging')
  
  logger.debug(`开始拖拽装备: ${itemId} 从 ${slotName}`)
}

function handleEquipmentDrop(e, targetSlot) {
  e.target.closest('.slot-box')?.classList.remove('drag-over')
  
  try {
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
    handleDropToEquipment(dragData, targetSlot)
  } catch (err) {
    logger.error('拖拽数据解析失败:', err)
  }
}

// ========== 通用拖拽事件 ==========
function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  setDragging(false)
}

function handleDragOver(e) {
  const target = e.target.closest('.backpack-slot, .slot-box')
  if (target) target.classList.add('drag-over')
}

function handleDragLeave(e) {
  const target = e.target.closest('.backpack-slot, .slot-box')
  if (target) target.classList.remove('drag-over')
}

// ========== 拖放逻辑 - 到背包 ==========
function handleDropToBackpack(dragData, targetIndex) {
  const { type, itemId, sourceIndex, sourceSlot } = dragData
  
  logger.debug(`背包接收拖拽: type=${type}, itemId=${itemId}, target=${targetIndex}`)
  
  const slots = backpackSlots.value
  
  // 1.从装备区拖到背包
  if (type === 'equipment') {
    const equippedItem = props.inventory.getEquippedItem(sourceSlot)
    if (! equippedItem) return
    
    const targetSlot = slots[targetIndex]
    
    if (!  targetSlot) {
      // 目标格子为空
      slots[targetIndex] = { itemId: equippedItem, count: 1 }
      props.inventory.setEquipmentSlot(sourceSlot, null)
      logger.info(`✅ 装备区[${sourceSlot}] → 背包[${targetIndex}]`)
    } else {
      // 目标格子有物品 - 交换或替换
      if (props.equipmentSystem.canEquipToSlot(targetSlot.itemId, sourceSlot)) {
        const tempItem = targetSlot.itemId
        const tempCount = targetSlot.count
        
        slots[targetIndex] = { itemId: equippedItem, count: 1 }
        props.inventory.setEquipmentSlot(sourceSlot, tempItem)
        
        if (tempCount > 1) {
          props.inventory.addItem(tempItem, tempCount - 1)
        }
        
        logger.info(`✅ 装备区[${sourceSlot}] ⇄ 背包[${targetIndex}] 交换`)
      } else {
        props.inventory.addItem(targetSlot.itemId, targetSlot.count)
        slots[targetIndex] = { itemId: equippedItem, count: 1 }
        props.inventory.setEquipmentSlot(sourceSlot, null)
        logger.info(`✅ 装备区[${sourceSlot}] → 背包[${targetIndex}]，旧物品放回背包`)
      }
    }
    
    updateBackpack()
    notifyInventoryChanged()
    return
  }
  
  // 2.从快捷栏拖到背包
  if (type === 'hotbar') {
    const hotbarSlots = props.inventory.getHotbarSlots()
    const sourceSlotData = hotbarSlots[sourceIndex]
    
    if (!  sourceSlotData) return
    
    const targetSlot = slots[targetIndex]
    
    if (! targetSlot) {
      slots[targetIndex] = { ...sourceSlotData }
      hotbarSlots[sourceIndex] = null
    } else if (targetSlot.itemId === sourceSlotData.itemId) {
      const maxStack = props.inventory.getMaxStackSize(itemId)
      const totalCount = targetSlot.count + sourceSlotData.count
      
      if (totalCount <= maxStack) {
        targetSlot.count = totalCount
        hotbarSlots[sourceIndex] = null
      } else {
        targetSlot.count = maxStack
        sourceSlotData.count = totalCount - maxStack
      }
    } else {
      [slots[targetIndex], hotbarSlots[sourceIndex]] = 
        [hotbarSlots[sourceIndex], slots[targetIndex]]
    }
    
    logger.info(`✅ 快捷栏[${sourceIndex}] → 背包[${targetIndex}]`)
    updateBackpack()
    notifyInventoryChanged()
    return
  }
  
  // 3.背包内部拖拽
  if (type === 'backpack' && sourceIndex !== undefined && sourceIndex !== targetIndex) {
    const sourceSlot = slots[sourceIndex]
    const targetSlot = slots[targetIndex]
    
    if (!  targetSlot) {
      slots[targetIndex] = sourceSlot
      slots[sourceIndex] = null
      logger.info(`✅ 背包移动: [${sourceIndex}] → [${targetIndex}]`)
    } else if (sourceSlot.itemId !== targetSlot.itemId) {
      [slots[sourceIndex], slots[targetIndex]] = 
        [slots[targetIndex], slots[sourceIndex]]
      logger.info(`✅ 背包交换: [${sourceIndex}] ⇄ [${targetIndex}]`)
    } else {
      const maxStack = props.inventory.getMaxStackSize(sourceSlot.itemId)
      const totalCount = sourceSlot.count + targetSlot.count
      
      if (totalCount <= maxStack) {
        slots[sourceIndex] = null
        targetSlot.count = totalCount
        logger.info(`✅ 背包堆叠合并: [${sourceIndex}] + [${targetIndex}] = ${totalCount}`)
      } else {
        targetSlot.count = maxStack
        sourceSlot.count = totalCount - maxStack
        logger.info(`✅ 背包部分堆叠: [${targetIndex}]补满, [${sourceIndex}]剩余${sourceSlot.count}`)
      }
    }
    
    updateBackpack()
    return
  }
}

// ========== 拖放逻辑 - 到装备区 ==========
function handleDropToEquipment(dragData, targetSlot) {
  const { type, itemId, sourceSlot, sourceIndex } = dragData
  
  logger.debug(`装备区接收拖拽: type=${type}, itemId=${itemId}, target=${targetSlot}`)
  
  // 验证物品是否可以装备到该槽位
  if (! props.equipmentSystem.canEquipToSlot(itemId, targetSlot)) {
    logger.warn(`❌ ${itemId} 不能装备到 ${targetSlot}`)
    return
  }
  
  // 1.从背包拖到装备区
  if (type === 'backpack') {
    const slots = backpackSlots.value
    const sourceSlotData = slots[sourceIndex]
    
    if (! sourceSlotData) return
    
    const oldItem = props.inventory.getEquippedItem(targetSlot)
    
    if (sourceSlotData.count > 1) {
      sourceSlotData.count--
    } else {
      slots[sourceIndex] = null
    }
    
    if (oldItem) {
      props.inventory.addItem(oldItem, 1)
    }
    
    props.inventory.setEquipmentSlot(targetSlot, itemId)
    
    logger.info(`✅ 背包 → 装备区[${targetSlot}]: ${itemId}`)
    updateBackpack()
    notifyInventoryChanged()
    return
  }
  
  // 2.从快捷栏拖到装备区
  if (type === 'hotbar') {
    const hotbarSlots = props.inventory.getHotbarSlots()
    const sourceSlotData = hotbarSlots[sourceIndex]
    
    if (! sourceSlotData) return
    
    const oldItem = props.inventory.getEquippedItem(targetSlot)
    
    if (sourceSlotData.count > 1) {
      sourceSlotData.count--
    } else {
      hotbarSlots[sourceIndex] = null
    }
    
    if (oldItem) {
      props.inventory.addItem(oldItem, 1)
    }
    
    props.inventory.setEquipmentSlot(targetSlot, itemId)
    
    logger.info(`✅ 快捷栏[${sourceIndex}] → 装备区[${targetSlot}]: ${itemId}`)
    updateBackpack()
    notifyInventoryChanged()
    return
  }
  
  // 3.装备区内部交换
  if (type === 'equipment' && sourceSlot) {
    const sourceItem = props.inventory.getEquippedItem(sourceSlot)
    const targetItem = props.inventory.getEquippedItem(targetSlot)
    
    if (targetItem && ! props.equipmentSystem.canEquipToSlot(targetItem, sourceSlot)) {
      logger.warn(`❌ 无法交换：${targetItem} 不能装备到 ${sourceSlot}`)
      return
    }
    
    props.inventory.setEquipmentSlot(sourceSlot, targetItem)
    props.inventory.setEquipmentSlot(targetSlot, sourceItem)
    
    logger.info(`✅ 装备区交换: [${sourceSlot}] ⇄ [${targetSlot}]`)
    updateBackpack()
    notifyInventoryChanged()
    return
  }
}

// ========== 通知背包数据变化 ==========
function notifyInventoryChanged() {
  const event = new CustomEvent('inventoryChanged', {
    detail: { source: 'inventory', timestamp: Date.now() }
  })
  document.dispatchEvent(event)
  logger.debug('🔔 已触发 inventoryChanged 事件')
}

// ========== 监听背包变化 ==========
function onInventoryChanged() {
  updateBackpack()
}

// ========== 生命周期 ==========
onMounted(() => {
  updateBackpack()
  document.addEventListener('inventoryChanged', onInventoryChanged)
  logger.info('✅ InventoryUI 已挂载')
})

onUnmounted(() => {
  document.removeEventListener('inventoryChanged', onInventoryChanged)
  logger.info('InventoryUI 已卸载')
})
</script>

<style scoped>
.inventory-content {
  display: flex;
  gap: 20px;
  padding: 15px;
  width: 760px;
  height: 480px;
  user-select: none;
  -webkit-user-select: none;
}

/* ========== 左侧装备面板 ========== */
.equipment-panel {
  width: 160px;
  display: flex;
  flex-direction: column;
}

.equipment-panel h3 {
  margin: 0 0 8px 0;
  color: #f4d03f;
  font-size: 14px;
  border-bottom: 2px solid rgba(255, 200, 100, 0.3);
  padding-bottom: 6px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.equipment-slots {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.equipment-slot {
  display: flex;
  align-items: center;
  gap: 6px;
}

.slot-label {
  width: 42px;
  color: #bdc3c7;
  font-size: 12px;
}

.slot-box {
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.slot-box:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.slot-box.has-item {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.4);
}

.slot-box.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

.slot-box.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.slot-box[draggable="true"] {
  cursor: grab;
}

.slot-icon {
  font-size: 22px;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.equipment-stats {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 200, 100, 0.2);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
}

.equipment-stats h4 {
  margin: 0 0 6px 0;
  color: #f39c12;
  font-size: 12px;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.effect-item {
  color: #ecf0f1;
  font-size: 10px;
  padding: 3px 5px;
  background: rgba(243, 156, 18, 0.1);
  border-left: 2px solid #f39c12;
  border-radius: 2px;
}

.effect-item.empty {
  color: #7f8c8d;
  background: none;
  border: none;
}

/* ========== 右侧背包面板 ========== */
.backpack-panel {
  display: flex;
  flex-direction: column;
}

.backpack-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(255, 200, 100, 0.3);
}

.backpack-header h3 {
  margin: 0;
  color: #f4d03f;
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* 选中物品信息（标题栏右侧） */
.selected-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 200, 100, 0.3);
}

.selected-item-info .detail-icon {
  font-size: 20px;
}

.selected-item-info .detail-name {
  color: #f4d03f;
  font-weight: bold;
  font-size: 14px;
}

.selected-item-info .detail-count {
  color: #95a5a6;
  font-size: 13px;
}

.quick-action-btn {
  background: rgba(243, 156, 18, 0.3);
  border: 1px solid #f39c12;
  color: #f4d03f;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-action-btn:hover {
  background: rgba(243, 156, 18, 0.5);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.detail-icon {
  font-size: 40px;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.detail-info {
  flex: 1;
}

.detail-name {
  color: #f4d03f;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.detail-type {
  color: #95a5a6;
  font-size: 11px;
}

.detail-body {
  margin-bottom: 10px;
}

.detail-count {
  color: #f39c12;
  font-size: 12px;
  margin-bottom: 6px;
}

.effects-title,
.desc-title {
  color: #f39c12;
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 12px;
}

.effect-line {
  color: #ecf0f1;
  font-size: 11px;
  margin: 2px 0;
  padding: 3px 6px;
  background: rgba(243, 156, 18, 0.15);
  border-left: 2px solid #f39c12;
  border-radius: 3px;
}

.detail-description {
  color: #bdc3c7;
  font-size: 11px;
  line-height: 1.5;
  margin-top: 6px;
}

.detail-actions {
  margin-top: 8px;
}

.detail-action-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.equip-btn {
  background: linear-gradient(135deg, #d35400, #e67e22);
  color: white;
  border: 1px solid rgba(255, 200, 100, 0.3);
}

.equip-btn:hover {
  background: linear-gradient(135deg, #e67e22, #f39c12);
  transform: translateY(-1px);
}

.use-btn {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.use-btn:hover {
  background: linear-gradient(135deg, #2ecc71, #58d68d);
  transform: translateY(-1px);
}

.no-actions {
  text-align: center;
  color: #7f8c8d;
  font-size: 11px;
  padding: 8px;
}

/* ========== 背包网格 ========== */
.backpack-grid {
  display: grid;
  grid-template-columns: repeat(10, 50px);
  grid-template-rows: repeat(4, 50px);
  gap: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 200, 100, 0.2);
  border-radius: 6px;
}

.backpack-slot {
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;
}

.backpack-slot:hover {
  border-color: rgba(243, 156, 18, 0.6);
  background: rgba(74, 55, 40, 0.6);
}

.backpack-slot.has-item {
  background: rgba(74, 55, 40, 0.5);
  border-color: rgba(255, 200, 100, 0.3);
}

.backpack-slot.equippable {
  border-color: rgba(155, 89, 182, 0.5);
}

.backpack-slot.equippable:hover {
  border-color: #9b59b6;
  background: rgba(155, 89, 182, 0.2);
}

.backpack-slot.selected {
  border-color: #f39c12;
  box-shadow: 0 0 12px rgba(243, 156, 18, 0.5), inset 0 0 8px rgba(243, 156, 18, 0.2);
  background: rgba(243, 156, 18, 0.15);
}

.backpack-slot.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.backpack-slot.drag-over {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.4);
}

.backpack-slot[draggable="true"] {
  cursor: grab;
}

.backpack-slot .slot-icon {
  font-size: 26px;
  pointer-events: none;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.backpack-slot .slot-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px black;
  pointer-events: none;
}

.backpack-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  color: #bdc3c7;
  font-size: 11px;
}

.backpack-capacity {
  font-weight: bold;
  color: #f39c12;
}

.backpack-hint {
  color: #7f8c8d;
  font-size: 10px;
}
</style>