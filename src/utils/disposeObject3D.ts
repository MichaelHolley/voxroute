import type * as THREE from "three";

type DisposableObj = {
  geometry?: { dispose(): void };
  material?: THREE.Material | THREE.Material[];
};

function disposeMaterial(material: THREE.Material): void {
  const map = (material as THREE.Material & { map?: THREE.Texture | null }).map;
  map?.dispose();
  material.dispose();
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const d = obj as unknown as DisposableObj;
    d.geometry?.dispose();
    if (d.material) {
      if (Array.isArray(d.material)) d.material.forEach(disposeMaterial);
      else disposeMaterial(d.material);
    }
  });
}
