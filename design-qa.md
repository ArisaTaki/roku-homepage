**Findings**
- No actionable P0/P1/P2 issues found for the luminous fish background.

**Source Visual Truth**
- User-provided reference screenshot: `/var/folders/vv/nn9kvwbs1nv0123t_p6pcr5r0000gn/T/codex-clipboard-31262ae4-8e95-4eb5-8d8f-7a1a684463dd.png`
- Visual target: dark cinematic scene with many glowing cyan, pink, yellow, lavender, and teal fish-like light shapes moving as a school behind the page.

**Implementation Evidence**
- Local URL: `http://127.0.0.1:5173/`
- Desktop top screenshot: `/private/tmp/irop-qa/light-fish-desktop-top.png`
- Desktop scrolled screenshot: `/private/tmp/irop-qa/light-fish-desktop-wheel.png`
- Mobile top screenshot: `/private/tmp/irop-qa/light-fish-mobile-top.png`
- Viewports: `1440 x 900` desktop, `390 x 900 @2x` mobile.
- State: home top, horizontal work-scroll section after a wheel scroll to `scrollY = 9000`, and mobile hero.
- Full-view comparison evidence: the reference image and implementation screenshots were inspected. The implementation intentionally translates the cinematic fish-school feeling into a site background instead of recreating the movie frame's architecture/bridge foreground.
- Focused region comparison evidence: hero title, assistant card, fixed nav, work card area, and mobile hero were inspected for contrast and overlap.

**QA Notes**
- Fonts and typography: existing GT Haptik and Diana Inter hierarchy remains intact. The canvas sits behind content and does not reduce the legibility of the hero title, intro copy, nav, assistant card, work titles, or mobile copy.
- Spacing and layout rhythm: the new fixed canvas does not affect layout flow. Desktop sticky scene, horizontal track, nav cards, and mobile stacked layout keep their previous spacing.
- Colors and tokens: the background uses the site's existing cyan, lavender, pink, coral, and yellow language, with extra teal/yellow glow to better match the reference. It avoids turning the page into a single-hue palette.
- Image quality and asset fidelity: the fish are rendered on canvas as luminous bitmap-like forms with glow trails and current lines. This is appropriate for a procedural animated background; no placeholder assets are visible.
- Copy and content: no user-facing copy changed.
- Interaction: fish render as a static background at rest. Scroll input starts a short animation burst, extends while scrolling continues, then stops the animation loop after the burst window. The reduced-motion media query keeps the layer static.
- Responsiveness: desktop and mobile screenshots show the fish layer visible but subordinate to content.

**Patches Made**
- Added `LightFishBackground` in `src/App.tsx` with canvas-rendered fish particles, glow trails, soft current lines, scroll-responsive drift, viewport-aware density, and reduced-motion behavior.
- Mounted the background once at app root so it covers the whole site.
- Updated `src/index.css` to place the canvas behind the page, tune background opacity, and make the stage/about/mobile backgrounds translucent enough for the fish layer to show through.
- Changed the fish background from a continuous `requestAnimationFrame` loop to a static-at-rest canvas with short scroll-triggered animation bursts, reducing idle CPU/GPU pressure.

**Final Result**
- final result: passed
