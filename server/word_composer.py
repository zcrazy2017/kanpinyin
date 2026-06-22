"""
词语组合验证服务 — Strategy + Singleton 设计模式

Strategy: 多种词语验证策略可切换
  - JiebaStrategy: 使用 jieba 分词库的词典验证词语（主策略）
  - BuiltinStrategy: 内置常用词语表（兜底策略）
Singleton: WordComposerService 全局唯一实例
"""

from typing import Optional


# ═══════════════════════════════════════════
#  内置常用词语表（兜底策略 — 小学常见词汇）
# ═══════════════════════════════════════════
_COMMON_WORDS: set[str] = {
    # 一年级常用
    '春天', '夏天', '秋天', '冬天', '春风', '春雨', '雪花', '花朵',
    '蓝天', '白云', '太阳', '月亮', '星星', '大地', '河水', '大海',
    '小鸟', '飞鸟', '鱼儿', '虫子', '花草', '树木', '叶子', '种子',
    '开心', '快乐', '高兴', '生气', '伤心', '难过', '着急', '害怕',
    '同学', '老师', '学校', '教室', '书本', '写字', '读书', '学习',
    '妈妈', '爸爸', '爷爷', '奶奶', '哥哥', '姐姐', '弟弟', '妹妹',
    '吃饭', '喝水', '睡觉', '走路', '跑步', '跳舞', '唱歌', '画画',
    '好看', '美丽', '漂亮', '可爱', '聪明', '勇敢', '善良', '认真',
    '大小', '多少', '长短', '高矮', '胖瘦', '快慢', '轻重', '远近',
    '早上', '中午', '晚上', '今天', '明天', '昨天', '星期', '月份',
    '中国', '北京', '长城', '红旗', '国家', '城市', '乡村', '田野',
    '水果', '苹果', '西瓜', '桃子', '草莓', '香蕉', '橘子', '葡萄',
    '动物', '小猫', '小狗', '小鸡', '小鸭', '兔子', '老虎', '大象',
    '看书', '看花', '看天', '看海', '听歌', '说话', '问答', '思考',
    '上来', '下去', '进来', '出去', '过来', '过去', '起来', '回去',
    '打开', '关上', '推开', '拉住', '放下', '拿起', '举起', '放下',
    '明白', '知道', '发现', '觉得', '以为', '相信', '想念', '忘记',
    '工作', '生活', '运动', '游戏', '故事', '音乐', '图画', '电影',
    '红色', '蓝色', '绿色', '白色', '黑色', '黄色', '金色', '粉色',
    '新年', '春节', '节日', '礼物', '团圆', '快乐', '平安', '幸福',
    '天空', '天气', '空气', '气温', '阳光', '月光', '灯光', '火光',
    '水花', '火花', '浪花', '泪花', '开花', '结果', '发芽', '生长',
    '好人', '好事', '好心', '好意', '好处', '好运', '好奇', '好像',
    '花开', '花落', '花香', '花园', '花丛', '花灯', '花生', '花样',
    '天上', '天下', '天才', '天生', '天文', '天平', '天使', '天地',
    '开门', '开始', '开学', '开展', '开放', '开心', '开关', '开朗',
    '大开', '打开', '展开', '放开', '开展', '盛开', '百花', '齐放',
    '春色', '绿色', '金色', '景色', '彩色', '颜色', '本色', '红色',
    '风光', '风景', '风格', '风气', '风雨', '风云', '风度', '风车',
    '力气', '气体', '气温', '气味', '体质', '体育', '体会', '体验',
    '手工', '动手', '双手', '手机', '手心', '手掌', '手术', '手段',
    '大水', '大雨', '大雪', '大风', '大地', '大山', '大河', '大海',
    '小草', '小花', '大树', '小河', '小山', '小桥', '小路', '小船',
    '上山', '下山', '上水', '下水', '上车', '下车', '上船', '下船',
    '火车', '轮船', '飞机', '汽车', '自行车', '电灯', '电话', '电视',
    '好人', '坏人', '大人', '小人', '老人', '新人', '高人', '能人',
    '长处', '短处', '好处', '坏处', '多处', '少处', '用处', '难处',
    '见面', '再见', '看见', '听见', '遇见', '梦见', '看见', '碰见',
    '年岁', '岁月', '几岁', '岁数', '年月', '年份', '年龄', '年纪',
    '东方', '南方', '西方', '北方', '前方', '后方', '左方', '右方',
    '白天', '黑夜', '白日', '黑天', '白净', '黑白', '明白', '清白',
    '千万', '万物', '万一', '万年', '万象', '万能', '万物', '万千',
    '人生', '人民', '人们', '人间', '人口', '人类', '人情', '人事',
    '主人', '主要', '自主', '主动', '主张', '主意', '主导', '主体',
    '友好', '好友', '好意', '友善', '友谊', '友情', '友爱', '友好',
    '生长', '生活', '生动', '生命', '生日', '生态', '生物', '生意',
    '十分', '十足', '十足', '十足', '十足', '十足',
    '心情', '情感', '感情', '情怀', '情操', '情绪', '情意', '友情',
    '大海', '大量', '大家', '大众', '大约', '大概', '大学', '大地',
    '合作', '合理', '合适', '和平', '和谐', '和气', '河流', '和好',
    '美好', '完美', '完善', '完全', '完整', '完成', '完美', '完善',
    '学习', '学问', '学业', '学术', '学风', '学号', '学年', '学期',
    '中国', '中间', '中心', '中央', '中华', '中学', '中午', '中年',
}

# 额外补充：前缀组词模式，用于常见搭配
_COMMON_PREFIXES: dict[str, list[str]] = {
    '春': ['天', '风', '雨', '花', '色', '光', '节', '暖', '意', '季', '耕', '联'],
    '夏': ['天', '日', '季', '令', '至', '收', '种'],
    '秋': ['天', '风', '色', '季', '收', '意', '高'],
    '冬': ['天', '日', '季', '至', '令', '装', '眠'],
    '好': ['人', '心', '意', '事', '处', '运', '奇', '像', '友', '听', '看', '吃', '玩', '学'],
    '花': ['朵', '香', '园', '丛', '瓣', '蕊', '色', '灯', '生', '样', '开', '落'],
    '开': ['门', '心', '始', '学', '展', '放', '关', '朗', '通', '花', '水', '车'],
    '天': ['空', '气', '上', '下', '才', '生', '使', '地', '真', '平', '文', '蓝'],
}


# ═══════════════════════════════════════════
#  策略接口
# ═══════════════════════════════════════════
class WordLookupStrategy:
    """词语验证策略接口"""

    def is_valid_word(self, word: str) -> bool:
        """判断二字词语是否真实有效"""
        raise NotImplementedError


# ═══════════════════════════════════════════
#  策略 A：jieba 分词库（主策略）
# ═══════════════════════════════════════════
class JiebaLookupStrategy(WordLookupStrategy):
    """使用 jieba 分词库内置词典验证词语"""

    def __init__(self):
        self._available = False
        try:
            import jieba
            self._jieba = jieba
            self._available = True
        except ImportError:
            pass

    @property
    def available(self) -> bool:
        return self._available

    def is_valid_word(self, word: str) -> bool:
        if not self._available or len(word) != 2:
            return False
        try:
            # 用 jieba 分词：如果词被完整切分为一个整体，说明是词典中的真实词语
            # 如果被拆成两个单字，则不是真实词语
            tokens = list(self._jieba.cut(word, HMM=False))
            return len(tokens) == 1 and tokens[0] == word
        except Exception:
            return False


# ═══════════════════════════════════════════
#  策略 B：内置词表 + 前缀规则（兜底策略）
# ═══════════════════════════════════════════
class BuiltinWordStrategy(WordLookupStrategy):
    """使用内置词表和构词规则"""

    def is_valid_word(self, word: str) -> bool:
        if len(word) != 2:
            return False
        # 1. 查内置词库
        if word in _COMMON_WORDS:
            return True

        # 2. 查前缀规则：第一个字是常用构词前缀，第二个字在允许列表中
        first, second = word[0], word[1]
        if first in _COMMON_PREFIXES:
            if second in _COMMON_PREFIXES[first]:
                return True

        return False


# ═══════════════════════════════════════════
#  Singleton 服务
# ═══════════════════════════════════════════
class WordComposerService:
    """词语组合验证服务 — Singleton"""

    _instance: Optional['WordComposerService'] = None

    def __new__(cls) -> 'WordComposerService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._strategies: list[WordLookupStrategy] = []
        self._init_strategies()

    def _init_strategies(self):
        """按优先级注册策略"""
        jieba_strategy = JiebaLookupStrategy()
        self._strategies.append(jieba_strategy)
        self._strategies.append(BuiltinWordStrategy())

    def compose(self, char: str, with_chars: list[str]) -> list[list[str]]:
        """
        对指定字符与候选字符进行组合，返回所有有效二字词语的字符对列表

        参数:
          char: 选中的字符（放在前面）
          with_chars: 候选字符列表

        返回:
          [["春","天"], ["春","花"]]  # 仅真实有效的词语
        """
        if not char or not with_chars:
            return []

        results: list[list[str]] = []

        for other in with_chars:
            if other == char:
                continue
            word = char + other
            if len(word) != 2:
                continue

            # 依次使用各策略判断
            is_valid = False
            for strategy in self._strategies:
                try:
                    if strategy.is_valid_word(word):
                        is_valid = True
                        break
                except Exception:
                    continue

            if is_valid:
                results.append([char, other])

        return results

    def validate_words(self, words: list[str]) -> dict[str, bool]:
        """
        批量验证词语是否真实有效

        参数:
          words: 待验证的词语列表

        返回:
          {"春天": true, "天春": false, ...}
        """
        result: dict[str, bool] = {}
        for word in words:
            if len(word) != 2:
                result[word] = False
                continue
            is_valid = False
            for strategy in self._strategies:
                try:
                    if strategy.is_valid_word(word):
                        is_valid = True
                        break
                except Exception:
                    continue
            result[word] = is_valid
        return result
