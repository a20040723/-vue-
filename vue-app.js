// vue-app.js
// 非破坏性地将一个小型 Vue 应用挂载到页面，用于用户管理和排行，并提供一个 Vue 化的侧边栏/导航。
// 要求：至少 3 层组件嵌套、5+ 组件。与原始脚本共存，不替换原逻辑。
(function(){
  function createDebugBanner(msg){
    try{
      const id = 'vue-debug-banner';
      if(document.getElementById(id)) return;
      const b = document.createElement('div');
      b.id = id;
      b.style.position = 'fixed';
      b.style.right = '18px';
      b.style.bottom = '18px';
      b.style.zIndex = 2147483647;
      b.style.background = 'linear-gradient(90deg,#ffb86b,#7aff9e)';
      b.style.color = '#001';
      b.style.padding = '10px 14px';
      b.style.borderRadius = '8px';
      b.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
      b.style.fontSize = '13px';
      b.textContent = msg;
      document.body.appendChild(b);
    }catch(e){ console.warn('createDebugBanner failed', e); }
  }
  if(!window.Vue){
    console.warn('Vue 未加载，vue-app.js 将不会工作。');
    createDebugBanner('Vue 未加载 — 页面增强侧边栏无法显示，检查网络或 CDN。查看控制台获取详细信息。');
    return;
  }
  const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount } = Vue;

  // --- 简单的 hash 路由 ---
  const route = ref(location.hash.replace('#','') || 'home');
  window.addEventListener('hashchange', ()=> route.value = location.hash.replace('#','') || 'home');

  // --- localStorage keys ---
  const USERS_KEY = 'async-treasure-users-v1';
  const SCORES_KEY = 'async-treasure-scores-v1';
  const CURRENT_USER_KEY = 'async-treasure-current-user-v1';

  // --- helpers ---
  function loadJSON(key, fallback){
    try{ const raw = localStorage.getItem(key); if(!raw) return fallback; return JSON.parse(raw); }catch(e){ console.warn('loadJSON err',e); return fallback; }
  }
  function saveJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ console.warn('saveJSON err',e); } }
  // settings helper
  const UI_SETTINGS_KEY = 'async-treasure-ui-v1';
  function loadSettings(){ try{ const r = localStorage.getItem(UI_SETTINGS_KEY); return r? JSON.parse(r): {}; }catch(e){ return {}; } }
  function saveSettings(s){ try{ localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(s||{})); }catch(e){} }

  // --- data stores ---
  const users = ref(loadJSON(USERS_KEY, []));
  const scores = ref(loadJSON(SCORES_KEY, []));
  const currentUserId = ref(loadJSON(CURRENT_USER_KEY, null));
  const uiSettings = reactive(Object.assign({ collapsed:false, lastRoute: null }, loadSettings()));

  // expose a small API so non-vue code can report scores
  window.__VueTreasureBridge = {
    reportScore(userId, score){
      // 支持传入数字或详情对象 {score, sceneId, base, bonus, penalty, timeMs, attempts, type}
      const now = Date.now();
      let payload = {};
      if(score && typeof score === 'object'){
        const s = Number(score.score)||0;
        payload = {
          score: s,
          sceneId: score.sceneId || null,
          base: Number(score.base)||0,
          bonus: Number(score.bonus)||0,
          penalty: Number(score.penalty)||0,
          timeMs: Number(score.timeMs)||0,
          attempts: Number(score.attempts)||1,
          type: score.type || 'custom'
        };
      } else {
        payload = { score: Number(score)||0, type:'custom' };
      }
      // userId can be null -> anonymous
      const entry = {
        id: String(now) + '-' + Math.random().toString(36).slice(2,8),
        userId: userId || null,
        ts: now,
        ...payload
      };
      scores.value.push(entry);
      saveJSON(SCORES_KEY, scores.value);
      try{
        window.dispatchEvent(new CustomEvent('treasure-score-recorded',{ detail: entry }));
      }catch(e){ console.warn('treasure-score event dispatch failed', e); }
      return entry;
    },
    getScores(){ return scores.value.slice(); },
    getUsers(){ return users.value.slice(); }
    ,
    // allow external deletion of a score
    deleteScore(scoreId){ const idx = scores.value.findIndex(s=>s.id===scoreId); if(idx>=0){ const sp = scores.value.splice(idx,1)[0]; saveJSON(SCORES_KEY, scores.value); return sp; } return null; },
    // allow external update of a user record
    updateUser(userId, patch){ const u = users.value.find(x=>x.id===userId); if(!u) return null; Object.assign(u, patch); saveJSON(USERS_KEY, users.value); return u; },
    // allow external code to query/set current user
    getCurrentUserId(){ return currentUserId.value; },
    setCurrentUser(id){ currentUserId.value = id; try{ saveJSON(CURRENT_USER_KEY, id); }catch(e){} }
  };

  // --- Components ---
  // HeaderProgress: 显示原页面的进度和控制（read-only from DOM）
  const HeaderProgress = {
    name: 'HeaderProgress',
    template: `
      <div class="vue-header-progress">
        <div class="vhp-top">
          <strong>增强侧边栏</strong>
          <small class="vhp-tag">(Vue)</small>
        </div>
        <div class="vhp-stats">
          <div class="vhp-count">已发现: <span>{{found}}</span>/<span>{{total}}</span></div>
          <div class="vhp-bar"><div class="vhp-bar-fill" :style="{width: pct + '%'}"></div></div>
        </div>
      </div>
    `,
    setup(){
      const found = ref(0);
      const total = ref(0);
      const pct = computed(()=> total.value? Math.round((found.value/total.value)*100) : 0);
      function refreshFromDOM(){
        const f = document.getElementById('found-count');
        const t = document.getElementById('total-count');
        if(f) found.value = Number(f.textContent||0);
        if(t) total.value = Number(t.textContent||0);
      }
      onMounted(()=>{
        refreshFromDOM();
        // 轮询少量变化，非侵入式
        setInterval(refreshFromDOM, 1500);
      });
      return { found, total, pct };
    }
  };

  // Nav component
  const AppNav = {
    name: 'AppNav',
    props: ['route','users','currentUserId'],
    template: `
      <nav class="vue-nav">
        <ul class="vue-nav-list">
          <li v-for="item in items" :key="item.key" :class="['vue-nav-item',{active: route===item.key}]">
            <a :href="'#' + item.key" class="nav-link">
              <span class="nav-icon" v-html="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </li>
        </ul>
        <div class="user-mini">
          <div v-if="currentUser">当前: <strong>{{currentUser.name}}</strong></div>
          <div v-else><small>未登录</small></div>
        </div>
      </nav>
    `,
    computed: {
      // no-op; using setup would be more explicit but keep template simple
    },
    setup(props){
      const currentUser = computed(()=> (props.users||[]).find(u=>u.id===props.currentUserId) || null);
      const items = [
        { key:'home', label:'游玩', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11L12 4L21 11V20C21 20.552 20.552 21 20 21H4C3.448 21 3 20.552 3 20V11Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { key:'challenges', label:'挑战', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8L12 12L16 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16H16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { key:'users', label:'用户', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C18.2091 11 20 9.20914 20 7C20 4.79086 18.2091 3 16 3C13.7909 3 12 4.79086 12 7C12 9.20914 13.7909 11 16 11Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21C6 17.6863 8.68629 15 12 15H13.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { key:'leaderboard', label:'排行', icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3V21H21" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="12" width="3" height="6" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="12" y="8" width="3" height="10" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="17" y="4" width="3" height="14" rx="0.5" stroke="currentColor" stroke-width="1.2"/></svg>' }
      ];
      return { currentUser, items };
    }
  };

  // PanoramaView: 嵌套示例 - 此组件会显示一个启动旧版全景的按钮
  const PanoramaView = {
    name: 'PanoramaView',
    template: `
      <section class="pv-section">
        <h3>原版全景游戏</h3>
        <p class="pv-desc">保留并可从这里打开原始寻宝游戏界面。</p>
        <div class="pv-controls">
          <select v-model="selectedScene" class="pv-select">
            <option v-for="s in scenes" :value="s.id" :key="s.id">{{s.title}}</option>
          </select>
          <button class="pv-btn" @click="openScene">打开场景</button>
          <button class="pv-btn" @click="randomStart">随机开始</button>
        </div>
        <div class="pv-note"><small>说明：此按钮会调用原有的 window.navigateToScene(sceneId)。</small></div>
      </section>
    `,
    setup(){
      const scenes = ref([]);
      const selectedScene = ref(null);

      function loadScenesFromGlobals(){
        try{
          // prefer explicit window.SCENES (safe), fall back to plain SCENES when present
          const raw = (window && window.SCENES) ? window.SCENES : (typeof SCENES !== 'undefined' ? SCENES : null);
          if(Array.isArray(raw)){
            scenes.value = raw.map(s=>({ id: s.id, title: s.title || s.id }));
            if(scenes.value.length && !selectedScene.value) selectedScene.value = scenes.value[0].id;
            return true;
          }
        }catch(e){ /* ignore */ }
        scenes.value = [];
        return false;
      }

      onMounted(()=>{
        const ok = loadScenesFromGlobals();
        if(!ok){
          // try to derive scenes from DOM list (fallback)
          try{
            const nodes = Array.from(document.querySelectorAll('#locations .location'));
            if(nodes.length){
              scenes.value = nodes.map(n=>({ id: n.dataset.id || n.getAttribute('data-id') || n.id || '', title: (n.querySelector('h3') && n.querySelector('h3').textContent) || n.textContent.slice(0,20) } )).filter(x=>x.id);
              if(scenes.value.length) selectedScene.value = scenes.value[0].id;
            }
          }catch(e){}
        }
      });

      // resilient openScene: try multiple strategies in order
      function openScene(){
        const id = selectedScene.value;
        if(!id) return alert('请先选择一个场景');

        // 1) window.navigateToScene if provided
        try{
          if(window && typeof window.navigateToScene === 'function'){
            window.navigateToScene(id);
            return;
          }
        }catch(e){}

        // 2) global navigateToScene (old-style global function)
        try{
          if(typeof navigateToScene === 'function'){
            navigateToScene(id);
            return;
          }
        }catch(e){}

        // 3) try to simulate click on the location element (DOM fallback)
        try{
          const el = document.querySelector(`#locations .location[data-id="${id}"]`) || document.querySelector(`#locations .location[id="${id}"]`);
          if(el){ el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); return; }
        }catch(e){}

        // 4) as a last resort, inform the user
        alert('无法调用页面原始的场景导航函数 (navigateToScene)，请检查页面或在控制台手动调用 navigateToScene("' + id + '")');
      }

      function randomStart(){ if(!scenes.value.length) return alert('未找到可用场景'); const idx = Math.floor(Math.random()*scenes.value.length); selectedScene.value = scenes.value[idx].id; openScene(); }

      // currentUserId is in outer scope; we'll reference via closure
      return { scenes, selectedScene, openScene, randomStart };
    }
  };

  const ReactionGame = {
    name: 'ReactionGame',
    props: {
      recordScore: { type: Function, required: true },
      recentScores: { type: Array, default: () => [] },
      currentUser: { type: Object, default: null }
    },
    template: `
      <div class="mg-card">
        <header class="mg-card-header">
          <div>
            <h4>反应挑战</h4>
            <p class="mg-desc">点击“开始”后等待面板变色，再立即点击面板，测试你的反应速度。</p>
          </div>
          <small v-if="bestTime">个人最佳: {{ bestTime }} 毫秒</small>
        </header>
        <div class="reaction-body">
          <div class="reaction-pad" :class="status" @click="handlePadClick">
            <span>{{ padLabel }}</span>
          </div>
          <div class="reaction-info">
            <div>{{ message }}</div>
            <div v-if="lastScore !== null">上次得分: <strong>{{ lastScore }}</strong> 分</div>
          </div>
          <div class="reaction-actions">
            <button class="mg-primary" @click="start" :disabled="status==='waiting'">开始</button>
            <button class="mg-secondary" @click="reset" v-if="status!=='idle'">重置</button>
          </div>
        </div>
        <footer class="mg-note" v-if="!currentUser">
          <small>提示：当前未登录用户，得分将记为匿名。</small>
        </footer>
      </div>
    `,
    setup(props){
      const status = ref('idle');
      const message = ref('点击开始测试反应时间。');
      const lastScore = ref(null);
      const startAt = ref(0);
      const timeoutId = ref(null);
      const bestTime = computed(()=>{
        const times = (props.recentScores||[]).map(s=>Number(s.timeMs)).filter(v=>!Number.isNaN(v) && v>0);
        if(!times.length) return null;
        return Math.min(...times);
      });

      const padLabel = computed(()=>{
        if(status.value==='waiting') return '等信号';
        if(status.value==='ready') return '点击!';
        if(status.value==='tooSoon') return '太早了';
        if(status.value==='result') return '完成';
        return '准备';
      });

      function clearTimer(){ if(timeoutId.value){ clearTimeout(timeoutId.value); timeoutId.value = null; } }

      function start(){
        clearTimer();
        lastScore.value = null;
        status.value = 'waiting';
        message.value = '请等待面板变色...';
        const delay = 1000 + Math.random()*2000;
        timeoutId.value = setTimeout(()=>{
          status.value = 'ready';
          message.value = '现在点击面板！';
          startAt.value = performance.now();
          timeoutId.value = null;
        }, delay);
      }

      function handlePadClick(){
            if(status.value==='idle'){
              // allow clicking the pad directly to start the challenge for discoverability
              start();
              return;
            }
            if(status.value==='waiting'){
          clearTimer();
          status.value = 'tooSoon';
          message.value = '太快了！请等待变色后再点击。';
          return;
        }
        if(status.value==='ready'){
          const elapsed = Math.round(performance.now() - startAt.value);
          status.value = 'result';
          message.value = `反应时间：${elapsed} 毫秒。`;
          const base = Math.max(80, 600 - elapsed);
          lastScore.value = base;
          try{
            props.recordScore('reaction', {
              score: base,
              base,
              bonus: 0,
              penalty: 0,
              timeMs: elapsed,
              attempts: 1,
              label: `反应 ${elapsed}ms`
            });
          }catch(e){ console.warn('recordScore failed', e); }
          return;
        }
        if(status.value==='result' || status.value==='tooSoon'){
          message.value = '点击开始重新测试。';
        }
      }

      function reset(){
        clearTimer();
        status.value = 'idle';
        message.value = '点击开始测试反应时间。';
        lastScore.value = null;
        startAt.value = 0;
      }

      onBeforeUnmount(clearTimer);

      return { status, message, padLabel, lastScore, start, reset, handlePadClick, bestTime };
    }
  };

  const MathSprint = {
    name: 'MathSprint',
    props: {
      recordScore: { type: Function, required: true },
      recentScores: { type: Array, default: () => [] },
      currentUser: { type: Object, default: null }
    },
    template: `
      <div class="mg-card">
        <header class="mg-card-header">
          <div>
            <h4>速算冲刺</h4>
            <p class="mg-desc">连续回答 6 道加减法题目，速度越快、正确越多，得分越高。</p>
          </div>
          <small v-if="bestScore">个人最佳: {{ bestScore }} 分</small>
        </header>
        <div v-if="status==='idle'" class="math-idle">
          <button class="mg-primary" @click="start">开始训练</button>
          <p class="mg-tip">准备好了吗？点击开始计时，将尽快解题。</p>
        </div>
        <div v-else-if="status==='running'" class="math-run">
          <div class="math-problem">
            <span>{{ currentProblem.a }}</span>
            <span>{{ currentProblem.op }}</span>
            <span>{{ currentProblem.b }}</span>
            <span>= ?</span>
          </div>
          <input class="math-input" v-model="answer" @keyup.enter="submit" autocomplete="off" />
          <div class="math-progress">题目 {{ index + 1 }} / {{ totalProblems }}</div>
          <div class="math-actions">
            <button class="mg-primary" @click="submit">提交</button>
            <button class="mg-secondary" @click="giveUp">放弃</button>
          </div>
        </div>
        <div v-else class="math-summary">
          <p>完成！正确 {{ correct }} 题，错误 {{ incorrect }} 题，用时 {{ Math.round(elapsed/100)/10 }} 秒。</p>
          <p>得分：<strong>{{ lastScore }}</strong> 分</p>
          <div class="math-actions">
            <button class="mg-primary" @click="start">再来一次</button>
          </div>
        </div>
        <footer class="mg-note" v-if="!currentUser">
          <small>提示：当前未登录用户，得分将记为匿名。</small>
        </footer>
      </div>
    `,
    setup(props){
      const status = ref('idle');
      const problems = ref([]);
      const index = ref(0);
      const answer = ref('');
      const correct = ref(0);
      const incorrect = ref(0);
      const lastScore = ref(0);
      const startTime = ref(0);
      const elapsed = ref(0);
      const totalProblems = 6;

      const bestScore = computed(()=>{
        const scores = (props.recentScores||[]).map(s=>Number(s.score)).filter(v=>!Number.isNaN(v));
        if(!scores.length) return null;
        return Math.max(...scores);
      });

      const currentProblem = computed(()=> problems.value[index.value] || { a:0, b:0, op:'+', answer:0 });

      function makeProblem(){
        const a = Math.floor(Math.random()*30)+1;
        const b = Math.floor(Math.random()*25)+1;
        const useSub = Math.random() < 0.4;
        if(useSub && a > b){
          return { a, b, op:'-', answer: a - b };
        }
        return { a, b, op:'+', answer: a + b };
      }

      function start(){
        problems.value = Array.from({length: totalProblems}, makeProblem);
        index.value = 0;
        answer.value = '';
        correct.value = 0;
        incorrect.value = 0;
        status.value = 'running';
        lastScore.value = 0;
        elapsed.value = 0;
        startTime.value = performance.now();
      }

      function endGame(abandoned){
        elapsed.value = performance.now() - startTime.value;
        status.value = 'finished';
        const base = correct.value * 400;
        const penalty = incorrect.value * 150 + (abandoned ? 200 : 0);
        const speedBonus = Math.max(0, Math.round(400 - elapsed.value / 8));
        const total = Math.max(60, base + speedBonus - penalty);
        lastScore.value = total;
        try{
          props.recordScore('math', {
            score: total,
            base,
            bonus: speedBonus,
            penalty,
            timeMs: Math.round(elapsed.value),
            attempts: totalProblems,
            label: `速算 ${correct.value}/${totalProblems}`,
            correct: correct.value,
            incorrect: incorrect.value
          });
        }catch(e){ console.warn('recordScore failed', e); }
      }

      function submit(){
        if(status.value!=='running') return;
        const input = Number(answer.value.trim());
        if(Number.isNaN(input)){
          incorrect.value += 1;
        }else if(input === currentProblem.value.answer){
          correct.value += 1;
        }else {
          incorrect.value += 1;
        }
        index.value += 1;
        answer.value = '';
        if(index.value >= totalProblems){
          endGame(false);
        }
      }

      function giveUp(){
        if(status.value!=='running') return;
        endGame(true);
      }

      return { status, start, submit, giveUp, answer, currentProblem, index, totalProblems, correct, incorrect, lastScore, elapsed, bestScore };
    }
  };

  const MiniGames = {
    name: 'MiniGames',
    components: { ReactionGame, MathSprint },
    template: `
      <section class="mini-games">
        <h3>小场景挑战</h3>
        <p class="mg-intro">在这里体验快节奏的小挑战游戏，积累额外得分，提升排行榜名次。</p>
        <div class="mg-layout">
          <div class="mg-left">
            <div class="mg-tabs">
              <button v-for="tab in tabs" :key="tab.key" @click="activeGame = tab.key" :class="['mg-tab', {active: activeGame===tab.key}]">{{ tab.label }}</button>
            </div>
            <component :is="activeComponent" :record-score="recordGameScore" :recent-scores="activeRecent" :current-user="currentUser"></component>
          </div>
          <aside class="mg-scoreboard">
            <h4>{{ activeLabel }} - 排行榜</h4>
            <div v-if="activeLeaderboard.length">
              <ol>
                <li v-for="(row, idx) in activeLeaderboard" :key="row.id">
                  <span class="rank-index">{{ idx+1 }}.</span>
                  <span class="rank-name">{{ userName(row.userId) }}</span>
                  <span class="rank-score">{{ row.score }} 分</span>
                  <small v-if="row.gameId==='reaction' && row.timeMs">{{ row.timeMs }} 毫秒</small>
                  <small v-else-if="row.gameId==='math'">正确 {{ row.correct||0 }} / {{ row.attempts||0 }}</small>
                </li>
              </ol>
            </div>
            <div v-else class="mg-empty">暂无记录，快来挑战第一名。</div>
          </aside>
        </div>
      </section>
    `,
    setup(){
      const tabs = [
        { key: 'reaction', label: '反应挑战', component: ReactionGame },
        { key: 'math', label: '速算冲刺', component: MathSprint }
      ];
      const activeGame = ref('reaction');
      const currentUser = computed(()=> users.value.find(u=>u.id===currentUserId.value) || null);

      function sortByScore(list){
        return list.slice().sort((a,b)=> (b.score||0) - (a.score||0));
      }

      const reactionRaw = computed(()=> (scores.value||[]).filter(s=>s.type==='miniGame' && s.gameId==='reaction'));
      const mathRaw = computed(()=> (scores.value||[]).filter(s=>s.type==='miniGame' && s.gameId==='math'));

      const reactionLeaderboard = computed(()=> sortByScore(reactionRaw.value).slice(0,5));
      const mathLeaderboard = computed(()=> sortByScore(mathRaw.value).slice(0,5));

      const activeLeaderboard = computed(()=> activeGame.value==='reaction' ? reactionLeaderboard.value : mathLeaderboard.value);

      const myReactionScores = computed(()=> reactionRaw.value.filter(s=> (s.userId || null) === (currentUserId.value || null)));
      const myMathScores = computed(()=> mathRaw.value.filter(s=> (s.userId || null) === (currentUserId.value || null)));
      const activeRecent = computed(()=> activeGame.value==='reaction' ? myReactionScores.value : myMathScores.value);

      function recordGameScore(gameId, payload){
        const bridge = window.__VueTreasureBridge;
        const userId = currentUserId.value || null;
        const base = payload.base != null ? payload.base : (payload.score || 0);
        const entryPayload = Object.assign({
          type: 'miniGame',
          gameId,
          base,
          bonus: payload.bonus || 0,
          penalty: payload.penalty || 0,
          score: payload.score != null ? payload.score : base,
          timeMs: payload.timeMs || 0,
          attempts: payload.attempts || 1,
          label: payload.label || ''
        }, payload);
        if(bridge && typeof bridge.reportScore === 'function'){
          try{ bridge.reportScore(userId, entryPayload); return; }catch(e){ console.warn('miniGame bridge failed', e); }
        }
        const now = Date.now();
        const fallbackEntry = { id: String(now)+'-'+Math.random().toString(36).slice(2,8), userId, ts: now, ...entryPayload };
        scores.value.push(fallbackEntry);
        saveJSON(SCORES_KEY, scores.value);
        try{ window.dispatchEvent(new CustomEvent('treasure-score-recorded',{ detail: fallbackEntry })); }catch(e){ console.warn('treasure-score event dispatch failed', e); }
      }

      function userName(uid){
        if(uid===null || uid===undefined || uid==='') return '匿名';
        const u = users.value.find(x=>x.id===uid);
        return u? u.name : uid;
      }

      const activeComponent = computed(()=>{
        const tab = tabs.find(t=>t.key===activeGame.value);
        return tab ? tab.component : ReactionGame;
      });
      const activeLabel = computed(()=>{
        const tab = tabs.find(t=>t.key===activeGame.value);
        return tab ? tab.label : '';
      });

      return {
        tabs,
        activeGame,
        recordGameScore,
        userName,
        currentUser,
        activeComponent,
        activeLabel,
        activeLeaderboard,
        activeRecent,
        reactionLeaderboard,
        mathLeaderboard
      };
    }
  };

  // Users page: 三级嵌套示例 - UsersList -> UserItem -> UserDetail
  const UserDetail = {
    name: 'UserDetail',
    props: ['user'],
    template: `
      <div v-if="user" class="user-detail">
        <h4>{{user.name}}</h4>
        <p>创建: {{formatTs(user.createdAt)}}</p>
        <button @click="$emit('delete', user.id)">删除用户</button>
      </div>
    `,
    methods: {
      formatTs(ts){ return new Date(ts).toLocaleString(); }
    }
  };

  const UserItem = {
    name: 'UserItem',
    props: ['user'],
    template: `
      <div class="user-item">
        <div class="user-item-row">
          <div class="user-item-info"><strong>{{user.name}}</strong> <small class="muted">({{user.id}})</small></div>
          <div></div>
        </div>
      </div>
    `
  };

  const UsersList = {
    name: 'UsersList',
    components: { UserItem, UserDetail },
    props: ['users','currentUserId'],
    template: `
      <section class="users-section">
        <h3>用户管理</h3>
        <div class="users-controls">
          <div class="input-group">
            <span class="input-icon" aria-hidden="true">
              <!-- user icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <input class="users-input" v-model="newName" placeholder="创建用户名" aria-label="创建用户名" />
          </div>
          <button class="users-btn" @click="create">创建用户</button>
          <button class="users-btn" @click="logout">登出</button>
          <div class="input-group search-group">
            <span class="input-icon" aria-hidden="true">
              <!-- search icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L15 15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <input class="users-search" v-model="query" placeholder="搜索用户或 ID..." aria-label="搜索用户" />
            <button class="clear-search" @click="query=''" title="清空搜索" aria-label="清空搜索">✕</button>
          </div>
        </div>
        <div class="users-grid">
          <div class="users-list">
            <div v-for="u in pagedUsers" :key="u.id" class="users-list-item">
              <div class="user-item-row">
                <div class="user-item-info"><strong>{{u.name}}</strong> <small class="muted">({{u.id}})</small></div>
                      <div class="item-actions">
                        <div class="action-wrapper">
                          <button class="action-toggle users-btn" :data-id="u.id" @click.stop="toggleMenu(u.id)" :aria-expanded="openMenuId===u.id">⋯</button>
                        </div>
                      </div>
              </div>
            </div>
            <div class="small-pager" v-if="totalUserPages>1">
              <button class="pager-btn" @click="prevUsersPage" :disabled="usersPage<=1">上一页</button>
              <span class="pager-ind">第 {{usersPage}} / {{totalUserPages}} 页</span>
              <button class="pager-btn" @click="nextUsersPage" :disabled="usersPage>=totalUserPages">下一页</button>
            </div>
          </div>
          <aside class="users-side">
            <div class="user-detail-card" v-if="selectedUser && !editingUser">
              <h4 class="user-name">{{selectedUser.name}}</h4>
              <div class="meta">ID: <code>{{selectedUser.id}}</code> · 创建: <small>{{new Date(selectedUser.createdAt).toLocaleString()}}</small></div>
              <div class="detail-actions">
                <button class="users-btn" @click="startEdit(selectedUser)">编辑资料</button>
                <button class="users-btn" @click="deleteUser(selectedUser.id)">删除用户</button>
              </div>
            </div>

            <div v-if="editingUser" class="user-edit-card">
              <h4>编辑用户信息</h4>
              <label class="edit-label">姓名
                <input class="edit-input" v-model="editingName" />
              </label>
              <div class="edit-actions">
                <button class="users-btn" @click="saveEdit">保存</button>
                <button class="users-btn" @click="cancelEdit">取消</button>
              </div>
            </div>

            <!-- per-user scores removed as requested -->
          </aside>
        </div>
      <teleport to="body">
        <div v-if="openMenuId" class="modal-backdrop" @click.self="closeMenu">
          <div class="modal" role="dialog" aria-modal="true">
            <h3>操作</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="users-btn" @click="loginAs(openMenuId)">登录</button>
              <button class="users-btn" @click="editMenuOpen">编辑</button>
              <button class="users-btn" @click="deleteMenuOpen">删除</button>
              <button class="users-btn" @click="closeMenu">取消</button>
            </div>
          </div>
        </div>
      </teleport>
      </section>
    `,
    setup(props, ctx){
      const newName = ref('');
      const query = ref('');
      const selectedUser = ref(null);
      const editingUser = ref(null);
      const editingName = ref('');
      // pagination for users
      const usersPage = ref(1);
      const usersPerPage = 8; // show 8 users per page in sidebar
      const totalUserPages = computed(()=> Math.max(1, Math.ceil(filteredUsers.value.length / usersPerPage)));
      const pagedUsers = computed(()=>{
        const start = (usersPage.value - 1) * usersPerPage;
        return filteredUsers.value.slice(start, start + usersPerPage);
      });
      function prevUsersPage(){ if(usersPage.value>1) usersPage.value--; }
      function nextUsersPage(){ if(usersPage.value<totalUserPages.value) usersPage.value++; }

      // per-user scores removed
      // per-item action menu state (teleported to body to avoid clipping/overlay)
      const openMenuId = ref(null);
      const openMenuUser = computed(() => users.value.find(x => x.id === openMenuId.value) || null);

      function toggleMenu(id) {
        openMenuId.value = (openMenuId.value === id) ? null : id;
      }
      function closeMenu() { openMenuId.value = null; }
      // close menu on outside click
      function onDocClick(e) {
        const node = e && e.target;
        if (!node) return closeMenu();
        // if click inside a action-wrapper or the teleported dropdown, ignore
        if (node.closest && (node.closest('.action-wrapper') || node.closest('.action-dropdown'))) return;
        closeMenu();
      }
      onMounted(() => { document.addEventListener('click', onDocClick); });
      onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); });

      function editMenuOpen() { if (openMenuUser.value) startEdit(openMenuUser.value); closeMenu(); }
  function deleteMenuOpen() { const id = openMenuId.value; closeMenu(); if (id) deleteUser(id); }
      const create = ()=>{
        const n = (newName.value||'').trim(); if(!n) return alert('请输入用户名');
        // duplicate name check
        if(users.value.find(u=>u.name.toLowerCase()===n.toLowerCase())){ return alert('用户名已存在，请选择其他名称'); }
        const u = { id: 'u-' + Date.now(), name: n, createdAt: Date.now() };
        users.value.push(u);
        saveJSON(USERS_KEY, users.value);
        newName.value = '';
      };
  function selectUser(id){ selectedUser.value = users.value.find(x=>x.id===id) || null; currentUserId.value = id; try{ saveJSON(CURRENT_USER_KEY, currentUserId.value); }catch(e){} }
      function deleteUser(id){ if(!confirm('删除用户?')) return; const idx = users.value.findIndex(x=>x.id===id); if(idx>=0) users.value.splice(idx,1); saveJSON(USERS_KEY, users.value);
        // remove scores belonging to user
        for(let i=scores.value.length-1;i>=0;i--){ if(scores.value[i].userId===id) scores.value.splice(i,1); }
        saveJSON(SCORES_KEY, scores.value);
        if(currentUserId.value===id) { currentUserId.value=null; try{ saveJSON(CURRENT_USER_KEY, null); }catch(e){} }
        selectedUser.value=null; }
      function logout(){ currentUserId.value = null; try{ saveJSON(CURRENT_USER_KEY, null); }catch(e){} }
      // loginAs: set selected user as current and persist
      function loginAs(id){ const u = users.value.find(x=>x.id===id); if(!u) return alert('用户不存在'); currentUserId.value = id; try{ saveJSON(CURRENT_USER_KEY, id); }catch(e){} closeMenu(); // small toast
        showSmallToast('已登录: ' + u.name);
      }

      function showSmallToast(msg){ const el = document.createElement('div'); el.textContent = msg; el.style.position='fixed'; el.style.right='18px'; el.style.bottom='120px'; el.style.zIndex=2147483646; el.style.background='rgba(0,0,0,0.8)'; el.style.color='#fff'; el.style.padding='8px 12px'; el.style.borderRadius='6px'; document.body.appendChild(el); setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),350); },1200); }
      // per-user scores removed
      const filteredUsers = computed(()=> {
        const q = (query.value||'').trim().toLowerCase();
        if(!q) return users.value.slice();
        return users.value.filter(u=> (u.name||'').toLowerCase().includes(q) || (u.id||'').toLowerCase().includes(q));
      });
  function startEdit(u){ editingUser.value = u; editingName.value = u.name; }
      function saveEdit(){ if(!editingUser.value) return; const newName = (editingName.value||'').trim(); if(!newName) return alert('请输入用户名'); if(users.value.find(x=>x.id!==editingUser.value.id && x.name.toLowerCase()===newName.toLowerCase())){ return alert('用户名已存在'); }
        editingUser.value.name = newName; saveJSON(USERS_KEY, users.value); editingUser.value = null; editingName.value = ''; }
      function cancelEdit(){ editingUser.value = null; editingName.value = ''; }
    // expose users/scores refs via outer scope
  return { newName, query, create, filteredUsers, pagedUsers, usersPage, totalUserPages, prevUsersPage, nextUsersPage, selectedUser, editingUser, editingName, startEdit, saveEdit, cancelEdit, selectUser, deleteUser, logout, openMenuId, toggleMenu, closeMenu, editMenuOpen, deleteMenuOpen, openMenuUser, loginAs };
    }
  };

  // Leaderboard component
  const Leaderboard = {
    name: 'Leaderboard',
    template: `
      <section>
        <h3>排行</h3>
        <div class="leader-controls">
          <label>排序 <select v-model="sortBy"><option value="score">分数</option><option value="time">时间</option></select></label>
          <label>方向 <select v-model="dir"><option value="desc">降序</option><option value="asc">升序</option></select></label>
          <button class="users-btn" @click="clearScores" :disabled="!hasScores">清空所有分数</button>
        </div>
        <div v-if="pageRows && pageRows.length">
          <ol>
            <li v-for="row in pageRows" :key="(row.userId||'anon')">
              <div class="leader-row" :data-userid="row.userId === null || row.userId===undefined ? '__anon' : row.userId">
                <div class="leader-main">
                  <strong class="leader-score">{{ row.total }}</strong>
                  <span class="leader-user">— {{ userName(row.userId) }}</span>
                  <small class="leader-meta">（共 {{ row.count }} 条，最近: {{ new Date(row.lastTs).toLocaleString() }}）</small>
                </div>
                <div class="leader-actions">
                  <button class="users-btn" @click="deleteUserScores(row.userId)">删除</button>
                </div>
              </div>
            </li>
          </ol>
        </div>
        <div v-else class="leader-empty"><em>暂无分数记录。</em></div>
        <div class="leader-pager">
          <button @click="prevPage" :disabled="page===1">上一页</button>
          <span>第 {{page}} 页 / {{totalPages}}</span>
          <button @click="nextPage" :disabled="page===totalPages">下一页</button>
        </div>
      </section>
    `,
    setup(){
      const sortBy = ref('score');
      const dir = ref('desc');
      const page = ref(1);
      const perPage = 10;
      const hasScores = computed(()=> Array.isArray(scores.value) && scores.value.length>0);

      // aggregate scores by userId -> { userId, total, count, lastTs }
      const aggregated = computed(()=>{
        // choose source: reactive scores.value if present, otherwise try to read localStorage directly
        let src = Array.isArray(scores.value) && scores.value.length ? scores.value : loadJSON(SCORES_KEY, []);
        const map = new Map();
        for(const s of (src||[])){
          const uid = (s.userId === null || s.userId === undefined) ? '__anon' : s.userId;
          const key = uid;
          let item = map.get(key);
          if(!item){ item = { userId: (s.userId===null||s.userId===undefined)? null : s.userId, total:0, count:0, lastTs:0 }; map.set(key, item); }
          item.total += Number(s.score||0);
          item.count += 1;
          if(s.ts && s.ts > item.lastTs) item.lastTs = s.ts;
        }
        return Array.from(map.values());
      });
        // sorted aggregated list according to sortBy/dir
        const sorted = computed(()=>{
          const arr = aggregated.value.slice();
          arr.sort((a,b)=>{
            let v = 0;
            if(sortBy.value==='score') v = (b.total||0) - (a.total||0);
            if(sortBy.value==='time') v = (b.lastTs||0) - (a.lastTs||0);
            return dir.value==='desc' ? v : -v;
          });
          return arr;
        });

        const totalPages = computed(()=> Math.max(1, Math.ceil(sorted.value.length / perPage)));
        const pageRows = computed(()=>{
          const start = (page.value - 1) * perPage;
          return sorted.value.slice(start, start + perPage);
        });
      
      function userName(uid){ if(uid===null || uid===undefined) return '匿名'; const u = users.value.find(x=>x.id===uid); return u? u.name : uid; }

      function deleteUserScores(userId){ const name = userName(userId); if(!confirm(`删除 ${name} 的所有分数？此操作不可撤销。`)) return; for(let i=scores.value.length-1;i>=0;i--){ const s = scores.value[i]; const sid = (s.userId===null||s.userId===undefined)? null : s.userId; if(sid === userId) scores.value.splice(i,1); }
        saveJSON(SCORES_KEY, scores.value); try{ showToast('已删除 '+ name + ' 的分数'); }catch(e){} }
  function clearScores(){ if(!confirm('确认要清空所有分数记录？此操作不可撤销。')) return; scores.value.splice(0, scores.value.length); try{ saveJSON(SCORES_KEY, []); }catch(e){ try{ localStorage.removeItem(SCORES_KEY); }catch(_){}} page.value = 1; try{ showToast('已清空所有分数'); }catch(e){} }

  // small toast helper (scoped to leaderboard)
  function showToast(msg){
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.position = 'fixed';
        el.style.right = '20px';
        el.style.top = '100px';
        el.style.zIndex = 2147483646;
        el.style.padding = '8px 12px';
        el.style.background = 'linear-gradient(90deg, rgba(122,255,158,0.95), rgba(94,234,212,0.95))';
        el.style.color = '#002b00';
        el.style.borderRadius = '8px';
        el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
        el.style.fontWeight = '600';
        el.style.opacity = '0';
        document.body.appendChild(el);
        requestAnimationFrame(()=>{ el.style.transition = 'opacity .25s, transform .25s'; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
        setTimeout(()=>{ el.style.opacity = '0'; setTimeout(()=> el.remove(),300); }, 1400);
      }
      function prevPage(){ if(page.value>1) page.value--; }
      function nextPage(){ if(page.value<totalPages.value) page.value++; }

      // highlight the user who just scored (if set by app.js)
      onMounted(()=>{
        try{
          const lastUser = localStorage.getItem('async-treasure-last-score-user');
          if(lastUser){
            // find the row and scroll to it after render
            setTimeout(()=>{
              const sel = document.querySelector(`[data-userid="${lastUser}"]`);
              if(sel){
                sel.classList.add('leader-new');
                sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(()=> sel.classList.remove('leader-new'), 3000);
                // clear the marker so subsequent visits won't re-highlight
                try{ localStorage.removeItem('async-treasure-last-score-user'); localStorage.removeItem('async-treasure-last-score-id'); }catch(e){}
              }
            }, 250);
          }
        }catch(e){ }
      });

      return { sortBy, dir, page, perPage, totalPages, pageRows, userName, deleteUserScores, clearScores, hasScores, prevPage, nextPage };
    }
  };

  // Shell / App Layout
  const AppShell = {
    name: 'AppShell',
    components: { HeaderProgress, AppNav, PanoramaView, UsersList, Leaderboard },
    template: `
      <div :class="['vue-shell', {collapsed: isCollapsed}]">
        <div class="vue-panel fade-in">
          <div class="vue-panel-top">
            <HeaderProgress />
            <button class="vue-collapse-btn" @click="toggleCollapse">{{ isCollapsed ? '展开' : '折叠' }}</button>
          </div>
          <div class="vue-nav-wrap">
            <AppNav :route="route" :users="users" :current-user-id="currentUserId" />
            <div v-if="isCollapsed" class="collapsed-icon-menu">
              <a v-for="it in ['home','challenges','users','leaderboard']" :key="it" :href="'#'+it" class="collapsed-icon" :class="{active: route===it}">
                <span v-html="iconMap[it]"></span>
              </a>
            </div>
          </div>
          <div class="vue-content">
            <component :is="currentView" />
          </div>
        </div>
      </div>
    `,
    setup(){
      const isCollapsed = computed({
        get(){ return uiSettings.collapsed; },
        set(v){ uiSettings.collapsed = !!v; saveSettings(uiSettings); }
      });

      // restore last route if present
      onMounted(()=>{
        if(uiSettings.lastRoute){ location.hash = uiSettings.lastRoute; }
      });

      // watch route changes to persist
      const currentView = computed(()=> {
        // persist last route
        try{ uiSettings.lastRoute = route.value; saveSettings(uiSettings); }catch(e){}
  if(route.value==='challenges') return MiniGames;
  if(route.value==='users') return UsersList;
  if(route.value==='leaderboard') return Leaderboard;
        return PanoramaView;
      });

      function toggleCollapse(){ isCollapsed.value = !isCollapsed.value; }

      // icon map moved to setup to avoid runtime expression in template (compiler-54)
      const iconMap = {
        home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11L12 4L21 11V20C21 20.552 20.552 21 20 21H4C3.448 21 3 20.552 3 20V11Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        challenges: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9H16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13H14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 17H16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C18.2091 11 20 9.20914 20 7C20 4.79086 18.2091 3 16 3C13.7909 3 12 4.79086 12 7C12 9.20914 13.7909 11 16 11Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21C6 17.6863 8.68629 15 12 15H13.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        leaderboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3V21H21" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="12" width="3" height="6" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="12" y="8" width="3" height="10" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="17" y="4" width="3" height="14" rx="0.5" stroke="currentColor" stroke-width="1.2"/></svg>'
      };

      return { route, users, currentUserId, currentView, isCollapsed, toggleCollapse, iconMap };
    }
  };

  // --- App mount ---
  const app = createApp({
    template: `<div><AppShell /></div>`,
    components: { AppShell }
  });
  // global refs available to components
  app.provide('users', users);
  app.provide('scores', scores);
  app.provide('currentUserId', currentUserId);

  // mount into newly added #vue-root
  const mountTarget = document.getElementById('vue-root');
  if(mountTarget){
    try{
      app.mount(mountTarget);
      console.info('Vue app mounted to #vue-root');
      // debug widget removed for production
    }catch(e){
      console.error('Failed to mount Vue app', e);
      createDebugBanner('Vue 应用挂载失败：' + (e && e.message ? e.message : String(e)));
    }
  } else {
    console.warn('#vue-root not found - skipping Vue mount');
    createDebugBanner('#vue-root 未找到 — 无法挂载 Vue 侧边栏。');
  }

})();
