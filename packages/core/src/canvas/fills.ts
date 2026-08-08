import type { Canvas, Paint } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph, Fill } from '#core/scene-graph'

import type { SkiaRenderer } from './renderer'

export function drawNodeFill(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  rect: Float32Array,
  hasRadius: boolean,
  fill?: Fill
): void {
  switch (node.type) {
    case 'VECTOR': {
      const fg = r.getFillGeometry(node)
      if (fg) {
        for (const p of fg) canvas.drawPath(p, r.fillPaint)
      } else {
        const vps = r.getVectorPaths(node)
        if (vps) {
          for (const vp of vps) canvas.drawPath(vp, r.fillPaint)
        }
      }
      break
    }
    case 'ELLIPSE':
      if (node.arcData) {
        r.drawArc(canvas, node, r.fillPaint)
      } else {
        canvas.drawOval(rect, r.fillPaint)
      }
      break
    case 'TEXT':
      r.renderText(canvas, node, fill)
      break
    case 'LINE':
      canvas.drawLine(0, 0, node.width, node.height, r.fillPaint)
      break
    case 'POLYGON':
    case 'STAR': {
      const path = r.makePolygonPath(node)
      canvas.drawPath(path, r.fillPaint)
      path.delete()
      break
    }
    default:
      if (hasRadius) {
        canvas.drawRRect(r.makeRRect(node), r.fillPaint)
      } else {
        canvas.drawRect(rect, r.fillPaint)
      }
  }
}

export function applyFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph,
  fillIndex = 0
): boolean {
  r.fillPaint.setShader(null)
  r.fillPaint.setBlendMode(r.ck.BlendMode.SrcOver)

  if (fill.type === 'SOLID') {
    const c = r.resolveFillColor(fill, fillIndex, node, graph)
    r.fillPaint.setColor(r.ck.Color4f(c.r, c.g, c.b, c.a))
    return true
  }

  if (fill.type.startsWith('GRADIENT') && fill.gradientStops && fill.gradientTransform) {
    r.applyGradientFill(fill, node, graph)
    return true
  }

  if (fill.type === 'IMAGE' && fill.imageHash) {
    return r.applyImageFill(fill, node, graph)
  }

  return false
}

function makeGradientLocalMatrix(
  r: SkiaRenderer,
  width: number,
  height: number,
  transform: NonNullable<Fill['gradientTransform']>
) {
  return r.ck.Matrix.multiply(r.ck.Matrix.scaled(width, height), [
    transform.m00,
    transform.m01,
    transform.m02,
    transform.m10,
    transform.m11,
    transform.m12,
    0,
    0,
    1
  ])
}

export function applyGradientFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph
): void {
  const stops = fill.gradientStops
  const t = fill.gradientTransform
  if (!stops || !t) return
  const colors = stops.map((s, index) => {
    const resolved = r.resolveFillColorInfo(
      {
        ...fill,
        type: 'SOLID',
        color: s.color,
        opacity: s.color.a,
        visible: true
      },
      index,
      node,
      graph
    )
    const c = resolved.color
    return r.ck.Color4f(c.r, c.g, c.b, c.a)
  })
  const positions = stops.map((s) => s.position)

  const w = node.width
  const h = node.height

  if (fill.type === 'GRADIENT_LINEAR') {
    const startX = t.m02 * w
    const startY = t.m12 * h
    const endX = (t.m00 + t.m02) * w
    const endY = (t.m10 + t.m12) * h
    const shader = r.ck.Shader.MakeLinearGradient(
      [startX, startY],
      [endX, endY],
      colors,
      positions,
      r.ck.TileMode.Clamp
    )
    r.fillPaint.setShader(shader)
  } else if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_DIAMOND') {
    // Figma's gradientTransform maps gradient space (center 0.5,0.5, radius 0.5)
    // to the node's normalized [0,1] coordinate space. The full local matrix
    // converts to pixel coordinates: scale(w, h) * gradientTransform.
    const localMatrix = makeGradientLocalMatrix(r, w, h, t)
    const shader = r.ck.Shader.MakeRadialGradient(
      [0.5, 0.5],
      0.5,
      colors,
      positions,
      r.ck.TileMode.Clamp,
      localMatrix
    )
    r.fillPaint.setShader(shader)
  } else if (fill.type === 'GRADIENT_ANGULAR') {
    const localMatrix = makeGradientLocalMatrix(r, w, h, t)
    const shader = r.ck.Shader.MakeSweepGradient(
      0.5,
      0.5,
      colors,
      positions,
      r.ck.TileMode.Clamp,
      localMatrix
    )
    r.fillPaint.setShader(shader)
  }
}

export function applyImageFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph
): boolean {
  const hash = fill.imageHash
  if (!hash) return false
  let img = r.imageCache.get(hash)
  if (!img) {
    const data = graph.images.get(hash)
    if (!data) return false
    img = r.ck.MakeImageFromEncoded(data) ?? undefined
    if (img) r.imageCache.set(hash, img)
    else return false
  }

  const imgW = img.width()
  const imgH = img.height()
  const scaleMode = fill.imageScaleMode ?? 'FILL'

  if (scaleMode === 'TILE') {
    const shader = img.makeShaderCubic(r.ck.TileMode.Repeat, r.ck.TileMode.Repeat, 1 / 3, 1 / 3)
    r.fillPaint.setShader(shader)
    return true
  }

  let sx: number, sy: number, sw: number, sh: number
  if (scaleMode === 'CROP' && fill.imageTransform) {
    const t = fill.imageTransform
    sx = t.m02 * imgW
    sy = t.m12 * imgH
    sw = t.m00 * imgW
    sh = t.m11 * imgH
  } else if (scaleMode === 'FIT') {
    const scale = Math.min(node.width / imgW, node.height / imgH)
    sw = imgW
    sh = imgH
    sx = -(node.width / scale - imgW) / 2
    sy = -(node.height / scale - imgH) / 2
  } else {
    const scale = Math.max(node.width / imgW, node.height / imgH)
    sw = node.width / scale
    sh = node.height / scale
    sx = (imgW - sw) / 2
    sy = (imgH - sh) / 2
  }

  const shader = img.makeShaderCubic(
    r.ck.TileMode.Clamp,
    r.ck.TileMode.Clamp,
    1 / 3,
    1 / 3,
    r.ck.Matrix.multiply(
      r.ck.Matrix.scaled(node.width / sw, node.height / sh),
      r.ck.Matrix.translated(-sx, -sy)
    )
  )

  const f = fill.filters
  if (hasActiveFilters(f)) {
    const effect = getImageFiltersEffect(r.ck)
    if (effect) {
      const b = f?.brightness ?? 0
      const c = f?.contrast ?? 0
      const exp = f?.exposure ?? 0
      const hl = f?.highlights ?? 0
      const sh = f?.shadows ?? 0
      const wh = f?.whites ?? 0
      const bl = f?.blacks ?? 0
      const gm = f?.gamma ?? 0

      const hue = f?.hue ?? 0
      const sat = f?.saturation ?? 0
      const vib = f?.vibrance ?? 0
      const temp = f?.temperature ?? 0
      const tint = f?.tint ?? 0

      const cyan = f?.cyan ?? 0
      const mag = f?.magenta ?? 0
      const yel = f?.yellow ?? 0
      const key = f?.key ?? 0

      const bg = f?.bgRemoval
      const bgEnabled = bg?.enabled ? 1.0 : 0.0
      const bgTarget = bg?.targetColor ?? [0.0, 1.0, 0.0]

      const lumaThresholdEnabled = f?.lumaThresholdEnabled ? 1.0 : 0.0
      const lumaThreshold = f?.lumaThreshold ?? 0.1
      const lumaTolerance = f?.lumaTolerance ?? 0.05

      const blend = f?.blend
      const blendEnabled = blend?.enabled ? 1.0 : 0.0
      const blendMode = BLEND_MODES_MAP[blend?.mode ?? 'multiply'] ?? 2.0
      const blendColor = blend?.color ?? [1.0, 1.0, 1.0]
      const blendOpacity = blend?.opacity ?? 1.0

      const rPoints = getFlatPoints(f?.pointsR)
      const gPoints = getFlatPoints(f?.pointsG)
      const bPoints = getFlatPoints(f?.pointsB)

      const uniforms = [
        b,
        c,
        exp,
        hl,
        sh,
        wh,
        bl,
        gm,
        hue,
        sat,
        vib,
        temp,
        tint,
        cyan,
        mag,
        yel,
        key,
        bgEnabled,
        bgTarget[0],
        bgTarget[1],
        bgTarget[2],
        lumaThresholdEnabled,
        lumaThreshold,
        lumaTolerance,
        blendEnabled,
        blendMode,
        blendColor[0],
        blendColor[1],
        blendColor[2],
        blendOpacity,
        ...rPoints,
        ...gPoints,
        ...bPoints
      ]

      const filteredShader = effect.makeShaderWithChildren(uniforms, [shader])
      if (filteredShader) {
        r.fillPaint.setShader(filteredShader)
        if (blend?.enabled && blend.mode) {
          const skBlend = getSkiaBlendMode(r, blend.mode)
          if (skBlend) {
            r.fillPaint.setBlendMode(skBlend)
          }
        }
        return true
      }
    }
  }

  r.fillPaint.setShader(shader)
  return true
}

const BLEND_MODES_MAP: Record<string, number> = {
  darken: 1.0,
  multiply: 2.0,
  'color-burn': 3.0,
  'linear-burn': 4.0,
  lighten: 5.0,
  screen: 6.0,
  'color-dodge': 7.0,
  'linear-dodge': 8.0,
  overlay: 9.0,
  'soft-light': 10.0,
  'hard-light': 11.0,
  'vivid-light': 12.0,
  difference: 13.0,
  exclusion: 14.0,
  subtract: 15.0,
  divide: 16.0,
  hue: 17.0,
  saturation: 18.0,
  color: 19.0,
  luminosity: 20.0
}

export function getSkiaBlendMode(r: SkiaRenderer, mode?: string): any {
  if (!mode) return r.ck.BlendMode.SrcOver
  switch (mode.toLowerCase()) {
    case 'darken':
      return r.ck.BlendMode.Darken
    case 'multiply':
      return r.ck.BlendMode.Multiply
    case 'color-burn':
      return r.ck.BlendMode.ColorBurn
    case 'linear-burn':
      return r.ck.BlendMode.ColorBurn // fallback
    case 'lighten':
      return r.ck.BlendMode.Lighten
    case 'screen':
      return r.ck.BlendMode.Screen
    case 'color-dodge':
      return r.ck.BlendMode.ColorDodge
    case 'linear-dodge':
      return r.ck.BlendMode.Plus
    case 'overlay':
      return r.ck.BlendMode.Overlay
    case 'soft-light':
      return r.ck.BlendMode.SoftLight
    case 'hard-light':
      return r.ck.BlendMode.HardLight
    case 'vivid-light':
      return r.ck.BlendMode.HardLight // fallback
    case 'difference':
      return r.ck.BlendMode.Difference
    case 'exclusion':
      return r.ck.BlendMode.Exclusion
    case 'hue':
      return r.ck.BlendMode.Hue
    case 'saturation':
      return r.ck.BlendMode.Saturation
    case 'color':
      return r.ck.BlendMode.Color
    case 'luminosity':
      return r.ck.BlendMode.Luminosity
    default:
      return r.ck.BlendMode.SrcOver
  }
}

export function drawArc(r: SkiaRenderer, canvas: Canvas, node: SceneNode, paint: Paint): void {
  const arc = node.arcData
  if (!arc) return
  const cx = node.width / 2
  const cy = node.height / 2
  const rx = node.width / 2
  const ry = node.height / 2
  const innerRx = rx * arc.innerRadius
  const innerRy = ry * arc.innerRadius

  const startDeg = arc.startingAngle * (180 / Math.PI)
  const endDeg = arc.endingAngle * (180 / Math.PI)
  const sweepDeg = endDeg - startDeg

  const path = new r.ck.Path()
  const oval = r.ck.LTRBRect(0, 0, node.width, node.height)

  if (arc.innerRadius > 0) {
    path.addArc(oval, startDeg, sweepDeg)
    const innerOval = r.ck.LTRBRect(cx - innerRx, cy - innerRy, cx + innerRx, cy + innerRy)
    const innerPath = new r.ck.Path()
    innerPath.addArc(innerOval, startDeg + sweepDeg, -sweepDeg)
    path.addPath(innerPath)
    path.close()
    innerPath.delete()
  } else {
    const isFullCircle = Math.abs(sweepDeg) >= 359.99
    if (isFullCircle) {
      path.addOval(oval)
    } else {
      path.moveTo(cx, cy)
      path.addArc(oval, startDeg, sweepDeg)
      path.close()
    }
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Image Filters Shader & Helpers (AGSL Runtime Shader)
const IMAGE_FILTERS_SHADER = `
  uniform shader image;
  uniform float brightness;
  uniform float contrast;
  uniform float exposure;
  uniform float highlights;
  uniform float shadows;
  uniform float whites;
  uniform float blacks;
  uniform float gamma;
  
  uniform float hue;
  uniform float saturation;
  uniform float vibrance;
  uniform float temperature;
  uniform float tint;
  
  uniform float cyan;
  uniform float magenta;
  uniform float yellow;
  uniform float key;

  uniform float bg_enabled;
  uniform vec3 bg_target;

  uniform float luma_threshold_enabled;
  uniform float luma_threshold;
  uniform float luma_tolerance;

  uniform float blend_enabled;
  uniform float blend_mode;
  uniform vec3 blend_color;
  uniform float blend_opacity;
  
  uniform vec2 r_points[8];
  uniform vec2 g_points[8];
  uniform vec2 b_points[8];

  float evaluateSpline(float x, vec2 points[8]) {
    vec2 p0 = points[0];
    vec2 p1 = points[1];
    for (int i = 0; i < 7; i++) {
      vec2 curr = points[i];
      vec2 next = points[i+1];
      if (next.x > 1.05) {
        break;
      }
      if (x >= curr.x) {
        p0 = curr;
        p1 = next;
      }
    }
    if (p1.x == p0.x) return p0.y;
    float t = (x - p0.x) / (p1.x - p0.x);
    t = clamp(t, 0.0, 1.0);
    return clamp(mix(p0.y, p1.y, t), 0.0, 1.0);
  }

  vec3 hueRotate(vec3 color, float angle) {
    vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(angle);
    return color * cosAngle + cross(k, color) * sin(angle) + k * dot(k, color) * (1.0 - cosAngle);
  }

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 rgb2hsl(vec3 c) {
    float maxVal = max(c.r, max(c.g, c.b));
    float minVal = min(c.r, min(c.g, c.b));
    float h = 0.0;
    float s = 0.0;
    float l = (maxVal + minVal) * 0.5;
    float d = maxVal - minVal;
    if (d > 0.0) {
      s = l > 0.5 ? d / (2.0 - maxVal - minVal) : d / (maxVal + minVal);
      if (maxVal == c.r) {
        h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
      } else if (maxVal == c.g) {
        h = (c.b - c.r) / d + 2.0;
      } else {
        h = (c.r - c.g) / d + 4.0;
      }
      h /= 6.0;
    }
    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    if (s == 0.0) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    float r = hue2rgb(p, q, h + 1.0/3.0);
    float g = hue2rgb(p, q, h);
    float b = hue2rgb(p, q, h - 1.0/3.0);
    return vec3(r, g, b);
  }

  vec3 applyBlend(vec3 A, vec3 B, float mode) {
    if (mode == 1.0) {
      return min(A, B);
    } else if (mode == 2.0) {
      return A * B;
    } else if (mode == 3.0) {
      return 1.0 - clamp((1.0 - A) / (B + 0.0001), 0.0, 1.0);
    } else if (mode == 4.0) {
      return clamp(A + B - 1.0, 0.0, 1.0);
    } else if (mode == 5.0) {
      return max(A, B);
    } else if (mode == 6.0) {
      return 1.0 - (1.0 - A) * (1.0 - B);
    } else if (mode == 7.0) {
      return clamp(A / (1.0 - B + 0.0001), 0.0, 1.0);
    } else if (mode == 8.0) {
      return clamp(A + B, 0.0, 1.0);
    } else if (mode == 9.0) {
      float r = B.r < 0.5 ? 2.0 * A.r * B.r : 1.0 - 2.0 * (1.0 - A.r) * (1.0 - B.r);
      float g = B.g < 0.5 ? 2.0 * A.g * B.g : 1.0 - 2.0 * (1.0 - A.g) * (1.0 - B.g);
      float b = B.b < 0.5 ? 2.0 * A.b * B.b : 1.0 - 2.0 * (1.0 - A.b) * (1.0 - B.b);
      return vec3(r, g, b);
    } else if (mode == 10.0) {
      return (1.0 - 2.0 * B) * A * A + 2.0 * B * A;
    } else if (mode == 11.0) {
      float r = A.r < 0.5 ? 2.0 * A.r * B.r : 1.0 - 2.0 * (1.0 - A.r) * (1.0 - B.r);
      float g = A.g < 0.5 ? 2.0 * A.g * B.g : 1.0 - 2.0 * (1.0 - A.g) * (1.0 - B.g);
      float b = A.b < 0.5 ? 2.0 * A.b * B.b : 1.0 - 2.0 * (1.0 - A.b) * (1.0 - B.b);
      return vec3(r, g, b);
    } else if (mode == 12.0) {
      float r = B.r < 0.5 ? A.r / (2.0 * (1.0 - B.r) + 0.0001) : 1.0 - (1.0 - A.r) / (2.0 * B.r + 0.0001);
      float g = B.g < 0.5 ? A.g / (2.0 * (1.0 - B.g) + 0.0001) : 1.0 - (1.0 - A.g) / (2.0 * B.g + 0.0001);
      float b = B.b < 0.5 ? A.b / (2.0 * (1.0 - B.b) + 0.0001) : 1.0 - (1.0 - A.b) / (2.0 * B.b + 0.0001);
      return clamp(vec3(r, g, b), 0.0, 1.0);
    } else if (mode == 13.0) {
      return abs(A - B);
    } else if (mode == 14.0) {
      return A + B - 2.0 * A * B;
    } else if (mode == 15.0) {
      return max(A - B, vec3(0.0));
    } else if (mode == 16.0) {
      return clamp(A / (B + 0.0001), 0.0, 1.0);
    } else if (mode >= 17.0) {
      vec3 hslA = rgb2hsl(A);
      vec3 hslB = rgb2hsl(B);
      if (mode == 17.0) {
        return hsl2rgb(vec3(hslA.x, hslB.y, hslB.z));
      } else if (mode == 18.0) {
        return hsl2rgb(vec3(hslB.x, hslA.y, hslB.z));
      } else if (mode == 19.0) {
        return hsl2rgb(vec3(hslA.x, hslA.y, hslB.z));
      } else if (mode == 20.0) {
        return hsl2rgb(vec3(hslB.x, hslB.y, hslA.z));
      }
    }
    return A;
  }

  float evaluateMask(vec2 coords) {
    vec4 color = image.eval(coords);
    if (color.a == 0.0) return 0.0;
    vec3 rgb = color.rgb / color.a;
    
    vec3 hsv = rgb2hsv(rgb);
    vec3 targetHsv = rgb2hsv(bg_target);
    
    float diffH = abs(hsv.x - targetHsv.x);
    diffH = min(diffH, 1.0 - diffH);
    
    float diffS = abs(hsv.y - targetHsv.y);
    float diffV = abs(hsv.z - targetHsv.z);
    
    // Optimal automatic threshold parameters
    float valH = smoothstep(0.09, 0.09 + 0.05 + 0.0001, diffH);
    float valS = smoothstep(0.15, 0.15 + 0.05 + 0.0001, diffS);
    float valV = smoothstep(0.18, 0.18 + 0.05 + 0.0001, diffV);
    
    return max(valH, max(valS, valV));
  }

  float getErodedMask(vec2 coords) {
    float mask = evaluateMask(coords);
    mask = min(mask, evaluateMask(coords + vec2(-1.0, -1.0)));
    mask = min(mask, evaluateMask(coords + vec2(0.0, -1.0)));
    mask = min(mask, evaluateMask(coords + vec2(1.0, -1.0)));
    mask = min(mask, evaluateMask(coords + vec2(-1.0, 0.0)));
    mask = min(mask, evaluateMask(coords + vec2(1.0, 0.0)));
    mask = min(mask, evaluateMask(coords + vec2(-1.0, 1.0)));
    mask = min(mask, evaluateMask(coords + vec2(0.0, 1.0)));
    mask = min(mask, evaluateMask(coords + vec2(1.0, 1.0)));
    return mask;
  }

  float getDilatedMask(vec2 coords) {
    float mask = getErodedMask(coords);
    mask = max(mask, getErodedMask(coords + vec2(-1.0, -1.0)));
    mask = max(mask, getErodedMask(coords + vec2(0.0, -1.0)));
    mask = max(mask, getErodedMask(coords + vec2(1.0, -1.0)));
    mask = max(mask, getErodedMask(coords + vec2(-1.0, 0.0)));
    mask = max(mask, getErodedMask(coords + vec2(1.0, 0.0)));
    mask = max(mask, getErodedMask(coords + vec2(-1.0, 1.0)));
    mask = max(mask, getErodedMask(coords + vec2(0.0, 1.0)));
    mask = max(mask, getErodedMask(coords + vec2(1.0, 1.0)));
    return mask;
  }

  vec4 main(vec2 coords) {
    vec4 color = image.eval(coords);
    if (color.a == 0.0) return color;
    
    vec3 rgb = color.rgb / color.a;
    
    // 1. Exposure (multiplicative)
    rgb = rgb * pow(2.0, exposure);
    
    // 2. Brightness (additive)
    rgb = rgb + brightness;
    
    // 3. Contrast (factor = contrast + 1.0)
    rgb = (rgb - 0.5) * (contrast + 1.0) + 0.5;
    
    // 4. Highlights / Shadows & Whites / Blacks
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    
    // Highlight weight (bright areas)
    float hiWeight = clamp((luma - 0.4) / 0.6, 0.0, 1.0);
    // Shadows weight (dark areas)
    float shWeight = clamp((0.6 - luma) / 0.6, 0.0, 1.0);
    
    if (highlights >= 0.0) {
      rgb += highlights * hiWeight * (1.0 - rgb);
    } else {
      rgb += highlights * hiWeight * rgb;
    }
    
    if (shadows >= 0.0) {
      rgb += shadows * shWeight * (1.0 - rgb);
    } else {
      rgb += shadows * shWeight * rgb;
    }
    
    // Whites (extreme brights)
    float whiteWeight = pow(clamp(luma, 0.0, 1.0), 2.0);
    if (whites >= 0.0) {
      rgb += whites * whiteWeight * (1.0 - rgb);
    } else {
      rgb += whites * whiteWeight * rgb;
    }
    
    // Blacks (extreme darks)
    float blackWeight = pow(clamp(1.0 - luma, 0.0, 1.0), 2.0);
    if (blacks >= 0.0) {
      rgb += blacks * blackWeight * (1.0 - rgb);
    } else {
      rgb += blacks * blackWeight * rgb;
    }
    
    // 5. Gamma
    rgb = clamp(rgb, 0.0, 1.0);
    rgb = pow(rgb, vec3(1.0 / (gamma + 1.0)));
    
    // 6. Color Correction: Temperature & Tint
    rgb.r += temperature * 0.15;
    rgb.b -= temperature * 0.15;
    
    rgb.g += tint * 0.15;
    rgb.r -= tint * 0.075;
    rgb.b -= tint * 0.075;
    
    // 7. Color Correction: Hue rotation
    if (hue != 0.0) {
      rgb = hueRotate(rgb, hue * 3.14159265);
    }
    
    // 8. Color Correction: Saturation
    float lumaCorr = dot(rgb, vec3(0.299, 0.587, 0.114));
    if (saturation != 0.0) {
      rgb = mix(vec3(lumaCorr), rgb, 1.0 + saturation);
    }
    
    // 9. Color Correction: Vibrance
    if (vibrance != 0.0) {
      float maxVal = max(rgb.r, max(rgb.g, rgb.b));
      float minVal = min(rgb.r, min(rgb.g, rgb.b));
      float satVal = (maxVal - minVal) / (maxVal + 0.0001);
      float vibranceFactor = vibrance * (1.0 - satVal);
      rgb = mix(vec3(lumaCorr), rgb, 1.0 + vibranceFactor);
    }
    
    // 10. CMYK Adjustments
    rgb = clamp(rgb, 0.0, 1.0);
    if (cyan != 0.0 || magenta != 0.0 || yellow != 0.0 || key != 0.0) {
      float kVal = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
      float cVal = 0.0;
      float mVal = 0.0;
      float yVal = 0.0;
      if (kVal < 1.0) {
        cVal = (1.0 - rgb.r - kVal) / (1.0 - kVal);
        mVal = (1.0 - rgb.g - kVal) / (1.0 - kVal);
        yVal = (1.0 - rgb.b - kVal) / (1.0 - kVal);
      }
      
      cVal = clamp(cVal + cyan, 0.0, 1.0);
      mVal = clamp(mVal + magenta, 0.0, 1.0);
      yVal = clamp(yVal + yellow, 0.0, 1.0);
      kVal = clamp(kVal + key, 0.0, 1.0);
      
      rgb.r = (1.0 - cVal) * (1.0 - kVal);
      rgb.g = (1.0 - mVal) * (1.0 - kVal);
      rgb.b = (1.0 - yVal) * (1.0 - kVal);
    }
    
    // 11. Curves piecewise linear
    rgb.r = evaluateSpline(rgb.r, r_points);
    rgb.g = evaluateSpline(rgb.g, g_points);
    rgb.b = evaluateSpline(rgb.b, b_points);

    // 12. Blend overlay application
    if (blend_enabled == 1.0) {
      vec3 blended = applyBlend(rgb, blend_color, blend_mode);
      rgb = mix(rgb, blended, blend_opacity);
    }
    
    // 13. Background removal mask application
    float alphaVal = color.a;
    if (bg_enabled == 1.0) {
      alphaVal = alphaVal * getDilatedMask(coords);
    }

    // 14. Luma thresholding background removal application
    if (luma_threshold_enabled == 1.0) {
      float pixelLuma = dot(rgb, vec3(0.299, 0.587, 0.114));
      float lumaAlpha = smoothstep(luma_threshold - luma_tolerance, luma_threshold + luma_tolerance, pixelLuma);
      alphaVal = alphaVal * lumaAlpha;
    }
    
    rgb = clamp(rgb, 0.0, 1.0);
    return vec4(rgb * alphaVal, alphaVal);
  }
`

let cachedImageFiltersEffect: any = null

function getImageFiltersEffect(ck: any) {
  if (!cachedImageFiltersEffect) {
    cachedImageFiltersEffect = ck.RuntimeEffect.Make(IMAGE_FILTERS_SHADER)
    if (!cachedImageFiltersEffect) {
      console.error('Failed to compile image adjustments runtime effect')
    }
  }
  return cachedImageFiltersEffect
}

function hasActiveFilters(f?: any): boolean {
  if (!f) return false
  return (
    (f.brightness ?? 0) !== 0 ||
    (f.contrast ?? 0) !== 0 ||
    (f.exposure ?? 0) !== 0 ||
    (f.highlights ?? 0) !== 0 ||
    (f.shadows ?? 0) !== 0 ||
    (f.whites ?? 0) !== 0 ||
    (f.blacks ?? 0) !== 0 ||
    (f.gamma ?? 0) !== 0 ||
    (f.hue ?? 0) !== 0 ||
    (f.saturation ?? 0) !== 0 ||
    (f.vibrance ?? 0) !== 0 ||
    (f.temperature ?? 0) !== 0 ||
    (f.tint ?? 0) !== 0 ||
    (f.cyan ?? 0) !== 0 ||
    (f.magenta ?? 0) !== 0 ||
    (f.yellow ?? 0) !== 0 ||
    (f.key ?? 0) !== 0 ||
    f.pointsR !== undefined ||
    f.pointsG !== undefined ||
    f.pointsB !== undefined ||
    f.bgRemoval?.enabled === true ||
    f.blend?.enabled === true ||
    f.lumaThresholdEnabled === true
  )
}

function getFlatPoints(pts?: [number, number][]): number[] {
  const result: number[] = []
  const list =
    pts && pts.length > 0
      ? pts
      : [
          [0, 0],
          [1, 1]
        ]
  for (let i = 0; i < 8; i++) {
    if (i < list.length) {
      result.push(list[i][0], list[i][1])
    } else {
      result.push(2.0, 2.0) // unused point sentinel
    }
  }
  return result
}
