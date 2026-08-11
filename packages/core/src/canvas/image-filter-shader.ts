// Image Filters Shader (AGSL/SKSL Runtime Shader)
const SKSL_PART1 = `
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
      if (next.x > 1.05) break;
      if (x >= curr.x) { p0 = curr; p1 = next; }
    }
    if (p1.x == p0.x) return p0.y;
    float t = clamp((x - p0.x) / (p1.x - p0.x), 0.0, 1.0);
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
      if (maxVal == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
      else if (maxVal == c.g) h = (c.b - c.r) / d + 2.0;
      else h = (c.r - c.g) / d + 4.0;
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
    float h = hsl.x; float s = hsl.y; float l = hsl.z;
    if (s == 0.0) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
  }

  vec3 applyBlendHigh(vec3 A, vec3 B, float mode) {
    if (mode == 11.0) {
      float r = A.r < 0.5 ? 2.0 * A.r * B.r : 1.0 - 2.0 * (1.0 - A.r) * (1.0 - B.r);
      float g = A.g < 0.5 ? 2.0 * A.g * B.g : 1.0 - 2.0 * (1.0 - A.g) * (1.0 - B.g);
      float b = A.b < 0.5 ? 2.0 * A.b * B.b : 1.0 - 2.0 * (1.0 - A.b) * (1.0 - B.b);
      return vec3(r, g, b);
    } else if (mode == 12.0) {
      float r = B.r < 0.5 ? A.r / (2.0 * (1.0 - B.r) + 0.0001) : 1.0 - (1.0 - A.r) / (2.0 * B.r + 0.0001);
      float g = B.g < 0.5 ? A.g / (2.0 * (1.0 - B.g) + 0.0001) : 1.0 - (1.0 - A.g) / (2.0 * B.g + 0.0001);
      float b = B.b < 0.5 ? A.b / (2.0 * (1.0 - B.b) + 0.0001) : 1.0 - (1.0 - A.b) / (2.0 * B.b + 0.0001);
      return clamp(vec3(r, g, b), 0.0, 1.0);
    } else if (mode == 13.0) return abs(A - B);
    else if (mode == 14.0) return A + B - 2.0 * A * B;
    else if (mode == 15.0) return max(A - B, vec3(0.0));
    else if (mode == 16.0) return clamp(A / (B + 0.0001), 0.0, 1.0);
    else {
      vec3 hslA = rgb2hsl(A); vec3 hslB = rgb2hsl(B);
      if (mode == 17.0) return hsl2rgb(vec3(hslA.x, hslB.y, hslB.z));
      else if (mode == 18.0) return hsl2rgb(vec3(hslB.x, hslA.y, hslB.z));
      else if (mode == 19.0) return hsl2rgb(vec3(hslA.x, hslA.y, hslB.z));
      else if (mode == 20.0) return hsl2rgb(vec3(hslB.x, hslB.y, hslA.z));
    }
    return A;
  }

  vec3 applyBlend(vec3 A, vec3 B, float mode) {
    if (mode >= 11.0) return applyBlendHigh(A, B, mode);
    if (mode == 1.0) return min(A, B);
    else if (mode == 2.0) return A * B;
    else if (mode == 3.0) return 1.0 - clamp((1.0 - A) / (B + 0.0001), 0.0, 1.0);
    else if (mode == 4.0) return clamp(A + B - 1.0, 0.0, 1.0);
    else if (mode == 5.0) return max(A, B);
    else if (mode == 6.0) return 1.0 - (1.0 - A) * (1.0 - B);
    else if (mode == 7.0) return clamp(A / (1.0 - B + 0.0001), 0.0, 1.0);
    else if (mode == 8.0) return clamp(A + B, 0.0, 1.0);
    else if (mode == 9.0) {
      float r = B.r < 0.5 ? 2.0 * A.r * B.r : 1.0 - 2.0 * (1.0 - A.r) * (1.0 - B.r);
      float g = B.g < 0.5 ? 2.0 * A.g * B.g : 1.0 - 2.0 * (1.0 - A.g) * (1.0 - B.g);
      float b = B.b < 0.5 ? 2.0 * A.b * B.b : 1.0 - 2.0 * (1.0 - A.b) * (1.0 - B.b);
      return vec3(r, g, b);
    } else if (mode == 10.0) return (1.0 - 2.0 * B) * A * A + 2.0 * B * A;
    return A;
  }
`

const SKSL_PART2 = `
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
    rgb = rgb * pow(2.0, exposure);
    rgb = rgb + brightness;
    rgb = (rgb - 0.5) * (contrast + 1.0) + 0.5;
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    float hiWeight = clamp((luma - 0.4) / 0.6, 0.0, 1.0);
    float shWeight = clamp((0.6 - luma) / 0.6, 0.0, 1.0);
    if (highlights >= 0.0) rgb += highlights * hiWeight * (1.0 - rgb);
    else rgb += highlights * hiWeight * rgb;
    if (shadows >= 0.0) rgb += shadows * shWeight * (1.0 - rgb);
    else rgb += shadows * shWeight * rgb;
    float whiteWeight = pow(clamp(luma, 0.0, 1.0), 2.0);
    if (whites >= 0.0) rgb += whites * whiteWeight * (1.0 - rgb);
    else rgb += whites * whiteWeight * rgb;
    float blackWeight = pow(clamp(1.0 - luma, 0.0, 1.0), 2.0);
    if (blacks >= 0.0) rgb += blacks * blackWeight * (1.0 - rgb);
    else rgb += blacks * blackWeight * rgb;
    rgb = clamp(rgb, 0.0, 1.0);
    rgb = pow(rgb, vec3(1.0 / (gamma + 1.0)));
    rgb.r += temperature * 0.15; rgb.b -= temperature * 0.15;
    rgb.g += tint * 0.15; rgb.r -= tint * 0.075; rgb.b -= tint * 0.075;
    if (hue != 0.0) rgb = hueRotate(rgb, hue * 3.14159265);
    float lumaCorr = dot(rgb, vec3(0.299, 0.587, 0.114));
    if (saturation != 0.0) rgb = mix(vec3(lumaCorr), rgb, 1.0 + saturation);
    if (vibrance != 0.0) {
      float maxVal = max(rgb.r, max(rgb.g, rgb.b));
      float minVal = min(rgb.r, min(rgb.g, rgb.b));
      float satVal = (maxVal - minVal) / (maxVal + 0.0001);
      rgb = mix(vec3(lumaCorr), rgb, 1.0 + vibrance * (1.0 - satVal));
    }
    rgb = clamp(rgb, 0.0, 1.0);
    if (cyan != 0.0 || magenta != 0.0 || yellow != 0.0 || key != 0.0) {
      float kVal = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
      float cVal = kVal < 1.0 ? (1.0 - rgb.r - kVal) / (1.0 - kVal) : 0.0;
      float mVal = kVal < 1.0 ? (1.0 - rgb.g - kVal) / (1.0 - kVal) : 0.0;
      float yVal = kVal < 1.0 ? (1.0 - rgb.b - kVal) / (1.0 - kVal) : 0.0;
      cVal = clamp(cVal + cyan, 0.0, 1.0);
      mVal = clamp(mVal + magenta, 0.0, 1.0);
      yVal = clamp(yVal + yellow, 0.0, 1.0);
      kVal = clamp(kVal + key, 0.0, 1.0);
      rgb.r = (1.0 - cVal) * (1.0 - kVal);
      rgb.g = (1.0 - mVal) * (1.0 - kVal);
      rgb.b = (1.0 - yVal) * (1.0 - kVal);
    }
    rgb.r = evaluateSpline(rgb.r, r_points);
    rgb.g = evaluateSpline(rgb.g, g_points);
    rgb.b = evaluateSpline(rgb.b, b_points);
    if (blend_enabled == 1.0) {
      vec3 blended = applyBlend(rgb, blend_color, blend_mode);
      rgb = mix(rgb, blended, blend_opacity);
    }
    float alphaVal = color.a;
    if (bg_enabled == 1.0) alphaVal = alphaVal * getDilatedMask(coords);
    if (luma_threshold_enabled == 1.0) {
      float pixelLuma = dot(rgb, vec3(0.299, 0.587, 0.114));
      alphaVal = alphaVal * smoothstep(luma_threshold - luma_tolerance, luma_threshold + luma_tolerance, pixelLuma);
    }
    rgb = clamp(rgb, 0.0, 1.0);
    return vec4(rgb * alphaVal, alphaVal);
  }
`

export const IMAGE_FILTERS_SHADER = SKSL_PART1 + SKSL_PART2
