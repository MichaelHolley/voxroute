import { onUnmounted, type Ref } from "vue";
import type { OrbitState } from "./useThreeScene.ts";

export function useOrbitControls(orbitState: OrbitState) {
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };
  let lastTouchDist = 0;
  let canvas: HTMLCanvasElement | null = null;
  let enabled = true;

  function touchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onMouseDown(e: MouseEvent): void {
    if (!enabled) return;
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function onMouseMove(e: MouseEvent): void {
    if (!isDragging || !enabled) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    orbitState.theta.value -= dx * 0.005;
    orbitState.phi.value = Math.max(
      0.05,
      Math.min(Math.PI / 2 - 0.01, orbitState.phi.value + dy * 0.005),
    );
    orbitState.update();
  }

  function onMouseUp(): void {
    isDragging = false;
  }

  function onWheel(e: WheelEvent): void {
    if (!enabled) return;
    e.preventDefault();
    orbitState.radius.value = Math.max(
      15,
      Math.min(350, orbitState.radius.value + e.deltaY * 0.12),
    );
    orbitState.update();
  }

  function onTouchStart(e: TouchEvent): void {
    if (!enabled) return;
    if (e.touches.length === 1) {
      isDragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging = false;
      lastTouchDist = touchDist(e.touches);
    }
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!enabled) return;
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastMouse.x;
      const dy = e.touches[0].clientY - lastMouse.y;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      orbitState.theta.value -= dx * 0.005;
      orbitState.phi.value = Math.max(
        0.05,
        Math.min(Math.PI / 2 - 0.01, orbitState.phi.value + dy * 0.005),
      );
      orbitState.update();
    } else if (e.touches.length === 2) {
      const dist = touchDist(e.touches);
      const delta = lastTouchDist - dist;
      lastTouchDist = dist;
      orbitState.radius.value = Math.max(15, Math.min(350, orbitState.radius.value + delta * 0.4));
      orbitState.update();
    }
  }

  function onTouchEnd(): void {
    isDragging = false;
  }

  function attachTo(canvasRef: Ref<HTMLCanvasElement | null>): void {
    canvas = canvasRef.value;
    if (!canvas) return;
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
  }

  function detach(): void {
    if (!canvas) return;
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas = null;
  }

  function setEnabled(val: boolean): void {
    enabled = val;
    if (!val) isDragging = false;
  }

  onUnmounted(detach);

  return { attachTo, detach, setEnabled };
}
