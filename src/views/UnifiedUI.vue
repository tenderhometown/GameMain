<template>
  <div class="unified-ui-overlay" @click.self="handleOverlayClick">
    <div class="unified-ui-container">
      <!-- 顶部标签页 -->
      <div class="unified-ui-header">
        <div 
          :class="['tab-button', { active:activeTab === 'inventory' }]"
          @click="activeTab = 'inventory'"
        >
          🎒 背包
        </div>
        <div 
          :class="['tab-button', { active: activeTab === 'crafting' }]"
          @click="activeTab = 'crafting'"
        >
          🔧 合成
        </div>
        
        <button class="close-button" @click="$emit('close')">✕</button>
      </div>
      
      <!-- 内容区域 -->
      <div class="unified-ui-content">
        <!-- 背包标签页 -->
        <InventoryUI 
          v-if="activeTab === 'inventory'"
          :inventory="inventory"
          :equipment-system="equipmentSystem"
          :player="player"
        />
        
        <!-- 合成标签页 -->
        <CraftingUI 
          v-if="activeTab === 'crafting'"
          :crafting-system="craftingSystem"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import InventoryUI from './InventoryUI.vue'
import CraftingUI from './CraftingUI.vue'

// ========== Props ==========
const props = defineProps({
  inventory:{
    type:Object,
    required: true
  },
  equipmentSystem: {
    type: Object,
    required: true
  },
  craftingSystem: {
    type: Object,
    required: true
  },
  player: {
    type: Object,
    required: true
  }
})

// ========== Emits ==========
const emit = defineEmits(['close'])

// ========== 响应式数据 ==========
const activeTab = ref('inventory')

// ========== 点击遮罩关闭 ==========
function handleOverlayClick() {
  emit('close')
}
</script>

<style scoped>
.unified-ui-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
  pointer-events: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.unified-ui-container {
  width: auto;
  min-width: 700px;
  max-width: 1000px;
  height: auto;
  max-height: 85vh;
  background: linear-gradient(135deg, #4a3728 0%, #2d1f15 100%);
  border-radius: 12px;
  box-shadow: 
    0 10px 50px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 200, 100, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
  pointer-events: auto;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 顶部标签页 ========== */
.unified-ui-header {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
  position: relative;
}

.tab-button {
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.tab-button:hover {
  background: rgba(74, 55, 40, 0.6);
  border-color: rgba(243, 156, 18, 0.5);
  color: #ecf0f1;
}

.tab-button.active {
  background: rgba(243, 156, 18, 0.2);
  border-color: #f39c12;
  color: #f4d03f;
  box-shadow: 0 0 15px rgba(243, 156, 18, 0.3);
}

.close-button {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: #bdc3c7;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(231, 76, 60, 0.6);
  color: #fff;
}

/* ========== 内容区域 ========== */
.unified-ui-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>