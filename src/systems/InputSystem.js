import { logger } from '../utils/logger.js';

/**
 * 输入系统类
 * 负责监听和管理键盘、鼠标输入
 */
export class InputSystem {
  constructor() {
    /** @type {Map<string, boolean>} 存储按键状态 */
    this.keys = new Map();
    
    /** @type {boolean} 鼠标右键是否按下 */
    this.isRightMouseDown = false;
  
    /** @type {boolean} 鼠标左键是否按下 */
    this.isLeftMouseDown = false;
    
    /** @type {number} 鼠标X轴移动量 */
    this.mouseDeltaX = 0;
    
    /** @type {number} 鼠标Y轴移动量 */
    this.mouseDeltaY = 0;
    
    /** @type {boolean} 是否已初始化 */
    this.isInitialized = false;
    
    /** @type {HTMLCanvasElement | null} 画布引用 */
    this.canvas = null;
    
    /** @type {boolean} 指针是否锁定 */
    this.isPointerLocked = false;

    // 🔧 新增：保存事件处理函数引用（用于移除）
    this._keydownHandler = null;
    this._keyupHandler = null;
    this._mousedownHandler = null;
    this._mouseupHandler = null;
    this._clickHandler = null;
    this._pointerlockchangeHandler = null;
    this._mousemoveHandler = null;
    this._contextmenuHandler = null;
  }

  /**
   * 初始化输入系统
   * @param {HTMLCanvasElement} canvas - 游戏画布
   */
  initialize(canvas) {
    // 🔧 修复：如果已初始化，先清理再重新初始化
    if (this.isInitialized) {
      logger.warn('输入系统重新初始化...');
      this.dispose();
    }

    this.canvas = canvas;

    // 🔧 创建并保存事件处理函数
    this._keydownHandler = (event) => {
      this.keys.set(event.code, true);
      
      if (event.code === 'Escape') {
        this.unlockPointer();
      }

      if (event.code === 'Tab') {
        event.preventDefault();
      }
    };

    this._keyupHandler = (event) => {
      this.keys.set(event.code, false);
    };

    this._mousedownHandler = (event) => {
      if (event.button === 0) {
        this.isLeftMouseDown = true;
      }
      if (event.button === 2) {
        this.isRightMouseDown = true;
      }
    };

    this._mouseupHandler = (event) => {
      if (event.button === 0) {
        this.isLeftMouseDown = false;
      }
      if (event.button === 2) {
        this.isRightMouseDown = false;
      }
    };

    this._clickHandler = () => {
      this.lockPointer();
    };

    this._pointerlockchangeHandler = () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      
      if (this.isPointerLocked) {
        logger.info('✅ 鼠标已锁定');
      } else {
        logger.info('🔓 鼠标已解锁');
      }
    };

    this._mousemoveHandler = (event) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX = event.movementX;
        this.mouseDeltaY = event.movementY;
      } else {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
      }
    };

    this._contextmenuHandler = (event) => {
      event.preventDefault();
    };

    // 🔧 添加事件监听器
    window.addEventListener('keydown', this._keydownHandler);
    window.addEventListener('keyup', this._keyupHandler);
    canvas.addEventListener('mousedown', this._mousedownHandler);
    canvas.addEventListener('mouseup', this._mouseupHandler);
    canvas.addEventListener('click', this._clickHandler);
    document.addEventListener('pointerlockchange', this._pointerlockchangeHandler);
    document.addEventListener('mousemove', this._mousemoveHandler);
    canvas.addEventListener('contextmenu', this._contextmenuHandler);

    this.isInitialized = true;
    logger.info('✅ 输入系统初始化成功');
  }

  /**
   * 锁定指针
   */
  lockPointer() {
    // 🔧 修复：添加 canvas 存在性和 DOM 检查
    if (this.canvas && 
        ! this.isPointerLocked && 
        document.body.contains(this.canvas)) {
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
   * @returns {boolean}
   */
  isPointerLockedNow() {
    return this.isPointerLocked;
  }

  /**
   * 检查按键是否按下
   * @param {string} keyCode - 按键代码
   * @returns {boolean}
   */
  isKeyDown(keyCode) {
    return this.keys.get(keyCode) === true;
  }

  /**
   * 检查多个按键是否有任意一个按下
   * @param {string[]} keyCodes - 按键代码数组
   * @returns {boolean}
   */
  isAnyKeyDown(keyCodes) {
    return keyCodes.some(key => this.isKeyDown(key));
  }

  /**
   * 获取移动输入向量（归一化）
   * @returns {{ x: number, z: number }}
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
   * @returns {boolean}
   */
  isJumpPressed() {
    return this.isKeyDown('Space');
  }

  /**
   * 检查是否按下冲刺键
   * @returns {boolean}
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
   * 获取鼠标移动增量
   * @returns {{ x: number, y: number }}
   */
  getMouseDelta() {
    return {
      x: this.mouseDeltaX,
      y:  this.mouseDeltaY,
    };
  }

  /**
   * 检查是否按下交互键
   * @returns {boolean}
   */
  isInteractPressed() {
    return this.isKeyDown('KeyE');
  }

  /**
   * 检查是否按下 Tab 键
   * @returns {boolean}
   */
  isTabPressed() {
    return this.isKeyDown('Tab');
  }

  /**
   * 检查是否按下切换视角键
   * @returns {boolean}
   */
  isViewTogglePressed() {
    return this.isKeyDown('KeyV');
  }

  /**
   * 检查是否按下数字键（1-5）
   * @param {number} number
   * @returns {boolean}
   */
  isNumberKeyPressed(number) {
    if (number < 1 || number > 5) return false;
    return this.isKeyDown(`Digit${number}`);
  }

  /**
   * 获取按下的数字键（1-5）
   * @returns {number|null}
   */
  getPressedNumberKey() {
    for (let i = 1; i <= 5; i++) {
      if (this.isNumberKeyPressed(i)) {
        return i;
      }
    }
    return null;
  }

  /**
   * 检查是否按下攻击键（鼠标左键）
   * @returns {boolean}
   */
  isAttackPressed() {
    return this.isLeftMouseDown && this.isPointerLocked;
  }

  /**
   * 🔧 完整清理输入系统
   */
  dispose() {
    logger.info('清理输入系统...');

    // 解锁指针
    this.unlockPointer();

    // 🔧 移除所有事件监听器
    if (this._keydownHandler) {
      window.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }

    if (this._keyupHandler) {
      window.removeEventListener('keyup', this._keyupHandler);
      this._keyupHandler = null;
    }

    if (this.canvas) {
      if (this._mousedownHandler) {
        this.canvas.removeEventListener('mousedown', this._mousedownHandler);
        this._mousedownHandler = null;
      }

      if (this._mouseupHandler) {
        this.canvas.removeEventListener('mouseup', this._mouseupHandler);
        this._mouseupHandler = null;
      }

      if (this._clickHandler) {
        this.canvas.removeEventListener('click', this._clickHandler);
        this._clickHandler = null;
      }

      if (this._contextmenuHandler) {
        this.canvas.removeEventListener('contextmenu', this._contextmenuHandler);
        this._contextmenuHandler = null;
      }
    }

    if (this._pointerlockchangeHandler) {
      document.removeEventListener('pointerlockchange', this._pointerlockchangeHandler);
      this._pointerlockchangeHandler = null;
    }

    if (this._mousemoveHandler) {
      document.removeEventListener('mousemove', this._mousemoveHandler);
      this._mousemoveHandler = null;
    }

    // 🔧 重置状态
    this.keys.clear();
    this.isLeftMouseDown = false;
    this.isRightMouseDown = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isPointerLocked = false;
    this.canvas = null;
    this.isInitialized = false;

    logger.info('✅ 输入系统已清理');
  }
}

// 导出单例
export const inputSystem = new InputSystem();