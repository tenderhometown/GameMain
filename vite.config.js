import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath,URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins:  [vue()],
  
  // 🔧 配置路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  
  // 🔧 开发服务器配置
  server: {
    port: 3000,
    open: false,
    // 配置 WASM 文件的 MIME 类型
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  
  // 🔧 优化配置
  optimizeDeps:  {
    exclude: ['@babylonjs/havok']  // 排除 Havok，避免预构建
  },
  
  // 🔧 构建配置
  build: {
    target: 'esnext',
    sourcemap: true
  },
  
  // 🔧 WASM 支持
  assetsInclude: ['**/*.wasm']
})