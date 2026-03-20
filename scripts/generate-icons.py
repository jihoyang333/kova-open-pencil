"""
Generates Kova branded favicon and PWA icons using pure Python (no dependencies).

Usage: python3 scripts/generate-icons.py

Outputs PNG files to public/ directory.

Strategy: Render at 512x512 with antialiasing, then downsample for smaller sizes.
This avoids the cost of rendering each size separately.
"""

import struct
import zlib
import os
import shutil
from typing import Optional

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")

# Brand colors (RGBA)
BRAND_R, BRAND_G, BRAND_B = 79, 110, 247  # #4F6EF7


def create_png(width: int, height: int, rgba_bytes: bytes) -> bytes:
    """Create a PNG file from flat RGBA byte data."""

    def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
        chunk = chunk_type + data
        return struct.pack(">I", len(data)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b"IHDR", ihdr_data)

    # Add filter bytes (0 = None) before each row
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_bytes[y * stride:(y + 1) * stride])

    compressed = zlib.compress(bytes(raw), 9)
    idat = make_chunk(b"IDAT", compressed)
    iend = make_chunk(b"IEND", b"")

    return signature + ihdr + idat + iend


def point_in_rounded_rect(x: float, y: float, x1: float, y1: float, x2: float, y2: float, r: float) -> bool:
    """Test if point (x,y) is inside rounded rect [x1,y1]-[x2,y2] with corner radius r."""
    if x < x1 or x > x2 or y < y1 or y > y2:
        return False
    # Corner checks
    if x < x1 + r and y < y1 + r:
        return (x - x1 - r) ** 2 + (y - y1 - r) ** 2 <= r * r
    if x > x2 - r and y < y1 + r:
        return (x - x2 + r) ** 2 + (y - y1 - r) ** 2 <= r * r
    if x < x1 + r and y > y2 - r:
        return (x - x1 - r) ** 2 + (y - y2 + r) ** 2 <= r * r
    if x > x2 - r and y > y2 - r:
        return (x - x2 + r) ** 2 + (y - y2 + r) ** 2 <= r * r
    return True


def point_in_polygon(x: float, y: float, verts: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    n = len(verts)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = verts[i]
        xj, yj = verts[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def render_icon(size: int, maskable: bool = False) -> bytes:
    """Render the Kova logo at given size. Returns flat RGBA bytes.

    Design: Rounded blue square with a geometric white K.
    The K: vertical stem + two diagonal parallelogram arms creating
    a forward-leaning, modern geometric mark (Stripe/Linear style).

    Uses 2x2 supersampling for antialiasing (good balance of quality vs speed).
    """
    # We render at 2x and average down for AA
    ss = 2  # supersampling factor
    hi = size * ss

    # Flat buffer: hi x hi pixels, each with R,G,B,A
    buf = bytearray(hi * hi * 4)

    # Design space is 512x512, scale to hi-res pixel space
    scale = hi / 512.0

    if maskable:
        pad = 512 * 0.10
        iscale = 0.80
    else:
        pad = 0.0
        iscale = 1.0

    def ds(v: float) -> float:
        return (pad + v * iscale) * scale

    # Background rounded rect
    bg_x1 = pad * scale
    bg_y1 = pad * scale
    bg_x2 = (512 - pad) * scale
    bg_y2 = (512 - pad) * scale
    bg_r = (bg_x2 - bg_x1) * 0.20

    # Stem (vertical bar of K)
    st_x1 = ds(138)
    st_y1 = ds(125)
    st_x2 = ds(202)
    st_y2 = ds(387)
    st_r = ds(8) - ds(0)

    # Upper arm parallelogram
    arm = [
        (ds(208), ds(238)),
        (ds(208), ds(195)),
        (ds(372), ds(118)),
        (ds(372), ds(178)),
    ]

    # Lower leg parallelogram
    leg = [
        (ds(208), ds(274)),
        (ds(208), ds(317)),
        (ds(372), ds(394)),
        (ds(372), ds(334)),
    ]

    # Bounding boxes for early rejection
    arm_min_x = min(v[0] for v in arm) - 1
    arm_max_x = max(v[0] for v in arm) + 1
    arm_min_y = min(v[1] for v in arm) - 1
    arm_max_y = max(v[1] for v in arm) + 1

    leg_min_x = min(v[0] for v in leg) - 1
    leg_max_x = max(v[0] for v in leg) + 1
    leg_min_y = min(v[1] for v in leg) - 1
    leg_max_y = max(v[1] for v in leg) + 1

    # Render hi-res buffer
    for py in range(hi):
        row_offset = py * hi * 4
        cy = py + 0.5  # pixel center

        for px in range(hi):
            idx = row_offset + px * 4
            cx = px + 0.5

            # Check background
            in_bg = point_in_rounded_rect(cx, cy, bg_x1, bg_y1, bg_x2, bg_y2, bg_r)

            if maskable:
                # Maskable always has brand blue background
                in_bg = True

            if not in_bg:
                # Transparent
                continue

            # Check if pixel is white (part of K)
            is_white = False

            # Stem check (rounded rect)
            if not is_white:
                is_white = point_in_rounded_rect(cx, cy, st_x1, st_y1, st_x2, st_y2, st_r)

            # Arm check (with bbox early-out)
            if not is_white and arm_min_x <= cx <= arm_max_x and arm_min_y <= cy <= arm_max_y:
                is_white = point_in_polygon(cx, cy, arm)

            # Leg check (with bbox early-out)
            if not is_white and leg_min_x <= cx <= leg_max_x and leg_min_y <= cy <= leg_max_y:
                is_white = point_in_polygon(cx, cy, leg)

            if is_white:
                buf[idx] = 255
                buf[idx + 1] = 255
                buf[idx + 2] = 255
                buf[idx + 3] = 255
            else:
                buf[idx] = BRAND_R
                buf[idx + 1] = BRAND_G
                buf[idx + 2] = BRAND_B
                buf[idx + 3] = 255

    # Downsample from hi-res to target size (box filter = average ss x ss blocks)
    out = bytearray(size * size * 4)
    ss2 = ss * ss

    for y in range(size):
        for x in range(size):
            r_sum = 0
            g_sum = 0
            b_sum = 0
            a_sum = 0
            for sy in range(ss):
                for sx in range(ss):
                    src_idx = ((y * ss + sy) * hi + (x * ss + sx)) * 4
                    r_sum += buf[src_idx]
                    g_sum += buf[src_idx + 1]
                    b_sum += buf[src_idx + 2]
                    a_sum += buf[src_idx + 3]

            dst_idx = (y * size + x) * 4
            out[dst_idx] = r_sum // ss2
            out[dst_idx + 1] = g_sum // ss2
            out[dst_idx + 2] = b_sum // ss2
            out[dst_idx + 3] = a_sum // ss2

    return bytes(out)


def main() -> None:
    print("Generating Kova icons...\n")

    specs = [
        ("favicon-32.png", 32, False),
        ("favicon-128.png", 128, False),
        ("apple-touch-icon.png", 180, False),
        ("pwa-192.png", 192, False),
        ("pwa-512.png", 512, False),
        ("pwa-maskable-512.png", 512, True),
    ]

    for filename, size, maskable in specs:
        print(f"  Generating {filename} ({size}x{size})...", end="", flush=True)
        rgba = render_icon(size, maskable)
        png_data = create_png(size, size, rgba)

        output_path = os.path.join(PUBLIC_DIR, filename)
        with open(output_path, "wb") as f:
            f.write(png_data)
        print(f" done ({len(png_data)} bytes)")

    # favicon.ico = copy of 32x32 PNG (browsers accept PNG-in-.ico)
    shutil.copy2(
        os.path.join(PUBLIC_DIR, "favicon-32.png"),
        os.path.join(PUBLIC_DIR, "favicon.ico"),
    )
    print("  Copied favicon-32.png -> favicon.ico")

    print("\nDone! All icons written to public/")


if __name__ == "__main__":
    main()
