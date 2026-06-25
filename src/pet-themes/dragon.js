// ============================================================
//  墨黑龙 — 暗黑系东方龙
//  形象设计：东方龙，蛇形身、鳞片、鹿角、龙须、鹰爪
// ============================================================
PetThemeRegistry.register('dragon', {
  name: '墨黑龙',
  emoji: '🐉',
  colors: ['#2d3748', '#48bb78', '#805ad5', '#f6e05e'],
  desc: '暗黑系东方龙',
  cost: 0,
  sprites: [
    // Stage 0 — 龙蛋（蛋壳带鳞片纹理）
    `<svg viewBox="0 0 64 64" width="52" height="52">
      <defs>
        <radialGradient id="de0" cx="40%" cy="35%"><stop offset="0" stop-color="#e8e0d8"/><stop offset="1" stop-color="#a09088"/></radialGradient>
      </defs>
      <ellipse cx="32" cy="36" rx="16" ry="20" fill="url(#de0)" stroke="#8b7d75" stroke-width="1"/>
      <path d="M22 30 Q24 26 28 30 M26 34 Q30 28 34 34 M30 24 Q34 18 38 24 M34 40 Q38 34 42 40" stroke="#b8b0a8" stroke-width="0.6" fill="none" opacity="0.6"/>
      <ellipse cx="30" cy="30" rx="6" ry="3" fill="#d8d0c8" opacity="0.3"/>
      <ellipse cx="32" cy="50" rx="10" ry="3" fill="#c8c0b8" opacity="0.2"/>
    </svg>`,

    // Stage 1 — 破壳（小龙仔：四脚、短尾、大眼、小角芽）
    `<svg viewBox="0 0 64 64" width="52" height="52">
      <defs>
        <radialGradient id="de1" cx="50%" cy="40%"><stop offset="0" stop-color="#5a7a9a"/><stop offset="1" stop-color="#2d3748"/></radialGradient>
      </defs>
      <ellipse cx="32" cy="40" rx="11" ry="9" fill="url(#de1)"/>
      <circle cx="32" cy="26" r="11" fill="url(#de1)"/>
      <path d="M20 22 L18 10 L24 16 L22 8 L28 14Z" fill="#718096"/>
      <path d="M44 22 L46 10 L40 16 L42 8 L36 14Z" fill="#718096"/>
      <path d="M22 22 Q24 12 28 18 Q30 10 34 16 Q36 8 40 18 L42 22Z" fill="#d0c8c0" stroke="#a09088" stroke-width="0.5" opacity="0.6"/>
      <ellipse cx="24" cy="24" rx="5" ry="5.5" fill="#fff"/>
      <ellipse cx="40" cy="24" rx="5" ry="5.5" fill="#fff"/>
      <ellipse cx="25" cy="24" rx="3" ry="3.5" fill="#48bb78"/>
      <ellipse cx="41" cy="24" rx="3" ry="3.5" fill="#48bb78"/>
      <circle cx="26" cy="23" r="1.5" fill="#fff"/>
      <circle cx="42" cy="23" r="1.5" fill="#fff"/>
      <path d="M28 30 Q32 33 36 30" stroke="#1a202c" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <path d="M18 38 Q10 32 14 36 Q8 30 12 34 L16 40Z" fill="#4a5568" opacity="0.5"/>
      <path d="M46 38 Q54 32 50 36 Q56 30 52 34 L48 40Z" fill="#4a5568" opacity="0.5"/>
      <path d="M26 48 Q20 52 24 48 Q18 50 22 46" stroke="#2d3748" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M22 44 Q18 46 20 44" stroke="#2d3748" stroke-width="1.5" fill="none"/>
      <path d="M42 44 Q46 46 44 44" stroke="#2d3748" stroke-width="1.5" fill="none"/>
    </svg>`,

    // Stage 2 — 幼龙（站立姿态，鳞片纹理，长尾拖地）
    `<svg viewBox="0 0 64 64" width="52" height="52">
      <defs>
        <radialGradient id="de2" cx="50%" cy="40%"><stop offset="0" stop-color="#4a6a8a"/><stop offset="1" stop-color="#1a202c"/></radialGradient>
      </defs>
      <ellipse cx="32" cy="42" rx="10" ry="8" fill="url(#de2)"/>
      <ellipse cx="32" cy="24" rx="11" ry="12" fill="url(#de2)"/>
      <ellipse cx="32" cy="24" rx="8" ry="6" fill="none" stroke="#718096" stroke-width="0.5" opacity="0.3"/>
      <path d="M16 14 L14 2 L20 10 L18 0 L24 8Z" fill="#718096"/>
      <path d="M48 14 L50 2 L44 10 L46 0 L40 8Z" fill="#718096"/>
      <ellipse cx="24" cy="22" rx="4.5" ry="5.5" fill="#fff"/>
      <ellipse cx="40" cy="22" rx="4.5" ry="5.5" fill="#fff"/>
      <ellipse cx="25" cy="22" rx="3" ry="3.5" fill="#48bb78"/>
      <ellipse cx="41" cy="22" rx="3" ry="3.5" fill="#48bb78"/>
      <circle cx="26" cy="21" r="1.5" fill="#fff"/>
      <circle cx="42" cy="21" r="1.5" fill="#fff"/>
      <path d="M26 28 Q32 32 38 28" stroke="#1a202c" stroke-width="1" fill="none" stroke-linecap="round"/>
      <path d="M22 34 Q12 24 18 30 Q8 20 14 26 L20 36Z" fill="#4a5568" opacity="0.6"/>
      <path d="M42 34 Q52 24 46 30 Q56 20 50 26 L44 36Z" fill="#4a5568" opacity="0.6"/>
      <path d="M20 30 L18 28" stroke="#718096" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M44 30 L46 28" stroke="#718096" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M22 48 Q12 56 8 48 Q4 54 12 52 Q8 58 16 54Z" stroke="#2d3748" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="44" rx="6" ry="3" fill="#718096" opacity="0.2"/>
      <path d="M30 6 L32 0 L34 6Z" fill="#718096" opacity="0.4"/>
    </svg>`,

    // Stage 3 — 少年龙（修长身躯、火焰鬃毛、锐利眼神）
    `<svg viewBox="0 0 72 72" width="56" height="56">
      <defs>
        <linearGradient id="de3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#48bb78"/><stop offset=".5" stop-color="#2b6cb0"/><stop offset="1" stop-color="#2d3748"/></linearGradient>
      </defs>
      <path d="M12 42 Q4 48 2 40 Q-2 36 4 34 Q0 30 6 32 Q10 28 12 34" fill="#ed8936" opacity="0.4"/>
      <path d="M16 50 Q6 58 12 50 Q4 56 10 48 Q6 60 14 52" stroke="#2b6cb0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="36" cy="44" rx="10" ry="8" fill="url(#de3)"/>
      <ellipse cx="36" cy="22" rx="13" ry="14" fill="url(#de3)"/>
      <path d="M18 12 L14 0 L24 8 L20 -4 L28 4Z" fill="url(#de3)"/>
      <path d="M54 12 L58 0 L48 8 L52 -4 L44 4Z" fill="url(#de3)"/>
      <ellipse cx="26" cy="20" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="46" cy="20" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="27" cy="20" rx="3.5" ry="4" fill="#fbd38d"/>
      <ellipse cx="47" cy="20" rx="3.5" ry="4" fill="#fbd38d"/>
      <circle cx="28" cy="19" r="1.8" fill="#fff"/>
      <circle cx="48" cy="19" r="1.8" fill="#fff"/>
      <path d="M24 24 L20 30" stroke="#f6ad55" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M48 24 L52 30" stroke="#f6ad55" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M30 30 Q36 35 42 30" stroke="#1a202c" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M20 36 Q8 22 16 30 Q4 16 12 26 L18 38Z" fill="#ed8936" opacity="0.7"/>
      <path d="M52 36 Q64 22 56 30 Q68 16 60 26 L54 38Z" fill="#ed8936" opacity="0.7"/>
      <path d="M16 32 Q8 20 14 26" stroke="#f6ad55" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M56 32 Q64 20 58 26" stroke="#f6ad55" stroke-width="0.8" fill="none" opacity="0.5"/>
      <ellipse cx="36" cy="46" rx="6" ry="3" fill="#a0aec0" opacity="0.15"/>
      <path d="M42 36 Q48 30 46 38 Q52 32 50 40Z" fill="#fbd38d" opacity="0.4"/>
    </svg>`,

    // Stage 4 — 巨龙（紫焰霸主、五爪、巨翼、龙珠）
    `<svg viewBox="0 0 72 72" width="56" height="56">
      <defs>
        <linearGradient id="de4b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#805ad5"/><stop offset=".4" stop-color="#4a5568"/><stop offset="1" stop-color="#1a202c"/></linearGradient>
        <linearGradient id="de4w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#553c9a"/><stop offset="1" stop-color="#2d3748"/></linearGradient>
      </defs>
      <circle cx="36" cy="32" r="30" fill="none" stroke="#805ad5" stroke-width="1.2" opacity="0.15"/>
      <circle cx="36" cy="32" r="27" fill="none" stroke="#d53f8c" stroke-width="0.6" opacity="0.1" stroke-dasharray="4 3"/>
      <path d="M12 36 Q-8 12 8 26 Q-12 2 4 20 L10 40Z" fill="url(#de4w)"/>
      <path d="M60 36 Q80 12 64 26 Q84 2 68 20 L62 40Z" fill="url(#de4w)"/>
      <path d="M6 28 Q-4 10 6 22" stroke="#805ad5" stroke-width="0.8" fill="none" opacity="0.3"/>
      <path d="M66 28 Q76 10 66 22" stroke="#805ad5" stroke-width="0.8" fill="none" opacity="0.3"/>
      <ellipse cx="36" cy="46" rx="13" ry="11" fill="url(#de4b)"/>
      <circle cx="36" cy="20" r="17" fill="url(#de4b)"/>
      <path d="M28 4 L30 -4 L34 2 L32 -6 L36 0 L40 -6 L38 2 L42 -4 L44 4Z" fill="#d53f8c"/>
      <path d="M16 10 L8 -6 L20 4 L12 -10 L24 0Z" fill="#805ad5"/>
      <path d="M56 10 L64 -6 L52 4 L60 -10 L48 0Z" fill="#805ad5"/>
      <ellipse cx="24" cy="18" rx="5.5" ry="6.5" fill="#fff"/>
      <ellipse cx="48" cy="18" rx="5.5" ry="6.5" fill="#fff"/>
      <ellipse cx="25" cy="18" rx="3.5" ry="4.5" fill="#fc8181"/>
      <ellipse cx="49" cy="18" rx="3.5" ry="4.5" fill="#fc8181"/>
      <circle cx="26" cy="17" r="2" fill="#fff"/>
      <circle cx="50" cy="17" r="2" fill="#fff"/>
      <path d="M22 22 L18 30" stroke="#805ad5" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M50 22 L54 30" stroke="#805ad5" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M28 30 Q36 37 44 30" stroke="#1a202c" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M30 32 L32 36 L34 32Z" fill="#fff" opacity="0.8"/>
      <path d="M38 32 L40 36 L42 32Z" fill="#fff" opacity="0.8"/>
      <path d="M20 54 Q4 66 10 54 Q-2 62 6 50 Q10 44 18 52" stroke="#4a5568" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M6 58 L2 52 L8 56Z" fill="#d53f8c"/>
      <path d="M20 42 L16 44" stroke="#2d3748" stroke-width="1.5" fill="none"/>
      <path d="M52 42 L56 44" stroke="#2d3748" stroke-width="1.5" fill="none"/>
      <circle cx="36" cy="12" r="3" fill="#fc8181" opacity="0.4"/>
    </svg>`,

    // Stage 5 — 神龙（金鳞龙神、踏云而行、星辰环绕）
    `<svg viewBox="0 0 80 80" width="60" height="60">
      <defs>
        <linearGradient id="de5b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbd38d"/><stop offset=".3" stop-color="#f6e05e"/><stop offset=".6" stop-color="#ecc94b"/><stop offset="1" stop-color="#d69e2e"/></linearGradient>
        <linearGradient id="de5g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#667eea" stop-opacity="0.35"/><stop offset=".5" stop-color="#d53f8c" stop-opacity="0.2"/><stop offset="1" stop-color="#f6ad55" stop-opacity="0.25"/></linearGradient>
        <linearGradient id="de5w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e05e" stop-opacity="0.85"/><stop offset="1" stop-color="#ed8936" stop-opacity="0.65"/></linearGradient>
      </defs>
      <circle cx="40" cy="36" r="36" fill="url(#de5g)"/>
      <circle cx="40" cy="36" r="31" fill="none" stroke="#f6e05e" stroke-width="1" opacity="0.25" stroke-dasharray="5 4"/>
      <circle cx="40" cy="36" r="27" fill="none" stroke="#667eea" stroke-width="0.6" opacity="0.15" stroke-dasharray="3 5"/>
      <circle cx="10" cy="8" r="1.5" fill="#f6e05e" opacity="0.85"/>
      <circle cx="70" cy="6" r="1.5" fill="#f6e05e" opacity="0.85"/>
      <circle cx="8" cy="28" r="1" fill="#bee3f8" opacity="0.65"/>
      <circle cx="72" cy="24" r="1" fill="#bee3f8" opacity="0.65"/>
      <circle cx="14" cy="4" r="0.8" fill="#fff" opacity="0.5"/>
      <circle cx="66" cy="4" r="0.8" fill="#fff" opacity="0.5"/>
      <circle cx="6" cy="46" r="1" fill="#f6e05e" opacity="0.4"/>
      <circle cx="74" cy="42" r="1" fill="#f6e05e" opacity="0.4"/>
      <path d="M14 40 Q-8 14 10 28 Q-14 2 6 22 L12 42Z" fill="url(#de5w)"/>
      <path d="M66 40 Q88 14 70 28 Q94 2 74 22 L68 42Z" fill="url(#de5w)"/>
      <path d="M10 32 Q-2 12 8 24" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M70 32 Q82 12 72 24" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.4"/>
      <ellipse cx="40" cy="50" rx="12" ry="10" fill="url(#de5b)"/>
      <circle cx="40" cy="22" r="16" fill="url(#de5b)"/>
      <path d="M30 8 L26 -4 L34 4 L30 -8 L38 0 L46 -8 L42 4 L50 -4 L46 8Z" fill="#f6ad55"/>
      <circle cx="38" cy="-2" r="3" fill="#f6ad55"/>
      <circle cx="38" cy="-2" r="1.5" fill="#fff" opacity="0.5"/>
      <ellipse cx="30" cy="20" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="50" cy="20" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="31" cy="20" rx="3.5" ry="4" fill="#bee3f8"/>
      <ellipse cx="51" cy="20" rx="3.5" ry="4" fill="#bee3f8"/>
      <circle cx="32" cy="19" r="1.8" fill="#fff"/>
      <circle cx="52" cy="19" r="1.8" fill="#fff"/>
      <path d="M28 24 L24 32" stroke="#f6e05e" stroke-width="0.8" fill="none" opacity="0.6"/>
      <path d="M52 24 L56 32" stroke="#f6e05e" stroke-width="0.8" fill="none" opacity="0.6"/>
      <path d="M34 32 Q40 36 46 32" stroke="#744210" stroke-width="1" fill="none" stroke-linecap="round"/>
      <ellipse cx="40" cy="52" rx="7" ry="4" fill="#d69e2e" opacity="0.25"/>
      <path d="M28 56 Q10 70 14 56 Q2 66 6 52 Q10 46 18 54" stroke="#d69e2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <circle cx="8" cy="58" r="3" fill="#f6e05e" opacity="0.3"/>
      <circle cx="8" cy="58" r="1.5" fill="#fff" opacity="0.5"/>
    </svg>`,
  ],
});

