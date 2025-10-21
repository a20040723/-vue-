Vue 增强（非破坏性）
=====================

简介
----

本文件说明此次新增的 Vue 增强模块如何使用，以及如何与原项目交互。

新特性
------

- 侧边栏（固定）包含“游玩 / 用户管理 / 排行”三页。
- 实现了至少 6 个 Vue 组件，组件层级至少 3 层。
- Vue 应用不会移除或替换原始脚本；而是并行加载并通过桥接函数交互。

如何运行
--------

1. 在项目根目录启动静态服务器，例如：

```powershell
python -m http.server 8000
```

2. 打开浏览器访问 http://localhost:8000/ 。页面右侧会出现 Vue 增强侧边栏。

交互说明
------

- 点击“游玩”中的“打开场景”会调用原始的 `window.navigateToScene(sceneId)`，如果浏览器中定义了该函数，页面将切换到原始场景。
- Vue 暴露了 `window.__VueTreasureBridge.reportScore(userId, score)`，用于向 Vue 的本地排行数据提交分数
- Vue 会把用户与分数保存在 localStorage（key 分别为 `async-treasure-users-v1` 和 `async-treasure-scores-v1`）

文件变动
------

- 修改：`index.html`（添加 Vue CDN 与 `vue-app.js`）
- 新增：`vue-app.js`（包含 Vue 应用）

后续改进（建议）
-----------

- 将 Vue 代码拆分成单文件组件、增加构建步骤（vite/webpack）以便可维护性
- 将排行/用户存储迁移到后端 API，以支持跨设备持久化

