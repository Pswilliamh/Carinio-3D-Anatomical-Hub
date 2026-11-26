import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Box,
} from 'lucide-react';
import { GeneratedMeshData } from '../services/volumeGenerator';
import { Language } from '../i18n/translations';

export type VolumeShaderPreset = 'clinical_bone' | 'glass_nerve' | 'vascular_amber' | 'cyan_mask';

export interface ToothDescriptor {
  id: string;
  fdiNumber: string;
  arch: 'upper' | 'lower';
  kind: 'molar' | 'premolar' | 'canine' | 'incisor';
  nameEn: string;
  nameId: string;
  visible: boolean;
  status: 'natural' | 'scatter_crown' | 'replaced' | 'hidden';
  position: [number, number, number];
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  tiltDeg: number;
  rotYDeg: number;
  scale: number;
}

export interface BiteAlignmentParams {
  jawOpeningMm: number;
  mandibularShiftX: number;
  protrusionZ: number;
  showOcclusalPlane: boolean;
}

export const DEFAULT_BITE_PARAMS: BiteAlignmentParams = {
  jawOpeningMm: 0.0,
  mandibularShiftX: 0.0,
  protrusionZ: 0.0,
  showOcclusalPlane: false,
};

function makeTooth(
  id: string,
  fdiNumber: string,
  arch: 'upper' | 'lower',
  kind: ToothDescriptor['kind'],
  nameEn: string,
  nameId: string,
  position: [number, number, number],
  status: ToothDescriptor['status'] = 'natural',
): ToothDescriptor {
  return {
    id,
    fdiNumber,
    arch,
    kind,
    nameEn,
    nameId,
    visible: true,
    status,
    position,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    tiltDeg: 0,
    rotYDeg: 0,
    scale: 1,
  };
}

// Complete 28-Tooth Anatomical Human Dentition (Class I Intercuspation + Curve of Spee)
export const INITIAL_TEETH_SET: ToothDescriptor[] = [
  // Upper Arch (Maxillofacial — 14 Teeth: #17 to #27)
  makeTooth('t_17', '#17', 'upper', 'molar', 'Upper R 2nd Molar', 'Molar 2 Atas Kanan', [-3.32, -1.62, 1.42]),
  makeTooth('t_16', '#16', 'upper', 'molar', 'Upper R 1st Molar', 'Molar 1 Atas Kanan', [-3.12, -1.68, 2.34]),
  makeTooth('t_15', '#15', 'upper', 'premolar', 'Upper R 2nd Premolar', 'Premolar 2 Atas Kanan', [-2.82, -1.72, 3.16]),
  makeTooth('t_14', '#14', 'upper', 'premolar', 'Upper R 1st Premolar', 'Premolar 1 Atas Kanan', [-2.46, -1.73, 3.84]),
  makeTooth('t_13', '#13', 'upper', 'canine', 'Upper R Canine', 'Kaninus Atas Kanan', [-1.96, -1.74, 4.42]),
  makeTooth('t_12', '#12', 'upper', 'incisor', 'Upper R Lateral Incisor', 'Insisivus Lateral Atas Kanan', [-1.24, -1.7, 4.86]),
  makeTooth('t_11', '#11', 'upper', 'incisor', 'Upper R Central Incisor', 'Insisivus Sentral Atas Kanan', [-0.46, -1.74, 5.08]),
  makeTooth('t_21', '#21', 'upper', 'incisor', 'Upper L Central Incisor', 'Insisivus Sentral Atas Kiri', [0.46, -1.74, 5.08]),
  makeTooth('t_22', '#22', 'upper', 'incisor', 'Upper L Lateral Incisor', 'Insisivus Lateral Atas Kiri', [1.24, -1.7, 4.86]),
  makeTooth('t_23', '#23', 'upper', 'canine', 'Upper L Canine', 'Kaninus Atas Kiri', [1.96, -1.74, 4.42]),
  makeTooth('t_24', '#24', 'upper', 'premolar', 'Upper L 1st Premolar', 'Premolar 1 Atas Kiri', [2.46, -1.73, 3.84]),
  makeTooth('t_25', '#25', 'upper', 'premolar', 'Upper L 2nd Premolar', 'Premolar 2 Atas Kiri', [2.82, -1.72, 3.16]),
  makeTooth('t_26', '#26', 'upper', 'molar', 'Upper L 1st Molar (Metal Crown)', 'Molar 1 Atas Kiri (Mahkota Logam)', [3.12, -1.68, 2.34], 'scatter_crown'),
  makeTooth('t_27', '#27', 'upper', 'molar', 'Upper L 2nd Molar', 'Molar 2 Atas Kiri', [3.32, -1.62, 1.42]),

  // Lower Arch (Mandibular — 14 Teeth: #47 to #37, tucked slightly lingual/inferior for Class I Bite)
  makeTooth('t_47', '#47', 'lower', 'molar', 'Lower R 2nd Molar', 'Molar 2 Bawah Kanan', [-3.12, -2.56, 1.32]),
  makeTooth('t_46', '#46', 'lower', 'molar', 'Lower R 1st Molar (Metal Crown)', 'Molar 1 Bawah Kanan (Mahkota Logam)', [-2.92, -2.62, 2.24], 'scatter_crown'),
  makeTooth('t_45', '#45', 'lower', 'premolar', 'Lower R 2nd Premolar', 'Premolar 2 Bawah Kanan', [-2.62, -2.64, 3.04]),
  makeTooth('t_44', '#44', 'lower', 'premolar', 'Lower R 1st Premolar', 'Premolar 1 Bawah Kanan', [-2.26, -2.64, 3.68]),
  makeTooth('t_43', '#43', 'lower', 'canine', 'Lower R Canine', 'Kaninus Bawah Kanan', [-1.74, -2.62, 4.24]),
  makeTooth('t_42', '#42', 'lower', 'incisor', 'Lower R Lateral Incisor', 'Insisivus Lateral Bawah Kanan', [-1.06, -2.58, 4.62]),
  makeTooth('t_41', '#41', 'lower', 'incisor', 'Lower R Central Incisor', 'Insisivus Sentral Bawah Kanan', [-0.38, -2.58, 4.78]),
  makeTooth('t_31', '#31', 'lower', 'incisor', 'Lower L Central Incisor', 'Insisivus Sentral Bawah Kiri', [0.38, -2.58, 4.78]),
  makeTooth('t_32', '#32', 'lower', 'incisor', 'Lower L Lateral Incisor', 'Insisivus Lateral Bawah Kiri', [1.06, -2.58, 4.62]),
  makeTooth('t_33', '#33', 'lower', 'canine', 'Lower L Canine', 'Kaninus Bawah Kiri', [1.74, -2.62, 4.24]),
  makeTooth('t_34', '#34', 'lower', 'premolar', 'Lower L 1st Premolar', 'Premolar 1 Bawah Kiri', [2.26, -2.64, 3.68]),
  makeTooth('t_35', '#35', 'lower', 'premolar', 'Lower L 2nd Premolar', 'Premolar 2 Bawah Kiri', [2.62, -2.64, 3.04]),
  makeTooth('t_36', '#36', 'lower', 'molar', 'Lower L 1st Molar', 'Molar 1 Bawah Kiri', [2.92, -2.62, 2.24]),
  makeTooth('t_37', '#37', 'lower', 'molar', 'Lower L 2nd Molar', 'Molar 2 Bawah Kiri', [3.12, -2.56, 1.32]),
];

interface ThreeViewportProps {
  language: Language;
  meshData: GeneratedMeshData;
  referenceMeshData: GeneratedMeshData;
  meshOpacity: number;
  wireframe: boolean;
  compareMode: boolean;
  nerveOpacity: number;
  teeth: ToothDescriptor[];
  selectedToothId?: string | null;
  biteParams?: BiteAlignmentParams;
  highlightReplacedCyan?: boolean;
  showTitaniumImplant: boolean;
  showLaserScanner: boolean;
  slices: [number, number, number];
  volumeDims?: [number, number, number];
  dicomSeriesLabel?: string | null;
  xyzOffsetMm: [number, number, number];
  colorByLayers?: boolean;
  onToggleColorByLayers?: (enabled: boolean) => void;
  onToggleTooth: (toothId: string) => void;
  onChangeXyzOffset: (newOffset: [number, number, number]) => void;
}

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  language,
  meshData,
  referenceMeshData,
  meshOpacity,
  wireframe,
  compareMode,
  nerveOpacity,
  teeth,
  selectedToothId = null,
  biteParams = DEFAULT_BITE_PARAMS,
  highlightReplacedCyan = true,
  showTitaniumImplant,
  showLaserScanner,
  slices,
  volumeDims = [40, 40, 40],
  dicomSeriesLabel = null,
  xyzOffsetMm,
  colorByLayers = false,
  onToggleColorByLayers,
  onToggleTooth,
  onChangeXyzOffset,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [shaderPreset, setShaderPreset] = useState<VolumeShaderPreset>(
    colorByLayers ? 'cyan_mask' : 'clinical_bone',
  );

  useEffect(() => {
    if (colorByLayers) {
      setShaderPreset('cyan_mask');
    } else if (shaderPreset === 'cyan_mask') {
      setShaderPreset('clinical_bone');
    }
  }, [colorByLayers]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mainMeshRef = useRef<THREE.Mesh | null>(null);
  const refWireMeshRef = useRef<THREE.Mesh | null>(null);
  const nerveGroupRef = useRef<THREE.Group | null>(null);
  const teethMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const toothMaterialsRef = useRef<{
    naturalEnamel: THREE.MeshPhysicalMaterial;
    scatterCrown: THREE.MeshPhysicalMaterial;
    virtualCyanEnamel: THREE.MeshPhysicalMaterial;
    selectedEnamel: THREE.MeshPhysicalMaterial;
  } | null>(null);
  const occlusalPlaneRef = useRef<THREE.Mesh | null>(null);
  const implantGroupRef = useRef<THREE.Group | null>(null);
  const laserGroupRef = useRef<THREE.Group | null>(null);
  const slicePlanesGroupRef = useRef<THREE.Group | null>(null);
  const anatomyRootRef = useRef<THREE.Group | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const onToggleToothRef = useRef(onToggleTooth);
  onToggleToothRef.current = onToggleTooth;

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    // Pitch-black clinical DICOM 3D Volume Rendering backdrop (matches iMed / 3D Slicer reference screenshots)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050a);
    scene.fog = new THREE.FogExp2(0x02050a, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
    camera.position.set(16, 6, 19);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Clinical Volume-Rendering 3-Point Warm Ivory / Cool Rim Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff1e0, 0x1a120b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8eb, 2.2);
    keyLight.position.set(16, 22, 24);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd97706, 0.65);
    fillLight.position.set(-18, -10, 12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef3c7, 1.15);
    rimLight.position.set(-14, 16, -20);
    scene.add(rimLight);

    // Discreet XYZ Coordinate Axes Gizmo in Bottom Corner
    const axesHelper = new THREE.AxesHelper(4.5);
    axesHelper.position.set(-8.5, -8.5, -8.5);
    scene.add(axesHelper);

    const anatomyRoot = new THREE.Group();
    scene.add(anatomyRoot);
    anatomyRootRef.current = anatomyRoot;

    // 1. Primary Photorealistic CT Volume-Rendered Bone Surface Mesh
    const boneGeo = new THREE.BufferGeometry();
    const boneMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.34,
      metalness: 0.03,
      clearcoat: 0.32,
      clearcoatRoughness: 0.24,
      sheen: 0.45,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(0xfff0d4),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    });
    const mainMesh = new THREE.Mesh(boneGeo, boneMat);
    mainMesh.castShadow = !isSoftwareGl;
    mainMesh.receiveShadow = !isSoftwareGl;
    anatomyRoot.add(mainMesh);
    mainMeshRef.current = mainMesh;

    // 2. Expert Reference Master Wireframe Overlay Mesh
    const refGeo = new THREE.BufferGeometry();
    const refMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const refWireMesh = new THREE.Mesh(refGeo, refMat);
    refWireMesh.visible = false;
    anatomyRoot.add(refWireMesh);
    refWireMeshRef.current = refWireMesh;

    // 3. Inferior Alveolar / Mandibular Nerve Pathway Group (Left & Right Mandibular Canals)
    const nerveGroup = new THREE.Group();
    const nerveCurveLeft = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.3, -1.2, -1.8), // Mandibular Foramen entry
      new THREE.Vector3(-4.3, -2.8, -0.4),
      new THREE.Vector3(-3.9, -4.4, 1.4),
      new THREE.Vector3(-2.8, -4.8, 3.2), // Mental Foramen exit
    ]);
    const nerveCurveRight = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.3, -1.2, -1.8),
      new THREE.Vector3(4.3, -2.8, -0.4),
      new THREE.Vector3(3.9, -4.4, 1.4),
      new THREE.Vector3(2.8, -4.8, 3.2),
    ]);
    const nerveMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      emissive: 0xffa000,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
    });
    const nerveTubeL = new THREE.Mesh(
      new THREE.TubeGeometry(nerveCurveLeft, 32, 0.24, 12, false),
      nerveMat,
    );
    const nerveTubeR = new THREE.Mesh(
      new THREE.TubeGeometry(nerveCurveRight, 32, 0.24, 12, false),
      nerveMat,
    );
    const foramenNodeGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const exitNodeL = new THREE.Mesh(foramenNodeGeo, nerveMat);
    exitNodeL.position.set(-2.8, -4.8, 3.2);
    const exitNodeR = new THREE.Mesh(foramenNodeGeo, nerveMat);
    exitNodeR.position.set(2.8, -4.8, 3.2);

    nerveGroup.add(nerveTubeL, nerveTubeR, exitNodeL, exitNodeR);
    nerveGroup.renderOrder = 15;
    anatomyRoot.add(nerveGroup);
    nerveGroupRef.current = nerveGroup;

    // 4. Anatomically Sculpted 28 Upper & Lower Teeth Sets (Multi-Cusp Molars, Bicuspid Premolars, Pointed Canines, Chisel Incisors + Scatter Crowns & Virtual Replacement Shaders)
    const teethMap = new Map<string, THREE.Group>();
    const enamelMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbf8f1,
      roughness: 0.11,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 0.25,
      sheenColor: new THREE.Color(0xfff3d6),
      ior: 1.62,
    });
    const scatterCrownMat = new THREE.MeshPhysicalMaterial({
      color: 0xd946ef,
      emissive: 0x701a75,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.92,
      clearcoat: 0.85,
    });
    const virtualCyanEnamelMat = new THREE.MeshPhysicalMaterial({
      color: 0x38e8ff,
      emissive: 0x0088aa,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const selectedEnamelMat = new THREE.MeshPhysicalMaterial({
      color: 0xccf7ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.28,
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    toothMaterialsRef.current = {
      naturalEnamel: enamelMat,
      scatterCrown: scatterCrownMat,
      virtualCyanEnamel: virtualCyanEnamelMat,
      selectedEnamel: selectedEnamelMat,
    };

    const cervicalDentinMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6cda3,
      roughness: 0.26,
      metalness: 0.03,
      clearcoat: 0.45,
      clearcoatRoughness: 0.2,
    });
    const cementumRootMat = new THREE.MeshStandardMaterial({
      color: 0xcba976,
      roughness: 0.48,
      metalness: 0.04,
    });

    // Helper: Sculpt realistic anatomical tooth crown geometry with occlusal cusps & fissures
    const createAnatomicalCrownGeometry = (
      kind: 'molar' | 'premolar' | 'canine' | 'incisor',
      isUpper: boolean,
    ): THREE.BufferGeometry => {
      const signY = isUpper ? -1 : 1; // Occlusal biting surface direction
      if (kind === 'molar') {
        const geo = new THREE.SphereGeometry(0.41, 24, 20);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let vx = pos.getX(i);
          let vy = pos.getY(i);
          let vz = pos.getZ(i);

          const sqFactor = 1 + 0.14 * Math.cos(Math.atan2(vz, vx) * 4);
          vx *= 1.08 * sqFactor;
          vz *= 1.05 * sqFactor;

          const isOcclusalHalf = vy * signY > 0;
          if (isOcclusalHalf) {
            const cuspWave =
              Math.sin(vx * 6.8) * Math.sin(vz * 6.8) * 0.09 +
              Math.cos(vx * 3.8) * Math.cos(vz * 3.8) * 0.06;
            const centralFissure = Math.exp(-(vx * vx + vz * vz) * 14) * 0.13;
            vy += signY * (Math.abs(cuspWave) - centralFissure);
          } else {
            vx *= 0.85;
            vz *= 0.85;
          }
          pos.setXYZ(i, vx, vy * 0.85, vz);
        }
        geo.computeVertexNormals();
        return geo;
      }

      if (kind === 'premolar') {
        const geo = new THREE.SphereGeometry(0.33, 22, 18);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let vx = pos.getX(i);
          let vy = pos.getY(i);
          let vz = pos.getZ(i);

          vx *= 1.02;
          vz *= 0.92;
          if (vy * signY > 0) {
            const bicuspidCusp = Math.abs(Math.sin(vx * 7.5)) * 0.09;
            const groove = Math.exp(-vx * vx * 22) * 0.1;
            vy += signY * (bicuspidCusp - groove);
          } else {
            vx *= 0.84;
            vz *= 0.84;
          }
          pos.setXYZ(i, vx, vy * 0.9, vz);
        }
        geo.computeVertexNormals();
        return geo;
      }

      if (kind === 'canine') {
        const geo = new THREE.SphereGeometry(0.32, 22, 18);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let vx = pos.getX(i) * 0.94;
          let vy = pos.getY(i) * 1.16;
          let vz = pos.getZ(i) * 0.84;
          if (vy * signY > 0) {
            const tipPeak = Math.exp(-(vx * vx + vz * vz) * 14) * 0.16;
            vy += signY * tipPeak;
          }
          pos.setXYZ(i, vx, vy, vz);
        }
        geo.computeVertexNormals();
        return geo;
      }

      // Incisor: Labial convex shield, lingual palatal concavity, and sharp incisal biting edge
      const geo = new THREE.SphereGeometry(0.31, 22, 18);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let vx = pos.getX(i) * 1.12;
        let vy = pos.getY(i) * 1.12;
        let vz = pos.getZ(i);

        const occProgress = Math.max(0, (vy * signY + 0.31) / 0.62);
        vz *= 0.7 * (1 - occProgress * 0.56);
        if (vz < 0) {
          vz += Math.exp(-(vx * vx) * 12) * 0.06;
        }
        pos.setXYZ(i, vx, vy, vz);
      }
      geo.computeVertexNormals();
      return geo;
    };

    const crownGeos = {
      upper: {
        molar: createAnatomicalCrownGeometry('molar', true),
        premolar: createAnatomicalCrownGeometry('premolar', true),
        canine: createAnatomicalCrownGeometry('canine', true),
        incisor: createAnatomicalCrownGeometry('incisor', true),
      },
      lower: {
        molar: createAnatomicalCrownGeometry('molar', false),
        premolar: createAnatomicalCrownGeometry('premolar', false),
        canine: createAnatomicalCrownGeometry('canine', false),
        incisor: createAnatomicalCrownGeometry('incisor', false),
      },
    };

    INITIAL_TEETH_SET.forEach((tooth) => {
      const tGroup = new THREE.Group();
      const baseArchYaw = Math.atan2(tooth.position[0], Math.max(0.4, tooth.position[2] + 0.9)) * 0.68;
      tGroup.position.set(tooth.position[0], tooth.position[1], tooth.position[2]);
      tGroup.rotation.y = baseArchYaw;
      tGroup.userData = { toothId: tooth.id, baseArchYaw };

      const isUpper = tooth.arch === 'upper';
      const crownGeo = crownGeos[tooth.arch][tooth.kind];

      const crownMesh = new THREE.Mesh(crownGeo, enamelMat);
      crownMesh.castShadow = !isSoftwareGl;
      crownMesh.receiveShadow = !isSoftwareGl;
      crownMesh.userData = { toothId: tooth.id, isCrown: true };
      crownMesh.layers.enable(1);
      tGroup.add(crownMesh);

      // Part 2: Cervical Enamel-Cementum Junction (CEJ) Neck Collar
      const rootSign = isUpper ? 1 : -1;
      const collarRadius =
        tooth.kind === 'molar' ? 0.33 : tooth.kind === 'premolar' ? 0.25 : 0.21;
      const collarGeo = new THREE.TorusGeometry(collarRadius, 0.05, 10, 20);
      collarGeo.rotateX(Math.PI / 2);
      const collarMesh = new THREE.Mesh(collarGeo, cervicalDentinMat);
      collarMesh.position.y = rootSign * 0.22;
      collarMesh.userData = { toothId: tooth.id };
      collarMesh.layers.enable(1);
      tGroup.add(collarMesh);

      // Part 3: Anatomically Bifurcated / Trifurcated Curved Roots
      if (tooth.kind === 'molar') {
        const rootOffsets: Array<[number, number]> = isUpper
          ? [
              [-0.14, 0.1],
              [0.14, 0.1],
              [0.0, -0.14],
            ]
          : [
              [-0.12, 0.12],
              [0.12, -0.12],
            ];
        rootOffsets.forEach(([rx, rz]) => {
          const rCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(rx * 0.5, rootSign * 0.22, rz * 0.5),
            new THREE.Vector3(rx * 1.12, rootSign * 0.62, rz * 1.08),
            new THREE.Vector3(rx * 0.92, rootSign * 1.02, rz * 1.2),
          ]);
          const rGeo = new THREE.TubeGeometry(rCurve, 12, 0.1, 10, false);
          const rMesh = new THREE.Mesh(rGeo, cementumRootMat);
          rMesh.userData = { toothId: tooth.id };
          rMesh.layers.enable(1);
          tGroup.add(rMesh);
        });
      } else {
        const rootLen = tooth.kind === 'canine' ? 1.24 : 1.02;
        const singleRootCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, rootSign * 0.2, 0),
          new THREE.Vector3(0, rootSign * (rootLen * 0.6), -0.05),
          new THREE.Vector3(0, rootSign * rootLen, -0.11),
        ]);
        const rGeo = new THREE.TubeGeometry(
          singleRootCurve,
          12,
          tooth.kind === 'premolar' ? 0.13 : 0.11,
          10,
          false,
        );
        const rMesh = new THREE.Mesh(rGeo, cementumRootMat);
        rMesh.userData = { toothId: tooth.id };
        rMesh.layers.enable(1);
        tGroup.add(rMesh);
      }

      anatomyRoot.add(tGroup);
      teethMap.set(tooth.id, tGroup);
    });
    teethMapRef.current = teethMap;

    // 4B. Translucent Cyan Occlusal Bite Alignment Reference Plane
    const occlusalGeo = new THREE.PlaneGeometry(8.8, 6.2);
    occlusalGeo.rotateX(-Math.PI / 2);
    const occlusalMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const occlusalPlane = new THREE.Mesh(occlusalGeo, occlusalMat);
    occlusalPlane.position.set(0, -2.14, 3.2);
    occlusalPlane.visible = false;
    anatomyRoot.add(occlusalPlane);
    occlusalPlaneRef.current = occlusalPlane;

    // 5. Realistic Custom Total TMJ Prosthetic System (12-Part Orthopaedic Device: UHMWPE Fossa + CoCrMo Condyle + Scalloped Ti-6Al-4V Ramus Plate + Countersunk Torx Screws)
    const implantGroup = new THREE.Group();

    // Material A: Mirror-Polished Cobalt-Chromium-Molybdenum (CoCrMo) Articular Condylar Head
    const coCrMoHeadMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      anisotropy: 0.75,
    });

    // Material B: Brushed Medical Grade 5 Titanium (Ti-6Al-4V) Mandibular Ramus Plate & Zygomatic Flange
    const brushedTiMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.24,
      anisotropy: 0.85,
      anisotropyRotation: Math.PI / 4,
      clearcoat: 0.35,
    });

    // Material C: Medical-Grade Ultra-High-Molecular-Weight Polyethylene (UHMWPE) Glenoid Fossa Articular Cup
    const uhmwpeFossaMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.02,
      roughness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      sheen: 0.3,
      sheenColor: new THREE.Color(0x38bdf8),
      transparent: true,
      opacity: 0.95,
    });

    // Material D: Gold-Anodized Ti-6Al-4V Self-Tapping Bicortical Bone Screws & Countersunk Bezels
    const anodizedScrewMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      metalness: 0.94,
      roughness: 0.18,
      clearcoat: 0.6,
    });
    const screwRecessMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.4,
    });

    // Component 1: Contoured UHMWPE Glenoid Fossa Articular Bearing Cup (Saddle Dome)
    const fossaDomeGeo = new THREE.SphereGeometry(
      1.15,
      28,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.58,
    );
    fossaDomeGeo.scale(1.18, 0.62, 1.05);
    const fossaDomeMesh = new THREE.Mesh(fossaDomeGeo, uhmwpeFossaMat);
    fossaDomeMesh.position.set(4.35, 1.35, -2.35);
    implantGroup.add(fossaDomeMesh);

    // Component 2: Curved Titanium Zygomatic Arch Fixation Flange (Beveled Extrude Profile)
    const zygomaShape = new THREE.Shape();
    zygomaShape.moveTo(-1.35, -0.22);
    zygomaShape.quadraticCurveTo(-0.45, 0.32, 0.55, 0.26);
    zygomaShape.quadraticCurveTo(1.25, 0.22, 1.45, -0.08);
    zygomaShape.quadraticCurveTo(0.45, -0.28, -1.35, -0.22);

    const zygomaFlangeGeo = new THREE.ExtrudeGeometry(zygomaShape, {
      steps: 2,
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
    });
    zygomaFlangeGeo.rotateY(Math.PI / 2);
    const zygomaFlangeMesh = new THREE.Mesh(zygomaFlangeGeo, brushedTiMat);
    zygomaFlangeMesh.position.set(4.78, 1.78, -2.35);
    implantGroup.add(zygomaFlangeMesh);

    // Component 3: 3 Zygomatic Arch Micro-Fixation Screws
    const zygomaScrewOffsets = [-0.85, -0.1, 0.68];
    zygomaScrewOffsets.forEach((zOff) => {
      const zScrewHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.11, 0.16, 16),
        anodizedScrewMat,
      );
      zScrewHead.rotation.z = Math.PI / 2;
      zScrewHead.position.set(4.94, 1.78, -2.35 + zOff);
      implantGroup.add(zScrewHead);
    });

    // Component 4: Mirror-Polished CoCrMo Ellipsoidal Condylar Bearing Head
    const condyleHeadGeo = new THREE.SphereGeometry(0.72, 32, 24);
    condyleHeadGeo.scale(0.88, 1.05, 0.95);
    const condyleHeadMesh = new THREE.Mesh(condyleHeadGeo, coCrMoHeadMat);
    condyleHeadMesh.position.set(4.35, 0.78, -2.35);
    condyleHeadMesh.castShadow = !isSoftwareGl;
    implantGroup.add(condyleHeadMesh);

    // Component 5: Swept Tapered Condylar Neck & Load-Transfer Collar (Lathe + Curved Tube)
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.35, 0.62, -2.35),
      new THREE.Vector3(4.52, 0.05, -2.22),
      new THREE.Vector3(4.65, -0.55, -1.98),
    ]);
    const neckTubeGeo = new THREE.TubeGeometry(neckCurve, 24, 0.34, 18, false);
    const neckMesh = new THREE.Mesh(neckTubeGeo, coCrMoHeadMat);
    implantGroup.add(neckMesh);

    const collarProfile = [
      new THREE.Vector2(0.0, -0.18),
      new THREE.Vector2(0.46, -0.16),
      new THREE.Vector2(0.52, 0.0),
      new THREE.Vector2(0.4, 0.18),
      new THREE.Vector2(0.0, 0.18),
    ];
    const collarLatheGeo = new THREE.LatheGeometry(collarProfile, 24);
    const neckCollarMesh = new THREE.Mesh(collarLatheGeo, brushedTiMat);
    neckCollarMesh.position.set(4.56, -0.15, -2.14);
    neckCollarMesh.rotation.x = 0.25;
    implantGroup.add(neckCollarMesh);

    // Component 6: Anatomically Scalloped Mandibular Ramus Reconstruction Plate (Beveled ExtrudeGeometry)
    // Contoured with rounded screw-bosses along the lateral mandibular ramus border
    const ramusPlateShape = new THREE.Shape();
    ramusPlateShape.moveTo(-0.42, 1.85);
    ramusPlateShape.bezierCurveTo(-0.68, 1.35, -0.58, 0.75, -0.45, 0.35);
    ramusPlateShape.bezierCurveTo(-0.72, -0.05, -0.62, -0.65, -0.45, -1.05);
    ramusPlateShape.bezierCurveTo(-0.7, -1.55, -0.52, -2.25, -0.08, -2.35);
    ramusPlateShape.bezierCurveTo(0.42, -2.35, 0.68, -1.75, 0.52, -1.15);
    ramusPlateShape.bezierCurveTo(0.68, -0.65, 0.62, -0.05, 0.48, 0.38);
    ramusPlateShape.bezierCurveTo(0.65, 0.95, 0.58, 1.65, 0.18, 1.92);
    ramusPlateShape.quadraticCurveTo(-0.15, 2.02, -0.42, 1.85);

    const ramusPlateGeo = new THREE.ExtrudeGeometry(ramusPlateShape, {
      steps: 2,
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 5,
    });
    ramusPlateGeo.rotateY(Math.PI / 2);
    const ramusPlateMesh = new THREE.Mesh(ramusPlateGeo, brushedTiMat);
    ramusPlateMesh.position.set(4.58, -2.15, -1.65);
    ramusPlateMesh.rotation.z = -0.06;
    ramusPlateMesh.rotation.x = 0.14;
    ramusPlateMesh.castShadow = !isSoftwareGl;
    implantGroup.add(ramusPlateMesh);

    // Component 7: 5 Recessed Countersunk Locking Bezels + Torx Gold-Anodized Bicortical Bone Screws
    // Positioned in an anatomical staggered 2-column locking pattern avoiding the Inferior Alveolar Nerve canal
    const ramusScrewCoords: Array<[number, number, number]> = [
      [4.76, -0.85, -1.82],
      [4.75, -1.55, -1.52],
      [4.74, -2.25, -1.86],
      [4.73, -2.95, -1.48],
      [4.71, -3.68, -1.72],
    ];

    const bezelRingGeo = new THREE.TorusGeometry(0.22, 0.055, 12, 24);
    bezelRingGeo.rotateY(Math.PI / 2);
    const screwHeadGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.18, 18);
    screwHeadGeo.rotateZ(Math.PI / 2);
    const torxSocketGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6);
    torxSocketGeo.rotateZ(Math.PI / 2);
    const threadedShaftGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.72, 14);
    threadedShaftGeo.rotateZ(Math.PI / 2);

    ramusScrewCoords.forEach(([sx, sy, sz]) => {
      const bezelMesh = new THREE.Mesh(bezelRingGeo, coCrMoHeadMat);
      bezelMesh.position.set(sx + 0.08, sy, sz);

      const sHead = new THREE.Mesh(screwHeadGeo, anodizedScrewMat);
      sHead.position.set(sx + 0.09, sy, sz);

      const sTorx = new THREE.Mesh(torxSocketGeo, screwRecessMat);
      sTorx.position.set(sx + 0.11, sy, sz);

      const sShaft = new THREE.Mesh(threadedShaftGeo, anodizedScrewMat);
      sShaft.position.set(sx - 0.26, sy, sz);

      implantGroup.add(bezelMesh, sHead, sTorx, sShaft);
    });

    implantGroup.visible = false;
    anatomyRoot.add(implantGroup);
    implantGroupRef.current = implantGroup;

    // 6. Optical Laser Surface Scanner Alignment Overlay
    const laserGroup = new THREE.Group();
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    });
    for (let l = -4; l <= 4; l++) {
      const pts = [
        new THREE.Vector3(-8, 8, l * 1.4),
        new THREE.Vector3(0, l * 0.6, l * 1.1),
        new THREE.Vector3(8, 8, l * 1.4),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      laserGroup.add(new THREE.Line(lineGeo, laserMat));
    }
    laserGroup.visible = false;
    anatomyRoot.add(laserGroup);
    laserGroupRef.current = laserGroup;

    // 7. Synchronized MPR Cutting Plane Indicator
    const slicePlanesGroup = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(18, 18);
    const axialMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const axialPlane = new THREE.Mesh(planeGeo, axialMat);
    axialPlane.rotation.x = Math.PI / 2;
    slicePlanesGroup.add(axialPlane);
    anatomyRoot.add(slicePlanesGroup);
    slicePlanesGroupRef.current = slicePlanesGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty || controls.autoRotate) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(anatomyRoot.children, true);
      if (hits.length > 0) {
        const hitToothId = hits[0].object.userData?.toothId;
        if (hitToothId) {
          onToggleToothRef.current(hitToothId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 480;
      const nh = container.clientHeight || 360;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    requestRender();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const mainMesh = mainMeshRef.current;
    if (!mainMesh) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
    geo.computeBoundingSphere();

    mainMesh.geometry.dispose();
    mainMesh.geometry = geo;
    requestRenderRef.current();
  }, [meshData]);

  useEffect(() => {
    const refWire = refWireMeshRef.current;
    if (!refWire) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(referenceMeshData.positions, 3));
    geo.computeBoundingSphere();
    refWire.geometry.dispose();
    refWire.geometry = geo;
    refWire.visible = compareMode;
    requestRenderRef.current();
  }, [referenceMeshData, compareMode]);

  // Apply 3D Slicer / Clinical Volume Rendering Shader Presets
  useEffect(() => {
    if (mainMeshRef.current) {
      const mat = mainMeshRef.current.material as THREE.MeshPhysicalMaterial;
      mat.wireframe = wireframe;

      if (shaderPreset === 'clinical_bone') {
        mat.vertexColors = true;
        mat.color.setHex(0xffffff);
        mat.roughness = 0.34;
        mat.metalness = 0.03;
        mat.clearcoat = 0.32;
        mat.clearcoatRoughness = 0.24;
        mat.opacity = meshOpacity;
        mat.depthWrite = meshOpacity > 0.82;
      } else if (shaderPreset === 'glass_nerve') {
        mat.vertexColors = false;
        mat.color.setHex(0xe2e8f0);
        mat.roughness = 0.15;
        mat.metalness = 0.05;
        mat.clearcoat = 0.9;
        mat.opacity = 0.34;
        mat.depthWrite = false;
      } else if (shaderPreset === 'vascular_amber') {
        mat.vertexColors = false;
        mat.color.setHex(0xd97706);
        mat.roughness = 0.28;
        mat.metalness = 0.08;
        mat.clearcoat = 0.55;
        mat.opacity = meshOpacity;
        mat.depthWrite = meshOpacity > 0.82;
      } else if (shaderPreset === 'cyan_mask') {
        mat.vertexColors = true;
        mat.color.setHex(0xffffff);
        mat.roughness = 0.3;
        mat.metalness = 0.08;
        mat.clearcoat = 0.35;
        mat.opacity = meshOpacity;
        mat.depthWrite = meshOpacity > 0.82;
      }
      mat.needsUpdate = true;
    }

    if (nerveGroupRef.current) {
      nerveGroupRef.current.visible = nerveOpacity > 0.02;
      nerveGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
          m.opacity = nerveOpacity;
        }
      });
    }

    const mats = toothMaterialsRef.current;
    const MM_TO_SCENE = 0.25;
    teeth.forEach((tooth) => {
      const grp = teethMapRef.current.get(tooth.id);
      if (grp) {
        grp.visible = tooth.visible && tooth.status !== 'hidden';
        const isLower = tooth.arch === 'lower';
        const jawY = isLower ? -biteParams.jawOpeningMm * MM_TO_SCENE : 0;
        const jawX = isLower ? biteParams.mandibularShiftX * MM_TO_SCENE : 0;
        const jawZ = isLower ? biteParams.protrusionZ * MM_TO_SCENE : 0;

        grp.position.set(
          tooth.position[0] + tooth.offsetX * MM_TO_SCENE + jawX,
          tooth.position[1] + tooth.offsetY * MM_TO_SCENE + jawY,
          tooth.position[2] + tooth.offsetZ * MM_TO_SCENE + jawZ,
        );

        const baseYaw = (grp.userData?.baseArchYaw as number) || 0;
        grp.rotation.set(
          (tooth.tiltDeg * Math.PI) / 180,
          baseYaw + (tooth.rotYDeg * Math.PI) / 180,
          0,
        );
        grp.scale.setScalar(tooth.scale);

        if (mats) {
          const isSelected = selectedToothId === tooth.id;
          const targetCrownMat =
            tooth.status === 'scatter_crown'
              ? mats.scatterCrown
              : tooth.status === 'replaced'
                ? highlightReplacedCyan
                  ? mats.virtualCyanEnamel
                  : mats.naturalEnamel
                : isSelected
                  ? mats.selectedEnamel
                  : mats.naturalEnamel;

          grp.children.forEach((child) => {
            if ((child as THREE.Mesh).isMesh && child.userData?.isCrown) {
              (child as THREE.Mesh).material = targetCrownMat;
            }
          });
        }
      }
    });

    if (occlusalPlaneRef.current) {
      occlusalPlaneRef.current.visible = biteParams.showOcclusalPlane;
      occlusalPlaneRef.current.position.y = -2.14 - biteParams.jawOpeningMm * MM_TO_SCENE * 0.5;
    }

    if (implantGroupRef.current) {
      implantGroupRef.current.visible = showTitaniumImplant;
    }

    if (laserGroupRef.current) {
      laserGroupRef.current.visible = showLaserScanner;
    }

    if (slicePlanesGroupRef.current && slicePlanesGroupRef.current.children[0]) {
      const nz = volumeDims[2] || 40;
      const voxelScale = 20 / Math.max(volumeDims[0] || 40, volumeDims[1] || 40, nz);
      slicePlanesGroupRef.current.children[0].position.y = (slices[2] - nz * 0.5) * voxelScale;
    }

    if (anatomyRootRef.current) {
      anatomyRootRef.current.position.set(
        xyzOffsetMm[0] * 0.5,
        xyzOffsetMm[2] * 0.5,
        xyzOffsetMm[1] * 0.5,
      );
    }

    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isSoftwareGl && autoRotate;
      controlsRef.current.autoRotateSpeed = 1.6;
    }

    requestRenderRef.current();
  }, [
    shaderPreset,
    meshOpacity,
    wireframe,
    nerveOpacity,
    teeth,
    selectedToothId,
    biteParams,
    highlightReplacedCyan,
    showTitaniumImplant,
    showLaserScanner,
    slices,
    volumeDims,
    xyzOffsetMm,
    autoRotate,
  ]);

  const setCameraPreset = (pos: [number, number, number]) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(pos[0], pos[1], pos[2]);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
    requestRenderRef.current();
  };

  return (
    <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Top Spec Header with 1-Click Clinical 3D Shader Presets */}
      <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#0A192F]/70">
        <div className="flex items-center gap-2">
          <Box className="w-3.5 h-3.5 text-[#0088AA] dark:text-[#00E5FF]" />
          <span className="text-xs font-mono font-bold text-[#0088AA] dark:text-[#00E5FF]">
            {language === 'en' ? '3D VOLUME RENDER (CT-BONE)' : 'RENDER VOLUME 3D (TULANG-CT)'}
          </span>
        </div>

        {/* Simple 1-Click 3D Slicer / DICOM Shader Style Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShaderPreset('clinical_bone');
              onToggleColorByLayers?.(false);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              shaderPreset === 'clinical_bone'
                ? 'bg-[#E8D2AC] text-[#0A192F] font-bold'
                : 'bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-300'
            }`}
            title="Clinical CT-Bone Ivory Shading"
          >
            {language === 'en' ? 'Ivory Bone' : 'Tulang Gading'}
          </button>
          <button
            onClick={() => {
              setShaderPreset('glass_nerve');
              onToggleColorByLayers?.(false);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              shaderPreset === 'glass_nerve'
                ? 'bg-[#FFD700] text-[#0A192F] font-bold'
                : 'bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-300'
            }`}
            title="Translucent Glass Bone for Nerve & Implant Inspection"
          >
            {language === 'en' ? 'X-Ray Nerve' : 'Transparan Saraf'}
          </button>
          <button
            onClick={() => {
              setShaderPreset('vascular_amber');
              onToggleColorByLayers?.(false);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              shaderPreset === 'vascular_amber'
                ? 'bg-amber-500 text-[#0A192F] font-bold'
                : 'bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-300'
            }`}
            title="3D Slicer CT-AAA Warm Subsurface Amber"
          >
            CT-Amber
          </button>
          <button
            onClick={() => {
              setShaderPreset('cyan_mask');
              onToggleColorByLayers?.(true);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              shaderPreset === 'cyan_mask'
                ? 'bg-[#00E5FF] text-[#0A192F] font-bold'
                : 'bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-300'
            }`}
            title="4-Color Separated Segmentation Layers (Cyan / Green / Yellow / Magenta)"
          >
            {language === 'en' ? '4-Layers' : '4-Lapisan'}
          </button>
        </div>
      </div>

      {/* Central Pitch-Black Clinical 3D WebGL Viewport */}
      <div className="relative flex-1 bg-[#02050A] aspect-square max-h-[340px] w-full overflow-hidden">
        <div ref={canvasMountRef} className="w-full h-full" />

        {/* Top-Left Clinical PACS 3D Volume Telemetry (matches reference screenshots) */}
        <div className="absolute top-2 left-2.5 text-[9.5px] font-mono text-slate-300/90 leading-tight pointer-events-none space-y-0.5 tabular-nums">
          <div className="text-[#00E5FF] font-semibold">Studio: 61.1000 // KARINA-3D</div>
          <div>Thick: 0.50 mm · Iso-Surface VR</div>
          <div>
            XYZ: [{xyzOffsetMm[0].toFixed(1)}, {xyzOffsetMm[1].toFixed(1)},{' '}
            {xyzOffsetMm[2].toFixed(1)}] mm
          </div>
          <div>Tris: {meshData.triangleCount.toLocaleString()}</div>
        </div>

        {/* Top-Right Clinical Series Label */}
        <div className="absolute top-2 right-5 text-[9.5px] font-mono text-slate-400 text-right leading-tight pointer-events-none space-y-0.5 max-w-[160px] truncate">
          <div className="truncate">{dicomSeriesLabel || 'TC CRANIO-TMJ 3D'}</div>
          <div>Serie: Ricostruzione Volumetrica</div>
        </div>

        {/* Anatomical Orientation Markers */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          A
        </span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          R
        </span>
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          L
        </span>

        {/* Collapsible Bottom Control Dock */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[94%] max-w-[440px] z-10">
          <div className="flex justify-center">
            <button
              onClick={() => setDockCollapsed(!dockCollapsed)}
              className="px-2.5 py-0.5 rounded-t bg-[#0A192F] border border-b-0 border-slate-700 text-[10px] font-mono text-[#00E5FF] flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>{language === 'en' ? 'Show 3D Controls' : 'Tampilkan Kontrol 3D'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>{language === 'en' ? 'Hide Controls' : 'Sembunyikan'}</span>
                </>
              )}
            </button>
          </div>

          {!dockCollapsed && (
            <div className="bg-[#0A192F]/95 border border-slate-700 rounded-lg p-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono text-slate-200">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCameraPreset([16, 6, 19])}
                  className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-[#00E5FF] transition-colors cursor-pointer"
                >
                  3/4 SKULL
                </button>
                <button
                  onClick={() => setCameraPreset([22, 2, 0])}
                  className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 transition-colors cursor-pointer"
                >
                  SAG (X)
                </button>
                <button
                  onClick={() => setCameraPreset([0, 2, 22])}
                  className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 transition-colors cursor-pointer"
                >
                  ANT (Y)
                </button>
                <button
                  onClick={() => setCameraPreset([0, 24, 0.1])}
                  className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 transition-colors cursor-pointer"
                >
                  SUP (Z)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    autoRotate
                      ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                      : 'bg-[#112240] text-slate-300'
                  }`}
                >
                  360°
                </button>
                <button
                  onClick={() => {
                    onChangeXyzOffset([0, 0, 0]);
                    setCameraPreset([16, 6, 19]);
                  }}
                  className="p-1 rounded bg-[#112240] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Reset 3D View & XYZ Datum"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* XYZ Hardware Alignment Fine-Adjustment Footer */}
      <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F]/70 grid grid-cols-3 gap-2 text-[11px] font-mono">
        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="text-red-400 font-bold">X:</span>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={xyzOffsetMm[0]}
            onChange={(e) =>
              onChangeXyzOffset([parseFloat(e.target.value), xyzOffsetMm[1], xyzOffsetMm[2]])
            }
            className="w-full accent-red-400 h-1 cursor-pointer"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="text-emerald-400 font-bold">Y:</span>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={xyzOffsetMm[1]}
            onChange={(e) =>
              onChangeXyzOffset([xyzOffsetMm[0], parseFloat(e.target.value), xyzOffsetMm[2]])
            }
            className="w-full accent-emerald-400 h-1 cursor-pointer"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="text-[#00E5FF] font-bold">Z:</span>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={xyzOffsetMm[2]}
            onChange={(e) =>
              onChangeXyzOffset([xyzOffsetMm[0], xyzOffsetMm[1], parseFloat(e.target.value)])
            }
            className="w-full accent-[#00E5FF] h-1 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
