// ============================================================
//  Pet Theme Registry — 精灵形象注册中心
//  新增形象只需在 src/pet-themes/ 下创建新文件并注册即可
//  注册方式: PetThemeRegistry.register('主题key', { ...数据... })
// ============================================================
window.PetThemeRegistry = {
  _keys: [],

  /** 注册一个精灵主题 */
  register(key, data) {
    this[key] = data;
    this._keys.push(key);
  },

  /** 获取所有注册的主题 key */
  keys() {
    return this._keys.slice();
  },

  /** 获取主题数据 */
  get(key) {
    return this[key] || this.dragon;
  },

  /** 获取主题的精灵数组 */
  getSprites(key) {
    const theme = this.get(key);
    return (theme && theme.sprites) || [];
  },

  /** 获取默认主题（第一个注册的） */
  getDefault() {
    return this.dragon || null;
  },
};
