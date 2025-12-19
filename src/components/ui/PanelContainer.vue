<template>
  <div class="panel-overlay" @click.self="onOverlayClick">
    <div :class="['panel-container', sizeClass]">
      <!-- 标题栏 -->
      <div v-if="title" class="panel-header">
        <h3 class="panel-title">{{ title }}</h3>
        <button v-if="closable" class="close-btn" @click="onClose">✕</button>
      </div>
      
      <!-- 内容区域 -->
      <div class="panel-content">
        <slot></slot>
      </div>
      
      <!-- 底部操作区 -->
      <div v-if="$slots.footer" class="panel-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ========== Props ==========
const props = defineProps({
  // 面板标题
  title: {
    type: String,
    default: ''
  },
  // 是否显示关闭按钮
  closable: {
    type: Boolean,
    default: true
  },
  // 点击遮罩是否关闭
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  // 尺寸：small, normal, large, auto
  size: {
    type: String,
    default: 'normal'
  }
})

// ========== Emits ==========
const emit = defineEmits(['close'])

// ========== 计算属性 ==========
const sizeClass = computed(() => {
  return `panel-${props.size}`
})

// ========== 方法 ==========
function onClose() {
  emit('close')
}

function onOverlayClick() {
  if (props.closeOnOverlay) {
    emit('close')
  }
}
</script>

<style scoped>
.panel-overlay {
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
}

.panel-container {
  background: linear-gradient(135deg, #4a3728 0%, #2d1f15 100%);
  border-radius: 12px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 200, 100, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 尺寸变体 */
.panel-small {
  min-width: 300px;
  max-width: 400px;
}

.panel-normal {
  min-width: 400px;
  max-width: 600px;
}

.panel-large {
  min-width: 600px;
  max-width: 900px;
}

.panel-auto {
  min-width: auto;
  max-width: 90vw;
}

/* 标题栏 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #f4d03f;
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

/* 内容区域 */
.panel-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

/* 底部区域 */
.panel-footer {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 200, 100, 0.1);
}
</style>
