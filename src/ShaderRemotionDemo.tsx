import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { useEffect, useMemo, useRef, useState } from "react";

const FPS = 30;
const SHADER_CASE_COUNT = 17;
const CASE_HOLD_FRAMES = 60;
const CASE_TIMELINE_FRAMES = SHADER_CASE_COUNT * CASE_HOLD_FRAMES;
const DURATION_IN_FRAMES = CASE_TIMELINE_FRAMES + 60;
const COMPOSITION_WIDTH = 1280;
const COMPOSITION_HEIGHT = 880;
const CURSOR_CLICK_DELAY_FRAMES = 14;
const CURSOR_TRAVEL_FRAMES = 18;
const SHADER_CURSOR_X = 202;
const TREE_WINDOW_INSET = 44;
const TREE_TOPBAR_HEIGHT = 70;
const TREE_PADDING_Y = 22;
const TREE_HEAD_HEIGHT = 40;
const TREE_SEARCH_BLOCK_HEIGHT = 78;
const TREE_SECTION_HEADER_HEIGHT = 17;
const TREE_SECTION_GAP = 13;
const TREE_ROW_GAP = 8;
const TREE_ITEM_HEIGHT = 38;
const TREE_SCROLL_TOP = TREE_WINDOW_INSET + TREE_TOPBAR_HEIGHT + TREE_PADDING_Y + TREE_HEAD_HEIGHT + TREE_SEARCH_BLOCK_HEIGHT;
const TREE_SCROLL_VIEWPORT_HEIGHT = COMPOSITION_HEIGHT
  - TREE_WINDOW_INSET * 2
  - TREE_TOPBAR_HEIGHT
  - TREE_PADDING_Y * 2
  - TREE_HEAD_HEIGHT
  - TREE_SEARCH_BLOCK_HEIGHT;

type ShaderCase = {
  id: string;
  index: number;
  track: "2D" | "3D";
  module: string;
  title: string;
  shortTitle: string;
  summary: string;
  shaderCase: number;
  accent: string;
  code: string;
  controls: Array<{ label: string; value: number }>;
  concepts: string[];
};

type ShaderRenderTarget = {
  render: (options: {
    time: number;
    shaderCase: number;
    intensity: number;
    mixAmount: number;
    rotation: number;
    mouseX: number;
    mouseY: number;
  }) => void;
  dispose: () => void;
};

const shaderCases: ShaderCase[] = [
  {
    id: "shader-what",
    index: 1,
    track: "2D",
    module: "板块1：入门与基础",
    title: "shader 是？",
    shortTitle: "Shader 是？",
    summary: "把整张画布做成并行计算的像素矩阵，每个格子都由同一段 fragment shader 独立发光。",
    shaderCase: 0,
    accent: "#76ffd7",
    concepts: ["fragment", "uniform", "parallel pixels"],
    controls: [
      { label: "Scale", value: 1.35 },
      { label: "Speed", value: 1 },
      { label: "Intensity", value: 0.82 },
    ],
    code: `vec2 gridUv = v_uv * vec2(46.0, 27.0);
vec2 id = floor(gridUv);
float led = smoothstep(0.28, 0.02, length(fract(gridUv) - 0.5));
gl_FragColor = vec4(u_colorA * led, 1.0);`,
  },
  {
    id: "shader-first-step",
    index: 2,
    track: "2D",
    module: "板块1：入门与基础",
    title: "shader 的第一步",
    shortTitle: "第一步",
    summary: "用归一化坐标做雷达扫描器：圆环来自 length，扫光来自 atan，鼠标就是目标点。",
    shaderCase: 1,
    accent: "#6cc7ff",
    concepts: ["uv", "time", "mouse input"],
    controls: [
      { label: "Radius", value: 0.42 },
      { label: "Sweep", value: 0.74 },
      { label: "Mouse", value: 0.62 },
    ],
    code: `float r = length(p);
float angle = atan(p.y, p.x);
float sweep = smoothstep(0.7, 0.0, abs(angle - u_time));
float rings = stroke(fract(r * 7.0 - u_time * 0.35) - 0.5);`,
  },
  {
    id: "glsl-language",
    index: 3,
    track: "2D",
    module: "板块1：入门与基础",
    title: "GLSL 语言",
    shortTitle: "GLSL",
    summary: "把 vec、mat、函数和 for loop 组合成霓虹丝带隧道，语法变化会直接变成画面变化。",
    shaderCase: 2,
    accent: "#ffd36a",
    concepts: ["vec2/vec3", "function", "for loop"],
    controls: [
      { label: "Loop", value: 0.68 },
      { label: "Palette", value: 0.54 },
      { label: "Blend", value: 0.47 },
    ],
    code: `for (int i = 0; i < 8; i++) {
  q = rotate2d(q, 0.38 + float(i) * 0.11);
  float ribbon = sin(q.x * (5.0 + float(i)) + u_time);
  color += palette(float(i) * 0.075) * smoothstep(0.075, 0.0, abs(ribbon));
}`,
  },
  {
    id: "uv-sdf-shapes",
    index: 4,
    track: "2D",
    module: "板块2：UV",
    title: "绘画之 UV：SDF 图腾徽章",
    shortTitle: "SDF 徽章",
    summary: "把 UV 当成画纸，用 signed distance field 描出花瓣、钻石、圆环和发光节点。",
    shaderCase: 3,
    accent: "#ff7b91",
    concepts: ["SDF", "smoothstep", "stroke"],
    controls: [
      { label: "Petals", value: 0.77 },
      { label: "Stroke", value: 0.52 },
      { label: "Glow", value: 0.81 },
    ],
    code: `float flower = length(p) - radius * (0.78 + 0.28 * abs(sin(angle * 6.0)));
float fill = 1.0 - smoothstep(0.0, 0.024, flower);
float outline = stroke(flower, 0.018, 0.012);`,
  },
  {
    id: "random-noise",
    index: 8,
    track: "2D",
    module: "板块3：简单例子",
    title: "随机与噪声",
    shortTitle: "Noise",
    summary: "用 hash 和 fbm 叠出一层会呼吸的光雾，让静态画面像被风轻轻推着。",
    shaderCase: 7,
    accent: "#c7b8ff",
    concepts: ["hash", "fbm", "aurora"],
    controls: [
      { label: "Detail", value: 0.72 },
      { label: "Warp", value: 0.66 },
      { label: "Glow", value: 0.88 },
    ],
    code: `vec2 warp = vec2(fbm(q * 1.7 + u_time * 0.12), fbm(q * 1.5 - u_time * 0.1));
float cloud = fbm(q * 2.0 + warp * u_intensity * 3.2);
vec3 aurora = mix(u_colorA, u_colorB, cloud);`,
  },
];

const additionalShaderCases: ShaderCase[] = [
  {
    id: "uv-transform-ops",
    index: 5,
    track: "2D",
    module: "板块2：UV",
    title: "绘画之 UV：机械花纹工厂",
    shortTitle: "UV 机械花纹",
    summary: "平移、缩放、旋转、重复和平铺共同生成机械叶片阵列，UV 运算一眼可见。",
    shaderCase: 4,
    accent: "#a78bfa",
    concepts: ["translate", "scale", "rotate", "tile/repeat"],
    controls: [
      { label: "Tile", value: 0.66 },
      { label: "Rotate", value: 0.74 },
      { label: "Repeat", value: 0.62 },
    ],
    code: `vec2 tile = fract(rotate2d(uv * tiles, u_rotation + u_time)) - 0.5;
float blade = sdBox(tile, vec2(0.28, 0.065));
vec3 color = mix(u_colorA, u_colorB, hash(floor(uv * tiles)));`,
  },
  {
    id: "mix-remap",
    index: 6,
    track: "2D",
    module: "板块2：UV",
    title: "绘画之 UV：mix 函数与重映射",
    shortTitle: "Mix / Remap",
    summary: "用 mix、smoothstep、step 和 remap 把噪声高度场变成热力地形、河道和等高线。",
    shaderCase: 5,
    accent: "#38e2d5",
    concepts: ["mix", "smoothstep", "remap", "mask composition"],
    controls: [
      { label: "Height", value: 0.58 },
      { label: "Mask", value: 0.76 },
      { label: "Contour", value: 0.64 },
    ],
    code: `float height = fbm(uv * 2.0 + warp);
float mask = smoothstep(0.18, 0.92, height);
vec3 terrain = mix(lowColor, highColor, mask);
terrain = mix(terrain, riverColor, smoothstep(0.04, 0.0, abs(mask - u_mixAmount)));`,
  },
  {
    id: "shader-img",
    index: 7,
    track: "2D",
    module: "板块3：简单例子",
    title: "shader 的 img",
    shortTitle: "Image FX",
    summary: "用程序生成一张 CRT 角色海报，再叠加像素化、扫描线、色差和故障条纹。",
    shaderCase: 6,
    accent: "#ff9a3d",
    concepts: ["texture coordinate", "sampling", "chromatic aberration", "post process"],
    controls: [
      { label: "Pixel", value: 0.55 },
      { label: "RGB Shift", value: 0.68 },
      { label: "Scanline", value: 0.72 },
    ],
    code: `vec2 pixelUv = floor(v_uv * u_resolution / blockSize) * blockSize / u_resolution;
vec3 r = texture(inputMap, pixelUv + vec2(shift, 0.0)).rgb;
vec3 g = texture(inputMap, pixelUv).rgb;
vec3 b = texture(inputMap, pixelUv - vec2(shift, 0.0)).rgb;`,
  },
  {
    id: "filters",
    index: 9,
    track: "2D",
    module: "板块3：简单例子",
    title: "滤镜",
    shortTitle: "Filter",
    summary: "把图案当作输入图像，折叠成彩窗万花筒，再用边缘检测做霓虹铅线。",
    shaderCase: 8,
    accent: "#f59cff",
    concepts: ["screen-space effect", "edge detect", "kaleidoscope", "contrast"],
    controls: [
      { label: "Sides", value: 0.71 },
      { label: "Edge", value: 0.67 },
      { label: "Contrast", value: 0.81 },
    ],
    code: `float edge = abs(pattern(uv + px.x) - pattern(uv - px.x));
edge += abs(pattern(uv + px.y) - pattern(uv - px.y));
vec2 kaleido = vec2(cos(seg), sin(seg)) * radius;
vec3 color = mix(base, neonEdge, edge);`,
  },
  {
    id: "webgl-transform",
    index: 10,
    track: "3D",
    module: "板块0：前言",
    title: "webGL 坐标转换简介",
    shortTitle: "Transform",
    summary: "模型、视图、投影矩阵把顶点从模型空间一步步送到屏幕空间。",
    shaderCase: 9,
    accent: "#6cc7ff",
    concepts: ["model matrix", "view matrix", "projection matrix", "clip space"],
    controls: [
      { label: "Model", value: 0.52 },
      { label: "View", value: 0.64 },
      { label: "Projection", value: 0.77 },
    ],
    code: `vec4 world = modelMatrix * vec4(position, 1.0);
vec4 view = viewMatrix * world;
gl_Position = projectionMatrix * view;`,
  },
  {
    id: "vertex-material-attrs",
    index: 11,
    track: "3D",
    module: "板块1：顶点着色器",
    title: "顶点着色器一：自定义材质与属性",
    shortTitle: "Vertex Attrs",
    summary: "用顶点 shader 把网格推成会呼吸的珊瑚晶体，并把自定义属性传给片元材质。",
    shaderCase: 10,
    accent: "#76ffd7",
    concepts: ["ShaderMaterial", "attribute", "varying", "vertex displacement"],
    controls: [
      { label: "Displace", value: 0.83 },
      { label: "Weight", value: 0.61 },
      { label: "Varying", value: 0.74 },
    ],
    code: `attribute float a_weight;
varying float v_weight;
vec3 p = position + normal * wave * a_weight * u_displace;
v_weight = a_weight;`,
  },
  {
    id: "vertex-particles",
    index: 12,
    track: "3D",
    module: "板块1：顶点着色器",
    title: "顶点着色器二：粒子与自定义数据",
    shortTitle: "Particles",
    summary: "用 attribute seed 和 radius 做五臂星系，粒子轨道、大小和亮度都在 GPU 侧演算。",
    shaderCase: 11,
    accent: "#ff9a3d",
    concepts: ["BufferGeometry", "attribute seed", "gl_PointSize", "billboard sprite"],
    controls: [
      { label: "Orbit", value: 0.69 },
      { label: "Point", value: 0.58 },
      { label: "Density", value: 0.86 },
    ],
    code: `attribute float a_seed;
attribute float a_radius;
p.xy += vec2(cos(t), sin(t)) * a_radius;
gl_PointSize = u_particleSize * 420.0 / -mvPosition.z;`,
  },
  {
    id: "phong-lighting",
    index: 13,
    track: "3D",
    module: "板块2：光照模型",
    title: "冯氏光照模型",
    shortTitle: "Phong",
    summary: "把 Phong 光照做成金色雕塑：漫反射塑形，反射向量高光负责金属闪点。",
    shaderCase: 12,
    accent: "#ffd36a",
    concepts: ["ambient", "diffuse", "reflection vector", "specular"],
    controls: [
      { label: "Diffuse", value: 0.72 },
      { label: "Reflect", value: 0.61 },
      { label: "Specular", value: 0.88 },
    ],
    code: `float diffuse = max(dot(N, L), 0.0);
vec3 R = reflect(-L, N);
float specular = pow(max(dot(R, V), 0.0), shininess);
vec3 color = ambient + diffuse * baseColor + specular * lightColor;`,
  },
  {
    id: "blinn-phong",
    index: 14,
    track: "3D",
    module: "板块2：光照模型",
    title: "Blinn-Phong 光照模型与反射",
    shortTitle: "Blinn",
    summary: "半程向量替代反射向量，配合糖果条纹和 rim light 展示更稳定的实时高光。",
    shaderCase: 13,
    accent: "#ff7b91",
    concepts: ["half vector", "specular power", "reflection", "rim light"],
    controls: [
      { label: "Half", value: 0.63 },
      { label: "Rim", value: 0.79 },
      { label: "Power", value: 0.71 },
    ],
    code: `vec3 H = normalize(L + V);
float specular = pow(max(dot(N, H), 0.0), 72.0);
float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);`,
  },
  {
    id: "normal-fix",
    index: 15,
    track: "3D",
    module: "板块2：光照模型",
    title: "修复法向量引起的问题",
    shortTitle: "Normals",
    summary: "顶点位移和非均匀缩放后，法线必须修复，否则高光会漂移或断裂。",
    shaderCase: 14,
    accent: "#a78bfa",
    concepts: ["normalMatrix", "re-normalize", "world normal", "debug normal color"],
    controls: [
      { label: "Normal", value: 0.57 },
      { label: "Debug", value: 0.73 },
      { label: "Repair", value: 0.84 },
    ],
    code: `vec3 displaced = position + normal * wave;
v_normal = normalize(normalMatrix * normal);
vec3 debugNormal = normalize(v_normal) * 0.5 + 0.5;`,
  },
  {
    id: "raymarch-basics",
    index: 16,
    track: "3D",
    module: "板块3：Raymarching",
    title: "2D 描绘 3D 之 Raymarching",
    shortTitle: "Raymarch",
    summary: "从相机射线出发，按照 SDF 距离步进，在 fragment shader 里画出一个发光传送门。",
    shaderCase: 15,
    accent: "#38e2d5",
    concepts: ["ray origin", "ray direction", "SDF map", "normal estimate"],
    controls: [
      { label: "Steps", value: 0.65 },
      { label: "SDF", value: 0.78 },
      { label: "Normal", value: 0.56 },
    ],
    code: `float march(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 96; i++) {
    float d = mapScene(ro + rd * t);
    if (d < 0.001 || t > 8.0) break;
    t += d;
  }
  return t;
}`,
  },
  {
    id: "raymarch-material-shadow",
    index: 17,
    track: "3D",
    module: "板块3：Raymarching",
    title: "混合、材质、阴影与抗锯齿",
    shortTitle: "Ray Material",
    summary: "把传送门、碎片、光柱和地面 SDF 平滑混合，再加入软阴影、材质条纹和抗锯齿。",
    shaderCase: 16,
    accent: "#f59cff",
    concepts: ["smooth min", "material id", "soft shadow", "anti-aliasing"],
    controls: [
      { label: "Blend", value: 0.72 },
      { label: "Shadow", value: 0.69 },
      { label: "AA", value: 0.81 },
    ],
    code: `float smoothMin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float shadow = softShadow(hit + normal * 0.01, lightDir);`,
  },
];

const demoShaderCases = [...shaderCases, ...additionalShaderCases].sort((a, b) => a.index - b.index);

const shaderSections = [
  { title: "板块1：入门与基础", cases: ["shader-what", "shader-first-step", "glsl-language"] },
  { title: "板块2：UV", cases: ["uv-sdf-shapes", "uv-transform-ops", "mix-remap"] },
  { title: "板块3：简单例子", cases: ["shader-img", "random-noise", "filters"] },
  { title: "板块0：前言", cases: ["webgl-transform"] },
  { title: "板块1：顶点着色器", cases: ["vertex-material-attrs", "vertex-particles"] },
  { title: "板块2：光照模型", cases: ["phong-lighting", "blinn-phong", "normal-fix"] },
  { title: "板块3：Raymarching", cases: ["raymarch-basics", "raymarch-material-shadow"] },
];

const demoCaseById = new Map(demoShaderCases.map((shaderCase) => [shaderCase.id, shaderCase]));
const demoCaseIndexById = new Map(demoShaderCases.map((shaderCase, index) => [shaderCase.id, index]));

function buildTreeItemLayout() {
  const itemCenterY = Array.from({ length: demoShaderCases.length }, () => TREE_SCROLL_TOP);
  let y = TREE_SCROLL_TOP;

  for (const section of shaderSections) {
    y += TREE_SECTION_HEADER_HEIGHT + TREE_ROW_GAP;

    for (const caseId of section.cases) {
      const itemIndex = demoCaseIndexById.get(caseId);
      if (itemIndex !== undefined) {
        itemCenterY[itemIndex] = y + TREE_ITEM_HEIGHT / 2;
      }

      y += TREE_ITEM_HEIGHT + TREE_ROW_GAP;
    }

    y -= TREE_ROW_GAP;
    y += TREE_SECTION_GAP;
  }

  const contentBottomY = y - TREE_SECTION_GAP;
  const maxShift = Math.max(0, contentBottomY - (TREE_SCROLL_TOP + TREE_SCROLL_VIEWPORT_HEIGHT));

  return { itemCenterY, maxShift };
}

const treeItemLayout = buildTreeItemLayout();
const TREE_ITEM_CENTER_Y = treeItemLayout.itemCenterY;
const TREE_MAX_SHIFT = treeItemLayout.maxShift;
const TREE_FOCUS_Y = TREE_SCROLL_TOP + TREE_SCROLL_VIEWPORT_HEIGHT * 0.74;

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform int u_case;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_intensity;
uniform float u_mixAmount;
uniform float u_rotation;
uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec3 u_colorC;

varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.03 + 4.17;
    amplitude *= 0.5;
  }
  return value;
}

vec2 rotate2d(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float stroke(float d, float width, float feather) {
  return 1.0 - smoothstep(width, width + feather, abs(d));
}

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.02, 0.34, 0.67) + t));
}

vec3 proceduralImage(vec2 uv) {
  vec2 p = uv * 2.0 - 1.0;
  float frame = stroke(sdBox(p, vec2(0.78, 0.58)), 0.022, 0.018);
  float head = 1.0 - smoothstep(0.0, 0.025, sdCircle(p - vec2(0.0, 0.08), 0.36));
  float visor = 1.0 - smoothstep(0.0, 0.018, sdBox(p - vec2(0.0, 0.08), vec2(0.28, 0.09)));
  float body = 1.0 - smoothstep(0.0, 0.025, sdBox(p - vec2(0.0, -0.45), vec2(0.48, 0.18)));
  float eyes = smoothstep(0.035, 0.0, length(p - vec2(-0.1, 0.1))) + smoothstep(0.035, 0.0, length(p - vec2(0.1, 0.1)));
  float signal = fbm(uv * 18.0 + vec2(u_time * 0.18, -u_time * 0.08));
  vec3 bg = mix(vec3(0.018, 0.035, 0.043), u_colorA * 0.2, signal);
  vec3 suit = mix(u_colorB * 0.42, u_colorC, uv.y);
  vec3 glass = mix(u_colorA * 0.55, u_colorB, smoothstep(-0.2, 0.35, p.x + p.y));
  vec3 color = mix(bg, suit, body);
  color = mix(color, u_colorC * 0.32, head);
  color = mix(color, glass, visor);
  color += eyes * u_colorC + frame * u_colorA;
  return color;
}

vec3 caseIntro(vec2 uv, vec2 p, float t) {
  vec2 gridUv = uv * vec2(46.0, 27.0);
  vec2 id = floor(gridUv);
  vec2 gv = fract(gridUv) - 0.5;
  float sparkle = step(0.78, hash(id + floor(t * 0.8)));
  float led = smoothstep(0.28, 0.02, length(gv)) * sparkle;
  float trace = smoothstep(0.016, 0.0, min(abs(gv.x), abs(gv.y))) * step(0.58, hash(id * 1.7));
  float scan = smoothstep(0.055, 0.0, abs(fract(uv.y * 1.35 - t * 0.16) - 0.5));
  vec3 bg = mix(vec3(0.01, 0.025, 0.032), u_colorA * 0.16, fbm(uv * 5.0 + t * 0.05));
  vec3 color = bg + trace * u_colorA * 0.75 + led * mix(u_colorB, u_colorC, hash(id + 4.0));
  color += scan * u_colorC * 0.65;
  return color;
}

vec3 caseRadar(vec2 uv, vec2 p, float t) {
  vec2 mouse = u_mouse * 2.0 - 1.0;
  mouse.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float r = length(p);
  float angle = atan(p.y, p.x);
  float delta = abs(atan(sin(angle - t * 1.4 - u_rotation), cos(angle - t * 1.4 - u_rotation)));
  float sweep = smoothstep(0.72, 0.0, delta) * smoothstep(1.05, 0.15, r);
  float rings = stroke(fract(r * 7.2 - t * 0.35) - 0.5, 0.035, 0.025);
  float cross = smoothstep(0.012, 0.0, abs(p.x)) + smoothstep(0.012, 0.0, abs(p.y));
  float blip = smoothstep(0.11, 0.0, length(p - mouse));
  vec3 color = vec3(0.01, 0.035, 0.04);
  color += rings * u_colorA * 0.65;
  color += sweep * u_colorB;
  color += cross * u_colorA * 0.28;
  color += blip * u_colorC * (1.0 + sin(t * 8.0) * 0.25);
  return color;
}

vec3 caseRibbon(vec2 uv, vec2 p, float t) {
  vec3 color = mix(vec3(0.006, 0.012, 0.025), u_colorA * 0.1, uv.y);
  vec2 q = p + (u_mouse - 0.5) * 0.24;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    q = rotate2d(q, 0.38 + fi * 0.11 + u_rotation * 0.05);
    float ribbon = sin(q.x * (5.0 + fi) + cos(q.y * (3.0 + fi * 0.3)) + t + fi);
    float line = smoothstep(0.075, 0.0, abs(ribbon));
    float gate = smoothstep(1.4, 0.12, length(q));
    color += palette(fi * 0.075 + u_mixAmount + t * 0.025) * line * gate * 0.25;
    q *= 1.13 + 0.02 * sin(t + fi);
  }
  return color;
}

vec3 caseSdf(vec2 uv, vec2 p, float t) {
  float angle = atan(p.y, p.x);
  float radius = 0.42 + u_mixAmount * 0.18;
  float petalRadius = radius * (0.78 + 0.28 * abs(sin(angle * 6.0 + t * 0.7)));
  float flower = length(p) - petalRadius;
  float fill = 1.0 - smoothstep(0.0, 0.024, flower);
  float outline = stroke(flower, 0.018 + u_mixAmount * 0.045, 0.012);
  float diamond = stroke(sdBox(rotate2d(p, 0.785 + t * 0.08), vec2(0.23)), 0.02, 0.015);
  float ring = stroke(sdCircle(p, radius * 1.28), 0.016, 0.01);
  float nodes = 0.0;
  for (int i = 0; i < 6; i++) {
    float a = float(i) / 6.0 * 6.28318 + t * 0.18;
    nodes += smoothstep(0.065, 0.0, length(p - vec2(cos(a), sin(a)) * radius * 1.28));
  }
  vec3 color = mix(vec3(0.018, 0.026, 0.033), u_colorB, fill);
  color += outline * u_colorC + ring * u_colorA + diamond * u_colorC * 0.65 + nodes * u_colorA;
  return color;
}

vec3 caseUvTransform(vec2 uv, vec2 p, float t) {
  vec2 q = rotate2d(p * (1.35 + u_mixAmount * 1.4) + (u_mouse - 0.5) * 0.35, u_rotation + t * 0.23);
  q += vec2(sin(q.y * 2.4 + t), cos(q.x * 2.0 - t)) * 0.08 * u_intensity;
  float tiles = 4.0 + floor(u_intensity * 2.2);
  vec2 cellId = floor(q * tiles);
  vec2 tile = fract(q * tiles) - 0.5;
  float spin = hash(cellId) * 6.28318 + t * (0.25 + hash(cellId + 3.0) * 0.55);
  vec2 bladeUv = rotate2d(tile, spin);
  float blade = 1.0 - smoothstep(0.0, 0.025, sdBox(bladeUv, vec2(0.28, 0.065)));
  float mini = 1.0 - smoothstep(0.0, 0.018, sdBox(rotate2d(tile, -spin * 0.7), vec2(0.075, 0.28)));
  float grid = stroke(max(abs(tile.x), abs(tile.y)) - 0.5, 0.008, 0.006);
  float portal = stroke(sdCircle(q, 0.72 + u_mixAmount * 0.28), 0.03, 0.02);
  vec3 cellColor = mix(u_colorA, u_colorB, hash(cellId + 8.0));
  return cellColor * (blade + mini * 0.65) + grid * u_colorA * 0.35 + portal * u_colorC;
}

vec3 caseMixRemap(vec2 uv, vec2 p, float t) {
  vec2 q = p * (1.4 + u_mixAmount * 1.2);
  q += vec2(fbm(q + t * 0.08), fbm(q - t * 0.07)) * 0.65 * u_intensity;
  float height = fbm(q * 1.2) * 0.72 + 0.28 * sin(q.x * 1.5 + q.y * 0.8 + t * 0.35);
  float remapped = smoothstep(0.18, 0.92, height);
  float contour = smoothstep(0.035, 0.0, abs(fract(height * 9.0 + t * 0.035) - 0.5));
  float river = smoothstep(0.045, 0.0, abs(remapped - u_mixAmount));
  vec3 low = mix(vec3(0.015, 0.026, 0.05), u_colorA, remapped);
  vec3 high = mix(u_colorB, u_colorC, smoothstep(0.55, 1.0, remapped));
  vec3 color = mix(low, high, remapped);
  color += contour * u_colorC * 0.85;
  color = mix(color, u_colorA * 1.2, river * 0.65);
  return color;
}

vec3 caseImage(vec2 uv, vec2 p, float t) {
  vec2 curved = uv - 0.5;
  curved *= 1.0 + dot(curved, curved) * 0.22;
  vec2 crtUv = curved + 0.5;
  float glitchLine = step(0.92, noise(vec2(floor(crtUv.y * 44.0), floor(t * 8.0))));
  crtUv.x += glitchLine * (hash(vec2(floor(crtUv.y * 44.0), floor(t * 5.0))) - 0.5) * 0.09 * u_intensity;
  float block = mix(1.0, 16.0, u_mixAmount);
  vec2 pixelUv = floor(crtUv * u_resolution / block) * block / u_resolution;
  float shift = 0.004 + u_intensity * 0.005;
  vec3 r = proceduralImage(pixelUv + vec2(shift, 0.0));
  vec3 g = proceduralImage(pixelUv);
  vec3 b = proceduralImage(pixelUv - vec2(shift, 0.0));
  vec3 color = vec3(r.r, g.g, b.b);
  float frame = 1.0 - smoothstep(0.0, 0.03, sdBox(p, vec2(0.92, 0.72)));
  float scan = sin(crtUv.y * u_resolution.y * 3.14159) * 0.06;
  float vignette = smoothstep(1.28, 0.18, length(p));
  return color * vignette + frame * u_colorC + scan;
}

vec3 caseNoise(vec2 uv, vec2 p, float t) {
  vec2 q = p * (1.35 + u_mixAmount);
  vec2 warp = vec2(fbm(q * 1.7 + vec2(t * 0.12, 0.0)), fbm(q * 1.5 - vec2(0.0, t * 0.1)));
  float cloud = fbm(q * 2.0 + warp * u_intensity * 3.2);
  float curtain = smoothstep(0.045, 0.0, abs(p.y - (cloud - 0.52) * 0.95));
  float glow = smoothstep(0.38, 0.92, cloud) * smoothstep(1.25, 0.1, length(p));
  vec2 starId = floor(uv * vec2(120.0, 72.0));
  float stars = step(0.992, hash(starId)) * smoothstep(0.48, 0.0, length(fract(uv * vec2(120.0, 72.0)) - 0.5));
  vec3 sky = mix(vec3(0.005, 0.01, 0.026), u_colorA * 0.22, uv.y);
  vec3 aurora = mix(u_colorA, u_colorB, cloud) * (curtain * 1.35 + glow * 0.35);
  return sky + aurora + stars * u_colorC;
}

vec3 caseFilter(vec2 uv, vec2 p, float t) {
  float sides = 6.0;
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float segment = 6.28318 / sides;
  angle = abs(mod(angle + segment * 0.5, segment) - segment * 0.5);
  vec2 k = vec2(cos(angle), sin(angle)) * radius;
  vec2 glassUv = rotate2d(k * 4.4, u_rotation + t * 0.08);
  float pane = fbm(glassUv * 1.5 + vec2(t * 0.12, -t * 0.08));
  float leading = smoothstep(0.08, 0.0, abs(sin(glassUv.x * 8.0) * sin(glassUv.y * 8.0)));
  float edge = abs(pane - fbm(glassUv * 1.5 + vec2(0.018, 0.0) + t * 0.12));
  vec3 color = mix(u_colorA, u_colorB, pane);
  color = mix(color, u_colorC, smoothstep(0.55, 0.95, pane) * 0.72);
  return color * (0.7 + leading * 0.45) + edge * mix(4.0, 16.0, u_mixAmount) * u_colorC;
}

vec3 fakeSphereNormal(vec2 p, float radius) {
  float z = sqrt(max(radius * radius - dot(p, p), 0.0));
  return normalize(vec3(p, z));
}

vec3 shadeSphere(vec2 p, float radius, vec3 base, float shininess) {
  float mask = 1.0 - smoothstep(radius, radius + 0.018, length(p));
  vec3 n = fakeSphereNormal(p, radius);
  vec3 l = normalize(vec3(-0.45 + u_mouse.x, 0.72, 0.62));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 h = normalize(l + v);
  float diffuse = max(dot(n, l), 0.0);
  float specular = pow(max(dot(n, h), 0.0), shininess);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.4);
  vec3 color = base * (0.16 + diffuse * 0.95) + u_colorC * specular + u_colorA * rim * 0.45;
  return color * mask;
}

vec3 caseTransform(vec2 uv, vec2 p, float t) {
  vec2 q = rotate2d(p, t * 0.22 + u_rotation * 0.4);
  vec2 cube = q;
  cube.y += sin(cube.x * 2.0 + t) * 0.08;
  float boxA = stroke(sdBox(cube, vec2(0.44, 0.28)), 0.018, 0.012);
  float boxB = stroke(sdBox(cube - vec2(0.16, 0.13), vec2(0.44, 0.28)), 0.018, 0.012);
  float edgeA = stroke(sdSegment(cube, vec2(-0.44, -0.28), vec2(-0.28, -0.15)), 0.01, 0.008);
  float edgeB = stroke(sdSegment(cube, vec2(0.44, 0.28), vec2(0.6, 0.41)), 0.01, 0.008);
  float xAxis = stroke(sdSegment(p, vec2(-1.2, -0.62), vec2(1.2, -0.62)), 0.008, 0.008);
  float yAxis = stroke(sdSegment(p, vec2(-1.12, -0.82), vec2(-1.12, 0.82)), 0.008, 0.008);
  float grid = smoothstep(0.012, 0.0, min(abs(fract(uv.x * 14.0) - 0.5), abs(fract(uv.y * 8.0) - 0.5)));
  vec3 color = vec3(0.008, 0.015, 0.026) + grid * u_colorA * 0.08;
  color += (boxA + boxB + edgeA + edgeB) * mix(u_colorA, u_colorC, uv.y);
  color += xAxis * u_colorB + yAxis * u_colorA;
  return color;
}

vec3 caseVertexAttrs(vec2 uv, vec2 p, float t) {
  float angle = atan(p.y, p.x);
  float wave = sin(angle * 9.0 + t * 2.0) * cos(length(p) * 12.0 - t);
  float radius = 0.42 + wave * 0.11 * u_intensity;
  float coral = length(p) - radius;
  float fill = 1.0 - smoothstep(0.0, 0.03, coral);
  float ridges = smoothstep(0.03, 0.0, abs(fract((length(p) + wave * 0.05) * 13.0) - 0.5));
  vec3 color = mix(vec3(0.006, 0.012, 0.02), mix(u_colorA, u_colorB, wave * 0.5 + 0.5), fill);
  color += ridges * fill * u_colorC * 0.45;
  color += stroke(coral, 0.012, 0.018) * u_colorA;
  return color;
}

vec3 caseParticles(vec2 uv, vec2 p, float t) {
  vec3 color = vec3(0.005, 0.01, 0.02);
  float glow = 0.0;
  for (int i = 0; i < 54; i++) {
    float fi = float(i);
    float arm = mod(fi, 5.0) / 5.0 * 6.28318;
    float radius = sqrt((fi + 1.0) / 54.0) * 0.94;
    float angle = arm + radius * 4.2 + t * (0.24 + hash(vec2(fi, 2.0)) * 0.22);
    vec2 pos = vec2(cos(angle), sin(angle)) * radius;
    pos += vec2(hash(vec2(fi, 8.0)) - 0.5, hash(vec2(fi, 14.0)) - 0.5) * 0.1;
    float point = smoothstep(0.035, 0.0, length(p - pos));
    glow += point;
    color += mix(u_colorA, u_colorB, hash(vec2(fi, 5.0))) * point * (0.7 + hash(vec2(fi)) * 0.8);
  }
  color += smoothstep(1.1, 0.0, length(p)) * u_colorC * glow * 0.06;
  return color;
}

vec3 casePhong(vec2 uv, vec2 p, float t) {
  vec2 q = rotate2d(p, sin(t * 0.35) * 0.16);
  vec3 gold = mix(u_colorC, vec3(1.0, 0.66, 0.22), 0.45);
  vec3 color = shadeSphere(q, 0.62, gold, 54.0);
  float base = smoothstep(0.01, 0.0, sdSegment(p, vec2(-0.72, -0.68), vec2(0.72, -0.68)));
  color += base * gold * 0.55;
  return color + vec3(0.008, 0.013, 0.022);
}

vec3 caseBlinn(vec2 uv, vec2 p, float t) {
  vec2 q = rotate2d(p, t * 0.16);
  vec3 n = fakeSphereNormal(q, 0.62);
  float mask = 1.0 - smoothstep(0.62, 0.64, length(q));
  float stripe = smoothstep(0.45, 0.55, sin((n.y * 8.0 + n.x * 3.0 + t) * 1.4) * 0.5 + 0.5);
  vec3 base = mix(u_colorA, u_colorB, stripe);
  vec3 color = shadeSphere(q, 0.62, base, 96.0);
  float rim = pow(1.0 - max(n.z, 0.0), 2.2) * mask;
  return color + rim * u_colorB * 1.2;
}

vec3 caseNormals(vec2 uv, vec2 p, float t) {
  vec2 q = rotate2d(p, sin(t) * 0.1);
  vec3 n = fakeSphereNormal(q, 0.62);
  float mask = 1.0 - smoothstep(0.62, 0.64, length(q));
  vec3 debugNormal = n * 0.5 + 0.5;
  vec3 lit = shadeSphere(q, 0.62, mix(u_colorA, u_colorB, n.y * 0.5 + 0.5), 44.0);
  float split = smoothstep(-0.03, 0.03, q.x + sin(q.y * 5.0 + t) * 0.05);
  float seam = smoothstep(0.025, 0.0, abs(q.x + sin(q.y * 5.0 + t) * 0.05));
  return mix(debugNormal * mask, lit, split) + seam * u_colorC;
}

vec3 caseRaymarch(vec2 uv, vec2 p, float t, bool materialMode) {
  vec2 q = rotate2d(p, t * 0.1 + (u_mouse.x - 0.5) * 0.4);
  float portal = abs(length(q) - (0.5 + u_mixAmount * 0.12)) - 0.045;
  float core = sdCircle(q, 0.15 + sin(t * 1.6) * 0.025);
  vec2 shardA = rotate2d(q - vec2(0.68, 0.02), 0.66 + t * 0.12);
  vec2 shardB = rotate2d(q + vec2(0.62, 0.08), -0.72 - t * 0.1);
  float boxA = sdBox(shardA, vec2(0.12, 0.28));
  float boxB = sdBox(shardB, vec2(0.1, 0.22));
  float beam = sdSegment(q, vec2(0.0, -0.82), vec2(0.0, 0.82)) - 0.02;
  float scene = min(portal, core);
  scene = min(scene, boxA);
  if (materialMode) {
    scene = min(scene, min(boxB, beam));
  }
  float hit = 1.0 - smoothstep(0.0, 0.035, scene);
  float ring = 1.0 - smoothstep(0.0, 0.04, portal);
  float shade = smoothstep(1.2, 0.0, length(p)) * (0.65 + 0.35 * sin(t + length(p) * 9.0));
  float grid = materialMode ? smoothstep(0.035, 0.0, abs(fract((p.x + p.y) * 5.0) - 0.5)) * step(0.25, -p.y) : 0.0;
  vec3 color = mix(vec3(0.006, 0.014, 0.024), u_colorA * 0.18, shade);
  color += ring * u_colorC * 1.4;
  color += hit * mix(u_colorA, u_colorB, materialMode ? u_mixAmount : 0.32);
  color += grid * u_colorA * 0.5;
  color += smoothstep(0.42, 0.0, abs(scene)) * u_colorC * 0.08;
  return color;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  p = rotate2d(p, u_rotation * 0.22);
  float t = u_time;
  vec3 color;
  if (u_case == 0) {
    color = caseIntro(uv, p, t);
  } else if (u_case == 1) {
    color = caseRadar(uv, p, t);
  } else if (u_case == 2) {
    color = caseRibbon(uv, p, t);
  } else if (u_case == 3) {
    color = caseSdf(uv, p, t);
  } else if (u_case == 4) {
    color = caseUvTransform(uv, p, t);
  } else if (u_case == 5) {
    color = caseMixRemap(uv, p, t);
  } else if (u_case == 6) {
    color = caseImage(uv, p, t);
  } else if (u_case == 7) {
    color = caseNoise(uv, p, t);
  } else if (u_case == 8) {
    color = caseFilter(uv, p, t);
  } else if (u_case == 9) {
    color = caseTransform(uv, p, t);
  } else if (u_case == 10) {
    color = caseVertexAttrs(uv, p, t);
  } else if (u_case == 11) {
    color = caseParticles(uv, p, t);
  } else if (u_case == 12) {
    color = casePhong(uv, p, t);
  } else if (u_case == 13) {
    color = caseBlinn(uv, p, t);
  } else if (u_case == 14) {
    color = caseNormals(uv, p, t);
  } else if (u_case == 15) {
    color = caseRaymarch(uv, p, t, false);
  } else {
    color = caseRaymarch(uv, p, t, true);
  }
  float vignette = smoothstep(1.55, 0.12, length(p));
  gl_FragColor = vec4(color * vignette, 1.0);
}
`;

function range(frame: number, input: number[], output: number[]): number {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
  }
  return shader;
}

function createShaderRenderer(canvas: HTMLCanvasElement): ShaderRenderTarget {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL unavailable");

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const uniforms = {
    case: gl.getUniformLocation(program, "u_case"),
    resolution: gl.getUniformLocation(program, "u_resolution"),
    mouse: gl.getUniformLocation(program, "u_mouse"),
    time: gl.getUniformLocation(program, "u_time"),
    intensity: gl.getUniformLocation(program, "u_intensity"),
    mixAmount: gl.getUniformLocation(program, "u_mixAmount"),
    rotation: gl.getUniformLocation(program, "u_rotation"),
    colorA: gl.getUniformLocation(program, "u_colorA"),
    colorB: gl.getUniformLocation(program, "u_colorB"),
    colorC: gl.getUniformLocation(program, "u_colorC"),
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  };

  return {
    render(options) {
      resize();
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(uniforms.case, options.shaderCase);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.mouse, options.mouseX, options.mouseY);
      gl.uniform1f(uniforms.time, options.time);
      gl.uniform1f(uniforms.intensity, options.intensity);
      gl.uniform1f(uniforms.mixAmount, options.mixAmount);
      gl.uniform1f(uniforms.rotation, options.rotation);
      gl.uniform3f(uniforms.colorA, 0.46, 1, 0.84);
      gl.uniform3f(uniforms.colorB, 1, 0.48, 0.57);
      gl.uniform3f(uniforms.colorC, 1, 0.83, 0.42);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}

function activeCaseForFrame(frame: number): {
  item: ShaderCase;
  index: number;
  caseFrame: number;
  caseProgress: number;
} {
  const clampedFrame = Math.max(
    0,
    Math.min(frame - CURSOR_CLICK_DELAY_FRAMES, CASE_TIMELINE_FRAMES - 1),
  );
  const index = Math.min(
    demoShaderCases.length - 1,
    Math.floor(clampedFrame / CASE_HOLD_FRAMES),
  );
  const caseFrame = clampedFrame - index * CASE_HOLD_FRAMES;
  const caseProgress = Math.max(0, Math.min(1, caseFrame / CASE_HOLD_FRAMES));
  return { item: demoShaderCases[index], index, caseFrame, caseProgress };
}

function cursorTargetForFrame(frame: number): {
  targetIndex: number;
  previousIndex: number;
  segmentFrame: number;
  travelProgress: number;
} {
  const targetIndex = Math.min(
    demoShaderCases.length - 1,
    Math.floor(Math.max(0, frame) / CASE_HOLD_FRAMES),
  );
  const previousIndex = Math.max(0, targetIndex - 1);
  const segmentFrame = Math.max(0, frame - targetIndex * CASE_HOLD_FRAMES);
  const travelProgress = range(segmentFrame, [0, CURSOR_TRAVEL_FRAMES], [0, 1]);
  return { targetIndex, previousIndex, segmentFrame, travelProgress };
}

function treeShiftForIndex(index: number): number {
  const itemCenterY = TREE_ITEM_CENTER_Y[index] ?? TREE_ITEM_CENTER_Y[0] ?? TREE_SCROLL_TOP;
  return -Math.min(TREE_MAX_SHIFT, Math.max(0, itemCenterY - TREE_FOCUS_Y));
}

function treeShiftForFrame(frame: number): number {
  const { targetIndex, previousIndex, travelProgress } = cursorTargetForFrame(frame);
  const previousShift = treeShiftForIndex(previousIndex);
  const targetShift = treeShiftForIndex(targetIndex);
  return previousShift + (targetShift - previousShift) * travelProgress;
}

function ShaderCanvas({
  activeCase,
  intensity,
  mixAmount,
  rotation,
  mouseX,
  mouseY,
}: {
  activeCase: ShaderCase;
  intensity: number;
  mixAmount: number;
  rotation: number;
  mouseX: number;
  mouseY: number;
}) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ShaderRenderTarget | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    try {
      rendererRef.current = createShaderRenderer(canvas);
    } catch (error) {
      console.error("Shader preview failed", error);
      setHasError(true);
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.render({
      time: frame / FPS,
      shaderCase: activeCase.shaderCase,
      intensity,
      mixAmount,
      rotation,
      mouseX,
      mouseY,
    });
  }, [activeCase.shaderCase, frame, intensity, mixAmount, mouseX, mouseY, rotation]);

  return (
    <div className="shader-canvas-wrap">
      <canvas ref={canvasRef} />
      {hasError ? <span className="shader-canvas-error">WebGL unavailable</span> : null}
    </div>
  );
}

function ShaderCursor() {
  const frame = useCurrentFrame();
  const { targetIndex, previousIndex, segmentFrame, travelProgress } = cursorTargetForFrame(frame);
  const treeShift = treeShiftForFrame(frame);
  const previousX = SHADER_CURSOR_X + Math.sin(previousIndex * 1.7) * 4;
  const targetX = SHADER_CURSOR_X + Math.sin(targetIndex * 1.7) * 4;
  const previousY = (TREE_ITEM_CENTER_Y[previousIndex] ?? TREE_ITEM_CENTER_Y[0]) + treeShift;
  const targetY = (TREE_ITEM_CENTER_Y[targetIndex] ?? TREE_ITEM_CENTER_Y[0]) + treeShift;
  const x = previousX + (targetX - previousX) * travelProgress;
  const y = previousY + (targetY - previousY) * travelProgress;
  const clickPress = Math.max(
    ...[CURSOR_CLICK_DELAY_FRAMES].map((clickFrame) => (
      segmentFrame >= clickFrame && segmentFrame <= clickFrame + 10
        ? spring({
          frame: segmentFrame - clickFrame,
          fps: FPS,
          config: { damping: 18, stiffness: 220 },
        })
        : 0
    )),
  );

  return (
    <div
      className="shader-demo-cursor"
      style={{ transform: `translate(${x}px, ${y}px) scale(${1 - clickPress * 0.12})` }}
    >
      <span />
    </div>
  );
}

function ShaderComposition() {
  const frame = useCurrentFrame();
  const { item: activeCase, index, caseFrame } = activeCaseForFrame(frame);
  const globalProgress = range(frame, [0, DURATION_IN_FRAMES], [0, 1]);
  const intensity = 0.72 + Math.sin(frame / 28) * 0.18 + globalProgress * 0.22;
  const mixAmount = range(frame, [0, 260, 520, 780, DURATION_IN_FRAMES], [0.18, 0.72, 0.42, 0.86, 0.35]);
  const rotation = range(frame, [0, DURATION_IN_FRAMES], [0.2, 3.6]);
  const mouseX = range(frame, [0, 260, 520, 780, DURATION_IN_FRAMES], [0.5, 0.72, 0.28, 0.64, 0.48]);
  const mouseY = range(frame, [0, 260, 520, 780, DURATION_IN_FRAMES], [0.5, 0.34, 0.7, 0.44, 0.5]);
  const codeReveal = Math.floor(range(caseFrame, [8, 42], [0, activeCase.code.length]));
  const treeShift = treeShiftForFrame(frame);
  const activeKind = activeCase.shaderCase >= 15
    ? "Raymarching"
    : activeCase.shaderCase === 11
      ? "Particles"
      : activeCase.shaderCase >= 9
        ? "Mesh / Lighting"
        : "Plane Shader";

  const displayControls = useMemo(() => activeCase.controls.map((control, controlIndex) => ({
    ...control,
    value: Math.max(0.08, Math.min(0.96, control.value + Math.sin(frame / 22 + controlIndex) * 0.09)),
  })), [activeCase, frame]);

  return (
    <AbsoluteFill className="shader-demo-root">
      <div className="shader-demo-window">
        <header className="shader-demo-topbar">
          <div className="shader-demo-brand">
            <b>Shader Casebook</b>
            <span>TypeScript · WebGL · GLSL</span>
          </div>
          <div className="shader-demo-status">
            <span>{demoShaderCases.length} demos</span>
            <span>{activeCase.track} · {activeKind}</span>
            <span>1280 × 880</span>
          </div>
          <div className="shader-demo-actions">
            <i />
            <i />
            <i />
          </div>
        </header>
        <main className="shader-demo-layout">
          <aside className="shader-demo-tree">
            <div className="shader-demo-tree-head">
              <span>NOTE DIRECTORY</span>
              <b>Shader 学习路线</b>
            </div>
            <div className="shader-demo-search">搜索章节...</div>
            <div className="shader-demo-tree-scroll">
              <div className="shader-demo-tree-track" style={{ transform: `translateY(${treeShift}px)` }}>
                {shaderSections.map((section) => (
                  <section key={section.title}>
                    <h4>{section.title}</h4>
                    {section.cases.map((caseId) => {
                      const shaderCase = demoCaseById.get(caseId);
                      if (!shaderCase) return null;
                      const itemIndex = demoCaseIndexById.get(caseId) ?? -1;
                      return (
                        <button className={itemIndex === index ? "is-active" : ""} key={shaderCase.id}>
                          <em>{String(shaderCase.index).padStart(2, "0")}</em>
                          <span>{shaderCase.shortTitle}</span>
                        </button>
                      );
                    })}
                  </section>
                ))}
              </div>
            </div>
          </aside>
          <section className="shader-demo-stage">
            <div className="shader-demo-hero">
              <div>
                <span>{activeCase.module}</span>
                <h3>{activeCase.title}</h3>
              </div>
              <b>{String(activeCase.index).padStart(2, "0")} / {demoShaderCases.length}</b>
            </div>
            <p>{activeCase.summary}</p>
            <div className="shader-demo-run">
              <header>
                <b>实时运行</b>
                <span>u_time {Math.round((frame / FPS) * 100) / 100}s · u_mouse {mouseX.toFixed(2)}, {mouseY.toFixed(2)}</span>
              </header>
              <ShaderCanvas
                activeCase={activeCase}
                intensity={intensity}
                mixAmount={mixAmount}
                rotation={rotation}
                mouseX={mouseX}
                mouseY={mouseY}
              />
            </div>
            <div className="shader-demo-concepts">
              {activeCase.concepts.map((concept) => <span key={concept}>{concept}</span>)}
            </div>
          </section>
          <aside className="shader-demo-panel">
            <section className="shader-demo-code">
              <header>
                <b>对应文件代码</b>
                <span>fragment.glsl</span>
              </header>
              <pre><code>{activeCase.code.slice(0, codeReveal)}</code></pre>
            </section>
            <section className="shader-demo-controls">
              <header>
                <b>参数控制台</b>
                <span>{activeCase.track}</span>
              </header>
              <div className="shader-demo-swatches">
                <i />
                <i />
                <i />
              </div>
              {displayControls.map((control) => (
                <label key={control.label}>
                  <span>{control.label}</span>
                  <i><b style={{ width: `${control.value * 100}%` }} /></i>
                  <em>{control.value.toFixed(2)}</em>
                </label>
              ))}
            </section>
          </aside>
        </main>
      </div>
      <ShaderCursor />
    </AbsoluteFill>
  );
}

export function ShaderReplay() {
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSession, setPlaySession] = useState(0);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    let raf = 0;
    let startedAt = 0;

    const tick = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const nextFrame = Math.floor(elapsedSeconds * FPS) % DURATION_IN_FRAMES;
      playerRef.current?.seekTo(nextFrame);
      raf = window.requestAnimationFrame(tick);
    };

    if (isPlaying) {
      playerRef.current?.seekTo(0);
      raf = window.requestAnimationFrame(tick);
    } else {
      playerRef.current?.seekTo(0);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isPlaying, playSession]);

  const startReplay = () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaySession((current) => current + 1);
    setIsPlaying(true);
  };

  const stopReplay = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  return (
    <div
      className={`shader-remotion-shell ${isPlaying ? "is-playing" : "is-idle"}`}
      aria-hidden="true"
      onMouseEnter={startReplay}
      onMouseMove={startReplay}
      onMouseLeave={stopReplay}
      onFocus={startReplay}
      onBlur={stopReplay}
      onTouchStart={startReplay}
    >
      <Player
        ref={playerRef}
        className="shader-remotion-player"
        component={ShaderComposition}
        compositionWidth={COMPOSITION_WIDTH}
        compositionHeight={COMPOSITION_HEIGHT}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        loop
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
