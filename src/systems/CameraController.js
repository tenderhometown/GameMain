import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { logger } from '../utils/logger.js';

/**
 * 相机控制器
 * 管理第一人称和第三人称相机切换
 */
export class CameraController {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @param {import('../entities/Player.js').Player} player - 玩家实体
   */
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    /** @type {import('@babylonjs/core/Cameras/universalCamera').UniversalCamera | null} */
    this.camera = null;
    
    /** @type {string} 当前模式：'first-person' | 'third-person' */
    this.mode = 'third-person';
    
    // 第一人称配置
    this.firstPersonConfig = {
      eyeOffset: new Vector3(0, 1.7, 0),
      interactionRange: 5.0,
    };
    
    // 第三人称配置
    this.thirdPersonConfig = {
      offset: new Vector3(1.5, 2.5, -6),
      lookAtOffset: new Vector3(0, 1.5, 3),
      interactionRange: 100.0,  // 🔧 射线最大长度（实际距离由逻辑判断）
    };
    
    // 相机旋转参数
    this.rotation = {
      yaw: 0,
      pitch: 0,
      sensitivity: 0.002,
      pitchLimit: Math.PI / 2.05, // 约 88 度，防止万向节死锁
    };
  }

  /**
   * 创建相机
   */
  createCamera() {
    this.camera = new UniversalCamera(
      'camera',
      new Vector3(0, 5, -10),
      this.scene
    );

    this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    
    this.camera.keysUp = [];
    this.camera.keysDown = [];
    this.camera.keysLeft = [];
    this.camera.keysRight = [];
    
    this.setMode('third-person');
    
    logger.info('相机控制器创建完成');
  }

  /**
   * 切换视角模式
   */
  toggleMode() {
    const newMode = this.mode === 'first-person' ? 'third-person' : 'first-person';
    this.setMode(newMode);
  }

  /**
   * 设置视角模式
   * @param {string} mode - 'first-person' | 'third-person'
   */
  setMode(mode) {
    const oldMode = this.mode;
    this.mode = mode;
    
    if (oldMode !== mode) {
      this.syncRotationOnModeSwitch(oldMode, mode);
    }
    
    if (mode === 'first-person') {
      logger.info('切换到第一人称');
    } else {
      logger.info('切换到第三人称');
    }
  }

  /**
   * 切换模式时同步旋转
   * @param {string} fromMode - 切换前的模式
   * @param {string} toMode - 切换后的模式
   */
  syncRotationOnModeSwitch(fromMode, toMode) {
    // 切换时需要反转旋转值（因为两种模式符号相反）
    if (fromMode === 'third-person' && toMode === 'first-person') {
      // 第三 → 第一：反转符号
      this.rotation.yaw = -this.rotation.yaw;
      this.rotation.pitch = -this.rotation.pitch;
      
      logger.debug('同步旋转：第三 → 第一（反转）', {
        yaw: this.rotation.yaw,
        pitch: this.rotation.pitch
      });
      
    } else if (fromMode === 'first-person' && toMode === 'third-person') {
      // 第一 → 第三：反转符号
      this.rotation.yaw = -this.rotation.yaw;
      this.rotation.pitch = -this.rotation.pitch;
      
      logger.debug('同步旋转：第一 → 第三（反转）', {
        yaw: this.rotation.yaw,
        pitch: this.rotation.pitch
      });
    }
  }

  /**
   * 更新相机位置（每帧调用）
   * @param {number} deltaTime - 帧时间
   * @param {import('../systems/BabylonInputSystem.js').BabylonInputSystem} inputSystem - 输入系统
   */
  update(deltaTime, inputSystem) {
    if (!this.camera || !this.player) return;

    this.updateRotation(inputSystem);

    const playerPos = this.player.getPosition();

    if (this.mode === 'first-person') {
      this.updateFirstPerson(playerPos);
    } else {
      this.updateThirdPerson(playerPos);
    }
  }

  /**
   * 更新相机旋转（鼠标控制）- 修复版
   * @param {import('../systems/BabylonInputSystem.js').BabylonInputSystem} inputSystem - 输入系统
   */
  updateRotation(inputSystem) {
    if (!inputSystem.isPointerLockedNow()) {
      return;
    }

    const mouseDelta = inputSystem.getMouseDelta();
    
    // 根据模式使用不同的符号
    if (this.mode === 'first-person') {
      // 第一人称：正号
      this.rotation.yaw += mouseDelta.x * this.rotation.sensitivity;
      this.rotation.pitch += mouseDelta.y * this.rotation.sensitivity;
    } else {
      // 第三人称：负号
      this.rotation.yaw -= mouseDelta.x * this.rotation.sensitivity;
      this.rotation.pitch -= mouseDelta.y * this.rotation.sensitivity;
    }
    
    // 限制俯仰角
    this.rotation.pitch = Math.max(
      -this.rotation.pitchLimit,
      Math.min(this.rotation.pitchLimit, this.rotation.pitch)
    );
    
    inputSystem.resetMouseDelta();
  }

  /**
   * 更新第一人称相机
   * @param {Vector3} playerPos - 玩家位置
   */
  updateFirstPerson(playerPos) {
    const config = this.firstPersonConfig;
    
    const targetPos = playerPos.add(config.eyeOffset);
    
    this.camera.position = Vector3.Lerp(
      this.camera.position,
      targetPos,
      0.2
    );
    
    // 直接赋值旋转
    this.camera.rotation.x = this.rotation.pitch;
    this.camera.rotation.y = this.rotation.yaw;
    this.camera.rotation.z = 0;
  }

  /**
   * 更新第三人称相机
   * @param {Vector3} playerPos - 玩家位置
   */
  updateThirdPerson(playerPos) {
    const config = this.thirdPersonConfig;
    
    const yawRotation = this.rotation.yaw;
    const pitchRotation = this.rotation.pitch;
    
    const distance = Math.sqrt(
      config.offset.x * config.offset.x + 
      config.offset.z * config.offset.z
    );
    
    const offsetX = Math.sin(yawRotation) * distance;
    const offsetZ = -Math.cos(yawRotation) * distance;
    const offsetY = config.offset.y - Math.sin(pitchRotation) * 2;
    
    const rotatedOffset = new Vector3(offsetX, offsetY, offsetZ);
    const targetPos = playerPos.add(rotatedOffset);
    
    this.camera.position = Vector3.Lerp(
      this.camera.position,
      targetPos,
      0.15
    );
    
    const lookTarget = playerPos.add(new Vector3(0, 1.5, 0));
    this.camera.setTarget(lookTarget);
  }

  /**
   * 获取交互射线
   * @returns {import('@babylonjs/core/Culling/ray').Ray}
   */
  getInteractionRay() {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const ray = this.scene.createPickingRay(
      centerX,
      centerY,
      null,
      this.camera
    );
    
    ray.length = 100;
    
    return ray;
  }

  /**
   * 获取当前交互距离
   * @returns {number}
   */
  getInteractionRange() {
    return this.mode === 'first-person' 
      ? this.firstPersonConfig.interactionRange
      : this.thirdPersonConfig.interactionRange;
  }

  /**
   * 获取相机实例
   * @returns {import('@babylonjs/core/Cameras/universalCamera').UniversalCamera}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * 获取当前模式
   * @returns {string}
   */
  getMode() {
    return this.mode;
  }

  /**
   * 清理相机控制器资源
   */
  dispose() {
    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }
    
    this.player = null;
    this.scene = null;
    
    logger.info('相机控制器已清理');
  }
}