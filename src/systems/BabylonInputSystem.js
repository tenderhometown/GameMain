import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { logger } from '../utils/logger.js';

/**
 * 输入系统
 * 键盘使用 window 原生监听（解决 Vue UI 焦点问题）
 * 鼠标使用 Babylon.js onPointerObservable（需要与 canvas 交互）
 */
export class BabylonInputSystem {
  constructor(scene, canvas) {
    /** @type {import('@babylonjs/core/scene').Scene} */
    this.scene = scene;
    
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    
    /** @type {Map<string, boolean>} 存储按键状态 */
    this.keys = new Map();
    
    /** @type {boolean} 鼠标左键是否按下 */
    this.isLeftMouseDown = false;
    
    /** @type {boolean} 鼠标右键是否按下 */
    this.isRightMouseDown = false;
    
    /** @type {number} 鼠标X轴移动量 */
    this.mouseDeltaX = 0;
    
    /** @type {number} 鼠标Y轴移动量 */
    this.mouseDeltaY = 0;
    
    /** @type {boolean} 指针是否锁定 */
    this.isPointerLocked = false;
    
    /** @type {import('@babylonjs/core/Misc/observable').Observer} */
    this._pointerObserver = null;
    
    /** @type {Function} */
    this._pointerLockChangeHandler = null;
    
    this._initialize();
  }
  
  /**
   * 初始化输入监听
   */
  _initialize() {
    // ========== 键盘监听（window 原生）==========
    // 使用 window 级别监听，解决 Vue UI 获取焦点时键盘事件丢失的问题
    
    this._keyDownHandler = (event) => {
      // 避免重复触发
      if (this.keys.get(event.code) === true) return;
      
      this.keys.set(event.code, true);
      
      // ESC 解锁指针
      if (event.code === 'Escape') {
        this.unlockPointer();
      }
      
      // 阻止 Tab 默认行为（游戏内）
      if (event.code === 'Tab' && this.isPointerLocked) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', this._keyDownHandler);
    
    this._keyUpHandler = (event) => {
      this.keys.set(event.code, false);
    };
    window.addEventListener('keyup', this._keyUpHandler);
    
    // 窗口失焦时重置所有按键（防止切换窗口时按键卡住）
    this._blurHandler = () => {
      this.resetAllKeys();
    };
    window.addEventListener('blur', this._blurHandler);
    
    // ========== 鼠标监听（Babylon.js）==========
    // 鼠标事件保留 Babylon.js 监听，因为需要与 canvas 和指针锁定交互
    
    this._pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          if (pointerInfo.event.button === 0) {
            this.isLeftMouseDown = true;
          }
          if (pointerInfo.event.button === 2) {
            this.isRightMouseDown = true;
          }
          
          // 点击画布时锁定指针
          if (!this.isPointerLocked) {
            this.lockPointer();
          }
          break;
          
        case PointerEventTypes.POINTERUP:
          if (pointerInfo.event.button === 0) {
            this.isLeftMouseDown = false;
          }
          if (pointerInfo.event.button === 2) {
            this.isRightMouseDown = false;
          }
          break;
          
        case PointerEventTypes.POINTERMOVE:
          if (this.isPointerLocked) {
            this.mouseDeltaX = pointerInfo.event.movementX || 0;
            this.mouseDeltaY = pointerInfo.event.movementY || 0;
          } else {
            this.mouseDeltaX = 0;
            this.mouseDeltaY = 0;
          }
          break;
      }
    });
    
    // ========== 指针锁定状态 ==========
    this._pointerLockChangeHandler = () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      
      if (this.isPointerLocked) {
        logger.info('✅ 鼠标已锁定');
      } else {
        logger.info('🔓 鼠标已解锁');
      }
    };
    document.addEventListener('pointerlockchange', this._pointerLockChangeHandler);
    
    // 阻止右键菜单
    this._contextMenuHandler = (e) => e.preventDefault();
    this.canvas.addEventListener('contextmenu', this._contextMenuHandler);
    
    logger.info('✅ 输入系统初始化成功');
  }
  
  /**
   * 锁定指针
   */
  lockPointer() {
    if (this.canvas && !this.isPointerLocked && document.body.contains(this.canvas)) {
      try {
        this.canvas.requestPointerLock();
      } catch (error) {
        logger.warn('无法锁定指针:', error.message);
      }
    }
  }
  
  /**
   * 解锁指针
   */
  unlockPointer() {
    if (this.isPointerLocked) {
      try {
        document.exitPointerLock();
      } catch (error) {
        logger.warn('无法解锁指针:', error.message);
      }
    }
  }
  
  /**
   * 检查指针是否锁定
   */
  isPointerLockedNow() {
    return this.isPointerLocked;
  }
  
  /**
   * 检查按键是否按下
   */
  isKeyDown(keyCode) {
    return this.keys.get(keyCode) === true;
  }
  
  /**
   * 获取移动输入向量（归一化）
   */
  getMovementInput() {
    let x = 0;
    let z = 0;

    if (this.isKeyDown('KeyW')) z += 1;
    if (this.isKeyDown('KeyS')) z -= 1;
    if (this.isKeyDown('KeyA')) x -= 1;
    if (this.isKeyDown('KeyD')) x += 1;

    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    return { x, z };
  }
  
  /**
   * 检查是否按下跳跃键
   */
  isJumpPressed() {
    return this.isKeyDown('Space');
  }
  
  /**
   * 检查是否按下冲刺键
   */
  isSprintPressed() {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
  }
  
  /**
   * 重置鼠标增量
   */
  resetMouseDelta() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
  
  /**
   * 重置所有按键状态（防止按键卡住）
   */
  resetAllKeys() {
    this.keys.clear();
    this.isLeftMouseDown = false;
    this.isRightMouseDown = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
  
  /**
   * 获取鼠标移动增量
   */
  getMouseDelta() {
    return {
      x: this.mouseDeltaX,
      y: this.mouseDeltaY,
    };
  }
  
  /**
   * 检查是否按下交互键
   */
  isInteractPressed() {
    return this.isKeyDown('KeyE');
  }
  
  /**
   * 检查是否按下 Tab 键
   */
  isTabPressed() {
    return this.isKeyDown('Tab');
  }
  
  /**
   * 检查是否按下切换视角键
   */
  isViewTogglePressed() {
    return this.isKeyDown('KeyV');
  }
  
  /**
   * 检查是否按下数字键（1-6）
   */
  isNumberKeyPressed(number) {
    if (number < 1 || number > 6) return false;
    return this.isKeyDown(`Digit${number}`);
  }
  
  /**
   * 获取按下的数字键（1-6）
   */
  getPressedNumberKey() {
    for (let i = 1; i <= 6; i++) {
      if (this.isNumberKeyPressed(i)) {
        return i;
      }
    }
    return null;
  }
  
  /**
   * 检查是否按下攻击键（鼠标左键）
   */
  isAttackPressed() {
    return this.isLeftMouseDown && this.isPointerLocked;
  }
  
  /**
   * 清理输入系统
   */
  dispose() {
    logger.info('清理输入系统...');
    
    // 解锁指针
    this.unlockPointer();
    
    // 移除 Babylon.js 鼠标观察者
    if (this._pointerObserver) {
      this.scene.onPointerObservable.remove(this._pointerObserver);
      this._pointerObserver = null;
    }
    
    // 移除 DOM 事件监听
    if (this._pointerLockChangeHandler) {
      document.removeEventListener('pointerlockchange', this._pointerLockChangeHandler);
      this._pointerLockChangeHandler = null;
    }
    
    // 移除键盘监听
    if (this._keyDownHandler) {
      window.removeEventListener('keydown', this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler) {
      window.removeEventListener('keyup', this._keyUpHandler);
      this._keyUpHandler = null;
    }
    if (this._blurHandler) {
      window.removeEventListener('blur', this._blurHandler);
      this._blurHandler = null;
    }
    
    // 移除右键菜单监听
    if (this._contextMenuHandler) {
      this.canvas.removeEventListener('contextmenu', this._contextMenuHandler);
      this._contextMenuHandler = null;
    }
    
    // 重置状态
    this.keys.clear();
    this.isLeftMouseDown = false;
    this.isRightMouseDown = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isPointerLocked = false;
    
    logger.info('✅ 输入系统已清理');
  }
}
