<template>
  <div class="damage-number-container">
    <TransitionGroup name="damage">
      <div
        v-for="number in damageNumbers"
        :key="number.id"
        class="damage-number"
        :class="{ critical:number.isCritical }"
        :style="{
          left:number.screenX + 'px',
          top:number.screenY + 'px',
        }"
      >
        {{ number.isCritical ? '💥 ' :'' }}{{ number.damage }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Vector3 } from '@babylonjs/core/Maths/math'

// ========== Props ==========
const props = defineProps({
  scene:{
    type:Object,
    default:null
  },
  camera:{
    type:Object,
    default:null
  },
  engine:{
    type:Object,
    default:null
  }
})

// ========== 响应式数据 ==========
const damageNumbers = ref([])
let nextId = 0

/**
 * 添加伤害数字
 * @param {number} damage - 伤害值
 * @param {Vector3} worldPosition - 世界坐标位置
 * @param {boolean} isCritical - 是否暴击
 */
function addDamageNumber(damage, worldPosition, isCritical = false) {
  // 将世界坐标转换为屏幕坐标
  const screenPos = worldToScreen(worldPosition)
  
  if (! screenPos) return

  // 添加随机偏移，避免重叠
  const offsetX = (Math.random() - 0.5) * 40
  const offsetY = (Math.random() - 0.5) * 20

  const id = nextId++
  
  damageNumbers.value.push({
    id,
    damage:Math.floor(damage),
    screenX:screenPos.x + offsetX,
    screenY:screenPos.y + offsetY,
    isCritical,
  })

  // 1秒后移除
  setTimeout(() => {
    const index = damageNumbers.value.findIndex(n => n.id === id)
    if (index > -1) {
      damageNumbers.value.splice(index, 1)
    }
  }, 1000)
}

/**
 * 世界坐标转屏幕坐标
 */
function worldToScreen(worldPos) {
  if (!props.scene || !props.engine) return null

  const camera = props.scene.activeCamera
  if (!camera) return null

  const engine = props.engine
  const canvas = engine.getRenderingCanvas()

  // 使用 Babylon.js 的投影方法
  const projectedPos = Vector3.Project(
    worldPos,
    props.scene.getTransformMatrix(),
    camera.getViewMatrix().multiply(camera.getProjectionMatrix()),
    camera.viewport.toGlobal(canvas.width, canvas.height)
  )

  // 检查是否在屏幕内
  if (projectedPos.z < 0 || projectedPos.z > 1) {
    return null
  }

  return {
    x:projectedPos.x,
    y:projectedPos.y
  }
}

// ========== 暴露方法给父组件 ==========
defineExpose({
  addDamageNumber
})

// ========== 监听事件 ==========
function onEnemyDamaged(e) {
  const { damage, position, isDead } = e.detail
  addDamageNumber(damage, position, isDead)
}

onMounted(() => {
  document.addEventListener('enemyDamaged', onEnemyDamaged)
})

onUnmounted(() => {
  document.removeEventListener('enemyDamaged', onEnemyDamaged)
})
</script>

<style scoped>
.damage-number-container {
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  pointer-events:none;
  z-index:1500;
  overflow:hidden;
}

.damage-number {
  position:absolute;
  font-size:24px;
  font-weight:bold;
  color:#ff4444;
  text-shadow:
    2px 2px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    0 0 10px rgba(255, 0, 0, 0.5);
  transform:translate(-50%, -50%);
  animation:damageFloat 1s ease-out forwards;
  white-space:nowrap;
}

.damage-number.critical {
  font-size:32px;
  color:#ffcc00;
  text-shadow:
    2px 2px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    0 0 15px rgba(255, 200, 0, 0.8);
}

@keyframes damageFloat {
  0% {
    opacity:1;
    transform:translate(-50%, -50%) scale(0.5);
  }
  20% {
    transform:translate(-50%, -50%) scale(1.2);
  }
  40% {
    transform:translate(-50%, -70%) scale(1);
  }
  100% {
    opacity:0;
    transform:translate(-50%, -150%) scale(0.8);
  }
}

/* 过渡动画 */
.damage-enter-active {
  animation:damageFloat 1s ease-out forwards;
}

.damage-leave-active {
  transition:opacity 0.2s;
}

.damage-leave-to {
  opacity:0;
}
</style>