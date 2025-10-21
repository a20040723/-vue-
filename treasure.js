// 为重新设计的4个场景创建连贯的寻宝故事
class TreasureMap {
  // 古老钟楼场景的寻宝流程
  static examineClockTower() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("你站在古老的钟楼前，迷雾缓缓散去。大门上的青铜锁早已生锈，但锁孔周围似乎有近期活动的痕迹。你注意到石阶上有一些奇怪的刻痕...");
      }, 1000);
    });
  }

  static decodeClockPattern(clue) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!clue) {
          reject("刻痕太过模糊，无法辨认出任何有意义的图案！");
        }
        resolve("通过仔细观察，你发现石阶上的刻痕实际上是一组星象图。当最后一缕阳光照射到特定位置时，钟楼的大门发出低沉的轰鸣，缓缓打开了...");
      }, 1500);
    });
  }

  static enterClockTowerHall() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("你走进钟楼大厅，灰尘覆盖的地面上有一串清晰的脚印。抬头望去，巨大的钟表机械依然完好，但指针停在了一个特殊的时刻：11点57分。钟摆下方有一个隐藏的控制面板...");
      }, 1500);
    });
  }

  static activateClockMechanism() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("随着你按下控制面板上的按钮，整个钟楼开始震动。头顶的机械装置开始运转，钟表指针开始走动。当指针指向12点整时，钟楼上层的地板突然打开，露出了一个通往未知区域的楼梯...");
      }, 1000);
    });
  }

  // 星空实验室场景的寻宝流程
  static exploreStarLab() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("楼梯尽头并不是钟楼的屋顶，而是一个隐藏的高科技实验室。四周的屏幕上显示着复杂的星图和计算公式，中央的天文望远镜正对着夜空中的某个特定位置。控制台的屏幕上有一行发光的文字：'坐标已锁定'。");
      }, 1000);
    });
  }

  static analyzeStarData(clue) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!clue) {
          reject("系统似乎遭到了损坏，无法读取完整的数据！");
        }
        resolve("通过分析望远镜收集的数据，你发现它一直在追踪一颗周期性掠过地球的神秘星体。更令人惊讶的是，数据显示这颗星体的运行轨道指向了地球上的一个特定点——位于太平洋深处的某个坐标。控制台自动生成了一张前往该地点的路线图。");
      }, 1500);
    });
  }

  static discoverAncientLog() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("在实验室的角落，你发现了一本古老的日志。日志的主人似乎是这个实验室的创建者，他在最后几页提到了'海底的古老文明'和'能够改变时间的装置'。日志的最后一页画着一个金字塔的草图，旁边标注着：'时间的秘密就在那里'。");
      }, 1500);
    });
  }

  static activateSubmarine() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("实验室的地板突然打开，露出了一个隐藏的潜艇舱。潜艇的控制面板上已经输入了日志中提到的坐标。看来一切都已准备就绪，只等你踏上前往深海的旅程...");
      }, 1000);
    });
  }

  // 深海遗迹场景的寻宝流程
  static diveToSeabed() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("潜艇平稳地降落在海底。透过观察窗，你看到了令人难以置信的景象：一座被珊瑚和海洋生物覆盖的古代城市静静地躺在海底。城市的中心是一座巨大的金字塔，塔顶正散发着柔和的蓝色光芒。");
      }, 1000);
    });
  }

  static exploreSunkenCity(clue) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!clue) {
          reject("海底的强流阻碍了你的探索，无法接近金字塔！");
        }
        resolve("你穿上潜水服，小心翼翼地探索这座沉没的城市。街道两旁的建筑物上雕刻着精美的图案，描绘着一个高度发达的文明。金字塔的入口处有一个巨大的石门，门上雕刻着与钟楼石阶上相同的星象图。");
      }, 1500);
    });
  }

  static solvePyramidPuzzle() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("根据之前收集的线索，你成功激活了金字塔入口的机关。石门缓缓打开，露出了一条通往金字塔内部的通道。通道的墙壁上镶嵌着发光的晶体，照亮了前方的道路。在通道的尽头，你看到了一个巨大的圆形房间。");
      }, 1500);
    });
  }

  static enterTimeChamber() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("圆形房间的中心是一个悬浮在空中的装置，它不断地旋转着，散发出强大的能量波动。装置的表面刻满了古老的符文和先进的电路，两者完美地融合在一起。这显然就是日志中提到的'时光核心'。");
      }, 1000);
    });
  }

  // 时光核心场景的寻宝流程
  static approachTimeCore() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("当你靠近时光核心时，它似乎感知到了你的存在，开始发出明亮的光芒。装置周围的空间开始扭曲，你仿佛看到了过去、现在和未来的重叠影像。一个温和的声音在你的脑海中响起：'欢迎，探索者。你已经通过了所有考验。'");
      }, 1000);
    });
  }

  static activateTimeInterface(clue) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!clue) {
          reject("时光核心似乎拒绝了你的连接请求！");
        }
        resolve("时光核心与你建立了精神连接，你开始理解它的运作原理。原来这不仅仅是一个时间机器，更是一个记录着整个宇宙历史的数据库。通过它，你可以看到任何时间、任何地点发生的事情。");
      }, 1500);
    });
  }

  static receiveUltimateRevelation() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("时光核心向你展示了一个惊人的真相：这个世界的所有传说、所有宝藏，都是为了引导像你这样的探索者来到这里。你的旅程本身就是最大的宝藏，它考验了你的智慧、勇气和好奇心。作为奖励，时光核心赋予了你选择任何一个时间点去见证的能力。");
      }, 1500);
    });
  }

  static completeJourney() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("你的寻宝之旅就此结束，但这也是一个新的开始。通过这段经历，你明白了真正的宝藏不是金银财宝，而是知识、体验和成长。当你离开金字塔时，海底城市开始发光，似乎在向你告别。你知道，这段奇妙的冒险将永远伴随着你。");
      }, 1000);
    });
  }
}

// 根据场景ID获取对应的寻宝流程和故事背景
function getSceneTreasureProcess(sceneId) {
  const processes = {
    'clocktower': {
      firstStep: TreasureMap.examineClockTower,
      secondStep: TreasureMap.decodeClockPattern,
      thirdStep: TreasureMap.enterClockTowerHall,
      finalStep: TreasureMap.activateClockMechanism,
      stepDescriptions: {
        first: '探索古老钟楼外观',
        second: '解读石阶上的刻痕',
        third: '进入钟楼大厅',
        final: '激活钟表机关'
      },
      storyBackground: '传说中，这座钟楼是由一位神秘的天文学家在几百年前建造的。他声称这座钟楼能够连接过去与未来，但在一个暴风雨的夜晚，钟楼的钟声突然停止，从此再也没有人听到过它的声音。多年来，许多冒险者试图探索这座钟楼，但都无功而返。',
      explorationTips: [
        '仔细观察石阶上的刻痕，它们可能隐藏着重要线索',
        '注意阳光照射的角度，它可能揭示一些平时看不见的东西',
        '寻找任何可以打开大门的机关'
      ],
      storyProgression: '你的寻宝之旅从这里开始。古老钟楼的秘密将引导你走向更广阔的世界。'
    },
    'starlab': {
      firstStep: TreasureMap.exploreStarLab,
      secondStep: TreasureMap.analyzeStarData,
      thirdStep: TreasureMap.discoverAncientLog,
      finalStep: TreasureMap.activateSubmarine,
      stepDescriptions: {
        first: '探索星空实验室',
        second: '分析天文数据',
        third: '发现古老日志',
        final: '启动潜水艇'
      },
      storyBackground: '这个隐藏在钟楼内的高科技实验室显然不是几百年前的产物。它的存在暗示着某种超越时代的技术或知识交流。实验室的设备仍然在运转，似乎一直在执行着某个长期任务。',
      explorationTips: [
        '仔细研究望远镜指向的星空位置',
        '分析控制台屏幕上的数据和图表',
        '搜索实验室的每一个角落，寻找有用的线索'
      ],
      storyProgression: '钟楼只是一个入口，真正的冒险现在才开始。星空实验室的发现将带你前往更深的未知领域。'
    },
    'seatreasure': {
      firstStep: TreasureMap.diveToSeabed,
      secondStep: TreasureMap.exploreSunkenCity,
      thirdStep: TreasureMap.solvePyramidPuzzle,
      finalStep: TreasureMap.enterTimeChamber,
      stepDescriptions: {
        first: '潜入海底城市',
        second: '探索沉没的文明',
        third: '解开金字塔谜题',
        final: '进入时光核心室'
      },
      storyBackground: '这座沉没的城市比任何人想象的都要古老和先进。它的建筑风格和技术水平与地球上已知的任何文明都不相符。金字塔的存在表明这个文明可能掌握了某种我们无法理解的力量。',
      explorationTips: [
        '注意观察建筑物上的雕刻和图案',
        '寻找与之前场景中相似的符号或线索',
        '小心海底的危险，包括强劲的水流和未知的生物'
      ],
      storyProgression: '你已经接近旅程的高潮。金字塔内的秘密将彻底改变你对这个世界的理解。'
    },
    'timetravel': {
      firstStep: TreasureMap.approachTimeCore,
      secondStep: TreasureMap.activateTimeInterface,
      thirdStep: TreasureMap.receiveUltimateRevelation,
      finalStep: TreasureMap.completeJourney,
      stepDescriptions: {
        first: '靠近时光核心',
        second: '激活时间接口',
        third: '接受终极启示',
        final: '完成寻宝之旅'
      },
      storyBackground: '时光核心是整个旅程的终点，也是起点。它不仅仅是一个装置，更像是一个有自我意识的存在。它一直在等待着一个有资格的探索者，一个能够通过所有考验的人。',
      explorationTips: [
        '保持开放的心态，接受时光核心传递的信息',
        '思考这段旅程对你的意义',
        '准备好面对可能改变你一生的真相'
      ],
      storyProgression: '这是旅程的终点，但也是你人生新的起点。你将带着这段经历和智慧，继续探索这个神秘而奇妙的世界。'
    }
  };
  
  return processes[sceneId] || null;
}

// 在场景之间添加导航功能
function navigateToScene(sceneId) {
  const scene = SCENES.find(s => s.id === sceneId);
  if (!scene) return;
  
  // 存储当前状态
  const currentState = {
    currentSceneId: sceneId,
    hotspotsFound: state.hotspotsFound,
    volume: state.volume
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch (e) {
    console.warn('保存状态失败', e);
  }
  
  // 跳转到指定场景
  openScene(sceneId);
}

// 导出函数供app.js使用
window.getSceneTreasureProcess = getSceneTreasureProcess;
window.navigateToScene = navigateToScene;