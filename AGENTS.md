# kanpinyin — AI 代理指南

## 项目概述

**看拼音写词语 · 智能练习系统** — 纯前端、完全本地运行的家长辅助工具，用于生成小学生"看拼音写词语"练习题。

- **技术栈**：纯 HTML + CSS + JavaScript（`index.html`）+ Python Flask 后端
- **数据存储**：`localStorage`（键名: `kanpinyin_data`）+ JSON 文件（通过后端 API 分文件存储）
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

## 界面架构

三个主面板（Tab 切换）+ 字库管理内含两个子 Tab：

### 1. 📝 出题面板
- 题目数量设置 + 分类筛选（多选）
- 生成今日练习（临时预览，打印/批改时才记录）
- 田字格预览、打印、批改
- 批改模式：默认全对，点击单字切换错误标记

### 2. 📚 字库管理面板
**子 Tab — 📂 分类管理**：
- 层级分类创建（年级 → 学期 → 单元 → 课）
- 字分类操作：勾选多字后点击分类批量分配，或拖拽单个字到分类
- 保存/加载分类到文件

**子 Tab — 🔤 字词管理**：
- 添加单字（自动识别拼音，可选分类）
- 组词（自动组合 + 手动输入）
- 批量导入（支持智能识别字/词，缺字自动补全拼音）
- 当前字库与词库列表，带保存/加载按钮

### 3. 📊 历史记录面板
- 统计概览：总天数、总词数、错词数、正确率
- 历史练习列表（按日期倒序，每条显示正确率色标）
- 查看详情（展开当日逐词批改情况）
- 常错字排行（🥇🥈🥉 标记）

### 学生切换
- 下拉选择器 + 添加学生按钮
- 保存学生数据按钮

## 关键函数约定

- `weightedRandomIndex(items, weightFunc)` — 加权随机抽取（**返回索引**）
- `getFilteredWords()` — 按选中的分类筛选词库
- `buildTzgWordHtml(word)` — 生成田字格 HTML
- `window._currentPractice` — 临时练习预览（打印/批改时写入 practiceLog）
- 批改：`wrongIndices: [0]` 表示词中第0个字写错

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
