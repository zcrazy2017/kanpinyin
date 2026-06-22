# kanpinyin — AI 代理指南

## 项目概述

**看拼音写词语 · 智能练习系统** — 纯前端、完全本地运行的家长辅助工具，用于生成小学生"看拼音写词语"练习题。

- **技术栈**：纯 HTML + CSS + JavaScript（`index.html`）+ Python Flask 后端
- **数据存储**：`localStorage`（键名: `kanpinyin_data`）
- **打印方案**：`window.print()` + CSS `@page` / `@media print`
- **拼音识别**：`server/app.py` Python 后端（端口 5001），使用 `pypinyin` 库
- **词语验证**：`server/word_composer.py` Python 后端，使用 `jieba` 词典验证真实词语

## 快速命令

| 命令 | 说明 |
|------|------|
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

## 设计模式

后端 `server/pinyin_service.py` 采用：
- **Singleton** — `PinyinService` 全局唯一实例
- **Strategy** — `PypinyinStrategy`（主策略）+ `BuiltinStrategy`（内置多音字表兜底）
- **Facade** — Flask API 层封装拼音识别逻辑

后端 `server/word_composer.py` 采用：
- **Singleton** — `WordComposerService` 全局唯一实例
- **Strategy** — `JiebaLookupStrategy`（主策略，使用 jieba 词典）+ `BuiltinWordStrategy`（内置小学常用词表 + 前缀规则兜底）
- **Facade** — Flask API 层封装词语验证逻辑

| 命令 | 说明 |
|------|------|
| 无构建步骤 | 直接在浏览器打开 `index.html` 即可运行 |
| 无依赖管理 | 零外部依赖，无需 npm / pip |

## 数据结构（核心知识）

所有数据存储在 `localStorage` 中，JSON 结构如下：

```javascript
{
  dict: { "春": { pinyin: "chūn" } },           // 全局字库
  words: [                                       // 全局词库
    { id: 0, chars: ["春","天"], pinyin: "chūn tiān" }
  ],
  students: [                                    // 学生列表
    {
      id: "stu1", name: "小明",
      errorWordIds: [],                          // 错词本（当前重点复习）
      wordStats: { "0": { total: 3, wrong: 1, lastDate: "2026-06-20" } },
      practiceLog: [                             // 每日练习记录
        { date: "2026-06-21", words: [{ wordId: 0, correct: true }] }
      ]
    }
  ]
}
```

**关键设计决策**：
- 错词本 (`errorWordIds`) 是动态的 — 写对就移除，写错就加入。永远是"当前仍需要重点复习的词"
- 新词按 `1 / (total + 1)` 加权随机选取，练习次数越少越优先
- 每日练习一旦生成即锁定存入 `practiceLog`，避免重复生成

## 每日出题算法

1. 从 `errorWordIds` 抽取 `min(5, len)` 个错词作为必考题
2. 剩余词按权重 `1/(total+1)` 加权随机抽取，补足50题
3. 打乱顺序
4. 特殊情况：总词数 < 50 则全出；错词本为空则纯权重抽取

## A4 打印规范

- A4 纵向 (210mm × 297mm)，页边距 15mm
- 5列 × 10行表格，每格放拼音 + 下划线
- 每页25词，共两页，用 `page-break-after` 分页
- `@media print` 隐藏导航、按钮等 UI

## 界面架构

三个面板（Tab 切换）：
1. **出题面板**（默认）— 生成练习、打印、批改
2. **字库管理面板** — 添加字/拼音、组词（遍历两两组合供勾选）
3. **学生切换** — 下拉选择器

## 关键函数约定

- `weightedRandom(items, weightFunc)` — 加权随机抽取通用函数
- 组词辅助：录入新字时，遍历已有字库显示所有两两组合，家长勾选确认
- 批改模式：逐词标记 ✓/✗，提交后更新 `wordStats` 和 `errorWordIds`

## 扩展预留

- 学生数组已支持多学生切换
- 宠物激励系统（二期）：挂在 `student` 下
- 数学/英语模式可复用整套出题-批改-统计框架

## 常见陷阱

- `localStorage` 存储的是字符串，读写需 `JSON.parse/stringify`
- 打印时需确保拼音字体清晰，推荐无衬线字体
- 加权随机需注意浮点数精度，累积概率到 1
- 同日重复生成练习时需检查 `practiceLog` 是否已有当日记录
