# Hero artwork

These images are derived from the key visual served by the official *超かぐや姫！* website. The homepage links to that website in the artwork credit.

- Website: https://www.cho-kaguyahime.com/
- Source image: https://www.cho-kaguyahime.com/assets/img/top/kv2.jpg
- Retrieved: 2026-09-14
- Source: JPEG, 1715×1382 pixels, 786,599 bytes
- Source SHA-256: `3925c67c23e34a19f2ea9e29bd2d213f1b9facb50fb74d93559fe04a4738e0d1`

The source JPEG is not stored in the repository. It is the native-resolution image found at this URL, not a 4K asset. No AI enlargement or other upscaling was applied.

| File | Dimensions | Bytes |
| --- | --- | ---: |
| `kaguya-visual-960.webp` | 960×774 | 280,576 |
| `kaguya-visual-1280.webp` | 1280×1031 | 459,310 |
| `kaguya-visual-1715.webp` | 1715×1382 | 757,210 |

Conversion used Pillow: preserve the source aspect ratio, round the target height to the nearest pixel, downsample with LANCZOS, and save WebP with `quality=91` and `method=6`. The 1715px version keeps the source dimensions. Pillow is a preparation tool, not a project or browser runtime dependency.

`src/FestivalArtwork.tsx` chooses among these sizes using the displayed frame dimensions and device pixel ratio. The selected image is fetched and decoded through the same cache used by the opening preparation. A later resize can request a larger version without removing the already decoded image. Gallery continues to use its own preview-sized asset.
