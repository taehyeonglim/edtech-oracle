#!/usr/bin/env python3
"""위인 이니셜 아바타를 만든다.

`KNOWN-ISSUES` #3 — 36장 중 퍼블릭 도메인·CC 근거가 확인된 초상은 14장뿐이다.
근거 없는 것을 올리지 않는 프로젝트에서 나머지 22장을 임의로 채울 수는 없고,
14장만 사진을 쓰면 두 종류가 섞여 더 이상해진다. **전원 이니셜이 지금의 답이다.**

위키가 정본이다. 이름도 slug도 `wiki/pioneers/*.md`에서 읽는다 — `gen-agents.mjs`가
에이전트를 위키에서 찍어내는 것과 같은 이유로, 손으로 적은 목록을 따로 두지 않는다.

파이썬을 쓰는 이유는 하나다. 글자를 그리려면 폰트 래스터라이저가 필요한데 이 저장소의
런타임 의존성은 0이고 그 상태를 유지하고 싶다. PIL은 macOS에 이미 있고, 이 스크립트는
자산을 한 번 만들어 커밋하면 끝이라 빌드에도 봇에도 관여하지 않는다.

    python3 scripts/gen-avatars.py
"""

import hashlib
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PIONEERS = ROOT / "wiki" / "pioneers"
OUT = ROOT / "web" / "assets" / "avatars"
SIZE = 256

# 한글이 있는 시스템 폰트. 앞의 것부터 찾아 쓴다.
FONTS = [
    ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 4),
    ("/System/Library/Fonts/Supplemental/AppleGothic.ttf", 0),
    ("/Library/Fonts/NanumGothic.ttf", 0),
]


def load_font(px):
    for path, index in FONTS:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, px, index=index)
            except OSError:
                continue
    sys.exit("한글 폰트를 찾지 못했다. FONTS 목록에 경로를 추가해라.")


def frontmatter(text):
    """`---` 사이의 `key: value`만 얕게 읽는다. 필요한 것은 title과 slug뿐이다."""
    m = re.match(r"^---\r?\n(.*?)\r?\n---", text, re.S)
    if not m:
        return {}
    out = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if kv:
            out[kv.group(1)] = kv.group(2).strip().strip("\"'")
    return out


def initial(title):
    """성 한 글자. `존 듀이` → `듀`, `B. F. 스키너` → `스`.

    한국어 표기에서 성은 마지막 어절이다. 이름의 첫 글자를 쓰면 서양 인물이
    전부 이름 기준으로 갈려 `존`·`로버트`가 여럿 겹친다.
    """
    words = [w for w in re.split(r"\s+", title.strip()) if w]
    return words[-1][0] if words else "?"


def hsl_to_rgb(h, s, light):
    c = (1 - abs(2 * light - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = light - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return tuple(round((v + m) * 255) for v in (r, g, b))


def color_for(slug):
    """slug에서 색을 결정한다. 같은 위인은 언제 다시 만들어도 같은 색이다."""
    h = int(hashlib.sha256(slug.encode()).hexdigest()[:8], 16)
    return hsl_to_rgb(h % 360, 0.42, 0.38)


def draw_avatar(text, bg):
    img = Image.new("RGB", (SIZE, SIZE), bg)
    d = ImageDraw.Draw(img)
    font = load_font(140)
    box = d.textbbox((0, 0), text, font=font)
    d.text(
        ((SIZE - (box[2] - box[0])) / 2 - box[0], (SIZE - (box[3] - box[1])) / 2 - box[1]),
        text,
        font=font,
        fill=(255, 255, 255),
    )
    return img


def main():
    files = sorted(PIONEERS.glob("*.md"))
    if not files:
        sys.exit(f"위인 페이지를 찾지 못했다: {PIONEERS}")
    OUT.mkdir(parents=True, exist_ok=True)

    made = 0
    for f in files:
        fm = frontmatter(f.read_text(encoding="utf-8"))
        slug, title = fm.get("slug"), fm.get("title")
        if not slug or not title:
            print(f"  건너뜀 {f.name} — slug 또는 title 없음")
            continue
        draw_avatar(initial(title), color_for(slug)).save(OUT / f"{slug}.png", optimize=True)
        made += 1

    # 사회자는 위인이 아니다. 위키에 페이지가 없으므로 여기서 따로 만든다.
    draw_avatar("오", (0x3A, 0x3A, 0x42)).save(OUT / "_orchestrator.png", optimize=True)
    print(f"아바타 {made + 1}개를 {OUT.relative_to(ROOT)}에 만들었다 (사회자 포함)")


if __name__ == "__main__":
    main()
