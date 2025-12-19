import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { logger } from '../utils/logger.js';

/**
 * 敌人基类（测试靶子）
 * 可被攻击，有HP，死亡后掉落物品
 */
export class Enemy {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - 场景
   * @param {Object} config - 配置
   */
  constructor(scene, config = {}) {
    this.scene = scene;
    this.physicsSystem = config.physicsSystem || null;  // 🔧 物理系统引用

    // 基础属性
    this.name = config.name || '敌人';
    this.maxHp = config.maxHp || 50;
    this.currentHp = this.maxHp;
    this.defense = config.defense || 0;

    // 掉落物
    this.drops = config.drops || {};

    // 网格
    this.mesh = null;
    this.material = null;
    this.physicsAggregate = null;  // 🔧 物理碰撞体

    // 状态
    this.isDead = false;
    this._disposed = false;

    // 受击反馈
    this.hitFlashTimer = 0;
    this.originalColor = config.color || new Color3(0.8, 0.2, 0.2);

    // 延迟销毁 timeout 引用
    this._deathTimeout = null;

    // 🔧 AI 系统
    this.hasAI = config.hasAI !== undefined ? config.hasAI : false;  // 是否启用AI
    this.aiState = 'PATROL';  // AI状态: PATROL | IDLE | CHASE | ATTACK
    this.target = null;       // 追击目标（玩家）
    this.patrolPoint = null;  // 当前巡逻目标点
    this.patrolCenter = null; // 巡逻中心点
    this.patrolRadius = config.patrolRadius || 15.0;  // 巡逻半径
    this.idleTimer = 0;       // 待机计时器
    this.attackCooldown = 0;  // 攻击冷却

    // 🔧 AI 参数
    this.detectionRange = config.detectionRange || 10.0;  // 检测范围
    this.attackRange = config.attackRange || 1.5;         // 攻击范围
    this.chaseRange = config.chaseRange || 20.0;          // 追击放弃范围
    this.moveSpeed = config.moveSpeed || 3.0;             // 移动速度
    this.patrolSpeed = config.patrolSpeed || 1.5;         // 巡逻速度
    this.attackDamage = config.attackDamage || 10;        // 攻击伤害
    this.attackCooldownTime = config.attackCooldownTime || 1.5;  // 攻击冷却时间

    // 回调
    this.onDeath = config.onDeath || null;
    this.onDamaged = config.onDamaged || null;
  }

  /**
   * 创建敌人
   * @param {Vector3} position - 位置
   */
  create(position) {
    // 创建网格（简单的盒子作为测试靶子）
    this.mesh = MeshBuilder.CreateBox(
      `enemy_${this.name}_${Date.now()}`,
      { width:1, height:2, depth:1 },
      this.scene
    );

    this.mesh.position = position.clone();

    // 🔧 保存巡逻中心点（生成位置）
    this.patrolCenter = position.clone();

    // 创建材质
    this.material = new StandardMaterial(`${this.mesh.name}_mat`, this.scene);
    this.material.diffuseColor = this.originalColor.clone();
    this.mesh.material = this.material;

    // 设置为可拾取
    this.mesh.isPickable = true;

    // 存储元数据
    this.mesh.metadata = {
      type:'enemy',
      attackable:true,
      enemy:this
    };

    // 🔧 添加物理碰撞体
    if (this.physicsSystem) {
      this.physicsAggregate = this.physicsSystem.createPhysicsAggregate(
        this.mesh,
        PhysicsShapeType.BOX,
        {
          mass: 50,  // 质量
          restitution: 0,  // 弹性（0=不弹）
          friction: 0.5  // 摩擦力
        }
      );

      // 锁定旋转（防止敌人倒地）
      const body = this.physicsAggregate.body;
      body.setAngularDamping(1.0);  // 角度阻尼
      body.setMassProperties({
        inertia: new Vector3(0, 0, 0)  // 零惯性=不会旋转
      });

      logger.debug(`${this.name} 物理碰撞体已创建`);
    } else {
      logger.warn(`${this.name} 未传入 physicsSystem，无物理碰撞`);
    }

    logger.info(`✅ 敌人创建:${this.name}`, { position:position.asArray() });
  }

  /**
   * 更新敌人（每帧调用）
   * @param {number} deltaTime - 帧时间
   * @param {import('./Player.js').Player} player - 玩家引用（AI需要）
   */
  update(deltaTime, player = null) {
    if (this.isDead) return;

    // 受击闪烁效果
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime;

      if (this.hitFlashTimer <= 0) {
        // 恢复原色
        this.material.diffuseColor = this.originalColor.clone();
      }
    }

    // 🔧 AI 更新
    if (this.hasAI && player && !player.isDead) {
      this.updateAI(deltaTime, player);
    }
  }

  /**
   * 🔧 更新 AI 逻辑
   * @param {number} deltaTime - 帧时间
   * @param {import('./Player.js').Player} player - 玩家
   */
  updateAI(deltaTime, player) {
    // 更新攻击冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    switch (this.aiState) {
      case 'PATROL':
        this.updatePatrol(deltaTime);
        this.checkPlayerDetection(player);
        break;
      case 'IDLE':
        this.updateIdle(deltaTime);
        this.checkPlayerDetection(player);
        break;
      case 'CHASE':
        this.updateChase(deltaTime, player);
        break;
      case 'ATTACK':
        this.updateAttack(deltaTime, player);
        break;
    }
  }

  /**
   * 受到伤害
   * @param {number} damage - 伤害值
   * @param {string} source - 伤害来源
   * @returns {{actualDamage:number, isDead:boolean}}
   */
  takeDamage(damage, source = 'unknown') {
    if (this.isDead) {
      return { actualDamage:0, isDead:true };
    }

    // 计算实际伤害
    const actualDamage = Math.max(1, damage - this.defense);
    this.currentHp = Math.max(0, this.currentHp - actualDamage);

    logger.info(`💥 ${this.name} 受到伤害:${actualDamage}`, {
      remainingHp:this.currentHp,
      source
    });

    // 受击闪烁
    this.hitFlashTimer = 0.15;
    this.material.diffuseColor = new Color3(1, 1, 1);

    // 触发伤害事件
    document.dispatchEvent(new CustomEvent('enemyDamaged', {
      detail:{
        enemy:this,
        damage:actualDamage,
        currentHp:this.currentHp,
        maxHp:this.maxHp,
        position:this.mesh.position.clone(),
        isDead:this.currentHp <= 0
      }
    }));

    // 回调
    if (this.onDamaged) {
      this.onDamaged(actualDamage, this.currentHp);
    }

    // 检查死亡
    if (this.currentHp <= 0) {
      this.die();
      return { actualDamage, isDead:true };
    }

    return { actualDamage, isDead:false };
  }

  /**
   * 应用击退
   * @param {Vector3} direction - 击退方向
   * @param {number} force - 击退力度
   */
  applyKnockback(direction, force) {
    if (this.isDead || ! this.mesh) return;

    // 简单的位置偏移（后续可以改成物理）
    const knockback = direction.scale(force * 0.5);
    knockback.y = 0;
    this.mesh.position.addInPlace(knockback);

    logger.debug(`${this.name} 被击退`, { force });
  }

  /**
   * 死亡处理
   */
  die() {
    if (this.isDead) return;

    this.isDead = true;
    logger.info(`☠️ ${this.name} 死亡！`);

    // 触发死亡事件
    document.dispatchEvent(new CustomEvent('enemyDied', {
      detail:{
        enemy:this,
        drops:this.drops,
        position:this.mesh.position.clone()
      }
    }));

    // 回调
    if (this.onDeath) {
      this.onDeath(this.drops);
    }

    // 延迟销毁（给死亡动画时间）
    this._deathTimeout = setTimeout(() => {
      this.dispose();
    }, 500);
  }

  /**
   * 获取HP百分比
   * @returns {number}
   */
  getHpPercent() {
    return (this.currentHp / this.maxHp) * 100;
  }

  /**
   * 获取位置
   * @returns {Vector3}
   */
  getPosition() {
    return this.mesh ?  this.mesh.position :Vector3.Zero();
  }

  // ==================== AI 逻辑方法 ====================

  /**
   * 🔧 巡逻状态更新
   * @param {number} deltaTime
   */
  updatePatrol(deltaTime) {
    // 如果没有巡逻点，生成一个
    if (!this.patrolPoint) {
      this.generatePatrolPoint();
    }

    // 朝巡逻点移动
    this.moveTowards(this.patrolPoint, this.patrolSpeed, deltaTime);

    // 检查是否到达巡逻点
    const distance = Vector3.Distance(this.mesh.position, this.patrolPoint);
    if (distance < 0.5) {
      // 切换到待机状态
      this.aiState = 'IDLE';
      this.idleTimer = 2 + Math.random() * 3;  // 2-5秒
      this.patrolPoint = null;
      logger.debug(`${this.name} 到达巡逻点，开始待机`);
    }
  }

  /**
   * 🔧 待机状态更新
   * @param {number} deltaTime
   */
  updateIdle(deltaTime) {
    this.idleTimer -= deltaTime;
    
    if (this.idleTimer <= 0) {
      // 切换回巡逻状态
      this.aiState = 'PATROL';
      logger.debug(`${this.name} 待机结束，继续巡逻`);
    }
  }

  /**
   * 🔧 追击状态更新
   * @param {number} deltaTime
   * @param {import('./Player.js').Player} player
   */
  updateChase(deltaTime, player) {
    const playerPos = player.mesh.position;
    const distance = Vector3.Distance(this.mesh.position, playerPos);

    // 检查是否超出追击范围
    if (distance > this.chaseRange) {
      logger.info(`${this.name} 放弃追击，距离过远`);
      this.aiState = 'PATROL';
      this.target = null;
      return;
    }

    // 检查是否进入攻击范围
    if (distance <= this.attackRange) {
      this.aiState = 'ATTACK';
      logger.info(`${this.name} 进入攻击范围`);
      return;
    }

    // 追击玩家
    this.moveTowards(playerPos, this.moveSpeed, deltaTime);
  }

  /**
   * 🔧 攻击状态更新
   * @param {number} deltaTime
   * @param {import('./Player.js').Player} player
   */
  updateAttack(deltaTime, player) {
    const playerPos = player.mesh.position;
    const distance = Vector3.Distance(this.mesh.position, playerPos);

    // 玩家逃出攻击范围，继续追击
    if (distance > this.attackRange * 1.2) {
      this.aiState = 'CHASE';
      logger.debug(`${this.name} 玩家逃离，继续追击`);
      return;
    }

    // 攻击冷却中
    if (this.attackCooldown > 0) {
      return;
    }

    // 执行攻击
    this.performAttack(player);
  }

  /**
   * 🔧 检测玩家
   * @param {import('./Player.js').Player} player
   */
  checkPlayerDetection(player) {
    const playerPos = player.mesh.position;
    const distance = Vector3.Distance(this.mesh.position, playerPos);

    if (distance <= this.detectionRange) {
      // 发现玩家，切换到追击状态
      this.aiState = 'CHASE';
      this.target = player;
      logger.info(`${this.name} 发现玩家，开始追击！`);
    }
  }

  /**
   * 🔧 生成随机巡逻点
   */
  generatePatrolPoint() {
    // 在巡逻中心附近生成随机点
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.patrolRadius;
    
    this.patrolPoint = new Vector3(
      this.patrolCenter.x + Math.cos(angle) * radius,
      this.patrolCenter.y,
      this.patrolCenter.z + Math.sin(angle) * radius
    );

    logger.debug(`${this.name} 生成新巡逻点`, { point: this.patrolPoint.asArray() });
  }

  /**
   * 🔧 朝目标点移动
   * @param {Vector3} targetPos - 目标位置
   * @param {number} speed - 移动速度
   * @param {number} deltaTime - 帧时间
   */
  moveTowards(targetPos, speed, deltaTime) {
    if (!this.mesh) return;

    const currentPos = this.mesh.position;
    const direction = targetPos.subtract(currentPos);
    direction.y = 0;  // 只在水平面移动

    const distance = direction.length();
    if (distance < 0.1) return;

    // 归一化方向
    direction.normalize();

    // 🔧 使用物理引擎移动（如果有物理体）
    if (this.physicsAggregate) {
      const body = this.physicsAggregate.body;
      
      // 设置线性速度（水平移动）
      const velocity = direction.scale(speed);
      velocity.y = body.getLinearVelocity().y;  // 保持垂直速度（重力）
      body.setLinearVelocity(velocity);
      
      // 面向移动方向
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    } else {
      // 没有物理体，使用直接位置移动
      const movement = direction.scale(speed * deltaTime);
      
      if (movement.length() > distance) {
        this.mesh.position.copyFrom(targetPos);
      } else {
        this.mesh.position.addInPlace(movement);
      }
      
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  /**
   * 🔧 执行攻击
   * @param {import('./Player.js').Player} player
   */
  performAttack(player) {
    logger.info(`${this.name} 攻击玩家！`);

    // 造成伤害
    player.takeDamage(this.attackDamage, this.name);

    // 设置攻击冷却
    this.attackCooldown = this.attackCooldownTime;

    // 播放攻击动画（TODO）
  }

  /**
   * 销毁敌人
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    // 清理延迟销毁 timeout
    if (this._deathTimeout) {
      clearTimeout(this._deathTimeout);
      this._deathTimeout = null;
    }

    // 🔧 清理物理碰撞体
    if (this.physicsAggregate) {
      this.physicsAggregate.dispose();
      this.physicsAggregate = null;
    }

    if (this.material) {
      this.material.dispose();
    }
    if (this.mesh) {
      this.mesh.dispose();
    }
    logger.debug(`${this.name} 已销毁`);
  }
}

/**
 * 创建测试用假人
 * @param {import('@babylonjs/core/scene').Scene} scene - 场景
 * @param {Vector3} position - 位置
 * @param {import('../systems/PhysicsSystem').PhysicsSystem} physicsSystem - 物理系统
 * @returns {Enemy}
 */
export function createTestDummy(scene, position, physicsSystem) {
  const dummy = new Enemy(scene, {
    name:'测试假人',
    maxHp:100,
    defense:0,
    hasAI:false,  // 假人没有AI
    color:new Color3(0.9, 0.6, 0.2),
    drops:{
      wood:2,
      stone:1
    },
    physicsSystem:physicsSystem
  });

  dummy.create(position);
  return dummy;
}

/**
 * 🔧 创建野猪
 * @param {import('@babylonjs/core/scene').Scene} scene - 场景
 * @param {Vector3} position - 位置
 * @param {import('../systems/PhysicsSystem').PhysicsSystem} physicsSystem - 物理系统
 * @returns {Enemy}
 */
export function createWildBoar(scene, position, physicsSystem) {
  const boar = new Enemy(scene, {
    name:'野猪',
    maxHp:50,
    defense:2,
    hasAI:true,  // 启用AI
    color:new Color3(0.4, 0.25, 0.15),  // 棕色
    physicsSystem:physicsSystem,
    
    // AI参数
    detectionRange:10.0,
    attackRange:1.5,
    chaseRange:20.0,
    moveSpeed:3.0,
    patrolSpeed:1.5,
    patrolRadius:15.0,
    attackDamage:10,
    attackCooldownTime:1.5,
    
    // 掉落物
    drops:{
      raw_meat:2,
      leather:1
    }
  });

  boar.create(position);
  return boar;
}

/**
 * 🌙 创建游荡者（夜行生物）
 * 只在夜晚出现，黎明时消失
 * @param {import('@babylonjs/core/scene').Scene} scene - 场景
 * @param {Vector3} position - 位置
 * @param {import('../systems/PhysicsSystem').PhysicsSystem} physicsSystem - 物理系统
 * @returns {Enemy}
 */
export function createWanderer(scene, position, physicsSystem) {
  const wanderer = new Enemy(scene, {
    name:'游荡者',
    maxHp:45,
    defense:3,
    hasAI:true,
    color:new Color3(0.2, 0.15, 0.3),  // 深紫色
    physicsSystem:physicsSystem,
    
    // AI参数 - 游荡者更有攻击性
    detectionRange:15.0,
    attackRange:1.8,
    chaseRange:25.0,
    moveSpeed:4.0,        // 比野猪快
    patrolSpeed:2.0,
    patrolRadius:25.0,    // 更大巡逻范围
    attackDamage:15,      // 更高伤害
    attackCooldownTime:1.2,
    
    // 掉落物
    drops:{
      fiber:3,
      stone:2
    }
  });

  wanderer.create(position);
  
  // 标记为夜行生物
  wanderer.isNightCreature = true;
  
  return wanderer;
}

/**
 * 🐺 创建森林狼（夜晚增强版敌人）
 * @param {import('@babylonjs/core/scene').Scene} scene - 场景
 * @param {Vector3} position - 位置
 * @param {import('../systems/PhysicsSystem').PhysicsSystem} physicsSystem - 物理系统
 * @returns {Enemy}
 */
export function createWolf(scene, position, physicsSystem) {
  const wolf = new Enemy(scene, {
    name:'森林狼',
    maxHp:40,
    defense:1,
    hasAI:true,
    color:new Color3(0.5, 0.5, 0.55),  // 灰色
    physicsSystem:physicsSystem,
    
    // AI参数 - 狼更敏捷
    detectionRange:12.0,
    attackRange:1.5,
    chaseRange:30.0,      // 追击距离远
    moveSpeed:5.0,        // 非常快
    patrolSpeed:2.5,
    patrolRadius:20.0,
    attackDamage:12,
    attackCooldownTime:1.0,  // 攻击快
    
    // 掉落物
    drops:{
      raw_meat:1,
      leather:2
    }
  });

  wolf.create(position);
  return wolf;
}