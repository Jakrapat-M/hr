#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.32.0",
#     "python-dotenv>=1.0.0",
# ]
# ///
"""
Generate images via the OpenRouter Image API (POST /api/v1/images).

Usage:
    python generate_gpt_image.py "prompt" output.png [options]

Examples:
    python generate_gpt_image.py "A sunset over mountains" sunset.png
    python generate_gpt_image.py "Company logo" logo.png --size 1024x1024 --quality high
    python generate_gpt_image.py "Wide diagram" wide.png --size 1536x1024 --quality high

Environment:
    OPENROUTER_API_KEY - Required API key (https://openrouter.ai/keys)

Model discovery:
    curl https://openrouter.ai/api/v1/images/models
    (or browse https://openrouter.ai/models?output_modalities=image)
"""

import argparse
import base64
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path.cwd() / ".env")

OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images"

VALID_QUALITY = ["auto", "low", "medium", "high"]
VALID_FORMATS = ["png", "jpeg", "webp"]
# OpenRouter passes background through; support varies per model/provider.
VALID_BACKGROUND = ["auto", "opaque", "transparent"]

# `size` accepts an OpenRouter resolution tier (512, 1K, 2K, 4K) OR explicit
# pixels ("1536x1024"); it is normalized per provider. Providers that lack a
# given knob (quality/background/size) simply ignore it.
POPULAR_SIZES = [
    "auto",
    "1024x1024",
    "1536x1024",
    "1024x1536",
    "2048x2048",
    "1K",
    "2K",
    "4K",
]


def generate_gpt_image(
    prompt: str,
    output_path: str,
    model: str = "openai/gpt-image-1",
    size: str = "auto",
    quality: str = "auto",
    n: int = 1,
    output_format: str = "png",
    output_compression: int | None = None,
    background: str = "auto",
) -> None:
    """Generate one or more images through OpenRouter's Image API."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY environment variable not set")

    payload: dict = {"model": model, "prompt": prompt, "n": n}
    # Only send optional knobs when they carry a non-default intent; providers
    # that don't support a field ignore it, but keeping the payload lean avoids
    # rejections from stricter endpoints.
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
    print(f"Size:       {size}")
    print(f"Quality:    {quality}")
    print(f"Format:     {output_format}")
    print(f"Background: {background}")
    print(f"Count:      {n}")
    print(f"Prompt:     {prompt[:120]}{'...' if len(prompt) > 120 else ''}")
    print()
    print("Generating image...")

    resp = requests.post(OPENROUTER_IMAGES_URL, headers=headers, json=payload, timeout=300)
    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter {resp.status_code}: {resp.text}")
    result = resp.json()

    data = result.get("data") or []
    if not data:
        raise RuntimeError(f"No image returned: {result}")

    out = Path(output_path)
    for i, item in enumerate(data):
        b64 = item.get("b64_json")
        if not b64:
            raise RuntimeError(f"Image {i} missing b64_json: {item}")
        target = out if n == 1 else out.with_name(f"{out.stem}_{i + 1}{out.suffix}")
        target.write_bytes(base64.b64decode(b64))
        print(f"Saved: {target}")

    if result.get("usage"):
        print(f"Usage: {result['usage']}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate images via OpenRouter Image API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("prompt", help="Text prompt describing the image")
    parser.add_argument("output", help="Output file path (e.g., output.png)")
    parser.add_argument(
        "--model",
        "-m",
        default="openai/gpt-image-1",
        help=(
            "OpenRouter image model slug (default: openai/gpt-image-1). "
            "Alternatives: google/gemini-2.5-flash-image, bytedance-seed/seedream-4.5. "
            "List all: curl https://openrouter.ai/api/v1/images/models"
        ),
    )
    parser.add_argument(
        "--size",
        "-s",
        default="auto",
        help=(
            "Image size (default: auto). Tier (512/1K/2K/4K) or explicit pixels. Popular: "
            + ", ".join(POPULAR_SIZES)
        ),
    )
    parser.add_argument(
        "--quality",
        "-q",
        default="auto",
        choices=VALID_QUALITY,
        help="Quality tier (default: auto); ignored by providers without a quality knob",
    )
    parser.add_argument(
        "--count",
        "-n",
        type=int,
        default=1,
        help="Number of images (default: 1; suffixes _1, _2, ... when >1). Not all models support n>1.",
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
        generate_gpt_image(
            prompt=args.prompt,
            output_path=args.output,
            model=args.model,
            size=args.size,
            quality=args.quality,
            n=args.count,
            output_format=args.format,
            output_compression=args.compression,
            background=args.background,
        )
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
