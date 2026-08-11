#!/usr/bin/env python3
"""Prepare a browser-compatible FAQ video, poster, and evidence frames."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


SAFE_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--input", required=True, type=Path, help="Source video path")
    value.add_argument("--public-dir", required=True, type=Path, help="Website public directory")
    value.add_argument("--slug", required=True, help="ASCII output slug")
    value.add_argument("--poster-at", required=True, type=float, help="Poster timestamp in seconds")
    value.add_argument(
        "--frame",
        action="append",
        default=[],
        metavar="NAME=SECONDS",
        help="Evidence frame name and timestamp; repeat for multiple frames",
    )
    value.add_argument("--width", type=int, default=720, help="Output width; default 720")
    value.add_argument("--crf", type=int, default=23, help="H.264 CRF; default 23")
    value.add_argument("--force", action="store_true", help="Replace exact output targets")
    return value


def parse_frames(values: list[str]) -> list[tuple[str, float]]:
    frames: list[tuple[str, float]] = []
    seen: set[str] = set()
    for item in values:
        try:
            name, raw_seconds = item.split("=", 1)
            seconds = float(raw_seconds)
        except ValueError as exc:
            raise SystemExit(f"Invalid --frame {item!r}; expected NAME=SECONDS") from exc
        if not SAFE_NAME.fullmatch(name):
            raise SystemExit(f"Unsafe frame name {name!r}; use lowercase ASCII kebab-case")
        if name in seen:
            raise SystemExit(f"Duplicate frame name: {name}")
        if seconds < 0:
            raise SystemExit(f"Negative frame timestamp: {seconds}")
        seen.add(name)
        frames.append((name, seconds))
    return frames


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    args = parser().parse_args()
    source = args.input.expanduser().resolve()
    public_dir = args.public_dir.expanduser().resolve()
    frames = parse_frames(args.frame)

    if not source.is_file():
        raise SystemExit(f"Source video does not exist: {source}")
    if not SAFE_NAME.fullmatch(args.slug):
        raise SystemExit("--slug must use lowercase ASCII kebab-case")
    if args.poster_at < 0 or args.width < 320 or not 16 <= args.crf <= 35:
        raise SystemExit("Use poster-at >= 0, width >= 320, and CRF from 16 to 35")
    for binary in ("ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            raise SystemExit(f"Required binary not found: {binary}")

    video_dir = public_dir / "videos" / "faq"
    image_dir = public_dir / "images" / "faq" / args.slug
    video_path = video_dir / f"{args.slug}.mp4"
    poster_path = image_dir / "poster.jpg"
    frame_paths = [(name, image_dir / f"{name}.jpg", seconds) for name, seconds in frames]
    targets = [video_path, poster_path, *(path for _, path, _ in frame_paths)]
    existing = [str(path) for path in targets if path.exists()]
    if existing and not args.force:
        raise SystemExit("Refusing to overwrite existing targets; inspect them or pass --force:\n" + "\n".join(existing))

    video_dir.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)
    overwrite = "-y" if args.force else "-n"
    scale = f"scale={args.width}:-2"

    run([
        "ffmpeg", overwrite, "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?", "-vf", scale,
        "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf),
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "128k", str(video_path),
    ])

    def extract(seconds: float, destination: Path) -> None:
        run([
            "ffmpeg", overwrite, "-hide_banner", "-loglevel", "error",
            "-ss", str(seconds), "-i", str(source), "-frames:v", "1",
            "-vf", scale, "-q:v", "2", str(destination),
        ])

    extract(args.poster_at, poster_path)
    for _, path, seconds in frame_paths:
        extract(seconds, path)

    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size:stream=codec_name,codec_type,width,height",
        "-of", "json", str(video_path),
    ], check=True, capture_output=True, text=True)
    summary = {
        "video": str(video_path),
        "poster": str(poster_path),
        "frames": [str(path) for _, path, _ in frame_paths],
        "probe": json.loads(probe.stdout),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
