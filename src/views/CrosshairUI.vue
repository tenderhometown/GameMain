<template>
  <div class="crosshair"></div>
</template>

<script setup>
// 准星UI组件 - 始终显示在屏幕中央
</script>

<style scoped>
.crosshair {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  pointer-events: none;
  z-index: 3000;
}

.crosshair::before,
.crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.crosshair::before {
  top: 50%;
  left: 50%;
  width: 2px;
  height: 12px;
  transform: translate(-50%, -50%);
}

.crosshair::after {
  top: 50%;
  left: 50%;
  width: 12px;
  height: 2px;
  transform: translate(-50%, -50%);
}
</style>
