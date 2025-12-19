import { Vector3 } from '@babylonjs/core/Maths/math';
import { Ray } from '@babylonjs/core/Culling/ray';
import { logger } from '../utils/logger.js';
import { getAttackConfig, getItemEffects, BARE_HAND_ATTACK } from '../data/RecipeData.js';

/**
 * 战斗系统
 * 负责攻击检测、伤害计算、击退效果
 */
export class CombatSystem {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   */
  constructor(scene) {
    this.scene = scene;

    // 攻击冷却计时器
    this.attackCooldownTimer = 0;

    // 当前攻击冷却时间
    this.currentCooldown = 0;

    // 已注册的可攻击目标
    this.attackableTargets = new Map();

    logger.info('✅ 战斗系统初始化完成');
  }

  /**
   * 更新战斗系统（每帧调用）
   * @param {number} deltaTime - 帧时间
   */
  update(deltaTime) {
    // 更新攻击冷却
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= deltaTime;
    }
  }

  /**
   * 注册可攻击目标
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 目标网格
   * @param {Object} target - 目标实例（需要有 takeDamage 方法）
   */
  registerTarget(mesh, target) {
    this.attackableTargets.set(mesh, target);
    mesh.metadata = mesh.metadata || {};
    mesh.metadata.attackable = true;
    logger.debug(`注册攻击目标: ${mesh.name}`);
  }

  /**
   * 注销可攻击目标
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 目标网格
   */
  unregisterTarget(mesh) {
    this.attackableTargets.delete(mesh);
    if (mesh.metadata) {
      mesh.metadata.attackable = false;
    }
    logger.debug(`注销攻击目标:${mesh.name}`);
  }

  /**
   * 检查是否可以攻击
   * @returns {boolean}
   */
  canAttack() {
    return this.attackCooldownTimer <= 0;
  }

  /**
   * 执行攻击
   * @param {import('../entities/Player.js').Player} player - 玩家
   * @param {import('./EquipmentSystem.js').EquipmentSystem} equipmentSystem - 装备系统
   * @returns {Object} 攻击结果
   */
  attack(player, equipmentSystem) {
    // 1.获取当前手持武器和攻击配置（从快捷栏）
    const weaponId = equipmentSystem.getCurrentHandItemId();
    const attackConfig = weaponId ? getAttackConfig(weaponId) :BARE_HAND_ATTACK;

    // 2.检查冷却
    if (! this.canAttack()) {
      return { success:false, reason:'cooldown', targets:[] };
    }

    // 3.设置冷却
    this.attackCooldownTimer = attackConfig.attackCooldown;
    this.currentCooldown = attackConfig.attackCooldown;

    // 4.获取玩家攻击力
    const baseDamage = player.getTotalAttack();

    // 5.根据检测形状执行检测
    let hitTargets = [];

    switch (attackConfig.detectShape) {
      case 'sector':
        hitTargets = this.detectSector(player, attackConfig);
        break;
      case 'ray':
        hitTargets = this.detectRay(player, attackConfig);
        break;
      case 'circle':
        hitTargets = this.detectCircle(player, attackConfig);
        break;
      default:
        hitTargets = this.detectSector(player, attackConfig);
    }

    // 6.如果没有命中目标
    if (hitTargets.length === 0) {
      logger.debug('攻击未命中任何目标');
      return {
        success:true,
        hit:false,
        reason:'miss',
        targets:[],
        weaponId,
        attackConfig
      };
    }

    // 7.对命中的目标造成伤害
    const damageResults = [];

    for (let i = 0; i < hitTargets.length; i++) {
      const { mesh, distance } = hitTargets[i];
      const target = this.attackableTargets.get(mesh);

      if (!target || typeof target.takeDamage !== 'function') {
        continue;
      }

      // 计算伤害（穿透衰减）
      let damage = baseDamage;
      if (attackConfig.detectShape === 'ray' && attackConfig.penetrationDamageDecay > 0) {
        damage = baseDamage * Math.pow(1 - attackConfig.penetrationDamageDecay, i);
      }
      damage = Math.floor(damage);

      // 造成伤害
      const result = target.takeDamage(damage, 'player');

      // 应用击退
      if (attackConfig.knockback > 0 && target.applyKnockback) {
        const knockbackDir = mesh.position.subtract(player.getPosition()).normalize();
        target.applyKnockback(knockbackDir, attackConfig.knockback);
      }

      damageResults.push({
        mesh,
        target,
        damage,
        distance,
        killed:result.isDead || false,
        position:mesh.position.clone()
      });

      logger.debug(`命中目标:${mesh.name}, 伤害:${damage}`);
    }

    // 8.返回攻击结果
    return {
      success: true,
      hit:true,
      targets:damageResults,
      weaponId,
      attackConfig
    };
  }

  /**
   * 扇形范围检测
   * @param {import('../entities/Player.js').Player} player - 玩家
   * @param {Object} config - 攻击配置
   * @returns {Array} 命中的目标
   */
  detectSector(player, config) {
    const playerPos = player.getPosition();
    const playerForward = player.getForwardDirection();
    playerForward.y = 0;
    playerForward.normalize();

    const hitTargets = [];
    const halfAngle = (config.attackAngle / 2) * (Math.PI / 180);

    // 遍历所有可攻击目标
    for (const [mesh, target] of this.attackableTargets) {
      if (! mesh.isEnabled() || !mesh.isVisible) continue;

      const targetPos = mesh.position;
      const toTarget = targetPos.subtract(playerPos);
      toTarget.y = 0;

      const distance = toTarget.length();

      // 检查距离
      if (distance > config.attackRange) continue;

      // 检查角度
      const dirToTarget = toTarget.normalize();
      const dot = Vector3.Dot(playerForward, dirToTarget);
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)));

      if (angle <= halfAngle) {
        hitTargets.push({ mesh, distance, angle });
      }
    }

    // 按距离排序
    hitTargets.sort((a, b) => a.distance - b.distance);

    // 限制目标数量
    if (config.maxTargets > 0 && hitTargets.length > config.maxTargets) {
      hitTargets.length = config.maxTargets;
    }

    return hitTargets;
  }

  /**
   * 射线检测（穿透）
   * @param {import('../entities/Player.js').Player} player - 玩家
   * @param {Object} config - 攻击配置
   * @returns {Array} 命中的目标
   */
  detectRay(player, config) {
    const eyePos = player.getEyePosition();
    const forward = player.getForwardDirection();

    const hitTargets = [];
    const ray = new Ray(eyePos, forward, config.attackRange);

    // 收集射线路径上的所有目标
    for (const [mesh, target] of this.attackableTargets) {
      if (!mesh.isEnabled() || !mesh.isVisible) continue;

      // 使用包围盒检测
      const pickInfo = ray.intersectsMesh(mesh);

      if (pickInfo.hit) {
        hitTargets.push({
          mesh,
          distance: pickInfo.distance,
          point:pickInfo.pickedPoint
        });
      }
    }

    // 按距离排序
    hitTargets.sort((a, b) => a.distance - b.distance);

    // 限制穿透数量
    if (config.penetration > 0 && hitTargets.length > config.penetration) {
      hitTargets.length = config.penetration;
    }

    return hitTargets;
  }

  /**
   * 圆形范围检测
   * @param {import('../entities/Player.js').Player} player - 玩家
   * @param {Object} config - 攻击配置
   * @returns {Array} 命中的目标
   */
  detectCircle(player, config) {
    const playerPos = player.getPosition();
    const hitTargets = [];

    // 遍历所有可攻击目标
    for (const [mesh, target] of this.attackableTargets) {
      if (!mesh.isEnabled() || !mesh.isVisible) continue;

      const targetPos = mesh.position;
      const distance = Vector3.Distance(playerPos, targetPos);

      // 检查距离
      if (distance <= config.attackRange) {
        hitTargets.push({ mesh, distance });
      }
    }

    // 按距离排序
    hitTargets.sort((a, b) => a.distance - b.distance);

    // 限制目标数量
    if (config.maxTargets > 0 && hitTargets.length > config.maxTargets) {
      hitTargets.length = config.maxTargets;
    }

    return hitTargets;
  }

  /**
   * 获取攻击冷却进度
   * @returns {number} 0-1，1表示冷却完成
   */
  getCooldownProgress() {
    if (this.currentCooldown <= 0) return 1;
    return 1 - (this.attackCooldownTimer / this.currentCooldown);
  }

  /**
   * 销毁战斗系统
   */
  dispose() {
    this.attackableTargets.clear();
    logger.info('战斗系统已销毁');
  }
}