"""Rewrite pet theme files with improved SVGs."""
import os

BASE = r"d:\aiproject\kanpinyin\kanpinyin\src\pet-themes"

# ===== FIREFOX =====
firefox_content = r"""// ============================================================
//  火灵狐 — 火焰之狐，炽热灵动
//  形象设计：赤狐，尖嘴、三角耳、蓬松尾、优雅身姿
// ============================================================
PetThemeRegistry.register('firefox', {
  name: '火灵狐',
  emoji: '\U0001F98A',
  colors: ['#dd6b20', '#f6ad55', '#fbd38d', '#e53e3e'],
  desc: '火焰之狐',
  cost: 30,
  sprites: [
    // Stage 0 — 火焰蛋（橙色渐变火焰纹）
    '<svg viewBox="0 0 64 64" width="52" height="52">'
    '  <defs><radialGradient id="ff0" cx="40%" cy="35%"><stop offset="0" stop-color="#fbd38d"/><stop offset="1" stop-color="#dd6b20"/></radialGradient></defs>'
    '  <ellipse cx="32" cy="36" rx="16" ry="20" fill="url(#ff0)" stroke="#c05621" stroke-width="1"/>'
    '  <path d="M26 28 Q30 20 34 28 Q32 24 28 28Z" fill="#f6ad55" opacity="0.5"/>'
    '  <path d="M24 34 Q30 26 36 34 Q32 30 28 34Z" fill="#f6ad55" opacity="0.3"/>'
    '  <path d="M30 24 Q32 18 34 24Z" fill="#fbd38d" opacity="0.4"/>'
    '  <path d="M28 42 Q32 38 36 42" stroke="#f6ad55" stroke-width="0.8" fill="none" opacity="0.3"/>'
    '</svg>',
  ],
});
"""
with open(os.path.join(BASE, 'firefox.js'), 'w', encoding='utf-8') as f:
    f.write(firefox_content)
print("firefox.js written")
