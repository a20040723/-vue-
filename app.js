// 重新设计的4个具有故事性的小场景
const SCENES = [
  { 
    id: 'clocktower', 
    title: '古老钟楼', 
    desc: '迷雾笼罩的山顶上，一座古老的钟楼孤独地矗立着。钟声已经沉默了百年，但传说中它隐藏着通往另一个世界的秘密。', 
    music: '深度抽象.mp3', 
    image: '古老图书馆图片.png', 
    hotspots:[{id:'clock-1',x:40,y:30,title:'钟楼大门'},{id:'clock-2',x:65,y:50,title:'雕刻花纹'},{id:'clock-3',x:20,y:60,title:'石阶缝隙'}],
    storyPosition: '起点',
    nextScene: 'starlab'
  },
  { 
    id: 'starlab', 
    title: '星空实验室', 
    desc: '钟楼顶部并非终点，而是一个高科技实验室的入口。巨大的天文望远镜指向星空，屏幕上显示着神秘的星图和计算公式。', 
    music: '未来设计.mp3', 
    image: '生成寻宝地图.png', 
    hotspots:[{id:'star-1',x:50,y:40,title:'主控制台'},{id:'star-2',x:30,y:60,title:'星图档案'},{id:'star-3',x:70,y:35,title:'望远镜目镜'}],
    storyPosition: '发展',
    prevScene: 'clocktower',
    nextScene: 'seatreasure'
  },
  { 
    id: 'seatreasure', 
    title: '深海遗迹', 
    desc: '实验室的数据指向了海底深处。当你潜入海底，一座被珊瑚覆盖的古代城市出现在眼前，城市中心的金字塔散发着神秘的蓝光。', 
    music: '节拍背景.mp3', 
    image: '节拍之地.png', 
    hotspots:[{id:'sea-1',x:45,y:50,title:'金字塔入口'},{id:'sea-2',x:70,y:40,title:'雕像基座'},{id:'sea-3',x:25,y:60,title:'海底裂缝'}],
    storyPosition: '高潮',
    prevScene: 'starlab',
    nextScene: 'timetravel'
  },
  { 
    id: 'timetravel', 
    title: '时光核心', 
    desc: '金字塔内部是一个超越时代的装置——时光核心。它似乎在等待着有人重新激活它，以揭示整个寻宝旅程的终极秘密。', 
    music: '大脑植入物.mp3', 
    image: '遗忘神庙.png', 
    hotspots:[{id:'time-1',x:50,y:35,title:'核心控制台'},{id:'time-2',x:30,y:50,title:'能量水晶'},{id:'time-3',x:70,y:50,title:'时光显示屏'}],
    storyPosition: '结局',
    prevScene: 'seatreasure'
  }
];

const STORAGE_KEY = 'async-treasure-state-v1';
// 难度权重（可调）
const SCENE_DIFFICULTY = {
  clocktower: 1,
  starlab: 2,
  seatreasure: 3,
  timetravel: 4
};

// DOM
const locationsEl = document.getElementById('locations');
const panoramaPage = document.getElementById('panorama');
const scenePage = document.getElementById('scene');
const sceneTitle = document.getElementById('scene-title');
const sceneDesc = document.getElementById('scene-desc');
const backBtn = document.getElementById('back');
const findBtn = document.getElementById('find');
const audioEl = document.getElementById('bg-audio');
const volumeEl = document.getElementById('volume');
const resetBtn = document.getElementById('reset');
const sceneImg = document.getElementById('scene-img');
const foundCountEl = document.getElementById('found-count');
const totalCountEl = document.getElementById('total-count');
const progressBarEl = document.getElementById('progress-bar');
const panoramaInner = document.getElementById('panorama-inner');
const panoramaView = document.getElementById('panorama-view');
const panFullscreenBtn = document.getElementById('pan-fullscreen');
const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const sceneHero = document.querySelector('.scene-hero');

let searchTerm = '';
let filterMode = 'all';
const foundBadge = document.getElementById('found-badge');
const narrativeEl = document.getElementById('narrative');
const challengeEnergyEl = document.getElementById('challenge-energy');
const useEnergyBtn = document.getElementById('use-energy');
const sceneMeta = document.querySelector('.scene-meta');
// debug panel removed

function createDefaultState(){
  return {
    currentSceneId: null,
    // hotspotsFound: { sceneId: { hotspotId: true, ... } }
    hotspotsFound: {}, // Initialize hotspotsFound for tracking
    volume: 0.6,
    challengeEnergy: 0,
    hintedHotspots: {},
    clocktowerGame: {
      bestScore: 0,
      bestTimeMs: null,
      bestClickScore: 0,
      bestClickCount: 0
    },
    // 计分与统计
    metrics: {
      // 场景尝试次数（累计）
      sceneAttempts: {}, // { [sceneId]: number }
      // 当前一次探索的起始时间戳
      currentStartTs: 0,
      // 最近一次成功信息（用于连击奖励）
      lastSuccessTs: 0,
      lastSuccessScene: null
    }
  };
}

let state = createDefaultState();

let busy = false; // 防止并发探索
let successShown = false; // whether the treasure-complete banner was shown
let cleanupClocktowerGame = null;

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){ console.warn('保存状态失败', e); }
}

// debug functions removed

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      // migrate legacy `found` -> hotspotsFound (mark first hotspot of scene)
      // If legacy `found` exists (older format), try to convert to hotspotsFound.
      if(parsed.found && !parsed.hotspotsFound){
        parsed.hotspotsFound = {};
        Object.keys(parsed.found).forEach(key => {
          if(parsed.found[key]){
            // key could be old scene id or scene title in Chinese. Try match by id first, then title.
            let scene = SCENES.find(s=>s.id===key);
            if(!scene) scene = SCENES.find(s=>s.title===key);
            if(scene){
              parsed.hotspotsFound[scene.id] = {};
              if(scene.hotspots && scene.hotspots.length>0){
                parsed.hotspotsFound[scene.id][scene.hotspots[0].id] = true;
              }
            } else {
              // unknown key: still create an entry to preserve truthy flag (no hotspot marked)
              parsed.hotspotsFound[key] = {};
            }
          }
        });
        delete parsed.found;
      }
      // Normalize existing parsed.hotspotsFound keys to use SCENES ids (in case user saved with titles)
      if(parsed.hotspotsFound && typeof parsed.hotspotsFound === 'object'){
        const normalized = {};
        Object.keys(parsed.hotspotsFound).forEach(oldKey => {
          const value = parsed.hotspotsFound[oldKey];
          let scene = SCENES.find(s=>s.id===oldKey) || SCENES.find(s=>s.title===oldKey);
          if(scene){
            normalized[scene.id] = value || {};
          } else {
            // keep unknown keys as-is to avoid data loss
            normalized[oldKey] = value || {};
          }
        });
        parsed.hotspotsFound = normalized;
      }
      // remove invalid/accidental keys like '[object PointerEvent]' from hotspotsFound
      function sanitizeHotspotsFound(map){
        if(!map || typeof map !== 'object') return;
        Object.keys(map).forEach(sceneKey => {
          const entry = map[sceneKey];
          if(!entry || typeof entry !== 'object') return;
          Object.keys(entry).forEach(hk => {
            if(typeof hk === 'string' && /^\[object .*Event\]$/.test(hk)){
              delete entry[hk];
            }
          });
        });
      }
      sanitizeHotspotsFound(parsed.hotspotsFound);
      Object.assign(state, parsed);
      // ensure metrics shape
      if(!state.metrics || typeof state.metrics !== 'object'){
        state.metrics = { sceneAttempts:{}, currentStartTs:0, lastSuccessTs:0, lastSuccessScene:null };
      } else {
        state.metrics.sceneAttempts = state.metrics.sceneAttempts || {};
        state.metrics.currentStartTs = state.metrics.currentStartTs || 0;
        state.metrics.lastSuccessTs = state.metrics.lastSuccessTs || 0;
        state.metrics.lastSuccessScene = state.metrics.lastSuccessScene || null;
      }
      if(!Number.isFinite(state.challengeEnergy)) state.challengeEnergy = 0;
      if(!state.hintedHotspots || typeof state.hintedHotspots !== 'object') state.hintedHotspots = {};
      if(!state.clocktowerGame || typeof state.clocktowerGame !== 'object'){
        state.clocktowerGame = { bestScore: 0, bestTimeMs: null, bestClickScore: 0, bestClickCount: 0 };
      } else {
        state.clocktowerGame.bestScore = Number(state.clocktowerGame.bestScore) || 0;
        if(!Number.isFinite(state.clocktowerGame.bestTimeMs)) state.clocktowerGame.bestTimeMs = null;
        state.clocktowerGame.bestClickScore = Number(state.clocktowerGame.bestClickScore) || 0;
        state.clocktowerGame.bestClickCount = Number(state.clocktowerGame.bestClickCount) || 0;
      }
    }
  }catch(e){ console.warn('读取状态失败', e); }
}

function renderLocations(){
  locationsEl.innerHTML = '';
  const list = SCENES.filter(s=>{
    const text = (s.title + ' ' + s.desc).toLowerCase();
    if(searchTerm && !text.includes(searchTerm.toLowerCase())) return false;
    const foundMap = state.hotspotsFound[s.id] || {};
    const foundCount = Object.keys(foundMap).filter(k=>foundMap[k]).length;
    if(filterMode === 'found' && foundCount===0) return false;
    if(filterMode === 'not-found' && foundCount>0) return false;
    return true;
  });
  list.forEach(s => {
    const foundMap = state.hotspotsFound[s.id] || {};
    // limit discoveries per scene to 1
    const rawFoundCount = Object.keys(foundMap).filter(k=>foundMap[k]).length;
    const foundCount = Math.min(1, rawFoundCount);
    const totalHotspots = 1;
    const el = document.createElement('div');
    el.className = 'location';
    if(foundCount > 0){
      el.classList.add('location-found');
    }
    el.dataset.id = s.id;
    
    // 添加发现状态的视觉指示器
    const statusClass = foundCount > 0 ? 'status-found' : 'status-not-found';
    const statusIcon = foundCount > 0 ? '✓' : '?';
    
    el.innerHTML = `
      <div class="thumb">
        <img src="${s.image}" alt="${s.title}"/>
        <div class="discovery-indicator ${statusClass}">${statusIcon}</div>
      </div>
      <h3>${s.title}</h3>
      <div>${s.desc}</div>
      <div style="margin-top:8px;color:${foundCount>0 ? 'var(--accent-alt)' : 'var(--accent)'}">
        ${foundCount>0? '已发现 ' + foundCount + '/' + totalHotspots : '未探索'}
      </div>
    `;
    
    el.addEventListener('click', () => openScene(s.id));
    locationsEl.appendChild(el);
  });
  updateProgressUI();
}

function debounce(fn, wait=200){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
}

searchInput.addEventListener('input', debounce((e)=>{ searchTerm = e.target.value; renderLocations(); }, 160));
filterSelect.addEventListener('change', (e)=>{ filterMode = e.target.value; renderLocations(); });

function openScene(id){
  const s = SCENES.find(x=>x.id===id);
  if(!s) return;
  state.currentSceneId = id;
  updateChallengeEnergyUI();
  sceneTitle.textContent = s.title;
  sceneDesc.textContent = s.desc;
  panoramaPage.classList.add('hidden');
  scenePage.classList.remove('hidden');
  // 设置 panorama 背景（使用宽图感受更像全景）
  const bg = s.image;
  panoramaInner.style.backgroundImage = `url('${bg}')`;
  panoramaInner.style.transform = 'translateX(0)';
  // also set the smaller img (for accessibility / fallback)
  sceneImg.classList.remove('fade-in');
  sceneImg.src = s.image;
  setTimeout(()=> sceneImg.classList.add('fade-in'), 50);
  playSceneMusic(s.music);
  // update badge and narrative
  updateBadgeForScene(id);
  
  // 重置场景布局类
  if(sceneHero){
    sceneHero.classList.remove('library-layout');
    sceneHero.classList.remove('clocktower-layout');
  }
  const bookshelfContainer = document.querySelector('.bookshelf-container');
  if (bookshelfContainer) {
    bookshelfContainer.remove();
  }
  if(cleanupClocktowerGame){
    try{ cleanupClocktowerGame(); }catch(e){ console.warn('clocktower cleanup failed', e); }
    cleanupClocktowerGame = null;
  }
  const clocktowerPanel = document.querySelector('.clocktower-panel');
  if(clocktowerPanel){
    clocktowerPanel.remove();
  }
  
  // 为场景添加故事位置标识
  if(sceneMeta){
    let storyPosEl = sceneMeta.querySelector('.story-position');
    if (!storyPosEl) {
      storyPosEl = document.createElement('div');
      storyPosEl.className = 'story-position';
      storyPosEl.style.fontSize = '12px';
      storyPosEl.style.color = 'var(--accent-alt)';
      storyPosEl.style.marginTop = '4px';
      storyPosEl.style.textTransform = 'uppercase';
      const insertBeforeNode = sceneImg ? sceneImg.nextSibling : null;
      sceneMeta.insertBefore(storyPosEl, insertBeforeNode);
    }
    storyPosEl.textContent = `故事位置: ${s.storyPosition}`;
  }
  
  // 移除任何旧的场景特定布局类
  if(sceneHero){
    sceneHero.classList.remove('library-layout');
  }
  
  // 获取场景的故事背景和探索提示
  const treasureProcess = getSceneTreasureProcess(id);
  if (treasureProcess) {
    // 确保旁白区域存在并正确设置初始文本
    if(narrativeEl) {
      narrativeEl.textContent = `你来到了${s.title}，${s.desc} 准备开始你的寻宝之旅...`;
      // 重置旁白元素样式
      narrativeEl.style.opacity = '1';
      narrativeEl.style.transition = 'opacity 0.5s ease';
    }
    
    // 创建或获取场景内容容器
    let contentContainer = document.querySelector('.scene-content');
    if (!contentContainer) {
      contentContainer = document.createElement('div');
      contentContainer.className = 'scene-content';
      // 将内容容器放在narrative元素之后
      narrativeEl.parentNode.insertBefore(contentContainer, narrativeEl.nextSibling);
    }
    
    // 创建场景背景故事元素
    let storyBackgroundEl = contentContainer.querySelector('.story-background');
    if (!storyBackgroundEl) {
      storyBackgroundEl = document.createElement('div');
      storyBackgroundEl.className = 'story-background';
      contentContainer.appendChild(storyBackgroundEl);
    }
    storyBackgroundEl.textContent = treasureProcess.storyBackground;
    
    // 创建探索提示元素
    let explorationTipsEl = contentContainer.querySelector('.exploration-tips');
    if (!explorationTipsEl) {
      explorationTipsEl = document.createElement('div');
      explorationTipsEl.className = 'exploration-tips';
      contentContainer.appendChild(explorationTipsEl);
    }
    
    // 清空旧内容并添加新提示
    explorationTipsEl.innerHTML = '';
    const tipsHeader = document.createElement('h4');
    tipsHeader.textContent = '探索提示：';
    explorationTipsEl.appendChild(tipsHeader);
    
    const tipsList = document.createElement('ul');
    treasureProcess.explorationTips.forEach(tip => {
      const tipItem = document.createElement('li');
      tipItem.textContent = tip;
      tipsList.appendChild(tipItem);
    });
    explorationTipsEl.appendChild(tipsList);

    const oldTimeline = contentContainer.querySelector('.scene-timeline');
    if (oldTimeline) {
      oldTimeline.remove();
    }
    const stepMeta = treasureProcess.stepDescriptions || null;
    if (stepMeta) {
      const orderedKeys = ['first', 'second', 'third', 'final'];
      const timelineItems = orderedKeys
        .map(key => (stepMeta[key] ? { key, text: stepMeta[key] } : null))
        .filter(Boolean);
      if (timelineItems.length) {
        const timelineEl = document.createElement('div');
        timelineEl.className = 'scene-timeline';
        const header = document.createElement('h4');
        header.textContent = '探索节奏';
        timelineEl.appendChild(header);
        if (treasureProcess.storyProgression) {
          const intro = document.createElement('p');
          intro.className = 'scene-timeline-intro';
          intro.textContent = treasureProcess.storyProgression;
          timelineEl.appendChild(intro);
        }
        const listEl = document.createElement('ol');
        listEl.className = 'scene-timeline-list';
        const titleSeeds = ['起点洞察', '线索解析', '深入推进', '终局揭晓'];
        timelineItems.forEach((item, idx) => {
          const li = document.createElement('li');
          li.className = 'scene-timeline-item';
          const indexEl = document.createElement('span');
          indexEl.className = 'scene-step-index';
          indexEl.textContent = String(idx + 1).padStart(2, '0');
          const bodyEl = document.createElement('div');
          bodyEl.className = 'scene-step-body';
          const titleEl = document.createElement('div');
          titleEl.className = 'scene-step-title';
          titleEl.textContent = titleSeeds[idx] || `第 ${idx + 1} 阶段`;
          const textEl = document.createElement('p');
          textEl.className = 'scene-step-text';
          textEl.textContent = item.text;
          bodyEl.appendChild(titleEl);
          bodyEl.appendChild(textEl);
          li.appendChild(indexEl);
          li.appendChild(bodyEl);
          listEl.appendChild(li);
        });
        timelineEl.appendChild(listEl);
        contentContainer.appendChild(timelineEl);
      }
    }
  } else {
    if(narrativeEl) {
      narrativeEl.textContent = s.desc;
      narrativeEl.style.opacity = '1';
    }
    
    // 移除可能存在的内容容器
    const contentContainer = document.querySelector('.scene-content');
    if (contentContainer) {
      contentContainer.remove();
    }
  }

  if(id === 'clocktower'){
    renderClocktowerExperience();
  }
  
  // 控制场景导航按钮的显示/隐藏
  const prevBtn = document.getElementById('prev-scene');
  const nextBtn = document.getElementById('next-scene');
  
  if (prevBtn) {
    prevBtn.style.display = s.prevScene ? 'inline-block' : 'none';
    
    // 移除旧的事件监听器，避免重复绑定
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    
    // 添加新的事件监听器
    newPrevBtn.addEventListener('click', () => {
      navigateToScene(s.prevScene);
    });
  }
  
  if (nextBtn) {
    nextBtn.style.display = s.nextScene ? 'inline-block' : 'none';
    
    // 移除旧的事件监听器，避免重复绑定
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    // 添加新的事件监听器
    newNextBtn.addEventListener('click', () => {
      navigateToScene(s.nextScene);
    });
  }
  
  setLoading(false);
  saveState();

  // render mini-map hotspots
  renderMiniMap(s);
}

function renderMiniMap(scene){
  const map = document.getElementById('mini-map');
  map.innerHTML = '';
  const canvas = document.createElement('div');
  canvas.className = 'map-canvas';
  canvas.style.backgroundImage = `url('${scene.image}')`;
  map.appendChild(canvas);
  // add markers
  const foundMap = state.hotspotsFound[scene.id] || {};
  const hintedId = state.hintedHotspots ? state.hintedHotspots[scene.id] : null;
  (scene.hotspots||[]).forEach(h=>{
    const m = document.createElement('div');
    m.className = 'marker';
    if(foundMap[h.id]) m.classList.add('found');
    if(hintedId && hintedId === h.id && !foundMap[h.id]) m.classList.add('hinted');
    m.style.left = h.x + '%';
    m.style.top = h.y + '%';
    m.dataset.title = h.title;
    m.title = h.title;
    m.addEventListener('click', (e)=>{
      e.stopPropagation();
      // quick visual feedback
      setStatus('正在探索：' + h.title);
      // perform exploration for this hotspot
      tryFindTreasure(h.id);
      // optimistic UI
      m.classList.add('found');
    });
    canvas.appendChild(m);
  });
}

function renderClocktowerExperience(){
  let contentContainer = document.querySelector('.scene-content');
  if(!contentContainer){
    const wrapper = narrativeEl && narrativeEl.parentNode ? narrativeEl.parentNode : sceneMeta;
    if(wrapper){
      contentContainer = document.createElement('div');
      contentContainer.className = 'scene-content';
      if(narrativeEl && narrativeEl.parentNode){
        narrativeEl.parentNode.insertBefore(contentContainer, narrativeEl.nextSibling);
      } else {
        wrapper.appendChild(contentContainer);
      }
    }
  }
  if(!contentContainer) return;
  if(sceneHero){
    sceneHero.classList.add('clocktower-layout');
  }

  const panel = document.createElement('div');
  panel.className = 'clocktower-panel';
  panel.innerHTML = `
    <div class="clocktower-info-grid">
      <div class="clocktower-story-card">
        <h4>钟楼观察笔记</h4>
        <ul>
          <li>镶嵌在钟面上的星象符号会随时间同步变化。</li>
          <li>齿轮之间存在 12 个校准位，必须对齐才能触发暗门。</li>
          <li>越快完成校准，钟摆的回响越清晰，奖励越高。</li>
        </ul>
      </div>
      <div class="clocktower-stats-card">
        <h4>个人成绩</h4>
        <div class="stat-line">最快校准：<span data-clock-bestspeed>--</span></div>
        <div class="stat-line">最高得分：<span data-clock-bestscore>--</span></div>
        <div class="stat-line">连击高分：<span data-clock-clickscore>--</span></div>
        <div class="stat-line">最高连击：<span data-clock-clickcount>--</span></div>
      </div>
    </div>
    <section class="clocktower-game" aria-labelledby="clocktower-game-title">
      <header class="clock-game-header">
        <div>
          <h4 id="clocktower-game-title">齿轮校准试炼</h4>
          <p>调整三个齿轮，让它们与目标脉冲序列保持完全同步。</p>
        </div>
        <div class="clock-target">目标序列：<span data-clock-target>— : — : —</span></div>
      </header>
      <div class="clock-dials" role="group" aria-label="齿轮控制">
        <div class="clock-dial" data-clock-dial="0">
          <button type="button" class="clock-btn" data-clock-dec="0" aria-label="减小第一齿轮">-</button>
          <div class="clock-dial-face"><span data-clock-value>00</span></div>
          <button type="button" class="clock-btn" data-clock-inc="0" aria-label="增大第一齿轮">+</button>
        </div>
        <div class="clock-dial" data-clock-dial="1">
          <button type="button" class="clock-btn" data-clock-dec="1" aria-label="减小第二齿轮">-</button>
          <div class="clock-dial-face"><span data-clock-value>00</span></div>
          <button type="button" class="clock-btn" data-clock-inc="1" aria-label="增大第二齿轮">+</button>
        </div>
        <div class="clock-dial" data-clock-dial="2">
          <button type="button" class="clock-btn" data-clock-dec="2" aria-label="减小第三齿轮">-</button>
          <div class="clock-dial-face"><span data-clock-value>00</span></div>
          <button type="button" class="clock-btn" data-clock-inc="2" aria-label="增大第三齿轮">+</button>
        </div>
      </div>
      <div class="clock-game-meta">
        <div>调整次数：<span data-clock-moves>0</span></div>
        <div>耗时：<span data-clock-time>0.0 秒</span></div>
      </div>
      <div class="clock-game-actions">
        <button type="button" class="clock-action primary" data-clock-start>开启校准</button>
        <button type="button" class="clock-action" data-clock-submit disabled>同步振铃</button>
        <button type="button" class="clock-action" data-clock-reset disabled>重置当前</button>
      </div>
      <div class="clock-game-status" data-clock-status>点击“开启校准”触发齿轮运转。</div>
    </section>
    <section class="clocktower-click" aria-labelledby="clocktower-click-title">
      <header class="clock-click-header">
        <div>
          <h4 id="clocktower-click-title">钟摆连击</h4>
          <p>在时间耗尽前尽可能敲击能量板，连击越快，奖励越丰厚。</p>
        </div>
        <div class="clock-click-timer">剩余：<span data-click-time>5.0 秒</span></div>
      </header>
      <div class="clock-click-body">
        <button type="button" class="clock-click-pad" data-click-pad disabled>点击充能</button>
        <div class="clock-click-stats">
          <div>总点击：<span data-click-count>0</span></div>
          <div>平均连击：<span data-click-cps>0.00 次/秒</span></div>
          <div data-click-status>点击“开始冲击”进入倒计时。</div>
        </div>
      </div>
      <div class="clock-click-actions">
        <button type="button" class="clock-action primary" data-click-start>开始冲击</button>
        <button type="button" class="clock-action" data-click-stop disabled>提前结束</button>
      </div>
    </section>
  `;

  contentContainer.insertBefore(panel, contentContainer.firstChild);

  const bestScoreEl = panel.querySelector('[data-clock-bestscore]');
  const bestTimeEl = panel.querySelector('[data-clock-bestspeed]');
  const clickBestScoreEl = panel.querySelector('[data-clock-clickscore]');
  const clickBestCountEl = panel.querySelector('[data-clock-clickcount]');
  const targetEl = panel.querySelector('[data-clock-target]');
  const statusEl = panel.querySelector('[data-clock-status]');
  const movesEl = panel.querySelector('[data-clock-moves]');
  const timeEl = panel.querySelector('[data-clock-time]');
  const startBtn = panel.querySelector('[data-clock-start]');
  const submitBtn = panel.querySelector('[data-clock-submit]');
  const resetBtn = panel.querySelector('[data-clock-reset]');
  const dialEls = Array.from(panel.querySelectorAll('.clock-dial'));
  const clickStartBtn = panel.querySelector('[data-click-start]');
  const clickStopBtn = panel.querySelector('[data-click-stop]');
  const clickPadBtn = panel.querySelector('[data-click-pad]');
  const clickStatusEl = panel.querySelector('[data-click-status]');
  const clickCountEl = panel.querySelector('[data-click-count]');
  const clickCpsEl = panel.querySelector('[data-click-cps]');
  const clickTimeEl = panel.querySelector('[data-click-time]');

  const game = {
    active: false,
    target: [0,0,0],
    current: [0,0,0],
    moves: 0,
    startTs: 0,
    timerId: null,
    lastElapsed: 0
  };

  const clickGame = {
    active: false,
    count: 0,
    startTs: 0,
    duration: 5000,
    timerId: null,
    countdownId: null,
    lastElapsed: 0
  };

  function formatVal(value){
    const v = Number(value)||0;
    return v.toString().padStart(2,'0');
  }

  function updateBestDisplay(){
    const best = state.clocktowerGame || { bestScore: 0, bestTimeMs: null, bestClickScore: 0, bestClickCount: 0 };
    if(bestTimeEl){
      bestTimeEl.textContent = best.bestTimeMs ? (Math.round(best.bestTimeMs/100)/10).toFixed(1) + ' 秒' : '--';
    }
    if(bestScoreEl){
      bestScoreEl.textContent = best.bestScore && best.bestScore > 0 ? best.bestScore : '--';
    }
    if(clickBestScoreEl){
      clickBestScoreEl.textContent = best.bestClickScore && best.bestClickScore > 0 ? best.bestClickScore : '--';
    }
    if(clickBestCountEl){
      clickBestCountEl.textContent = best.bestClickCount && best.bestClickCount > 0 ? best.bestClickCount : '--';
    }
  }

  function updateDials(){
    dialEls.forEach((dial, idx)=>{
      const valueEl = dial.querySelector('[data-clock-value]');
      if(valueEl){ valueEl.textContent = formatVal(game.current[idx]); }
    });
    if(movesEl) movesEl.textContent = game.moves;
  }

  function updateTimeDisplay(){
    if(!timeEl) return;
    if(game.active){
      const elapsed = Date.now() - game.startTs;
      timeEl.textContent = (Math.round(elapsed/100)/10).toFixed(1) + ' 秒';
    } else if(game.lastElapsed){
      timeEl.textContent = (Math.round(game.lastElapsed/100)/10).toFixed(1) + ' 秒';
    } else {
      timeEl.textContent = '0.0 秒';
    }
  }

  function startTimer(){
    if(game.timerId) clearInterval(game.timerId);
    game.timerId = setInterval(updateTimeDisplay, 120);
  }

  function stopTimer(){
    if(game.timerId){
      clearInterval(game.timerId);
      game.timerId = null;
    }
  }

  function stopClickTimers(){
    if(clickGame.timerId){
      clearInterval(clickGame.timerId);
      clickGame.timerId = null;
    }
    if(clickGame.countdownId){
      clearTimeout(clickGame.countdownId);
      clickGame.countdownId = null;
    }
  }

  function setDialEnabled(enabled){
    dialEls.forEach(dial=>{
      const buttons = dial.querySelectorAll('button');
      buttons.forEach(btn=>{ btn.disabled = !enabled; });
      if(enabled){
        dial.classList.add('active');
      } else {
        dial.classList.remove('active');
      }
    });
  }

  function randomTarget(){
    return Array.from({length:3}, ()=> Math.floor(Math.random()*12));
  }

  function startGame(){
    if(game.active) return;
    game.active = true;
    game.target = randomTarget();
    game.current = [0,0,0];
    game.moves = 0;
    game.startTs = Date.now();
    game.lastElapsed = 0;
    if(targetEl) targetEl.textContent = game.target.map(formatVal).join(' : ');
    if(statusEl) statusEl.textContent = '调整齿轮，直至与目标序列完全一致。';
    startBtn.disabled = true;
    submitBtn.disabled = false;
    resetBtn.disabled = false;
    setDialEnabled(true);
    updateDials();
    updateTimeDisplay();
    startTimer();
  }

  function resetGame(){
    if(!game.active) return;
    game.current = [0,0,0];
    game.moves = 0;
    game.startTs = Date.now();
    game.lastElapsed = 0;
    if(statusEl) statusEl.textContent = '已重置当前尝试，继续校准。';
    updateDials();
    updateTimeDisplay();
  }

  function optimalMoveCount(){
    return game.target.reduce((sum,val)=> sum + Math.min(val, 12 - val), 0);
  }

  function reportScore(total, base, bonus, penalty, elapsed){
    const details = {
      type: 'miniGame',
      sceneId: 'clocktower',
      miniGameId: 'clock-alignment',
      score: total,
      base,
      bonus,
      penalty,
      timeMs: elapsed,
      attempts: game.moves,
      label: '齿轮校准'
    };
    try{
      const bridge = window.__VueTreasureBridge;
      const userId = bridge && typeof bridge.getCurrentUserId === 'function' ? bridge.getCurrentUserId() : null;
      if(bridge && typeof bridge.reportScore === 'function'){
        bridge.reportScore(userId, details);
      } else {
        window.dispatchEvent(new CustomEvent('treasure-score-recorded',{ detail: Object.assign({ id: 'clock-'+Date.now(), userId }, details) }));
      }
    }catch(e){ console.warn('clocktower score上报失败', e); }
  }

  function reportClickScore(total, base, bonus, elapsed, count){
    const details = {
      type: 'miniGame',
      sceneId: 'clocktower',
      miniGameId: 'clock-click',
      score: total,
      base,
      bonus,
      penalty: 0,
      timeMs: elapsed,
      attempts: count,
      clicks: count,
      label: '钟摆连击'
    };
    try{
      const bridge = window.__VueTreasureBridge;
      const userId = bridge && typeof bridge.getCurrentUserId === 'function' ? bridge.getCurrentUserId() : null;
      if(bridge && typeof bridge.reportScore === 'function'){
        bridge.reportScore(userId, details);
      } else {
        window.dispatchEvent(new CustomEvent('treasure-score-recorded',{ detail: Object.assign({ id: 'clockclick-'+Date.now(), userId }, details) }));
      }
    }catch(e){ console.warn('clocktower click score上报失败', e); }
  }

  function completeGame(){
    if(!game.active) return;
    stopTimer();
    const elapsed = Date.now() - game.startTs;
    game.lastElapsed = elapsed;
    const base = 700;
    const speedBonus = Math.max(0, 500 - Math.round(elapsed / 40));
    const movePenalty = Math.max(0, (game.moves - Math.max(1, optimalMoveCount())) * 30);
    const total = Math.max(90, base + speedBonus - movePenalty);
    if(statusEl){
      statusEl.textContent = `校准完成！用时 ${(Math.round(elapsed/100)/10).toFixed(1)} 秒，得分 ${total}。`;
    }
    if(!state.clocktowerGame) state.clocktowerGame = { bestScore: 0, bestTimeMs: null };
    if(!state.clocktowerGame.bestTimeMs || elapsed < state.clocktowerGame.bestTimeMs){
      state.clocktowerGame.bestTimeMs = elapsed;
    }
    if(total > (state.clocktowerGame.bestScore || 0)){
      state.clocktowerGame.bestScore = total;
    }
    updateBestDisplay();
    try{ saveState(); }catch(e){ console.warn('保存钟楼成绩失败', e); }
    reportScore(total, base, speedBonus, movePenalty, elapsed);
    setDialEnabled(false);
    startBtn.disabled = false;
    submitBtn.disabled = true;
    resetBtn.disabled = true;
    game.active = false;
    updateTimeDisplay();
  }

  function mismatchHint(){
    const diffs = game.current.map((value, idx)=>{
      const target = game.target[idx];
      const raw = Math.abs(value - target);
      const shortest = Math.min(raw, 12 - raw);
      return shortest === 0 ? '✓' : `±${shortest}`;
    });
    return diffs.join(' · ');
  }

  function submitGame(){
    if(!game.active) return;
    if(game.current.every((value, idx)=> value === game.target[idx])){
      completeGame();
    } else {
      if(statusEl) statusEl.textContent = '尚未对齐：' + mismatchHint();
    }
  }

  function adjustDial(index, direction){
    if(!game.active) return;
    const delta = direction === 'inc' ? 1 : -1;
    const next = (game.current[index] + delta + 12) % 12;
    game.current[index] = next;
    game.moves += 1;
    updateDials();
    updateTimeDisplay();
    if(game.current.every((value, idx)=> value === game.target[idx])){
      // 自动完成，给予少量提示
      if(statusEl) statusEl.textContent = '齿轮锁定！准备同步振铃或直接提交。';
    }
  }

  dialEls.forEach((dial, idx)=>{
    const inc = dial.querySelector('[data-clock-inc]');
    const dec = dial.querySelector('[data-clock-dec]');
    if(inc) inc.addEventListener('click', ()=> adjustDial(idx, 'inc'));
    if(dec) dec.addEventListener('click', ()=> adjustDial(idx, 'dec'));
  });

  startBtn.addEventListener('click', startGame);
  submitBtn.addEventListener('click', submitGame);
  resetBtn.addEventListener('click', resetGame);

  function updateClickDisplay(){
    if(clickCountEl) clickCountEl.textContent = clickGame.count;
    const elapsed = clickGame.active ? Date.now() - clickGame.startTs : (clickGame.lastElapsed || 0);
    const seconds = elapsed > 0 ? elapsed / 1000 : 0;
    const cps = seconds > 0 ? clickGame.count / seconds : 0;
    if(clickCpsEl) clickCpsEl.textContent = cps.toFixed(2) + ' 次/秒';
    const remaining = clickGame.active
      ? Math.max(0, clickGame.duration - (Date.now() - clickGame.startTs))
      : (clickGame.lastElapsed ? Math.max(0, clickGame.duration - clickGame.lastElapsed) : clickGame.duration);
    if(clickTimeEl) clickTimeEl.textContent = (Math.round(remaining/100)/10).toFixed(1) + ' 秒';
  }

  function finishClickGame(early){
    if(!clickGame.active) return;
    stopClickTimers();
    clickGame.active = false;
    const elapsed = Date.now() - clickGame.startTs;
    clickGame.lastElapsed = elapsed;
    const seconds = Math.max(0.5, elapsed/1000);
    const base = clickGame.count * 30;
    const rate = clickGame.count / seconds;
    const bonus = Math.max(0, Math.round(rate * 20));
    const total = Math.max(60, base + bonus);
    if(clickStatusEl){
      clickStatusEl.textContent = (early ? '提前结束。' : '倒计时完成。') + `共击打 ${clickGame.count} 次，得分 ${total}。`;
    }
    if(clickPadBtn) clickPadBtn.disabled = true;
  if(clickPadBtn) clickPadBtn.classList.remove('hit');
    if(clickStopBtn) clickStopBtn.disabled = true;
    if(clickStartBtn) clickStartBtn.disabled = false;
    if(!state.clocktowerGame) state.clocktowerGame = { bestScore: 0, bestTimeMs: null, bestClickScore: 0, bestClickCount: 0 };
    if(total > (state.clocktowerGame.bestClickScore || 0)){
      state.clocktowerGame.bestClickScore = total;
    }
    if(clickGame.count > (state.clocktowerGame.bestClickCount || 0)){
      state.clocktowerGame.bestClickCount = clickGame.count;
    }
    updateBestDisplay();
    try{ saveState(); }catch(e){ console.warn('保存钟楼连击成绩失败', e); }
    reportClickScore(total, base, bonus, elapsed, clickGame.count);
    updateClickDisplay();
  }

  function tickClickTimer(){
    if(!clickGame.active) return;
    updateClickDisplay();
  }

  function startClickGame(){
    if(clickGame.active) return;
    clickGame.active = true;
    clickGame.count = 0;
    clickGame.startTs = Date.now();
    clickGame.lastElapsed = 0;
    updateClickDisplay();
    if(clickStatusEl) clickStatusEl.textContent = '全力敲击！保持高连击率以获得更多奖励。';
    if(clickPadBtn) clickPadBtn.disabled = false;
    if(clickStartBtn) clickStartBtn.disabled = true;
    if(clickStopBtn) clickStopBtn.disabled = false;
    clickGame.timerId = setInterval(tickClickTimer, 100);
    clickGame.countdownId = setTimeout(()=> finishClickGame(false), clickGame.duration);
  }

  function stopClickGameEarly(){
    if(!clickGame.active) return;
    finishClickGame(true);
  }

  function handleClickPad(){
    if(!clickGame.active) return;
    clickGame.count += 1;
    if(clickPadBtn){
      clickPadBtn.classList.add('hit');
      setTimeout(()=> clickPadBtn && clickPadBtn.classList.remove('hit'), 90);
    }
    updateClickDisplay();
  }

  if(clickStartBtn) clickStartBtn.addEventListener('click', startClickGame);
  if(clickStopBtn) clickStopBtn.addEventListener('click', stopClickGameEarly);
  if(clickPadBtn) clickPadBtn.addEventListener('click', handleClickPad);

  updateBestDisplay();
  setDialEnabled(false);
  updateDials();
  updateTimeDisplay();
  updateClickDisplay();

  cleanupClocktowerGame = ()=>{
    stopTimer();
    stopClickTimers();
    clickGame.active = false;
  };
}

function backToPanorama(){
  state.currentSceneId = null;
  panoramaPage.classList.remove('hidden');
  scenePage.classList.add('hidden');
  stopMusic();
  if(cleanupClocktowerGame){
    try{ cleanupClocktowerGame(); }catch(e){ console.warn('clocktower cleanup failed', e); }
    cleanupClocktowerGame = null;
  }
  saveState();
  renderLocations();
  updateChallengeEnergyUI();
}

function playSceneMusic(filename){
  // HTML audio src expects a path; mp3 files are in same folder
  audioEl.src = filename;
  audioEl.volume = state.volume ?? 0.6;
  audioEl.play().catch(e=>console.warn('播放失败',e));
}

function stopMusic(){
  audioEl.pause();
  audioEl.currentTime = 0;
}

function setStatus(msg){
  const meta = document.querySelector('.scene-meta');
  if(meta){
    let s = meta.querySelector('.status');
    if(!s){ s = document.createElement('div'); s.className = 'status'; s.style.marginTop = '8px'; s.style.color='#cbd5e1'; meta.appendChild(s); }
    s.textContent = msg;
  }
}

function setLoading(loading){
  if(loading){
    findBtn.setAttribute('disabled','true');
    findBtn.innerHTML = '探索中 <span class="spinner" aria-hidden="true"></span>';
  } else {
    findBtn.removeAttribute('disabled');
    findBtn.innerHTML = '探索/找寻宝藏';
  }
}

function updateBadgeForScene(id){
  const foundMap = state.hotspotsFound[id] || {};
  const rawFoundCount = Object.keys(foundMap).filter(k=>foundMap[k]).length;
  const foundCount = Math.min(1, rawFoundCount);
  if(!foundBadge) return;
  if(foundCount>0){
    foundBadge.textContent = `已发现 ${foundCount}`;
    foundBadge.classList.add('found');
    foundBadge.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:600});
  } else {
    foundBadge.textContent = '未发现';
    foundBadge.classList.remove('found');
  }
  
  // 添加到场景描述的动画效果
  if(narrativeEl){
    narrativeEl.style.opacity = '0';
    setTimeout(() => {
      narrativeEl.style.opacity = '1';
      narrativeEl.style.transition = 'opacity 0.5s ease';
    }, 100);
  }
}

function canUseChallengeEnergy(){
  if((state.challengeEnergy||0) <= 0) return false;
  if(!state.currentSceneId) return false;
  const scene = SCENES.find(s=>s.id===state.currentSceneId);
  if(!scene) return false;
  const foundMap = state.hotspotsFound[state.currentSceneId] || {};
  const discovered = Object.keys(foundMap).some(key=>foundMap[key]);
  if(discovered) return false;
  return true;
}

function updateChallengeEnergyUI(){
  const energy = state.challengeEnergy || 0;
  if(challengeEnergyEl){
    challengeEnergyEl.textContent = '挑战能量：' + energy;
    if(energy > 0){
      challengeEnergyEl.classList.add('has-energy');
    } else {
      challengeEnergyEl.classList.remove('has-energy');
    }
  }
  if(useEnergyBtn){
    if(canUseChallengeEnergy()){
      useEnergyBtn.removeAttribute('disabled');
      useEnergyBtn.textContent = '使用挑战能量提示';
    } else {
      useEnergyBtn.setAttribute('disabled','true');
      if(energy <= 0){
        useEnergyBtn.textContent = '挑战能量不足';
      } else if(!state.currentSceneId){
        useEnergyBtn.textContent = '进入场景后使用';
      } else {
        const foundMap = state.hotspotsFound[state.currentSceneId] || {};
        const discovered = Object.keys(foundMap).some(key=>foundMap[key]);
        useEnergyBtn.textContent = discovered ? '本场景已完成' : '暂不可用';
      }
    }
  }
}

function showEnergyToast(text){
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.right = '28px';
  el.style.bottom = '120px';
  el.style.zIndex = 99997;
  el.style.padding = '8px 12px';
  el.style.background = 'linear-gradient(120deg, rgba(122,255,158,0.95), rgba(94,234,212,0.95))';
  el.style.color = '#001a0f';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 12px 35px rgba(0,0,0,0.25)';
  el.style.fontWeight = 'bold';
  el.style.opacity = '0';
  el.style.transform = 'translateY(12px)';
  document.body.appendChild(el);
  requestAnimationFrame(()=>{
    el.style.transition = 'opacity .3s ease, transform .3s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  setTimeout(()=>{
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(()=> el.remove(), 320);
  }, 1600);
}

function useChallengeEnergy(){
  if(!canUseChallengeEnergy()){
    setStatus('挑战能量不足或当前场景无须提示');
    return;
  }
  const scene = SCENES.find(s=>s.id===state.currentSceneId);
  if(!scene || !scene.hotspots || !scene.hotspots.length){
    setStatus('当前场景没有可用的提示');
    return;
  }
  const targetHotspot = scene.hotspots[0];
  state.challengeEnergy = Math.max(0, (state.challengeEnergy||0) - 1);
  if(!state.hintedHotspots || typeof state.hintedHotspots !== 'object') state.hintedHotspots = {};
  state.hintedHotspots[state.currentSceneId] = targetHotspot.id;
  saveState();
  renderMiniMap(scene);
  updateChallengeEnergyUI();
  showEnergyToast('提示已激活');
  setStatus('挑战能量扫描：潜在宝藏位置已在迷你地图中高亮');
  if(narrativeEl){
    narrativeEl.textContent = '挑战能量激活，迷你地图中的某个标记开始闪烁，提示可能的藏匿点。';
  }
}

function handleScoreRecorded(event){
  const entry = event && event.detail;
  if(!entry || !entry.type) return;
  if(entry.type === 'miniGame' || entry.type === 'sceneMiniGame'){
    const gain = Math.max(1, Math.round((Number(entry.score)||0) / 400));
    state.challengeEnergy = (state.challengeEnergy || 0) + gain;
    saveState();
    updateChallengeEnergyUI();
    showEnergyToast('挑战能量 +' + gain);
    setStatus('挑战成功！可消耗挑战能量获得线索。');
  }
}

function tryFindTreasure(hotspotId){
  // if called from an event handler without hotspotId, hotspotId may be an Event object — ignore it
  if(hotspotId && typeof hotspotId === 'object' && (hotspotId instanceof Event || hotspotId.type)){
    hotspotId = undefined;
  }
  const id = state.currentSceneId;
  if(!id) return;
  // if this scene already has a found hotspot and per-scene cap is 1, do nothing
  const existing = state.hotspotsFound && state.hotspotsFound[id] ? Object.keys(state.hotspotsFound[id]).filter(k=>state.hotspotsFound[id][k]).length : 0;
  if(existing > 0){
    setStatus('本场景已找到宝藏（每场最多 1 处）');
    setLoading(false);
    return;
  }
  if(busy) return;
  busy = true;
  setLoading(true);

  // 记录尝试与起始时间
  try{
    const sid = state.currentSceneId;
    const attempts = (state.metrics.sceneAttempts[sid]||0) + 1;
    state.metrics.sceneAttempts[sid] = attempts;
    state.metrics.currentStartTs = Date.now();
    saveState();
  }catch(e){ /* ignore */ }

  // 获取当前场景对应的寻宝流程
  const treasureProcess = getSceneTreasureProcess(id);
  if (!treasureProcess) {
    setStatus('无法找到此场景的寻宝流程');
    setLoading(false);
    busy = false;
    return;
  }

  setStatus('开始探索：' + treasureProcess.stepDescriptions.first);

  // 使用场景特定的寻宝流程
  treasureProcess.firstStep()
    .then(clue=>{
      setStatus('线索：' + clue);
      if(narrativeEl) narrativeEl.textContent = clue;
      setStatus('正在进行：' + treasureProcess.stepDescriptions.second);
      return treasureProcess.secondStep(clue);
    })
    .then(location=>{
      setStatus('发现：' + location);
      if(narrativeEl) narrativeEl.textContent = location;
      setStatus('正在进行：' + treasureProcess.stepDescriptions.third);
      return treasureProcess.thirdStep(location);
    })
    .then(box=>{
      setStatus('进展：' + box);
      if(narrativeEl) narrativeEl.textContent = box;
      setStatus('正在进行：' + treasureProcess.stepDescriptions.final);
      return treasureProcess.finalStep();
    })
    .then(treasure=>{
      // mark hotspot as found (if provided) else mark first hotspot
      if(!state.hotspotsFound || typeof state.hotspotsFound !== 'object') state.hotspotsFound = {};
      if(!state.hotspotsFound[id] || typeof state.hotspotsFound[id] !== 'object') state.hotspotsFound[id] = {};
      if(hotspotId){
  state.hotspotsFound[id][hotspotId] = true;
  console.log('[treasure] marked hotspot found', { scene:id, hotspot:hotspotId });
      } else {
        const first = (SCENES.find(s=>s.id===id).hotspots||[])[0];
        if(first){
          state.hotspotsFound[id][first.id] = true;
          console.log('[treasure] marked first hotspot found', { scene:id, hotspot:first.id });
        }
      }
      if(state.hintedHotspots && state.hintedHotspots[id]){
        delete state.hintedHotspots[id];
      }
  // persist and update UI
      try{ saveState(); }catch(e){ console.warn('保存状态失败', e); }
      // ensure list and progress both refresh
      try{ renderLocations(); }catch(e){ console.warn('渲染位置失败', e); }
      setStatus('成功：' + treasure);
      if(narrativeEl) narrativeEl.textContent = treasure;
      updateBadgeForScene(id);
  try{ updateProgressUI(); }catch(e){ console.warn('更新进度失败', e); }
  updateChallengeEnergyUI();
  // 尝试通过 Vue 桥接上报分数（非破坏性）
  try{
    const bridge = window.__VueTreasureBridge;
    if(bridge && typeof bridge.reportScore === 'function'){
      // 若 bridge 提供 getCurrentUserId，则尝试获取当前用户
      let userId = null;
      try{ if(typeof bridge.getCurrentUserId === 'function') userId = bridge.getCurrentUserId(); }catch(e){ /* ignore */ }
      // 详细计分：基础分(随难度)，时间奖励，连击奖励，尝试惩罚
      const diff = SCENE_DIFFICULTY[id] || 1;
      const base = 800 + 400*diff;
      const now = Date.now();
      const elapsedMs = Math.max(0, now - (state.metrics.currentStartTs||now));
      const timeFactor = Math.max(0, 1 - (elapsedMs/60000)); // 1分钟内越快越高
      const timeBonus = Math.round(600 * timeFactor);
      const recentWindow = 2*60*1000; // 2分钟内连击
      const streakBonus = (state.metrics.lastSuccessTs && (now - state.metrics.lastSuccessTs) <= recentWindow) ? 200 : 0;
      const attempts = (state.metrics.sceneAttempts && state.metrics.sceneAttempts[id]) ? state.metrics.sceneAttempts[id] : 1;
      const penalty = Math.max(0, (attempts-1) * 200);
      const total = Math.max(50, base + timeBonus + streakBonus - penalty);
      const details = {
        type: 'sceneFind',
        sceneId: id,
        base,
        bonus: timeBonus + streakBonus,
        penalty,
        timeMs: elapsedMs,
        attempts,
        score: total
      };
      try{
        const entry = bridge.reportScore(userId, details);
        try{
          if(entry && entry.id) localStorage.setItem('async-treasure-last-score-id', entry.id);
          // store user for highlighting (may be null -> store empty string)
          localStorage.setItem('async-treasure-last-score-user', entry && entry.userId ? entry.userId : (userId || ''));
        }catch(_){ }
        try{ location.hash = '#leaderboard'; }catch(_){ }
      }catch(e){ console.warn('bridge.reportScore failed', e); }
      // 记录最近一次成功
      try{ state.metrics.lastSuccessTs = now; state.metrics.lastSuccessScene = id; state.metrics.currentStartTs = 0; saveState(); }catch(e){ /* ignore */ }
      // 分数提示
      try{ showScoreToast('+' + total + ' 分'); }catch(e){ /* ignore */ }
    }
  }catch(e){ console.warn('bridge integration error', e); }

  setLoading(false);
    })
    .catch(err=>{
      console.error('探索失败', err);
      setStatus('探索失败：' + err);
      if(narrativeEl) narrativeEl.textContent = '探索过程中遇到困难：' + err;
      setLoading(false);
    })
    .finally(()=>{ busy=false; });
}

// 简易分数提示
function showScoreToast(text){
  const anchor = document.getElementById('found-badge') || document.body;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.right = '24px';
  el.style.top = '88px';
  el.style.zIndex = 99998;
  el.style.padding = '8px 12px';
  el.style.background = 'linear-gradient(90deg, rgba(122,255,158,0.9), rgba(94,234,212,0.9))';
  el.style.color = '#002b00';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  el.style.fontWeight = 'bold';
  el.style.opacity = '0';
  el.style.transform = 'translateY(-6px)';
  document.body.appendChild(el);
  requestAnimationFrame(()=>{
    el.style.transition = 'opacity .3s ease, transform .3s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  setTimeout(()=>{
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(()=> el.remove(), 320);
  }, 1600);
}

function resetProgress(){
  if(!confirm('确定要重置所有进度吗？')) return;
  state = createDefaultState();
  successShown = false;
  localStorage.removeItem(STORAGE_KEY);
  renderLocations();
  backToPanorama();
  updateProgressUI();
  updateChallengeEnergyUI();
}

// 创建古老图书馆的特殊布局
function createLibraryLayout() {
  const sceneContent = document.querySelector('.scene-content');
  if (!sceneContent) return;
  
  // 创建书架容器
  const bookshelfContainer = document.createElement('div');
  bookshelfContainer.className = 'bookshelf-container';
  
  // 添加到场景内容中
  sceneContent.appendChild(bookshelfContainer);
  
  // 生成书架
  const bookshelves = 2; // 书架数量
  const booksPerShelf = 8; // 每层书架的书籍数量
  
  for (let shelfIndex = 0; shelfIndex < bookshelves; shelfIndex++) {
    const bookshelf = document.createElement('div');
    bookshelf.className = 'bookshelf';
    bookshelf.dataset.shelfIndex = shelfIndex;
    
    // 添加书架标题
    const shelfTitle = document.createElement('div');
    shelfTitle.className = 'shelf-title';
    shelfTitle.textContent = shelfIndex === 0 ? '历史文献区' : '神秘手稿区';
    bookshelf.appendChild(shelfTitle);
    
    // 添加书籍
    const booksRow = document.createElement('div');
    booksRow.className = 'books-row';
    
    for (let bookIndex = 0; bookIndex < booksPerShelf; bookIndex++) {
      const bookId = `book-${shelfIndex}-${bookIndex}`;
      const book = document.createElement('div');
      book.className = 'book';
      book.dataset.bookId = bookId;
      
      // 随机书籍颜色
      const colors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#BC8F8F'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      book.style.backgroundColor = randomColor;
      
      // 随机书籍厚度
      const thickness = Math.floor(Math.random() * 15) + 10;
      book.style.width = `${thickness}px`;
      
      // 随机书籍高度（稍微不同，增加真实感）
      const heightVariation = Math.floor(Math.random() * 8) - 4;
      book.style.height = `${200 + heightVariation}px`;
      
      // 检查这本书是否已被发现
      const isFound = state.hotspotsFound['library'] && state.hotspotsFound['library'][bookId];
      if (isFound) {
        book.classList.add('book-found');
      }
      
      // 添加点击事件
      book.addEventListener('click', () => {
        exploreBook(bookId, book);
      });
      
      booksRow.appendChild(book);
    }
    
    bookshelf.appendChild(booksRow);
    bookshelfContainer.appendChild(bookshelf);
  }
}

// 探索书籍的功能
function exploreBook(bookId, bookElement) {
  if (busy) return;
  
  // 检查是否已经探索过这本书
  if (state.hotspotsFound['library'] && state.hotspotsFound['library'][bookId]) {
    narrativeEl.textContent = '你已经探索过这本书了，里面的秘密已经被揭开。';
    return;
  }
  
  busy = true;
  
  // 随机决定这本书是否包含线索
  const hasClue = Math.random() > 0.3; // 70% 的概率包含线索
  
  // 设置旁白
  if (hasClue) {
    narrativeEl.textContent = '你翻开了这本书，页面上的文字开始发光...你发现了重要线索！';
    
    // 标记这本书为已发现
    if (!state.hotspotsFound['library']) {
      state.hotspotsFound['library'] = {};
    }
    state.hotspotsFound['library'][bookId] = true;
    
    // 添加已发现样式
    setTimeout(() => {
      bookElement.classList.add('book-found');
      saveState();
      updateProgressUI();
      busy = false;
    }, 1000);
  } else {
    narrativeEl.textContent = '你仔细阅读了这本书，但没有发现特别的线索。继续寻找吧。';
    
    setTimeout(() => {
      busy = false;
    }, 1000);
  }
}

function updateProgressUI(){
  // progress by hotspots
  // now count per scene (max 1 per scene)
  const totalScenes = SCENES.length;
  let foundScenes = 0;
  SCENES.forEach(s=>{
    const fm = state.hotspotsFound[s.id] || {};
    const raw = Object.keys(fm).filter(k=>fm[k]).length;
    if(raw>0) foundScenes += 1;
  });
  if(foundCountEl) foundCountEl.textContent = String(foundScenes);
  if(totalCountEl) totalCountEl.textContent = String(totalScenes);
  if(progressBarEl) progressBarEl.style.width = (totalScenes?((foundScenes/totalScenes)*100):0) + '%';
  // if complete and not yet shown, show success
  if(totalScenes && foundScenes === totalScenes && !successShown){
    successShown = true;
    showTreasureSuccess();
  }
}

function showTreasureSuccess(){
  // create a temporary banner at top-center
  try{
    const b = document.createElement('div');
    b.id = 'treasure-success';
    b.textContent = '恭喜！你已找到所有宝藏 🎉';
    b.style.position = 'fixed';
    b.style.left = '50%';
    b.style.top = '18px';
    b.style.transform = 'translateX(-50%)';
    b.style.padding = '12px 18px';
    b.style.background = 'linear-gradient(90deg,#b7ffd6,#7aff9e)';
    b.style.color = '#002b00';
    b.style.borderRadius = '8px';
    b.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
    b.style.zIndex = 99999;
    document.body.appendChild(b);
    setTimeout(()=>{ b.style.transition='opacity 1s'; b.style.opacity='0'; setTimeout(()=>b.remove(),1000); }, 4000);
  }catch(e){ alert('恭喜！你已找到所有宝藏 🎉'); }
}

// panorama drag behavior
let isDragging = false;
let startX = 0;
let currentOffset = 0; // px

function onPanStart(e){
  isDragging = true;
  panoramaInner.classList.add('touch-dragging');
  startX = (e.touches ? e.touches[0].clientX : e.clientX);
}
function onPanMove(e){
  if(!isDragging) return;
  const x = (e.touches ? e.touches[0].clientX : e.clientX);
  const dx = x - startX;
  const width = panoramaView.clientWidth;
  // panoramaInner width is 2x, translate from 0 to -width
  let newOffset = currentOffset + dx;
  // clamp
  newOffset = Math.max(Math.min(newOffset, 0), -width);
  panoramaInner.style.transform = `translateX(${newOffset}px)`;
}
function onPanEnd(e){
  if(!isDragging) return;
  const width = panoramaView.clientWidth;
  const style = panoramaInner.style.transform || 'translateX(0px)';
  const match = style.match(/translateX\((-?\d+)px\)/);
  currentOffset = match ? parseInt(match[1],10) : 0;
  isDragging = false;
  panoramaInner.classList.remove('touch-dragging');
}

// attach panorama events
panoramaInner.addEventListener('mousedown', onPanStart);
window.addEventListener('mousemove', onPanMove);
window.addEventListener('mouseup', onPanEnd);
panoramaInner.addEventListener('touchstart', onPanStart, {passive:true});
panoramaInner.addEventListener('touchmove', onPanMove, {passive:true});
panoramaInner.addEventListener('touchend', onPanEnd);

// 初始化
loadState();
renderLocations();

// restore last scene if exists
if(state.currentSceneId){
  // preload image then open
  const s = SCENES.find(x=>x.id===state.currentSceneId);
  if(s){
    const i = new Image();
    i.src = s.image;
    i.onload = ()=> openScene(state.currentSceneId);
    i.onerror = ()=> openScene(state.currentSceneId);
  }
}

// initial badge/progress update
updateProgressUI();
if(state.currentSceneId) updateBadgeForScene(state.currentSceneId);

// preload other images
SCENES.forEach(s=>{ const i=new Image(); i.src=s.image; });

volumeEl.value = state.volume;
volumeEl.addEventListener('input', e=>{
  const v = parseFloat(e.target.value);
  state.volume = v;
  audioEl.volume = v;
  saveState();
});

backBtn.addEventListener('click', backToPanorama);
// bind find button with wrapper so event object is not passed as hotspotId
findBtn.addEventListener('click', (e)=>{ e.preventDefault(); tryFindTreasure(); });
resetBtn.addEventListener('click', resetProgress);
if(useEnergyBtn) useEnergyBtn.addEventListener('click', useChallengeEnergy);
window.addEventListener('treasure-score-recorded', handleScoreRecorded);
updateChallengeEnergyUI();

// allow clicking audio to toggle pause/play
audioEl.addEventListener('click', ()=>{
  if(audioEl.paused) audioEl.play(); else audioEl.pause();
});
