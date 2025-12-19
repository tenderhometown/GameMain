import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { logger } from '../utils/logger.js';

/**
 * 游戏引擎类
 * 负责初始化 Babylon.js 引擎和管理渲染循环
 */
export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas - 渲染画布
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    
    /** @type {Engine | WebGPUEngine | null} */
    this.engine = null;
    
    /** @type {boolean} */
    this.isWebGPU = false;

    // 🔧 新增：保存 resize 处理函数引用（用于移除）
    this._resizeHandler = null;
    
    // 🔧 新增：是否已销毁
    this._disposed = false;
  }

  /**
   * 初始化引擎
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('尝试初始化 WebGPU 引擎...');
      
      if (navigator.gpu) {
        const webGPUEngine = new WebGPUEngine(this.canvas, {
          antialias: true,
          stencil: true,
        });
        
        await webGPUEngine.initAsync();
        
        this.engine = webGPUEngine;
        this.isWebGPU = true;
        logger.info('✅ WebGPU 引擎初始化成功');
      } else {
        throw new Error('浏览器不支持 WebGPU');
      }
    } catch (error) {
      logger.warn('WebGPU 不可用，降级到 WebGL', error.message);
      this.engine = new Engine(this.canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });
      this.isWebGPU = false;
      logger.info('✅ WebGL 引擎初始化成功');
    }

    // 🔧 修复：保存 resize 处理函数引用
    this._resizeHandler = () => {
      // 🔧 添加检查：确保引擎存在且未销毁
      if (this.engine && !this._disposed) {
        this.engine.resize();
      }
    };
    window.addEventListener('resize', this._resizeHandler);

    this.updateEngineTypeDisplay();
  }

  /**
   * 开始渲染循环
   * @param {import('@babylonjs/core/scene').Scene} scene - 要渲染的场景
   */
  startRenderLoop(scene) {
    if (!this.engine) {
      logger.error('引擎未初始化，无法启动渲染循环');
      return;
    }

    logger.info('启动渲染循环...');
    
    this.engine.runRenderLoop(() => {
      // 🔧 添加检查：确保未销毁
      if (!this._disposed && scene) {
        scene.render();
        this.updateFPS();
      }
    });
  }

  /**
   * 更新 FPS 显示
   */
  updateFPS() {
    const fpsElement = document.getElementById('fps');
    if (fpsElement && this.engine) {
      fpsElement.textContent = this.engine.getFps().toFixed(0);
    }
  }

  /**
   * 更新引擎类型显示
   */
  updateEngineTypeDisplay() {
    const engineTypeElement = document.getElementById('engineType');
    if (engineTypeElement) {
      engineTypeElement.textContent = this.isWebGPU ? 'WebGPU' : 'WebGL';
      engineTypeElement.style.color = this.isWebGPU ? '#00ff00' : '#ffaa00';
    }
  }

  /**
   * 获取引擎实例
   * @returns {Engine | WebGPUEngine | null}
   */
  getEngine() {
    return this.engine;
  }

  /**
   * 获取画布
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * 释放引擎资源
   */
  dispose() {
    logger.info('释放引擎资源...');
    
    // 🔧 标记为已销毁
    this._disposed = true;

    // 🔧 移除 resize 监听器
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    // 停止渲染循环并销毁引擎
    if (this.engine) {
      this.engine.stopRenderLoop();
      this.engine.dispose();
      this.engine = null;
    }

    this.canvas = null;
    logger.info('✅ 引擎资源已释放');
  }
}