#!/usr/bin/env python3
"""디스코드 아바타를 만든다.

두 갈래다.

1. `web/assets/portraits/<slug>.jpg`가 있으면 그것을 정사각으로 잘라 쓴다.
   초상은 edtech-pantheon에서 가져왔고 출처·라이선스는 `web/assets/portraits.json`에
   함께 옮겼다 — 이 프로젝트에서 근거 없이 놓이는 것은 없다.
2. 없으면 이니셜로 그린다. 사회자처럼 실존 인물이 아닌 화자가 여기 해당한다.

위키가 정본이다. 이름도 slug도 `wiki/pioneers/*.md`에서 읽는다 — `gen-agents.mjs`가
에이전트를 위키에서 찍어내는 것과 같은 이유로, 손으로 적은 목록을 따로 두지 않는다.

파이썬을 쓰는 이유는 글자를 그리고 사진을 자르려면 래스터라이저가 필요한데 루트의
런타임 의존성 0을 유지하고 싶어서다. 자산을 만들어 커밋하면 끝이라 빌드에도 봇에도
관여하지 않는다.

    python3 scripts/gen-avatars.py
"""

import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PIONEERS = ROOT / "wiki" / "pioneers"
ASSETS = ROOT / "web" / "assets"
PORTRAITS = ASSETS / "portraits"
OUT = ASSETS / "avatars"
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


def letter_avatar(text, bg):
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


"""얼굴이 가운데에 없거나 너무 작은 초상의 자를 위치. `slug: (가로, 세로, 배율)`.

기본 규칙(가운데 + 위쪽 우선)으로 얼굴이 원형 아바타 밖으로 밀려나는 것만 적는다.
`sidney-pressey`는 왼쪽이 인물, 오른쪽이 교수기계인 2단 이미지라 기본값으로는
기계만 남는다. 나머지 셋은 강연 사진이라 인물이 화면의 4분의 1도 되지 않는다.
"""
FOCUS = {
    "david-merrill": (0.49, 0.25, 0.50),
    "jean-lave": (0.31, 0.28, 0.55),
    "robert-kozma": (0.45, 0.38, 0.58),
    # 남는 붉은 로고 띠는 왼쪽 아래 모서리에만 걸린다 — 디스코드의 원형 자르기가 지운다.
    "sidney-pressey": (0.20, 0.32, 0.58),
}


def photo_avatar(path, focus=None):
    """정사각으로 자른다.

    기본은 가로 가운데 · 세로 여백의 위쪽을 남긴다 — 인물 사진은 얼굴이 위에 있어서,
    가운데를 기준으로 자르면 세로로 긴 초상에서 턱과 어깨만 남는다.
    `focus`가 있으면 그 지점을 중심으로 배율만큼 좁혀 자른다.
    """
    im = Image.open(path).convert("RGB")
    w, h = im.size
    if focus:
        cx, cy, zoom = focus
        side = int(min(w, h) * zoom)
        left = min(max(int(cx * w) - side // 2, 0), w - side)
        top = min(max(int(cy * h) - side // 2, 0), h - side)
    else:
        side = min(w, h)
        left = (w - side) // 2
        top = int((h - side) * 0.18)
    return im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)


def main():
    files = sorted(PIONEERS.glob("*.md"))
    if not files:
        sys.exit(f"위인 페이지를 찾지 못했다: {PIONEERS}")
    OUT.mkdir(parents=True, exist_ok=True)

    meta_path = ASSETS / "portraits.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

    photo, letter, missing = [], [], []
    for f in files:
        fm = frontmatter(f.read_text(encoding="utf-8"))
        slug, title = fm.get("slug"), fm.get("title")
        if not slug or not title:
            missing.append(f.name)
            continue
        src = PORTRAITS / f"{slug}.jpg"
        if src.exists():
            photo_avatar(src, FOCUS.get(slug)).save(OUT / f"{slug}.png", optimize=True)
            photo.append(slug)
            if slug not in meta:
                print(f"  경고 {slug}: 초상은 있는데 portraits.json에 출처가 없다")
        else:
            letter_avatar(initial(title), color_for(slug)).save(OUT / f"{slug}.png", optimize=True)
            letter.append(slug)

    # 위인이 아닌 화자·브랜드. 실존 인물이 아니므로 초상이 없고, 있으면 그것을 쓴다.
    for slug, text, bg in [("_orchestrator", "오", (0x3A, 0x3A, 0x42)), ("_oracle", "오", (0x1F, 0x2A, 0x44))]:
        src = PORTRAITS / f"{slug}.jpg"
        (photo_avatar(src) if src.exists() else letter_avatar(text, bg)).save(
            OUT / f"{slug}.png", optimize=True
        )
        (photo if src.exists() else letter).append(slug)

    print(f"사진 {len(photo)}개 · 이니셜 {len(letter)}개 → {OUT.relative_to(ROOT)}")
    if letter:
        print("  이니셜: " + ", ".join(letter))
    if missing:
        print("  slug/title 없어 건너뜀: " + ", ".join(missing))


if __name__ == "__main__":
    main()
