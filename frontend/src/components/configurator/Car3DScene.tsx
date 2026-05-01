"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

type WheelPreset = "17-silver" | "18-black" | "19-performance";
type InteriorTone = "black" | "beige" | "red";

type Props = {
  paintColor: string;
  wheelPreset: WheelPreset;
  interiorTone: InteriorTone;
  headlightsOn: boolean;
  panorama: boolean;
  assistPack: boolean;
  brandName: string;
  modelName: string;
  bodyType: string;
};

type LoadedModelProps = Props & {
  path: string;
  onTargetChange: (value: number) => void;
};

type ModelFitPreset = {
  targetSize: number;
  scaleMultiplier?: number;
  rotationY?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  targetYOffset?: number;
};

function normalizeBrand(brandName: string) {
  const value = brandName.toLowerCase();

  if (value.includes("bmw")) return "bmw";
  if (value.includes("audi")) return "audi";
  if (value.includes("mercedes")) return "mercedes";
  if (value.includes("toyota")) return "toyota";

  return "generic";
}

function normalizeModel(modelName: string) {
  return modelName.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeBody(bodyType: string) {
  const value = bodyType.toLowerCase();

  if (value.includes("suv")) return "suv";
  if (value.includes("touring")) return "wagon";
  if (value.includes("wagon")) return "wagon";
  if (value.includes("avant")) return "wagon";
  if (value.includes("hatch")) return "hatchback";

  return "sedan";
}

function getModelPath(brandName: string, modelName: string, bodyType: string) {
  const brand = normalizeBrand(brandName);
  const model = normalizeModel(modelName);
  const body = normalizeBody(bodyType);

  if (brand === "bmw") {
    if (model.includes("x5")) return "/models/cars/bmw-x5-suv.glb";
    if (model.includes("3")) {
      if (body === "wagon") return "/models/cars/bmw-3series-touring.glb";
      if (body === "hatchback") return "/models/cars/bmw-3series-hatchback.glb";
      return "/models/cars/bmw-3series-sedan.glb";
    }
    return "/models/cars/bmw-3series-sedan.glb";
  }

  if (brand === "audi") {
    if (body === "wagon") return "/models/cars/audi-a4-avant.glb";
    return "/models/cars/audi-a4-sedan.glb";
  }

  if (brand === "mercedes") {
    if (body === "wagon") return "/models/cars/mercedes-cclass-wagon.glb";
    return "/models/cars/mercedes-cclass-sedan.glb";
  }

  if (brand === "toyota") {
    return "/models/cars/toyota-camry-sedan.glb";
  }

  return "/models/cars/toyota-camry-sedan.glb";
}

function getFitPreset(path: string): ModelFitPreset {
  if (path.includes("bmw-x5-suv")) {
    return {
      targetSize: 4.9,
      scaleMultiplier: 1.08,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.06,
    };
  }

  if (path.includes("bmw-3series-sedan")) {
    return {
      targetSize: 4.45,
      scaleMultiplier: 1.22,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("bmw-3series-hatchback")) {
    return {
      targetSize: 4.3,
      scaleMultiplier: 1.18,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("bmw-3series-touring")) {
    return {
      targetSize: 4.55,
      scaleMultiplier: 1.18,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("audi-a4-sedan")) {
    return {
      targetSize: 4.35,
      scaleMultiplier: 1.22,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("audi-a4-avant")) {
    return {
      targetSize: 4.5,
      scaleMultiplier: 1.18,
      rotationY: 0,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("mercedes-cclass-sedan")) {
    return {
      targetSize: 4.4,
      scaleMultiplier: 1.08,
      rotationY: 0,
      offsetX: -0.04,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("mercedes-cclass-wagon")) {
    return {
      targetSize: 4.55,
      scaleMultiplier: 1.08,
      rotationY: 0,
      offsetX: -0.05,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  if (path.includes("toyota-camry-sedan")) {
    return {
      targetSize: 4.6,
      scaleMultiplier: 1.02,
      rotationY: 0,
      offsetX: -0.02,
      offsetY: 0.02,
      targetYOffset: 0.04,
    };
  }

  return {
    targetSize: 4.4,
    scaleMultiplier: 1,
    rotationY: 0,
    offsetY: 0.02,
    targetYOffset: 0.04,
  };
}

function getInteriorColor(tone: InteriorTone) {
  if (tone === "beige") return "#b69b7a";
  if (tone === "red") return "#7f2336";
  return "#171a1f";
}

function cloneMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    return material.map((item) => item.clone());
  }
  return material.clone();
}

function tuneMaterials(
  scene: THREE.Object3D,
  paintColor: string,
  interiorTone: InteriorTone,
  headlightsOn: boolean
) {
  const interiorColor = new THREE.Color(getInteriorColor(interiorTone));

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = true;
    object.receiveShadow = true;

    const name = object.name.toLowerCase();
    object.material = cloneMaterial(object.material);

    if (Array.isArray(object.material)) return;

    if (name.includes("glass") || name.includes("window") || name.includes("wind")) {
      object.material = new THREE.MeshPhysicalMaterial({
        color: "#9ec9d7",
        transparent: true,
        opacity: 0.34,
        roughness: 0.08,
        transmission: 0.45,
      });
      return;
    }

    if (
      name.includes("tire") ||
      name.includes("tyre") ||
      name.includes("rubber")
    ) {
      object.material = new THREE.MeshStandardMaterial({
        color: "#0f1114",
        metalness: 0.08,
        roughness: 0.9,
      });
      return;
    }

    if (
      name.includes("wheel") ||
      name.includes("rim") ||
      name.includes("disc")
    ) {
      object.material = new THREE.MeshStandardMaterial({
        color: "#b8c2cc",
        metalness: 1,
        roughness: 0.18,
      });
      return;
    }

    if (
      name.includes("seat") ||
      name.includes("interior") ||
      name.includes("cabin") ||
      name.includes("dashboard")
    ) {
      object.material = new THREE.MeshStandardMaterial({
        color: interiorColor,
        metalness: 0.1,
        roughness: 0.86,
      });
      return;
    }

    if (
      name.includes("light") ||
      name.includes("lamp") ||
      name.includes("head")
    ) {
      object.material = new THREE.MeshStandardMaterial({
        color: headlightsOn ? "#e7fbff" : "#9fb1be",
        emissive: headlightsOn ? new THREE.Color("#bff6ff") : new THREE.Color("#000000"),
        emissiveIntensity: headlightsOn ? 2.2 : 0,
        roughness: 0.16,
        metalness: 0.14,
      });
      return;
    }

    if (
      name.includes("body") ||
      name.includes("paint") ||
      name.includes("door") ||
      name.includes("hood") ||
      name.includes("bonnet") ||
      name.includes("roof") ||
      name.includes("bumper") ||
      name.includes("fender") ||
      name.includes("trunk") ||
      name.includes("car")
    ) {
      object.material = new THREE.MeshPhysicalMaterial({
        color: paintColor,
        metalness: 0.56,
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
      });
    }
  });
}

function LoadedCarModel({
  path,
  paintColor,
  interiorTone,
  headlightsOn,
  onTargetChange,
}: LoadedModelProps) {
  const gltf = useGLTF(path);
  const modelRef = useRef<THREE.Group | null>(null);

  const prepared = useMemo(() => {
    const root = gltf.scene.clone(true);
    const preset = getFitPreset(path);

    tuneMaterials(root, paintColor, interiorTone, headlightsOn);

    root.rotation.set(0, preset.rotationY ?? 0, 0);
    root.updateMatrixWorld(true);

    const initialBox = new THREE.Box3().setFromObject(root);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxDimension =
      Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;

    const scale =
      (preset.targetSize / maxDimension) * (preset.scaleMultiplier ?? 1);

    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    const fittedBox = new THREE.Box3().setFromObject(root);
    const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
    const fittedSize = fittedBox.getSize(new THREE.Vector3());

    root.position.set(
      -fittedCenter.x + (preset.offsetX ?? 0),
      -fittedBox.min.y + (preset.offsetY ?? 0),
      -fittedCenter.z + (preset.offsetZ ?? 0)
    );

    root.updateMatrixWorld(true);

    return {
      scene: root,
      targetY: Math.max(0.7, fittedSize.y * 0.38 + (preset.targetYOffset ?? 0)),
    };
  }, [gltf.scene, path, paintColor, interiorTone, headlightsOn]);

  useEffect(() => {
    onTargetChange(prepared.targetY);
  }, [prepared.targetY, onTargetChange]);

  return <primitive ref={modelRef} object={prepared.scene} />;
}

function FallbackCar({
  paintColor,
  onTargetChange,
}: {
  paintColor: string;
  onTargetChange: (value: number) => void;
}) {
  useEffect(() => {
    onTargetChange(0.95);
  }, [onTargetChange]);

  return (
    <group rotation={[0, -0.52, 0]} position={[0, 0.02, 0]}>
      <RoundedBox
        args={[4.25, 0.82, 1.84]}
        radius={0.22}
        smoothness={5}
        position={[0, 0.72, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.56}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.18}
        />
      </RoundedBox>

      <RoundedBox
        args={[2.02, 0.56, 1.24]}
        radius={0.16}
        smoothness={5}
        position={[0.28, 1.04, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#9ec9d7"
          transparent
          opacity={0.34}
          roughness={0.08}
          transmission={0.45}
        />
      </RoundedBox>
    </group>
  );
}

function SceneContent(props: Props) {
  const controlsRef = useRef<any>(null);
  const [targetY, setTargetY] = useState(0.95);

  const path = useMemo(
    () => getModelPath(props.brandName, props.modelName, props.bodyType),
    [props.brandName, props.modelName, props.bodyType]
  );

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(0, targetY, 0);
    controlsRef.current.update();
  }, [targetY]);

  return (
    <>
      <color attach="background" args={["#041017"]} />
      <fog attach="fog" args={["#041017", 8, 18]} />

      <hemisphereLight intensity={0.95} color="#dff7ff" groundColor="#081018" />
      <directionalLight
        position={[7, 9, 5]}
        intensity={2.6}
        color="#eef8ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.75} color="#77ddff" />
      <spotLight
        position={[0, 8, 1]}
        intensity={0.48}
        angle={0.42}
        penumbra={0.5}
        color="#dffcff"
      />

      <PerspectiveCamera makeDefault position={[6.15, 2.28, 5.7]} fov={33} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={4.6}
        maxDistance={9.2}
        minPolarAngle={0.82}
        maxPolarAngle={1.42}
      />

      <Suspense fallback={<FallbackCar paintColor={props.paintColor} onTargetChange={setTargetY} />}>
        <LoadedCarModel {...props} path={path} onTargetChange={setTargetY} />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#07141c" />
      </mesh>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.58}
        scale={12}
        blur={2.4}
        far={4.2}
        color="#0ff2ea"
      />
    </>
  );
}

export function Car3DScene(props: Props) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/cars/audi-a4-avant.glb");
useGLTF.preload("/models/cars/audi-a4-sedan.glb");
useGLTF.preload("/models/cars/bmw-3series-hatchback.glb");
useGLTF.preload("/models/cars/bmw-3series-sedan.glb");
useGLTF.preload("/models/cars/bmw-3series-touring.glb");
useGLTF.preload("/models/cars/bmw-x5-suv.glb");
useGLTF.preload("/models/cars/mercedes-cclass-sedan.glb");
useGLTF.preload("/models/cars/mercedes-cclass-wagon.glb");
useGLTF.preload("/models/cars/toyota-camry-sedan.glb");