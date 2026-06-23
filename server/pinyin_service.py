"""
拼音识别服务 — Strategy + Singleton 设计模式

Strategy: 多种拼音识别策略可切换
  - PypinyinStrategy: 使用 pypinyin 库（主策略）
  - BuiltinStrategy: 内置常用多音字表（兜底策略）
Singleton: PinyinService 全局唯一实例
"""

import re
from typing import Optional


# ──────────────────────────────────────────────
# 内置常用多音字表（兜底策略）
# ──────────────────────────────────────────────
_POLYPHONE_MAP: dict[str, list[str]] = {
    '好': ['hǎo', 'hào'],
    '长': ['cháng', 'zhǎng'],
    '乐': ['lè', 'yuè'],
    '行': ['xíng', 'háng'],
    '重': ['zhòng', 'chóng'],
    '朝': ['cháo', 'zhāo'],
    '还': ['hái', 'huán'],
    '为': ['wèi', 'wéi'],
    '的': ['de', 'dí', 'dì'],
    '了': ['le', 'liǎo'],
    '着': ['zhe', 'zháo', 'zhāo', 'zhuó'],
    '都': ['dōu', 'dū'],
    '只': ['zhǐ', 'zhī'],
    '发': ['fā', 'fà'],
    '教': ['jiào', 'jiāo'],
    '当': ['dāng', 'dàng'],
    '得': ['dé', 'děi', 'de'],
    '数': ['shù', 'shǔ', 'shuò'],
    '弹': ['dàn', 'tán'],
    '乐': ['lè', 'yuè'],
    '觉': ['jué', 'jiào'],
    '空': ['kōng', 'kòng'],
    '间': ['jiān', 'jiàn'],
    '种': ['zhǒng', 'zhòng'],
    '传': ['chuán', 'zhuàn'],
    '应': ['yīng', 'yìng'],
    '处': ['chǔ', 'chù'],
    '模': ['mó', 'mú'],
    '薄': ['báo', 'bó', 'bò'],
    '假': ['jiǎ', 'jià'],
    '调': ['diào', 'tiáo'],
    '率': ['lǜ', 'shuài'],
    '尽': ['jìn', 'jǐn'],
    '强': ['qiáng', 'qiǎng', 'jiàng'],
    '背': ['bèi', 'bēi'],
    '没': ['méi', 'mò'],
    '给': ['gěi', 'jǐ'],
    '难': ['nán', 'nàn'],
    '少': ['shǎo', 'shào'],
    '把': ['bǎ', 'bà'],
    '便': ['biàn', 'pián'],
    '参': ['cān', 'shēn', 'cēn'],
    '曾': ['céng', 'zēng'],
    '差': ['chà', 'chā', 'chāi', 'cī'],
    '称': ['chēng', 'chèn', 'chèng'],
    '冲': ['chōng', 'chòng'],
    '斗': ['dǒu', 'dòu'],
    '恶': ['è', 'wù', 'ě'],
    '干': ['gàn', 'gān'],
    '观': ['guān', 'guàn'],
    '冠': ['guān', 'guàn'],
    '华': ['huá', 'huà'],
    '划': ['huà', 'huá'],
    '会': ['huì', 'kuài'],
    '几': ['jǐ', 'jī'],
    '济': ['jì', 'jǐ'],
    '角': ['jiǎo', 'jué'],
    '禁': ['jìn', 'jīn'],
    '卷': ['juǎn', 'juàn'],
    '看': ['kàn', 'kān'],
    '壳': ['ké', 'qiào'],
    '括': ['kuò', 'guā'],
    '落': ['luò', 'là', 'lào'],
    '埋': ['mái', 'mán'],
    '蒙': ['méng', 'měng', 'mēng'],
    '秘': ['mì', 'bì'],
    '宁': ['níng', 'nìng'],
    '铺': ['pū', 'pù'],
    '切': ['qiè', 'qiē'],
    '曲': ['qǔ', 'qū'],
    '散': ['sàn', 'sǎn'],
    '丧': ['sàng', 'sāng'],
    '舍': ['shě', 'shè'],
    '省': ['shěng', 'xǐng'],
    '盛': ['shèng', 'chéng'],
    '石': ['shí', 'dàn'],
    '熟': ['shú', 'shóu'],
    '似': ['sì', 'shì'],
    '踏': ['tà', 'tā'],
    '提': ['tí', 'dī'],
    '挑': ['tiāo', 'tiǎo'],
    '贴': ['tiē', 'tiè'],
    '吐': ['tǔ', 'tù'],
    '为': ['wèi', 'wéi'],
    '系': ['xì', 'jì'],
    '吓': ['xià', 'hè'],
    '血': ['xuè', 'xiě'],
    '咽': ['yān', 'yàn', 'yè'],
    '要': ['yào', 'yāo'],
    '遗': ['yí', 'wèi'],
    '饮': ['yǐn', 'yìn'],
    '晕': ['yūn', 'yùn'],
    '载': ['zài', 'zǎi'],
    '占': ['zhàn', 'zhān'],
    '正': ['zhèng', 'zhēng'],
    '挣': ['zhèng', 'zhēng'],
    '只': ['zhǐ', 'zhī'],
    '中': ['zhōng', 'zhòng'],
    '转': ['zhuǎn', 'zhuàn'],
    '钻': ['zuān', 'zuàn'],
    '作': ['zuò', 'zuō'],
}


# ═══════════════════════════════════════════
#  策略接口
# ═══════════════════════════════════════════
class PinyinStrategy:
    """拼音识别策略接口"""

    def get_pinyin(self, char: str) -> Optional[list[str]]:
        """返回汉字的拼音列表（有声调符号），None 表示无法识别"""
        raise NotImplementedError


# ═══════════════════════════════════════════
#  策略 A：pypinyin 库（主策略）
# ═══════════════════════════════════════════
class PypinyinStrategy(PinyinStrategy):
    """使用 pypinyin 库进行拼音识别"""

    def __init__(self):
        self._available = False
        try:
            from pypinyin import pinyin, Style
            self._pinyin = pinyin
            self._Style = Style
            self._available = True
        except ImportError:
            pass

    @property
    def available(self) -> bool:
        return self._available

    def get_pinyin(self, char: str) -> Optional[list[str]]:
        if not self._available:
            return None
        try:
            from pypinyin import Style
            # Get standard (most common) pronunciation
            standard = self._pinyin(char, style=Style.TONE3, heteronym=False)
            if not standard or not standard[0]:
                return None
            std_py = self._tone3_to_symbol(standard[0][0])

            # Check if this char is in the curated multi-pronunciation map
            if char in _POLYPHONE_MAP:
                return _POLYPHONE_MAP[char]

            # Single pronunciation: return standard only
            return [std_py]
        except Exception:
            return None

    @staticmethod
    def _tone3_to_symbol(py: str) -> str:
        """将拼音中的数字声调转为符号声调（如 hao3 -> hǎo）

        声调标注标准规则：
          1. 有 a / e → 标在该元音上
          2. 有 ou → 标在 o 上
          3. 否则 → 标在最后一个元音上
        """
        match = re.match(r'^([a-zA-ZüÜ]+)(\d)$', py)
        if not match:
            return py
        letters, tone = match.group(1), match.group(2)
        tone_idx = int(tone) - 1

        vowel_map = {
            'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì',
            'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ',
            'A': 'ĀÁǍÀ', 'E': 'ĒÉĚÈ', 'I': 'ĪÍǏÌ',
            'O': 'ŌÓǑÒ', 'U': 'ŪÚǓÙ', 'Ü': 'ǕǗǙǛ',
        }

        def find_vowel(candidates):
            for i, ch in enumerate(letters):
                if ch in candidates:
                    return i
            return -1

        # 规则1: 找 a 或 e
        target = find_vowel(('a', 'A', 'e', 'E'))
        # 规则2: 找 ou 组合 → 标 o
        if target < 0:
            for i, ch in enumerate(letters):
                if i + 1 < len(letters) and ch in ('o', 'O') and letters[i + 1] in ('u', 'U'):
                    target = i
                    break
        # 规则3: 标在最后一个元音上
        if target < 0:
            for i in range(len(letters) - 1, -1, -1):
                if letters[i] in vowel_map:
                    target = i
                    break

        if target < 0:
            return py

        result = list(letters)
        result[target] = vowel_map[letters[target]][tone_idx]
        return ''.join(result)


# ═══════════════════════════════════════════
#  策略 B：内置字典（兜底策略）
# ═══════════════════════════════════════════
class BuiltinStrategy(PinyinStrategy):
    """使用内置常用字拼音表"""

    def get_pinyin(self, char: str) -> Optional[list[str]]:
        return _POLYPHONE_MAP.get(char)


# ═══════════════════════════════════════════
#  Singleton 服务
# ═══════════════════════════════════════════
class PinyinService:
    """拼音识别服务 — Singleton"""

    _instance: Optional['PinyinService'] = None

    def __new__(cls) -> 'PinyinService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._strategies: list[PinyinStrategy] = []
        self._init_strategies()

    def _init_strategies(self):
        """按优先级注册策略"""
        pypinyin_strategy = PypinyinStrategy()
        self._strategies.append(pypinyin_strategy)
        self._strategies.append(BuiltinStrategy())

    def get_pinyin(self, char: str) -> list[str]:
        """
        识别汉字的拼音列表（有声调符号）
        返回空列表表示无法识别
        """
        if not char or len(char) != 1:
            return []
        if ord(char) < 0x4e00 or ord(char) > 0x9fff:
            return []

        seen = set()
        results = []

        for strategy in self._strategies:
            try:
                pinyins = strategy.get_pinyin(char)
                if pinyins:
                    for py in pinyins:
                        if py and py not in seen:
                            seen.add(py)
                            results.append(py)
            except Exception:
                continue

        return results
