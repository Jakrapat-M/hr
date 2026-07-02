#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.32.0",
#     "python-dotenv>=1.0.0",
# ]
# ///
"""
Edit / compose images via the OpenRouter Image API (image-to-image).

Reference images are sent as `input_references` on POST /api/v1/images.
Pass one or more input images; with multiple inputs the model composes them.

Usage:
    python edit_gpt_image.py "edit instruction" output.png input.png [more.png ...] [options]

Examples:
    python edit_gpt_image.py "Add a rainbow in the sky" edited.png photo.png
    python edit_gpt_image.py "Make a group photo" group.png p1.png p2.png p3.png

Environment:
    OPENROUTER_API_KEY - Required API key (https://openrouter.ai/keys)
"""

import argparse
import base64
import mimetypes
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path.cwd() / ".env")

OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images"

VALID_QUALITY = ["auto", "low", "medium", "high"]
VALID_FORMATS = ["png", "jpeg", "webp"]
VALID_BACKGROUND = ["auto", "opaque", "transparent"]


def backup_if_exists(output_path: str) -> None:
    """Copy an existing output file into ./backup/ before it gets overwritten.

    Edits often target a path that already holds an image (sometimes an input
    itself), so back the original up first — losing it to an edit is silent and
    unrecoverable. backup/ self-ignores via a backup/.gitignore of "*".
    """
    out = Path(output_path)
    if not out.exists():
        return
    backup_dir = Path.cwd() / "backup"
    backup_dir.mkdir(exist_ok=True)
    gitignore = backup_dir / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("*\n")
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = backup_dir / f"{out.stem}_{ts}{out.suffix}"
    counter = 1
    while dest.exists():
        dest = backup_dir / f"{out.stem}_{ts}_{counter}{out.suffix}"
        counter += 1
    shutil.copy2(out, dest)
    print(f"Backed up existing {output_path} -> {dest}")


def _to_data_url(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "image/png"
    b64 = base64.b64encode(Path(path).read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def edit_gpt_image(
    input_paths: list[str],
    instruction: str,
    output_path: str,
    model: str = "openai/gpt-image-1",
    size: str = "auto",
    quality: str = "auto",
    output_format: str = "png",
    output_compression: int | None = None,
    background: str = "auto",
) -> None:
    """Edit/compose images through OpenRouter's Image API via input_references."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY environment variable not set")

    for p in input_paths:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Input image not found: {p}")

    payload: dict = {
        "model": model,
        "prompt": instruction,
        "input_references": [
            {"type": "image_url", "image_url": {"url": _to_data_url(p)}}
            for p in input_paths
        ],
    }
    if size and size != "auto":
        payload["size"] = size
    if quality and quality != "auto":
        payload["quality"] = quality
    if output_format:
        payload["output_format"] = output_format
    if background and background != "auto":
        payload["background"] = background
    if output_compression is not None and output_format in {"jpeg", "webp"}:
        payload["output_compression"] = output_compression

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/disler/planf3",
        "X-Title": "planf3",
    }

    print(f"Model:      {model}")
    print(f"Inputs:     {', '.join(input_paths)}")
    print(f"Size:       {size}")
    print(f"Quality:    {quality}")
    print(f"Format:     {output_format}")
    print(f"Background: {background}")
    print(f"Prompt:     {instruction[:120]}{'...' if len(instruction) > 120 else ''}")
    print()
    print("Editing image...")

    resp = requests.post(OPENROUTER_IMAGES_URL, headers=headers, json=payload, timeout=300)
    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter {resp.status_code}: {resp.text}")
    result = resp.json()

    data = result.get("data") or []
    if not data or not data[0].get("b64_json"):
        raise RuntimeError(f"No image returned: {result}")

    backup_if_exists(output_path)
    Path(output_path).write_bytes(base64.b64decode(data[0]["b64_json"]))
    print(f"Saved: {output_path}")

    if result.get("usage"):
        print(f"Usage: {result['usage']}")


def main():
    parser = argparse.ArgumentParser(
        description="Edit/compose images via OpenRouter Image API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("instruction", help="Edit/compose instruction")
    parser.add_argument("output", help="Output file path")
    parser.add_argument(
        "inputs",
        nargs="+",
        help="One or more input image paths (multiple = composition)",
    )
    parser.add_argument(
        "--model",
        "-m",
        default="openai/gpt-image-1",
        help=(
            "OpenRouter image model slug (default: openai/gpt-image-1). "
            "Alternatives: google/gemini-2.5-flash-image, bytedance-seed/seedream-4.5"
        ),
    )
    parser.add_argument(
        "--size",
        "-s",
        default="auto",
        help="Image size (default: auto). Tier (512/1K/2K/4K) or explicit pixels, e.g. 1536x1024.",
    )
    parser.add_argument(
        "--quality",
        "-q",
        default="auto",
        choices=VALID_QUALITY,
        help="Quality tier (default: auto)",
    )
    parser.add_argument(
        "--format",
        "-f",
        default="png",
        choices=VALID_FORMATS,
        help="Output format (default: png)",
    )
    parser.add_argument(
        "--compression",
        type=int,
        default=None,
        help="Output compression 0-100 (jpeg/webp only)",
    )
    parser.add_argument(
        "--background",
        default="auto",
        choices=VALID_BACKGROUND,
        help="Background mode (default: auto); support varies by model",
    )

    args = parser.parse_args()

    try:
        edit_gpt_image(
            input_paths=args.inputs,
            instruction=args.instruction,
            output_path=args.output,
            model=args.model,
            size=args.size,
            quality=args.quality,
            output_format=args.format,
            output_compression=args.compression,
            background=args.background,
        )
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
