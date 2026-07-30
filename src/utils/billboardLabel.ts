import * as THREE from "three";

const FONT = "600 28px Inter, system-ui, sans-serif";
const PADDING_X = 18;
const PADDING_Y = 12;
const DOT_RADIUS = 6;
const DOT_GAP = 10;
const RADIUS = 10;

export const LABEL_PIXEL_HEIGHT = 26;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.quadraticCurveTo(w, 0, w, radius);
  ctx.lineTo(w, h - radius);
  ctx.quadraticCurveTo(w, h, w - radius, h);
  ctx.lineTo(radius, h);
  ctx.quadraticCurveTo(0, h, 0, h - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
}

export function createBillboardLabel(text: string, color: string): THREE.Sprite {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = FONT;
  const textWidth = measureCtx.measureText(text).width;

  const width = PADDING_X * 2 + DOT_RADIUS * 2 + DOT_GAP + textWidth;
  const height = PADDING_Y * 2 + 28;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "rgba(15, 15, 20, 0.82)";
  ctx.strokeStyle = "#3a3a5a";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, width, height, RADIUS);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(PADDING_X + DOT_RADIUS, height / 2, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = FONT;
  ctx.fillStyle = "#e2e8f0";
  ctx.textBaseline = "middle";
  ctx.fillText(text, PADDING_X + DOT_RADIUS * 2 + DOT_GAP, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 2;
  sprite.userData.aspect = width / height;
  return sprite;
}

export function updateBillboardScale(
  sprite: THREE.Sprite,
  fovDeg: number,
  canvasHeight: number,
  pixelHeight = LABEL_PIXEL_HEIGHT,
): void {
  if (canvasHeight <= 0) return;
  const aspect = (sprite.userData.aspect as number) ?? 1;
  const k = 2 * Math.tan((fovDeg * Math.PI) / 360) * (pixelHeight / canvasHeight);
  sprite.scale.set(k * aspect, k, 1);
}
