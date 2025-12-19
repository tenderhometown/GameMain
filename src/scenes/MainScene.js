import { CameraController } from "../systems/CameraController.js";
import { PickingSystem } from "../systems/PickingSystem.js";
import { ResourceSystem } from "../systems/ResourceSystem.js";
import { CraftingSystem } from "../systems/CraftingSystem.js";
import { EquipmentSystem } from "../systems/EquipmentSystem.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { EnvironmentSpawner } from "../world/EnvironmentSpawner.js";
import { TerrainSystem } from "../systems/TerrainSystem.js";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { logger } from "../utils/logger.js";
import { physicsSystem } from "../systems/PhysicsSystem.js";
import { BabylonInputSystem } from "../systems/BabylonInputSystem.js";
import { Player } from "../entities/Player.js";
import {
  createTestDummy,
  createWildBoar,
  createWanderer,
  createWolf,
} from "../entities/Enemy.js";
import {
  isEdible,
  getHungerRestore,
  getItem,
  isPlaceable,
  getPlaceType,
} from "../data/RecipeData.js";
import { buffSystem } from "../systems/BuffSystem.js";
import { timeSystem, TimePeriod } from "../systems/TimeSystem.js";
import { BuildingSystem } from "../systems/BuildingSystem.js";
import { BUILDINGS } from "../data/BuildingData.js";

// ✨ 新增：重构系统
import { uiStateManager } from "../systems/UIStateManager.js";
import {
  InteractionContext,
  InteractionPriority,
} from "../systems/InteractionContext.js";
import { ActionContext } from "../systems/ActionContext.js";

/**
 * 主场景类
 * 创建游戏3D世界
 */
export class MainScene {
  constructor(engine) {
    this.scene = new Scene(engine);
    this.engine = engine;
    this.scene.clearColor = new Color4(0.5, 0.8, 1.0, 1.0);

    this.player = null;
    this.terrainSystem = null;
    this.environmentSpawner = null;
    this.pickingSystem = null;
    this.resourceSystem = null;
    this.cameraController = null;
    this.craftingSystem = null;
    this.equipmentSystem = null;
    this.combatSystem = null; // 🔧 新增
    this.inputSystem = null; // 🔧 新增 Babylon.js 输入系统

    // 🔧 新增：敌人列表
    this.enemies = [];

    // 🔧 事件监听器引用（用于清理）
    this._enemyDiedHandler = null;

    // 🔧 视角切换 timeout 引用
    this._viewToggleTimeout = null;

    // 🔧 渲染循环观察者引用
    this._renderObserver = null;

    // 🔧 新增：光源引用（用于昼夜循环）
    this.hemisphericLight = null;
    this.sunLight = null;

    // 🌙 新增：夜晚敌人系统
    this.nightEnemies = []; // 夜行生物列表（单独管理）
    this._lastPeriod = null; // 上一个时间段
    this._nightSpawnTimer = 0; // 夜间生成计时器

    // 🛏️ 新增：建筑物列表
    this.buildings = [];

    // 🏗️ 新增：建造系统
    this.buildingSystem = null;

    // 🏗️ 建造状态变量
    this._isPlacingFromHeldItem = false; // 是否从手持物品放置
    this._heldItemId = null; // 手持的建筑物品ID
    this._heldItemSlot = -1; // 手持物品的格子索引
    this._rotateCooldown = false; // 旋转冷却
    this._interactCooldown = false; // E键交互冷却

    // ✨ 重构：新交互和行为系统
    this.interactionContext = null; // E键交互上下文
    this.actionContext = null; // 鼠标左键行为上下文
    this.uiStateManager = uiStateManager; // UI状态管理器（单例）

    logger.info("场景创建完成");
  }

  async createScene() {
    await physicsSystem.initialize();
    physicsSystem.enablePhysics(this.scene, new Vector3(0, -25, 0));

    // 🔧 使用 Babylon.js 原生输入系统
    this.inputSystem = new BabylonInputSystem(
      this.scene,
      this.engine.getRenderingCanvas()
    );

    this.pickingSystem = new PickingSystem(this.scene);
    this.resourceSystem = new ResourceSystem(this.scene);
    this.combatSystem = new CombatSystem(this.scene); // 🔧 新增

    this.createLights();
    this.createTerrain();
    this.createEnvironment();
    this.createPlayer();
    this.createCameraController();
    this.initializeGameSystems();

    // 🔧 新增：创建测试敌人
    this.createTestEnemies();

    // 🏗️ 初始化建造系统
    this.initBuildingSystem();

    // 🌙 设置时间系统回调
    this.setupTimeCallbacks();

    // ✨ 设置游戏事件监听
    this.setupGameEvents();

    this.setupUpdateLoop();
    this.setupMouseEvents(); // 🔧 设置鼠标事件监听

    logger.info("场景内容创建完成");

    return this.scene;
  }

  createLights() {
    this.hemisphericLight = new HemisphericLight(
      "skyLight",
      new Vector3(0, 1, 0),
      this.scene
    );
    this.hemisphericLight.intensity = 0.6;
    this.hemisphericLight.diffuse = new Color3(1, 1, 1);
    this.hemisphericLight.groundColor = new Color3(0.3, 0.3, 0.4);

    this.sunLight = new DirectionalLight(
      "sunLight",
      new Vector3(-1, -2, -1),
      this.scene
    );
    this.sunLight.intensity = 0.5;
    this.sunLight.diffuse = new Color3(1, 0.95, 0.8);

    logger.debug("光照创建完成");
  }

  /**
   * 🔧 新增：更新昼夜光照
   */
  updateDayNightLighting() {
    // 获取时间系统数据
    const lightIntensity = timeSystem.getLightIntensity();
    const ambientColor = timeSystem.getAmbientColor();
    const skyColor = timeSystem.getSkyColor();
    const sunAngle = timeSystem.getSunAngle();

    // 更新天空颜色
    this.scene.clearColor = new Color4(
      skyColor.r,
      skyColor.g,
      skyColor.b,
      skyColor.a
    );

    // 更新环境光
    if (this.hemisphericLight) {
      this.hemisphericLight.intensity = lightIntensity * 0.6;
      this.hemisphericLight.diffuse = new Color3(
        ambientColor.r,
        ambientColor.g,
        ambientColor.b
      );

      // 夜晚地面颜色更暗
      const groundIntensity =
        timeSystem.currentPeriod === TimePeriod.NIGHT ? 0.1 : 0.3;
      this.hemisphericLight.groundColor = new Color3(
        ambientColor.r * groundIntensity,
        ambientColor.g * groundIntensity,
        ambientColor.b * groundIntensity
      );
    }

    // 更新太阳光
    if (this.sunLight) {
      // 根据太阳角度计算方向
      const sunAngleRad = (sunAngle * Math.PI) / 180;
      const sunHeight = Math.sin(sunAngleRad);
      const sunHorizontal = Math.cos(sunAngleRad);

      // 太阳从东(+X)升起，西(-X)落下
      this.sunLight.direction = new Vector3(
        -sunHorizontal,
        -Math.abs(sunHeight) - 0.5,
        -0.5
      ).normalize();

      // 太阳在地平线以下时强度为0
      const sunIntensity =
        sunHeight > -0.2 ? Math.max(0, sunHeight + 0.2) * lightIntensity : 0;
      this.sunLight.intensity = sunIntensity * 0.8;

      // 根据时间段调整太阳光颜色
      if (
        timeSystem.currentPeriod === TimePeriod.DAWN ||
        timeSystem.currentPeriod === TimePeriod.DUSK
      ) {
        // 黎明/黄昏：橙红色阳光
        this.sunLight.diffuse = new Color3(1.0, 0.7, 0.4);
      } else if (timeSystem.currentPeriod === TimePeriod.DAY) {
        // 白天：正常阳光
        this.sunLight.diffuse = new Color3(1.0, 0.95, 0.8);
      } else {
        // 夜晚：月光（冷色调）
        this.sunLight.diffuse = new Color3(0.4, 0.4, 0.6);
      }
    }
  }

  /**
   * 🌙 设置时间系统回调
   */
  setupTimeCallbacks() {
    // 监听时间段变化
    timeSystem.onPeriodChange = (newPeriod, oldPeriod) => {
      this.onTimePeriodChange(newPeriod, oldPeriod);
    };

    // 初始化上一个时间段
    this._lastPeriod = timeSystem.currentPeriod;

    logger.info("🌙 时间系统回调已设定");
  }

  /**
   * ✨ 设置游戏事件监听（ActionContext派发的事件）
   */
  setupGameEvents() {
    // 监听伤害事件
    this._damageDealtHandler = (e) => {
      const { damage, position, isCritical, killed, targetName } = e.detail;
      this.showDamageNumber?.(damage, position, isCritical);
      if (killed) {
        this.showMessage(`☠️ 击杀了${targetName}！`);
      }
    };
    document.addEventListener("damageDealt", this._damageDealtHandler);

    // 监听工具损坏事件
    this._toolBrokenHandler = (e) => {
      const { itemId } = e.detail;
      this.showMessage(`⚠️ ${itemId} 损坏了！`);
    };
    document.addEventListener("toolBroken", this._toolBrokenHandler);

    // 监听资源采集事件
    this._resourceHarvestedHandler = (e) => {
      const {
        damage,
        destroyed,
        rewards,
        remainingHp,
        maxHp,
        toolBroken,
        toolRemaining,
        toolId,
      } = e.detail;

      let message = "";

      if (destroyed) {
        const rewardText = Object.entries(rewards)
          .map(([item, count]) => {
            const names = { wood: "木材", stone: "石头" };
            return `${names[item] || item} +${count}`;
          })
          .join(", ");
        message = `🎉 获得 ${rewardText}`;
      } else {
        const hpPercent = ((remainingHp / maxHp) * 100).toFixed(0);
        message = `💥 -${damage} | HP:${remainingHp}/${maxHp} (${hpPercent}%)`;
      }

      if (toolRemaining >= 0) {
        message += ` | 🔧 ${toolRemaining}`;
      }

      if (toolBroken) {
        message = `⚠️ ${toolId} 损坏了！ ` + message;
      }

      this.showMessage(message);
    };
    document.addEventListener(
      "resourceHarvested",
      this._resourceHarvestedHandler
    );

    logger.info("✨ 游戏事件监听已设定");
  }

  /**
   * 🌙 时间段变化处
   */
  onTimePeriodChange(newPeriod, oldPeriod) {
    // 进入夜晚：生成夜行生物
    if (newPeriod === TimePeriod.NIGHT) {
      this.spawnNightEnemies();
      this.showMessage("🌙 夜晚来临，危险的生物开始出现了..");
    }

    // 进入黎明：清除夜行生物
    if (newPeriod === TimePeriod.DAWN && oldPeriod === TimePeriod.NIGHT) {
      this.despawnNightEnemies();
      this.showMessage("🌅 黎明到来，夜行生物消散了");
    }
  }

  /**
   * 🌙 生成夜行生物
   */
  spawnNightEnemies() {
    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const spawnCount = 3 + Math.floor(Math.random() * 3); // 3-5个游荡者

    logger.info(`🌙 开始生成${spawnCount} 个夜行生物..`);

    for (let i = 0; i < spawnCount; i++) {
      // 在玩家周围15-30 米处生成
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 15;

      const spawnX = playerPos.x + Math.cos(angle) * distance;
      const spawnZ = playerPos.z + Math.sin(angle) * distance;
      const spawnY = this.terrainSystem.getHeightAt(spawnX, spawnZ) + 1;

      const pos = new Vector3(spawnX, spawnY, spawnZ);

      // 随机选择游荡者或狼
      let enemy;
      if (Math.random() < 0.6) {
        enemy = createWanderer(this.scene, pos, physicsSystem);
      } else {
        enemy = createWolf(this.scene, pos, physicsSystem);
      }

      this.nightEnemies.push(enemy);
      this.enemies.push(enemy);
      this.combatSystem.registerTarget(enemy.mesh, enemy);
    }

    logger.info(`🌙 已生成${spawnCount} 个夜行生物`);
  }

  /**
   * 🌅 清除夜行生物（黎明时消散了）
   */
  despawnNightEnemies() {
    logger.info(`🌅 清除 ${this.nightEnemies.length} 个夜行生物`);

    for (const enemy of this.nightEnemies) {
      // 从敌人列表移除
      const index = this.enemies.indexOf(enemy);
      if (index > -1) {
        this.enemies.splice(index, 1);
      }

      // 从战斗系统移除
      this.combatSystem.unregisterTarget(enemy.mesh);

      // 销毁敌人
      enemy.dispose();
    }

    this.nightEnemies = [];
  }

  /**
   * 🌙 更新夜晚敌人系统
   */
  updateNightEnemies(deltaTime) {
    // 夜晚期间每隔一段时间可能生成额外敌人
    if (timeSystem.currentPeriod === TimePeriod.NIGHT) {
      this._nightSpawnTimer += deltaTime;

      // 60秒有机会生成额外敌人（最多8个夜行生物）
      if (this._nightSpawnTimer >= 60 && this.nightEnemies.length < 8) {
        this._nightSpawnTimer = 0;

        // 30% 概率生成
        if (Math.random() < 0.3) {
          this.spawnSingleNightEnemy();
        }
      }
    } else {
      this._nightSpawnTimer = 0;
    }
  }

  /**
   * 🌙 生成单个夜行生物
   */
  spawnSingleNightEnemy() {
    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 10;

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnZ = playerPos.z + Math.sin(angle) * distance;
    const spawnY = this.terrainSystem.getHeightAt(spawnX, spawnZ) + 1;

    const pos = new Vector3(spawnX, spawnY, spawnZ);
    const enemy = createWanderer(this.scene, pos, physicsSystem);

    this.nightEnemies.push(enemy);
    this.enemies.push(enemy);
    this.combatSystem.registerTarget(enemy.mesh, enemy);

    logger.info("🌙 一个游荡者从黑暗中出现了..");
  }

  createPlayer() {
    const spawnX = 0;
    const spawnZ = 0;
    const spawnY = this.terrainSystem.getHeightAt(spawnX, spawnZ) + 10;

    this.player = new Player(this.scene, physicsSystem, this.inputSystem);
    this.player.create(new Vector3(spawnX, spawnY, spawnZ));

    // 设置背包测试数据
    const inventory = this.player.getInventory();
    const backpackSlots = inventory.getBackpackSlots();

    backpackSlots[0] = { itemId: "wood", count: 20 };
    backpackSlots[1] = { itemId: "wood", count: 15 };
    backpackSlots[2] = { itemId: "stone", count: 30 };
    backpackSlots[3] = { itemId: "stone", count: 10 };
    backpackSlots[4] = { itemId: "stone_axe", count: 1 };
    backpackSlots[5] = { itemId: "wood_pickaxe", count: 1 };
    backpackSlots[6] = { itemId: "stone_pickaxe", count: 1 };
    backpackSlots[7] = { itemId: "wooden_sword", count: 1 }; // 🔧 新增测试武器
    backpackSlots[8] = { itemId: "stone_sword", count: 1 }; // 🔧 新增测试武器
    backpackSlots[9] = { itemId: "wooden_spear", count: 1 }; // 🔧 新增测试武器
    backpackSlots[10] = { itemId: "berry", count: 20 }; // 🔧 新增测试食物
    backpackSlots[11] = { itemId: "raw_meat", count: 30 }; // 🔧 新增测试食物
    backpackSlots[12] = { itemId: "campfire", count: 1 }; // 🔧 新增测试食物
    backpackSlots[13] = { itemId: "chest", count: 1 }; // 🔧 新增测试食物

    logger.info("👤 玩家已创建（包含测试武器和食物）");
  }

  createCameraController() {
    this.cameraController = new CameraController(this.scene, this.player);
    this.cameraController.createCamera();

    logger.info("📷 相机控制器创建完毕");
  }

  /**
   * 初始化游戏系统
   */
  initializeGameSystems() {
    const inventory = this.player.getInventory();

    this.craftingSystem = new CraftingSystem(inventory);
    this.equipmentSystem = new EquipmentSystem(inventory);

    // 将装备系统关联到玩家
    this.player.setEquipmentSystem(this.equipmentSystem);

    // 设置玩家出生点
    this.player.setSpawnPoint(this.player.getPosition());

    // ✨ 初始化交互上下文系统（E键）
    this.interactionContext = new InteractionContext(this.scene);
    this.interactionContext.setPlayer(this.player);
    this.interactionContext.setCameraController(this.cameraController);  // 🔧 设置相机控制器

    // ✨ 初始化行为上下文系统（鼠标左键）
    this.actionContext = new ActionContext(this.scene);
    this.actionContext.setSystems({
      player: this.player,
      uiStateManager: this.uiStateManager,
      buildingSystem: this.buildingSystem,
      combatSystem: this.combatSystem,
      resourceSystem: this.resourceSystem,
      equipmentSystem: this.equipmentSystem,
      pickingSystem: this.pickingSystem,
      inventory: inventory,
      mainScene: this,
      cameraController: this.cameraController,  // 🔧 添加相机控制器
    });

    logger.info("🎮 游戏系统初始化完毕");
    logger.info("✨ 新交互系统已启用");
  }

  /**
   * 🏗️ 初始化建造系统
   */
  initBuildingSystem() {
    this.buildingSystem = new BuildingSystem(this.scene, this.terrainSystem);
    this.buildingSystem.setBuildingData(BUILDINGS);

    // 设置回调
    this.buildingSystem.onBuildingPlaced = (building) => {
      this.buildings.push(building);
      // 消息显示已在ActionContext.executeBuildingAction中处理

      // ✨ 注册到交互系统
      if (building.canInteract && this.interactionContext) {
        this.registerBuildingInteraction(building);
      }

      // 触发UI更新
      document.dispatchEvent(
        new CustomEvent("inventoryChanged", {
          detail: { source: "building-placed", timestamp: Date.now() },
        })
      );
    };

    this.buildingSystem.onModeChanged = (isBuilding, buildingId) => {
      // 通知UI建造模式变化
      document.dispatchEvent(
        new CustomEvent("buildModeChanged", {
          detail: { isBuilding, buildingId },
        })
      );
    };

    this.buildingSystem.onBuildingRemoved = (building) => {
      // ✨ 从交互系统取消注册
      if (building.canInteract && this.interactionContext) {
        this.interactionContext.unregisterInteractable(building.mesh);
      }
    };

    logger.info("🏗️ 建造系统初始化完成");
  }

  /**
   * 🔧 创建测试敌人
   */
  createTestEnemies() {
    const playerPos = this.player.getPosition();

    // 在玩家周围创建几个测试假人（无AI系统）
    const dummyPositions = [
      new Vector3(playerPos.x + 5, playerPos.y, playerPos.z),
      new Vector3(playerPos.x - 5, playerPos.y, playerPos.z),
    ];

    for (const pos of dummyPositions) {
      // 调整Y位置到地
      const groundY = this.terrainSystem.getHeightAt(pos.x, pos.z);
      pos.y = groundY + 1;

      const dummy = createTestDummy(this.scene, pos, physicsSystem);
      this.enemies.push(dummy);

      // 注册到战斗系统
      this.combatSystem.registerTarget(dummy.mesh, dummy);
    }

    logger.info(`已创建${dummyPositions.length} 个测试假人`);

    // 🔧 创建野猪（有AI）
    const boarPositions = [
      new Vector3(playerPos.x + 10, playerPos.y, playerPos.z + 10),
      new Vector3(playerPos.x - 10, playerPos.y, playerPos.z + 10),
      new Vector3(playerPos.x + 15, playerPos.y, playerPos.z - 5),
    ];

    for (const pos of boarPositions) {
      // 调整Y位置到地
      const groundY = this.terrainSystem.getHeightAt(pos.x, pos.z);
      pos.y = groundY + 1;

      const boar = createWildBoar(this.scene, pos, physicsSystem);
      this.enemies.push(boar);

      // 注册到战斗系统
      this.combatSystem.registerTarget(boar.mesh, boar);
    }

    logger.info(`已创建${boarPositions.length} 只野猪`);

    // 监听敌人死亡事件，从列表中移除并处理掉落
    this._enemyDiedHandler = (e) => {
      const deadEnemy = e.detail.enemy;
      const drops = e.detail.drops;

      const index = this.enemies.indexOf(deadEnemy);
      if (index > -1) {
        this.enemies.splice(index, 1);
        this.combatSystem.unregisterTarget(deadEnemy.mesh);
        logger.info(`敌人死亡，剩余${this.enemies.length}`);
      }

      // 🌙 如果是夜行生物，也从夜行生物列表移除
      const nightIndex = this.nightEnemies.indexOf(deadEnemy);
      if (nightIndex > -1) {
        this.nightEnemies.splice(nightIndex, 1);
      }

      // 🔧 处理掉落物品（简化版：直接添加到玩家背包
      this.handleEnemyDrops(drops);
    };
    document.addEventListener("enemyDied", this._enemyDiedHandler);
  }

  /**
   * 🔧 处理敌人掉落物品
   * @param {Object} drops - 掉落物品 { itemId: count }
   */
  handleEnemyDrops(drops) {
    if (!drops || Object.keys(drops).length === 0) return;

    const inventory = this.player.getInventory();
    const droppedItems = [];

    for (const [itemId, count] of Object.entries(drops)) {
      const success = inventory.addItem(itemId, count);
      if (success) {
        droppedItems.push(`${itemId} x${count}`);
      }
    }

    if (droppedItems.length > 0) {
      const message = `获得: ${droppedItems.join(", ")}`;
      logger.info(`📦 ${message}`);

      // 显示UI提示
      this.showMessage(message);
    }
  }

  /**
   * ✨ 注册建筑物交互
   */
  registerBuildingInteraction(building) {
    if (!building || !building.mesh || !this.interactionContext) return;

    // ✨ 交互类型到方法的映射（配置化）
    const interactionHandlers = {
      storage: () =>
        building.storage && this.openStorageUI(building.storage, building.name),
      campfire: () =>
        building.cookingStation && this.openCookingUI(building.cookingStation),
      workbench: () => this.openCraftingUI(building),
      sleep: () => this.showMessage("💤 休息功能开发中..."),
    };

    // ✨ 根据类型获取对应的交互方法（如果没有则用默认方法）
    building.interact =
      interactionHandlers[building.interactType] ||
      (() => logger.warn(`未处理的建筑交互类型: ${building.interactType}`));

    // 注册到交互系统
    this.interactionContext.registerInteractable({
      mesh: building.mesh,
      priority: InteractionPriority.BUILDING,
      promptText: building.getPrompt ? building.getPrompt() : `[E] 交互`,
      canInteract: () => true,
      onInteract: building.interact,
    });

    logger.debug(`✨ 已注册建筑交互: ${building.name}`);
  }

  showInteractionPrompt(text) {
    document.dispatchEvent(
      new CustomEvent("showPrompt", {
        detail: { text },
      })
    );
  }

  hideInteractionPrompt() {
    document.dispatchEvent(new CustomEvent("hidePrompt"));
  }

  showMessage(text) {
    document.dispatchEvent(
      new CustomEvent("showMessage", {
        detail: { text },
      })
    );
  }

  /**
   * 打开存储界面
   */
  openStorageUI(storage, title) {
    document.dispatchEvent(
      new CustomEvent("openStorageUI", {
        detail: { storage, title },
      })
    );
  }

  /**
   * 🔥 打开烹饪界面
   */
  openCookingUI(cookingStation) {
    document.dispatchEvent(
      new CustomEvent("openCookingUI", {
        detail: { cookingStation },
      })
    );
  }

  /**
   * 🔨 打开制作界面
   */
  openCraftingUI(station) {
    document.dispatchEvent(
      new CustomEvent("openCraftingUI", {
        detail: { station },
      })
    );
  }

  /**
   * 🔧 检查是否有交互界面打开
   */
  isInteractionUIOpen() {
    return (
      uiStateManager.states.storageOpen || uiStateManager.states.cookingOpen
    );
  }

  /**
   * 🔧 关闭所有交互界面
   */
  closeInteractionUI() {
    document.dispatchEvent(new CustomEvent("closeInteractionUI"));
  }

  /**
   *  显示伤害数字
   */
  showDamageNumber(damage, position, isCritical = false) {
    document.dispatchEvent(
      new CustomEvent("showDamageNumber", {
        detail: { damage, position, isCritical },
      })
    );
  }

  /**
   * 🔧 检查是否有任何UI打开（背包、交互界面等）
   */
  isAnyUIOpen() {
    return uiStateManager.hasAnyUIOpen();
  }

  /**
   * 更新循环
   */
  setupUpdateLoop() {
    const scene = this.scene;
    let lastTime = Date.now();
    let viewToggleCooldown = false;

    // 保存观察者引用以便清理
    this._renderObserver = scene.onBeforeRenderObservable.add(() => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // 更新时间系统
      timeSystem.update(deltaTime);

      // 更新昼夜光照
      this.updateDayNightLighting();

      // 更新夜晚敌人系统
      this.updateNightEnemies(deltaTime);

      // 更新玩家
      if (this.player) {
        this.player.update(deltaTime);

        if (this.cameraController) {
          this.cameraController.update(deltaTime, this.inputSystem);
        }

        // ✨ 新增：更新交互上下文（扫描周围可交互物体）
        if (this.interactionContext) {
          this.interactionContext.update(deltaTime);
        }

        // ✨ 新增：更新行为上下文（判断当前应该执行的动作）
        if (this.actionContext) {
          this.actionContext.update(deltaTime);
        }

        // ✨ 新增：更新准星目标检测（用于显示提示）
        this.updateTargetHighlight();

        // ✨ 新增：处理输入（E键、鼠标左键）
        this.handleInput();
      }

      // 更新敌人（传递玩家引用给AI）
      for (const enemy of this.enemies) {
        enemy.update(deltaTime, this.player);
      }

      // 更新战斗系统
      if (this.combatSystem) {
        this.combatSystem.update(deltaTime);
      }

      // 更新建造系统
      this.updateBuilding();

      // 视角切换（V键）
      if (this.inputSystem.isViewTogglePressed() && !viewToggleCooldown) {
        if (this.cameraController) {
          this.cameraController.toggleMode();
          viewToggleCooldown = true;
          // 清理旧的 timeout
          if (this._viewToggleTimeout) {
            clearTimeout(this._viewToggleTimeout);
          }
          this._viewToggleTimeout = setTimeout(() => {
            viewToggleCooldown = false;
            this._viewToggleTimeout = null;
          }, 300);
        }
      }
    });

    logger.debug("更新循环已设定");
  }

  /**
   * 🔧 设置鼠标事件监听
   */
  setupMouseEvents() {
    this.scene.onPointerDown = (evt, pickResult) => {
      // 右键点击 (button === 2)
      if (evt.button === 2) {
        this.handleRightClick();
      }

      // ✨ 左键点击（由新的ActionContext处理）
      if (evt.button === 0) {
        this.handleLeftClick();
      }
    };

    logger.info("🖱️ 鼠标事件监听已设定");
  }

  /**
   * ✨ 处理鼠标左键（新）- 使用ActionContext
   */
  handleLeftClick() {
    if (!this.player || this.player.isDead) return;

    // 如果UI打开，不处理游戏操作
    if (this.uiStateManager.shouldBlockGameInput()) {
      return;
    }

    // 🔧 优先级1：建造模式（直接检查，不依赖 ActionContext）
    if (this.buildingSystem && this.buildingSystem.isBuilding && this.buildingSystem.canPlace) {
      const inventory = this.player.getInventory();
      const isPlacingFromHeldItem = this._isPlacingFromHeldItem || false;
      const heldItemId = this._heldItemId || null;
      const heldItemSlot = this._heldItemSlot || -1;

      let result;
      
      if (isPlacingFromHeldItem && inventory) {
        result = this.buildingSystem.placeBuilding(inventory, true, heldItemId, heldItemSlot);
        
        if (result.success) {
          const newSlot = inventory.getHotbarSlot(heldItemSlot);
          if (!newSlot || newSlot.count <= 0) {
            this.buildingSystem.exitBuildMode();
            this._isPlacingFromHeldItem = false;
            this._heldItemId = null;
            this._heldItemSlot = -1;
          }
        }
      } else {
        result = this.buildingSystem.placeBuilding(inventory);
      }
      
      if (result.success) {
        this.showMessage(result.message);
      } else {
        this.showMessage(`❌ ${result.message}`);
      }
      
      return;
    }

    // 🔧 其他动作交给 ActionContext 处理
    if (this.actionContext) {
      this.actionContext.executeAction();
    }
  }

  /**
   * 🔧 处理右键点击
   */
  handleRightClick() {
    if (!this.player || this.player.isDead) return;

    // 🏗️ 如果在建造模式，右键取消
    if (this.buildingSystem?.isBuilding) {
      this.buildingSystem.exitBuildMode();
      return;
    }

    const inventory = this.player.getInventory();
    const selectedIndex = inventory.getSelectedHotbarIndex();
    const hotbarItem = inventory.getHotbarSlot(selectedIndex);

    logger.debug(`右键点击 - 选中格子: ${selectedIndex}, 物品:`, hotbarItem);

    if (hotbarItem) {
      this.tryUseItem(hotbarItem.itemId);
    }
  }

  /**
   * 🏗️ 更新建造系统
   */
  updateBuilding() {
    if (!this.buildingSystem || !this.player || this.player.isDead) return;

    // 🔥 更新所有烹饪站的烹饪进度
    for (const building of this.buildings) {
      if (building.cookingStation) {
        building.cookingStation.update();
      }
    }

    const inventory = this.player.getInventory();
    const selectedIndex = inventory.getSelectedHotbarIndex();
    const hotbarSlot = inventory.getHotbarSlot(selectedIndex);

    // 🏗️ 检测手持可放置物品，自动进入/退出建造模式
    if (hotbarSlot && isPlaceable(hotbarSlot.itemId)) {
      const placeType = getPlaceType(hotbarSlot.itemId);

      // 如果当前不在建造模式，或者建造的不是当前手持物品类型，进入新的建造模式
      if (
        !this.buildingSystem.isBuilding ||
        this.buildingSystem.selectedBuildingId !== placeType
      ) {
        this.buildingSystem.enterBuildMode(placeType);
        this._isPlacingFromHeldItem = true; // 标记是从手持物品放置
        this._heldItemId = hotbarSlot.itemId;
        this._heldItemSlot = selectedIndex;
      }
    } else {
      // 手持的不是可放置物品，如果在手持放置模式，则退出
      if (this._isPlacingFromHeldItem && this.buildingSystem.isBuilding) {
        this.buildingSystem.exitBuildMode();
        this._isPlacingFromHeldItem = false;
        this._heldItemId = null;
        this._heldItemSlot = -1;
      }
    }

    // 建造模式下更新 Ghost 位置
    if (this.buildingSystem.isBuilding) {
      // 获取玩家前方位置作为建造位置
      const ray = this.cameraController.getInteractionRay();
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
        return mesh.name === "terrain";
      });

      if (pickInfo && pickInfo.hit) {
        this.buildingSystem.updateGhostPosition(pickInfo.pickedPoint);
      }

      // R键旋转
      if (this.inputSystem.isKeyDown("KeyR")) {
        // 简单的冷却检测
        if (!this._rotateCooldown) {
          this.buildingSystem.rotate();
          this._rotateCooldown = true;
          setTimeout(() => {
            this._rotateCooldown = false;
          }, 200);
        }
      }

      // 左键放置逻辑已移到 ActionContext.executeBuildingAction()
    }
  }

  /**
   * 🔧 尝试使用物品
   */
  tryUseItem(itemId) {
    if (isEdible(itemId)) {
      const itemData = getItem(itemId);
      const hungerRestore = getHungerRestore(itemId);
      const restored = this.player.eat(hungerRestore);

      if (restored > 0 || itemData.healthRestore) {
        const inventory = this.player.getInventory();
        const removeSuccess = inventory.removeItem(itemId, 1);

        if (removeSuccess) {
          logger.info(`🍖 使用: ${itemData.name}, 恢复饥饿值 +${restored}`);

          // 🔧 检查是否有HP恢复
          if (itemData.healthRestore) {
            const healed = this.player.heal(itemData.healthRestore);
            if (healed > 0) {
              logger.info(`💚 ${itemData.name} 恢复HP +${healed}`);
            }
          }

          // 🔧 检查是否有Buff效果
          if (itemData.buffOnConsume) {
            buffSystem.addBuff(itemData.buffOnConsume);
            logger.info(`获得Buff: ${itemData.buffOnConsume}`);
          }

          // 🔧 检查是否有中毒几率（生肉等）
          if (itemData.poisonChance && Math.random() < itemData.poisonChance) {
            buffSystem.addBuff("poison");
            logger.warn(`☠️ 吃了${itemData.name}中毒了！`);
            this.showMessage(`☠️ 吃了${itemData.name}中毒了！`);
          }

          // 触发UI更新
          document.dispatchEvent(
            new CustomEvent("inventoryChanged", {
              detail: { source: "hotbar-use", itemId, timestamp: Date.now() },
            })
          );
          logger.debug("已触发 inventoryChanged 事件");
        } else {
          logger.warn(`移除物品失败: ${itemId}`);
        }
      }
    }
  }

  /**
   * ✨ 更新目标高亮显示（新）
   */
  updateTargetHighlight() {
    if (!this.pickingSystem) return;

    // 优先级1：E键交互目标（箱子、篝火等建筑物）
    if (this.interactionContext) {
      const target = this.interactionContext.getCurrentTarget();
      if (target) {
        this.pickingSystem.highlightMesh(target.mesh);
        const promptText = this.interactionContext.getPromptText();
        if (promptText) {
          this.showInteractionPrompt(promptText);
        }
        return;
      }
    }

    // 优先级2：左键采集目标（树木、石头等资源）
    if (this.actionContext && this.actionContext.currentAction === 'harvest') {
      const ray = this.cameraController.getInteractionRay();
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
        const interactable = this.pickingSystem.getInteractable(mesh);
        return interactable !== null;
      });

      if (pickInfo && pickInfo.hit) {
        // 🔧 使用玩家到目标的距离判断
        const playerPos = this.player.getPosition();
        const distanceFromPlayer = playerPos.subtract(pickInfo.pickedPoint).length();
        
        if (distanceFromPlayer <= 3.5) {  // 采集距离3.5米
          this.pickingSystem.highlightMesh(pickInfo.pickedMesh);
          return;
        }
      }
    }

    // 没有目标：清除高亮和提示
    this.pickingSystem.clearHighlight();
    this.hideInteractionPrompt();
  }

  /**
   * ✨ 处理输入（E键交互）（新）
   */
  handleInput() {
    if (!this.player || this.player.isDead) return;

    // E键交互
    if (this.inputSystem.isInteractPressed() && !this._interactCooldown) {
      this._interactCooldown = true;

      // 先检查是否有交互UI打开，如果有则关闭
      if (this.isInteractionUIOpen()) {
        this.closeInteractionUI();
      } else if (!this.uiStateManager.shouldBlockGameInput()) {
        // 没有UI打开，且有可交互目标，执行交互
        if (
          this.interactionContext &&
          this.interactionContext.hasInteractableTarget()
        ) {
          this.interactionContext.executeInteraction();
        }
      }

      setTimeout(() => {
        this._interactCooldown = false;
      }, 300);
    }
  }

  createTerrain() {
    this.terrainSystem = new TerrainSystem(this.scene, physicsSystem);
    this.terrainSystem.createTerrain({
      width: 200,
      depth: 200,
      subdivisions: 100,
      minHeight: 0,
      maxHeight: 30,
      seed: 12345,
    });
    logger.info("地形创建完成");
  }

  createEnvironment() {
    this.environmentSpawner = new EnvironmentSpawner(
      this.scene,
      this.terrainSystem,
      physicsSystem
    );
    this.environmentSpawner.spawnEnvironment({
      treeCount: 100,
      rockCount: 50,
      spawnRadius: 80,
      seed: 12345,
    });
    logger.info("环境装饰创建完成");
  }

  getScene() {
    return this.scene;
  }

  /**
   * 清理场景资源
   */
  dispose() {
    logger.info("开始清理场景资源..");

    // 清理视角切换 timeout
    if (this._viewToggleTimeout) {
      clearTimeout(this._viewToggleTimeout);
      this._viewToggleTimeout = null;
    }

    // 移除渲染循环观察者
    if (this._renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this._renderObserver);
      this._renderObserver = null;
      logger.debug("🔧 渲染观察者已移除");
    }

    // 移除事件监听器
    if (this._enemyDiedHandler) {
      document.removeEventListener("enemyDied", this._enemyDiedHandler);
      this._enemyDiedHandler = null;
    }
    if (this._damageDealtHandler) {
      document.removeEventListener("damageDealt", this._damageDealtHandler);
      this._damageDealtHandler = null;
    }
    if (this._toolBrokenHandler) {
      document.removeEventListener("toolBroken", this._toolBrokenHandler);
      this._toolBrokenHandler = null;
    }
    if (this._resourceHarvestedHandler) {
      document.removeEventListener(
        "resourceHarvested",
        this._resourceHarvestedHandler
      );
      this._resourceHarvestedHandler = null;
    }
    logger.debug("🔧 事件监听器已移除");

    // 清理敌人
    if (this.enemies && this.enemies.length > 0) {
      this.enemies.forEach((enemy) => {
        if (enemy.mesh) {
          enemy.mesh.dispose();
        }
      });
      this.enemies = [];
      logger.debug("👾 敌人已清理");
    }

    // 清理建造状态
    this._isPlacingFromHeldItem = false;
    this._heldItemId = null;
    this._heldItemSlot = -1;
    this._rotateCooldown = false;
    this._interactCooldown = false;

    // 清理系统
    this.player = null;
    this.terrainSystem = null;
    this.environmentSpawner = null;
    this.pickingSystem = null;
    this.resourceSystem = null;
    this.cameraController = null;
    this.craftingSystem = null;
    this.equipmentSystem = null;
    this.combatSystem = null;
    this.buildingSystem = null;
    this.interactionContext = null;
    this.actionContext = null;

    logger.info("🧹 场景资源清理完成");
  }
}
