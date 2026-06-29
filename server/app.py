"""
看拼音写词语 · 后端组合服务

设计模式：
  - Singleton: Flask 应用实例 + PinyinService / WordComposerService
  - Facade: API 层封装拼音识别 + 词语验证逻辑
  - Strategy: 拼音识别多策略 / 词语验证多策略
  - Proxy: 静态文件服务代理（开发模式）

启动：python app.py
"""

import os
import sys
import json
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pinyin_service import PinyinService
from word_composer import WordComposerService

# ──────────────────────────────────────────────
#  Singleton: Flask 应用
# ──────────────────────────────────────────────
_APP: Flask | None = None


def create_app() -> Flask:
    """创建/获取 Flask 单例"""
    global _APP
    if _APP is not None:
        return _APP

    app = Flask(__name__, static_folder=None)
    CORS(app)

    # ── 服务单例 ──
    pinyin_service = PinyinService()
    word_composer = WordComposerService()

    # ──────────────────────────────────────────────
    #  API 层（Facade）
    # ──────────────────────────────────────────────

    @app.route('/api/pinyin', methods=['GET'])
    def api_pinyin():
        """
        拼音识别接口

        GET /api/pinyin?char=好
        → { "char": "好", "pinyins": ["hǎo", "hào"] }
        """
        char = request.args.get('char', '').strip()
        if not char:
            return jsonify({'error': '缺少参数 char'}), 400
        if len(char) != 1:
            return jsonify({'error': '只支持单字查询'}), 400
        if ord(char) < 0x4e00 or ord(char) > 0x9fff:
            return jsonify({'error': '请输入汉字'}), 400

        pinyins = pinyin_service.get_pinyin(char)
        return jsonify({
            'char': char,
            'pinyins': pinyins,
        })

    @app.route('/api/batch-pinyin', methods=['POST'])
    def api_batch_pinyin():
        """
        批量拼音识别

        POST /api/batch-pinyin
        { "chars": ["春", "天"] }
        → { "results": { "春": ["chūn"], "天": ["tiān"] } }
        """
        data = request.get_json(silent=True) or {}
        chars = data.get('chars', [])
        if not chars or not isinstance(chars, list):
            return jsonify({'error': '缺少参数 chars 或格式错误'}), 400

        results = {}
        for ch in chars:
            ch = ch.strip()
            if ch and len(ch) == 1 and 0x4e00 <= ord(ch) <= 0x9fff:
                pinyins = pinyin_service.get_pinyin(ch)
                if pinyins:
                    results[ch] = pinyins

        return jsonify({'results': results})

    @app.route('/api/compose', methods=['GET'])
    def api_compose():
        """
        词语组合验证接口

        GET /api/compose?char=春&with=天,花,开
        → {
            "char": "春",
            "combinations": [["春","天"], ["春","花"]],
            "words": ["春天", "春花"]
          }
        """
        char = request.args.get('char', '').strip()
        with_chars_raw = request.args.get('with', '').strip()

        if not char or not with_chars_raw:
            return jsonify({'error': '缺少参数 char 或 with'}), 400
        if len(char) != 1:
            return jsonify({'error': 'char 只支持单字'}), 400

        with_chars = [c.strip() for c in with_chars_raw.split(',') if c.strip()]
        if not with_chars:
            return jsonify({'error': 'with 参数无效'}), 400

        combinations = word_composer.compose(char, with_chars)
        words = [''.join(pair) for pair in combinations]

        return jsonify({
            'char': char,
            'combinations': combinations,
            'words': words,
        })

    @app.route('/api/composable', methods=['GET'])
    def api_composable():
        """
        可组词字筛选接口 — 返回哪些字能组成至少一个真实词语

        GET /api/composable?chars=春,天,花,开,好
        → {
            "composable": ["春", "好"],
            "non_composable": ["天", "花", "开"]
          }
        """
        chars_raw = request.args.get('chars', '').strip()
        if not chars_raw:
            return jsonify({'error': '缺少参数 chars'}), 400

        chars = [c.strip() for c in chars_raw.split(',') if c.strip() and len(c.strip()) == 1]
        if len(chars) < 2:
            return jsonify({'composable': [], 'non_composable': chars})

        composable = []
        non_composable = []

        for ch in chars:
            others = [c for c in chars if c != ch]
            combos = word_composer.compose(ch, others)
            if combos:
                composable.append(ch)
            else:
                non_composable.append(ch)

        return jsonify({
            'composable': composable,
            'non_composable': non_composable,
        })

    @app.route('/api/validate-words', methods=['POST'])
    def api_validate_words():
        """
        批量词语验证接口

        POST /api/validate-words
        { "words": ["春天", "天春", "春花"] }
        → { "results": { "春天": true, "天春": false, "春花": true } }
        """
        data = request.get_json(silent=True) or {}
        words = data.get('words', [])
        if not words or not isinstance(words, list):
            return jsonify({'error': '缺少参数 words 或格式错误'}), 400

        results = word_composer.validate_words(words)
        return jsonify({'results': results})

    @app.route('/api/health', methods=['GET'])
    def api_health():
        """健康检查"""
        return jsonify({'status': 'ok', 'service': 'kanpinyin-pinyin'})

    # ── 静态文件服务（Proxy） ──
    # 提供 index.html 所在目录的静态文件
    _project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    @app.route('/')
    def serve_index():
        return send_from_directory(_project_root, 'index.html')

    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(_project_root, filename)

    # ──────────────────────────────────────────────
    #  JSON 数据文件持久化 — 按类型分文件存储
    # ──────────────────────────────────────────────
    DATA_DIR = os.path.join(_project_root, 'data')
    os.makedirs(DATA_DIR, exist_ok=True)

    DATA_FILES = {
        'dict': os.path.join(DATA_DIR, 'dict.json'),
        'words': os.path.join(DATA_DIR, 'words.json'),
        'categories': os.path.join(DATA_DIR, 'categories.json'),
        'students': os.path.join(DATA_DIR, 'students.json'),
        'saved_practices': os.path.join(DATA_DIR, 'saved_practices.json'),
    }

    def _data_file_path(data_type):
        path = DATA_FILES.get(data_type)
        if path is None:
            raise ValueError(f'未知数据类型: {data_type}')
        return path

    @app.route('/api/data/load/<data_type>', methods=['GET'])
    def api_data_load(data_type):
        """加载指定类型的 JSON 数据文件"""
        try:
            path = _data_file_path(data_type)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        if not os.path.exists(path):
            return jsonify({'data': None, 'message': f'{data_type}.json 不存在'})
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify({'data': data, 'message': 'ok', 'type': data_type})
        except Exception as e:
            return jsonify({'error': f'读取失败: {str(e)}'}), 500

    @app.route('/api/data/save/<data_type>', methods=['POST'])
    def api_data_save(data_type):
        """保存指定类型的 JSON 数据文件"""
        try:
            path = _data_file_path(data_type)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        body = request.get_json(silent=True) or {}
        data = body.get('data')
        if data is None:
            return jsonify({'error': '缺少 data 字段'}), 400
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return jsonify({'message': f'{data_type}.json 保存成功', 'path': path})
        except Exception as e:
            return jsonify({'error': f'保存失败: {str(e)}'}), 500

    _APP = app
    return app


# ──────────────────────────────────────────────
#  入口
# ──────────────────────────────────────────────
if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5001))
    print(f'🚀 拼音组词服务已启动: http://localhost:{port}')
    print(f'📖 访问 http://localhost:{port} 打开应用')
    print(f'🔍 拼音: http://localhost:{port}/api/pinyin?char=好')
    print(f'   → 多音字如「好」将返回 ["hǎo", "hào"]')
    print(f'   → 单音字如「春」将返回 ["chūn"]')
    print(f'🔍 组词: http://localhost:{port}/api/compose?char=春&with=天,花,开')
    print(f'   → 仅返回真实有效的词语组合')
    app.run(host='0.0.0.0', port=port, debug=True)
