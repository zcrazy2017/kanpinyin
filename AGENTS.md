# kanpinyin — AI 代理指南

## 项目概述

**看拼音写词语 · 智能练习系统** — 纯前端、完全本地运行的家长辅助工具，用于生成小学生"看拼音写词语"练习题。

- **技术栈**：纯 HTML + CSS + JavaScript（模块化 SPA）+ Python Flask 后端
- **前端架构**：`index.html` 作为壳页面，功能逻辑拆分到 `src/` 目录下的模块化 JS 文件
- **数据存储**：`localStorage`（键名: `kanpinyin_data`）+ JSON 文件（通过后端 API 分文件存储）
- **状态管理**：`Store` 模式（`src/data/store.js`），单一数据源 + 变更通知
- **打印方案**：`window.print()` + CSS `@page` / `@media print`，田字格样式
- **拼音识别**：`server/app.py` Python 后端（端口 5001），使用 `pypinyin` 库
- **词语验证**：`server/word_composer.py` Python 后端，使用 `jieba` 词典验证真实词语

## 快速命令

| 命令 | 说明 |
|------|------|
| `start.bat`（推荐） | 一键启动后端 + 打开浏览器 |
| `python server/app.py` | 启动拼音+组词后端服务（端口 5001） |
| `pip install flask flask-cors pypinyin jieba` | 安装后端依赖 |

## 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/pinyin?char=好` | GET | 返回 { char, pinyins: ["hǎo","hào"] } |
| `/api/batch-pinyin` | POST | 批量识别，{ chars: ["春","天"] } |
| `/api/compose?char=春&with=天,花,开` | GET | 词语组合验证，仅返回真实有效词语 |
| `/api/validate-words` | POST | 批量词语验证 |
| `/api/composable?chars=春,天,花,开,好` | GET | 筛选可组词的字，返回 composable/non_composable |
| `/api/health` | GET | 健康检查 |
| `/api/data/load/<type>` | GET | 加载JSON数据文件（dict/words/categories/students） |
| `/api/data/save/<type>` | POST | 保存JSON数据文件 |

## 数据结构（核心知识）

所有数据存储在 `localStorage` 中，键名 `kanpinyin_data`，JSON 结构如下：

```javascript
{
  categories: [                                  // 层级分类树
    { id: "cat1", name: "一年级", children: [
      { id: "cat2", name: "上学期", children: [] }
    ]}
  ],
  dict: { "春": { pinyin: "chūn", categoryId: "cat1" } },  // 字库，可关联分类
  words: [                                       // 词库
    { id: 0, chars: ["春","天"], pinyin: "chūn tiān" }
  ],
  students: [                                    // 学生列表
    {
      id: "stu1", name: "小明",
      errorWordIds: [],                          // 错词ID列表
      errorCharIds: { "春": 2 },                 // 错字统计 {字: 次数}
      wordStats: { "0": { total: 3, wrong: 1, lastDate: "2026-06-20" } },
      practiceLog: [                             // 练习记录（仅打印/批改后保存）
        { date: "2026-06-23", words: [
          { wordId: 0, chars: ["春","天"], pinyin: "chūn tiān", wrongIndices: [0] }
        ]}
      ]
    }
  ]
}
```

**关键设计决策**：
- 错词本 (`errorWordIds`) 是动态的 — 写对就移除，写错就加入
- 新词按 `1 / (total + 1)` 加权随机选取，练习次数越少越优先
- 练习仅在"打印"或"提交批改"时写入 `practiceLog`，生成时可自由重新出题
- 数据可保存到 `data/` 目录下的 JSON 文件（分 `dict.json`, `words.json`, `categories.json`, `students.json`）

## 每日出题算法

1. 从 `errorWordIds` 抽取 `min(5, len)` 个错词作为必考题
2. 剩余词按权重 `1/(total+1)` 加权随机抽取，补足设定题数
3. 支持按分类筛选出题
4. 打乱顺序

## A4 打印规范 — 田字格

- A4 纵向 (210mm × 297mm)，页边距 12mm 左右、15mm 上下
- 5列 × 5行田字格 Grid 布局，每格放一个词语（2个田字格并排）
- 每页25词，用 `page-break-after` 分页
- 田字格样式：19mm 正方格（打印），带十字虚线
- 拼音显示在田字格上方
- `@media print` 隐藏导航、按钮等 UI

## 启动方式

| 方式 | 说明 |
|------|------|
| `start.bat`（推荐） | 双击即可启动后端并打开浏览器 |
| `python server/app.py` | 手动启动后端（端口 5001） |
| VS Code 任务 | 运行「启动后端服务」任务 |
| 直接打开 `index.html` | 前端自动检测后端状态，未连接时显示提示 |

## 前端模块架构 — 三文件分离原则

每个桌面 App 的 HTML 代码必须封装在对应的 JS 模块文件中，`index.html` 只保留壳结构。

### 三文件结构

| 文件 | 归属 | 职责 |
|------|------|------|
| `index.html` | 壳页面 | 桌面 + 应用窗口框架 + 全局元素（浮动精灵、弹窗、打印区） |
| `styles.css` | 全局 | 所有样式（桌面、应用窗口、各面板、田字格、精灵等） |
| `src/modules/desktop.js` | **桌面** | 桌面图标渲染、应用开关、App 注册表 |
| `src/modules/kanpinyin-app.js` | **看拼音写汉字** | HTML 模板 (`App.KanpinyinApp.HTML`) + 渲染函数 |
| `src/modules/practice.js` | 看拼音写汉字 | 出题 / 批改 / 打印 / 已保存练习 |
| `src/modules/library.js` | 看拼音写汉字 | 字库管理 / 分类管理 / 组词 / 批量导入 |
| `src/modules/history.js` | 看拼音写汉字 | 历史记录 / 修改 / 详情 / 常错字排行 |
| `src/modules/dict.js` | 看拼音写汉字 | 字典浏览 / 拼音编辑 / 字统计 |
| `src/modules/stats.js` | 看拼音写汉字 | 成绩统计 ECharts 折线图 |
| `src/modules/pet.js` | **精灵乐园** | 精灵成长系统 + `PAGE_HTML` 模板 + 渲染函数 |
| `src/data/store.js` | 全局数据 | Store 状态管理 |
| `src/utils/ui.js` | 全局工具 | UI 工具函数 |
| `src/app.js` | 全局命名空间 | 模块挂载 + Tab 切换 |
| `src/main.js` | 初始化 | 兼容层 + 后端连接 + 初始化渲染 |

### 核心规则

1. **`index.html` 仅保留壳结构** — 桌面、应用窗口框架（标题栏 + 空 `app-content` 容器）、全局元素（浮动精灵、打印区、Toast、Confirm 弹窗）。每个 App 的 HTML 内容由各自的 JS 模块在运行时渲染注入。

2. **每个 App 自包含 HTML + JS**：
   - `kanpinyin-app.js`：定义 `App.KanpinyinApp.HTML` 模板字符串，通过 `App.KanpinyinApp.render()` 注入到 `#app-content-kanpinyin`
   - `pet.js`：定义 `App.Pet.PAGE_HTML` 模板字符串，通过 `App.Pet.renderPage()` 注入到 `#app-content-pet`
   - 新增 App 时创建对应 `app-xxx.js`，定义 `HTML` 属性和 `render()` 方法

3. **加载顺序**（依赖顺序）：
   `store.js` → `app.js` → `ui.js` → `practice.js` → `library.js` → `history.js` → `dict.js` → `stats.js` → `kanpinyin-app.js` → `desktop.js` → 精灵主题 → `pet.js` → `main.js`

4. **每个模块挂在 `App.ModuleName` 命名空间下**，通过 `window.xxx = ...` 提供 `onclick` 兼容。

## 桌面架构

应用以类 Windows 桌面形式启动，每个功能作为一个独立 App 在应用窗口中打开。

### 桌面
- 深色星空壁纸，底部任务栏（含系统名称 + 时钟）
- 图标网格自动渲染，每个图标含 emoji + 名称 + 描述

### 应用窗口
- 顶部标题栏含「← 返回桌面」按钮
- 每个 App 有独立的 `app-content-{id}` 容器
- 返回桌面时隐藏窗口，显示桌面

### 添加新功能
1. 在 `src/modules/desktop.js` 的 `App.Desktop.APPS` 数组中添加条目
2. 创建 `app-xxx.js` 模块文件，定义 `App.XxxApp.HTML` 模板和 `render()` 方法
3. 在 `index.html` 的 `#appWindow > .app-body` 内添加空容器 `<div class="app-content" id="app-content-xxx"></div>`
4. 在 `index.html` 的 `<script>` 列表中添加新模块
5. 在 `desktop.js` 的 `openApp` 中添加初始化分支（如打开时调用 `render()`）
6. 新功能自动共享全局精灵（`App.Pet`）

## 界面架构

桌面 → 选择 App → 应用窗口（带返回桌面按钮）

### App: 📝 看拼音写汉字
内部包含 5 个 Tab（原全部功能）：
- **出题面板**：题目数量设置 + 分类筛选（多选），生成今日练习（临时预览，打印/批改时才记录），田字格预览、打印、批改
- **字库管理面板**：子 Tab「分类管理」（层级分类创建、字分类操作、保存/加载）+ 子 Tab「字词管理」（添加单字/组词/批量导入）
- **历史记录面板**：统计概览 + 历史练习列表 + 常错字排行
- **字典面板**：拼音首字母浏览汉字，查看包含该字的词语 + 练习统计
- **统计面板**：成绩趋势 ECharts 折线图 + 错误类型分析 + 进步周报 + 成就墙

### App: 🐉 精灵乐园
- 大精灵展示区 + 进化全览缩略条 + 进化之路 + 形象选择 + 最近成就

### 学生切换
- 下拉选择器 + 添加学生按钮
- 保存学生数据按钮（在顶栏 💾）

## 关键函数约定

- `App.UI.weightedRandomIndex(items, weightFunc)` — 加权随机抽取（**返回索引**）
- `App.UI.shuffle(arr)` — Fisher-Yates 洗牌
- `App.Practice.getFilteredWords()` — 按选中的分类筛选词库
- `App.Practice.buildTzgWordHtml(word)` — 生成田字格 HTML
- `App.Practice._currentPractice` — 临时练习预览（打印/批改时写入 practiceLog）
- `window._currentPractice` (Proxy) — 兼容旧引用的代理
- 批改：`wrongIndices: [0]` 表示词中第0个字写错，`wrongTypes: {0: "wrong_char"|"blank_char"}` 标记错误类型

## 模块间调用约定

| 调用方 | 目标 | 方式 |
|--------|------|------|
| 任何模块 | 数据读写 | `Store.data.xxx` / `Store.save()` |
| 任何模块 | Toast提示 | `App.UI.toast(msg, type)` |
| 任何模块 | 确认对话框 | `await App.UI.showConfirm(msg)` |
| Practice | 分类筛选 | `App.Library.getAllCategoriesFlat(nodes)` |
| Dict | 分类过滤 | `Store.getCategoryAndDescendantIds(catId)` |
| Dict | 字统计 | `App.Dict.computeCharStats(char)` |
| Library | 后端拼音 | `fetch(http://localhost:5001/api/pinyin?... )` |
| 历史/出题 | 学生数据 | `Store.getCurrentStudent()` |

## JSON 文件数据持久化
修改程序不要修改持久化数据文件
| 文件 | 内容 | 对应按钮 |
|------|------|----------|
| `data/dict.json` | 字库 | 字词管理 → 字库卡片下 |
| `data/words.json` | 词库 | 字词管理 → 词库卡片下 |
| `data/categories.json` | 分类 | 分类管理 → 创建分类卡片下 |
| `data/students.json` | 学生数据 | 顶栏 💾 保存学生 |

## 常见陷阱

- `localStorage` 存储的是字符串，读写需 `JSON.parse/stringify`
- 打印时需确保拼音字体清晰，推荐无衬线字体
- 加权随机需注意浮点数精度
- 练习仅在打印/批改时写入 `practiceLog`，刷新页面后未保存的临时练习会丢失
- 删除字时会自动删除所有包含该字的词及相关统计
- 分类删除后，字和词的 `categoryId` 会被清空而非删除
- **模块加载顺序**：`store.js` → `app.js` → `ui.js` → `practice.js` → `library.js` → `history.js` → `dict.js` → `stats.js` → `main.js`（按依赖顺序排列）
- 修改功能时找到对应模块文件编辑，不要修改 `index.html` 的 `<script>` 标签
- 新增公共函数应挂在 `App.ModuleName` 下，并通过 `window.xxx = ...` 提供 onclick 兼容
