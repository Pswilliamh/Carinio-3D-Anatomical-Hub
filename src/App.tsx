/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Crosshair,
  Eraser,
  Scissors,
  Sparkles,
  Ruler,
  RotateCcw,
  Download,
  Upload,
  Sun,
  Moon,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  auth,
  BLUEPRINT_CONSTRAINTS,
  computeEncryptedDigest,
  db,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  sanitizeText,
  signInWithGoogle,
  signOutUser,
} from './firebase';
import { Language, UI_TEXT } from './i18n/translations';
import {
  CachedVolumeRecord,
  getLocalAuditLogs,
  LocalAuditRecord,
  saveLocalAuditLog,
} from './services/indexedDbCache';
import {
  AnatomicalLandmark,
  computeActiveSegmentationMask,
  computeComparisonMetrics,
  detectAnatomicalLandmarks,
  extractSurfaceMeshFromMask,
  loadOrGenerateDataset,
  parseUploadedVolumeFile,
  removeFloatingIslands,
  runSeedRegionGrowing,
} from './services/volumeGenerator';
import {
  exportMeshToOBJ,
  exportMeshToSTEP,
  exportMeshToSTL,
} from './services/meshExporters';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SafetyDisclaimerModal } from './components/SafetyDisclaimerModal';
import { KarinaLandingSection } from './components/KarinaLandingSection';
import { MprSliceViewer, WorkstationTool } from './components/MprSliceViewer';
import { INITIAL_TEETH_SET, ThreeViewport, ToothDescriptor } from './components/ThreeViewport';
import { GuidedLabPanel } from './components/GuidedLabPanel';
import { AiGlossaryAssistant } from './components/AiGlossaryAssistant';
import { AuditPerformanceDashboard } from './components/AuditPerformanceDashboard';

type ActiveSection = 'overview' | 'workstation' | 'guided_lab' | 'glossary' | 'audit';

export default function App() {
  // Theme, Language, and Safety Gate State
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('workstation');

  // Firebase Auth & RBAC Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'technician' | 'instructor' | 'admin'>(
    'student',
  );
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Volumetric CT Dataset & Segmentation State
  const [datasetId, setDatasetId] = useState<'tmj_condyle_scatter' | 'full_cranium_arch'>(
    'tmj_condyle_scatter',
  );
  const [volume, setVolume] = useState<CachedVolumeRecord | null>(null);
  const [cacheLatencyMs, setCacheLatencyMs] = useState(4.2);
  const [slices, setSlices] = useState<[number, number, number]>([20, 18, 21]);
  const [windowPreset, setWindowPreset] = useState<'bone' | 'soft' | 'metal'>('bone');
  const [minHU, setMinHU] = useState(360);
  const [maxHU, setMaxHU] = useState(3050);

  // Artifact Cleanup & Segmentation Mask Buffers
  const [erasedVoxels, setErasedVoxels] = useState<Uint8Array>(() => new Uint8Array(40 * 40 * 40));
  const [regionFilterMask, setRegionFilterMask] = useState<Uint8Array | null>(null);
  const [scatterCleanedCount, setScatterCleanedCount] = useState(0);
  const [islandsRemovedCount, setIslandsRemovedCount] = useState(0);
  const [activeTool, setActiveTool] = useState<WorkstationTool>('navigate');
  const [brushRadius, setBrushRadius] = useState(2);
  const [calibrationMm, setCalibrationMm] = useState<number>(0.5);
  const [landmarks, setLandmarks] = useState<AnatomicalLandmark[]>([]);

  // 3D WebGL & Anatomical Controls State
  const [meshOpacity, setMeshOpacity] = useState(0.94);
  const [smoothingIterations, setSmoothingIterations] = useState(3);
  const [wireframe, setWireframe] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [nerveOpacity, setNerveOpacity] = useState(0.92);
  const [teeth, setTeeth] = useState<ToothDescriptor[]>(INITIAL_TEETH_SET);
  const [showTitaniumImplant, setShowTitaniumImplant] = useState(false);
  const [showLaserScanner, setShowLaserScanner] = useState(false);
  const [xyzOffsetMm, setXyzOffsetMm] = useState<[number, number, number]>([0, 0, 0]);

  // Guided Lab & Audit Logs State
  const [activeLabStep, setActiveLabStep] = useState(0);
  const [auditLogs, setAuditLogs] = useState<LocalAuditRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = UI_TEXT[language];

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  // Sync Dark / Light Theme class on document.documentElement
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkMode]);

  // Load initial dataset from IndexedDB or procedural generator
  useEffect(() => {
    let mounted = true;
    loadOrGenerateDataset(datasetId).then(({ record, latencyMs }) => {
      if (!mounted) return;
      setVolume(record);
      setCacheLatencyMs(latencyMs);
      setErasedVoxels(new Uint8Array(record.huData.length));
      setRegionFilterMask(null);
      setScatterCleanedCount(0);
      setIslandsRemovedCount(0);
      setLandmarks(detectAnatomicalLandmarks(record));
    });
    return () => {
      mounted = false;
    };
  }, [datasetId]);

  // Load cached local audit logs on mount
  useEffect(() => {
    getLocalAuditLogs().then((logs) => {
      if (logs.length > 0) {
        setAuditLogs(logs);
      }
    });
  }, []);

  // Record immutable audit log entry to IndexedDB + Firestore (when signed in)
  const recordAuditAction = useCallback(
    async (
      actionType:
        | 'DISCLAIMER_ACK'
        | 'THRESHOLD_UPDATE'
        | 'SCATTER_CLEANUP'
        | 'REGION_GROW'
        | 'ISLAND_REMOVAL'
        | 'MESH_EXPORT'
        | 'CALIBRATION_MEASURE'
        | 'CLOUD_SYNC'
        | 'PROSTHETIC_ALIGN',
      moduleName: string,
      details: string,
    ) => {
      const logId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const actorUid = sanitizeId(currentUser?.uid || 'local_trainee');
      const actorName = sanitizeText(
        currentUser?.displayName || 'Vocational Trainee',
        BLUEPRINT_CONSTRAINTS.DISPLAY_NAME_MAX_LEN,
      );
      const cleanModule = sanitizeText(moduleName, BLUEPRINT_CONSTRAINTS.MODULE_NAME_MAX_LEN);
      const cleanDetails = sanitizeText(details, BLUEPRINT_CONSTRAINTS.DETAILS_MAX_LEN);
      const safeAccuracy = Math.max(0.5, Math.min(1.0, calibrationMm));

      const encryptedHash = await computeEncryptedDigest({
        logId,
        actorUid,
        actionType,
        cleanDetails,
        ts: Date.now(),
      });

      const localEntry: LocalAuditRecord = {
        logId,
        actorUid,
        actorName,
        actionType,
        moduleName: cleanModule,
        details: cleanDetails,
        encryptedHash,
        accuracyMm: safeAccuracy,
        createdAtIso: new Date().toISOString(),
      };

      await saveLocalAuditLog(localEntry);
      setAuditLogs((prev) => [localEntry, ...prev.slice(0, 49)]);

      if (currentUser && currentUser.emailVerified) {
        const logPath = `auditLogs/${logId}`;
        try {
          await setDoc(doc(db, 'auditLogs', logId), {
            logId,
            actorUid: currentUser.uid,
            actorName,
            actionType,
            moduleName: cleanModule,
            details: cleanDetails,
            encryptedHash: sanitizeText(encryptedHash, BLUEPRINT_CONSTRAINTS.CHECKSUM_MAX_LEN),
            accuracyMm: safeAccuracy,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, logPath);
        }
      }
    },
    [currentUser, calibrationMm],
  );

  // Firebase Auth listener & UserProfile initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (user) {
        const userPath = `users/${user.uid}`;
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.role) setUserRole(data.role);
            if (Array.isArray(data.completedModules)) {
              setCompletedModules(data.completedModules.slice(0, 10));
            }
          } else if (user.emailVerified) {
            await setDoc(doc(db, 'users', user.uid), {
              userId: user.uid,
              displayName: sanitizeText(
                user.displayName || user.email || 'Vocational Trainee',
                BLUEPRINT_CONSTRAINTS.DISPLAY_NAME_MAX_LEN,
              ),
              role: 'student',
              completedModules: [],
              accuracyScore: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, userPath);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore auditLogs listener for authenticated user
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const logsQuery = query(
      collection(db, 'auditLogs'),
      where('actorUid', '==', currentUser.uid),
      limit(25),
    );
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const cloudLogs: LocalAuditRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          cloudLogs.push({
            logId: d.logId,
            actorUid: d.actorUid,
            actorName: d.actorName,
            actionType: d.actionType,
            moduleName: d.moduleName,
            details: d.details,
            encryptedHash: d.encryptedHash,
            accuracyMm: d.accuracyMm,
            createdAtIso: d.createdAt?.toDate
              ? d.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          });
        });
        if (cloudLogs.length > 0) {
          cloudLogs.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
          setAuditLogs(cloudLogs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      },
    );
    return () => unsubscribe();
  }, [authReady, currentUser]);

  // Window / Level Presets
  const windowConfig = useMemo(() => {
    if (windowPreset === 'soft') return { width: 400, level: 40 };
    if (windowPreset === 'metal') return { width: 3500, level: 1200 };
    return { width: 2000, level: 400 };
  }, [windowPreset]);

  // Active Binary Segmentation Mask
  const activeMask = useMemo(() => {
    if (!volume) return new Uint8Array(40 * 40 * 40);
    return computeActiveSegmentationMask(
      volume,
      minHU,
      maxHU,
      erasedVoxels,
      regionFilterMask,
    );
  }, [volume, minHU, maxHU, erasedVoxels, regionFilterMask]);

  // Real-Time Evaluation Metrics vs Expert Reference Mesh
  const comparisonMetrics = useMemo(() => {
    if (!volume) {
      return {
        diceScore: 0,
        scatterRemovedPct: 0,
        bonePreservedPct: 0,
        islandsClearedPct: 0,
        activeVoxelCount: 0,
        referenceVoxelCount: 0,
        remainingScatterVoxels: 0,
      };
    }
    return computeComparisonMetrics(activeMask, volume);
  }, [activeMask, volume]);

  // Real-Time Marching Cubes / Surface Mesh Extraction
  const meshData = useMemo(() => {
    if (!volume) {
      return {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        colors: new Float32Array(0),
        triangleCount: 0,
        vertexCount: 0,
        computeTimeMs: 0,
      };
    }
    return extractSurfaceMeshFromMask(
      activeMask,
      volume,
      smoothingIterations,
      compareMode,
    );
  }, [activeMask, volume, smoothingIterations, compareMode]);

  // Expert Master Reference Mesh for 3D Overlay Comparison
  const referenceMeshData = useMemo(() => {
    if (!volume) {
      return {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        colors: new Float32Array(0),
        triangleCount: 0,
        vertexCount: 0,
        computeTimeMs: 0,
      };
    }
    return extractSurfaceMeshFromMask(volume.cleanReferenceMask, volume, 3, false);
  }, [volume]);

  // Handlers for Scatter Eraser, Region Growing, Island Removal, and Landmarks
  const handleEraseVoxels = useCallback((indices: number[]) => {
    setErasedVoxels((prev) => {
      const next = prev.slice();
      let newlyErased = 0;
      for (const idx of indices) {
        if (next[idx] === 0) {
          next[idx] = 1;
          newlyErased++;
        }
      }
      if (newlyErased > 0) {
        setScatterCleanedCount((c) => c + newlyErased);
      }
      return next;
    });
  }, []);

  const handleSeedRegionGrow = useCallback(
    (seed: [number, number, number]) => {
      if (!volume) return;
      const { regionMask, grownCount } = runSeedRegionGrowing(
        activeMask,
        volume,
        seed[0],
        seed[1],
        seed[2],
      );
      setRegionFilterMask(regionMask);
      showToast(
        language === 'en'
          ? `Region Growing isolated ${grownCount.toLocaleString()} connected Mandible & Condyle voxels.`
          : `Region Growing mengisolasi ${grownCount.toLocaleString()} voksel Mandibula & Kondilus.`,
      );
      recordAuditAction(
        'REGION_GROW',
        'Module 3: Region Growing',
        `6-connected seed grow at [${seed[0]},${seed[1]},${seed[2]}] isolated ${grownCount} mandible voxels.`,
      );
    },
    [volume, activeMask, language, showToast, recordAuditAction],
  );

  const handleRemoveIslands = useCallback(() => {
    if (!volume) return;
    const { newErasedVoxels, removedVoxelsCount, islandsRemoved } = removeFloatingIslands(
      activeMask,
      volume.dims,
      erasedVoxels,
      55,
    );
    setErasedVoxels(newErasedVoxels);
    setIslandsRemovedCount((c) => c + islandsRemoved);
    showToast(
      language === 'en'
        ? `Island Removal cleared ${islandsRemoved} floating noise clusters (${removedVoxelsCount} voxels).`
        : `Penghapusan Pulau Noise membersihkan ${islandsRemoved} klaster noise (${removedVoxelsCount} voksel).`,
    );
    recordAuditAction(
      'ISLAND_REMOVAL',
      'Module 4: Artifact Cleanup',
      `Removed ${islandsRemoved} floating noise islands (${removedVoxelsCount} voxels).`,
    );
  }, [volume, activeMask, erasedVoxels, language, showToast, recordAuditAction]);

  const handleCleanAllDentalScatter = useCallback(() => {
    if (!volume) return;
    let cleaned = 0;
    setErasedVoxels((prev) => {
      const next = prev.slice();
      for (let i = 0; i < volume.scatterMask.length; i++) {
        if (volume.scatterMask[i] === 1 && next[i] === 0) {
          next[i] = 1;
          cleaned++;
        }
      }
      return next;
    });
    setScatterCleanedCount((c) => c + cleaned);
    showToast(
      language === 'en'
        ? `Trimmed ${cleaned} metallic dental scatter streak & noise voxels.`
        : `Memangkas ${cleaned} voksel pancaran hamburan logam gigi & noise.`,
    );
    recordAuditAction(
      'SCATTER_CLEANUP',
      'Module 4: Scatter Cleanup',
      `Trimmed ${cleaned} beam-hardening dental scatter voxels.`,
    );
  }, [volume, language, showToast, recordAuditAction]);

  const handleResetRawVolume = useCallback(() => {
    if (!volume) return;
    setErasedVoxels(new Uint8Array(volume.huData.length));
    setRegionFilterMask(null);
    setScatterCleanedCount(0);
    setIslandsRemovedCount(0);
    setMinHU(360);
    setMaxHU(3050);
    showToast(
      language === 'en'
        ? 'Restored raw uncleaned CT volume.'
        : 'Mengembalikan volume CT awal sebelum pembersihan.',
    );
  }, [volume, language, showToast]);

  const handleToggleTooth = useCallback((toothId: string) => {
    setTeeth((prev) =>
      prev.map((tooth) =>
        tooth.id === toothId ? { ...tooth, visible: !tooth.visible } : tooth,
      ),
    );
  }, []);

  const handleSetAllTeethVisibility = useCallback((visible: boolean) => {
    setTeeth((prev) => prev.map((tooth) => ({ ...tooth, visible })));
  }, []);

  const handleCompleteModule = useCallback(
    async (moduleId: string) => {
      setCompletedModules((prev) => {
        if (prev.includes(moduleId)) return prev;
        const next = [...prev, moduleId].slice(0, BLUEPRINT_CONSTRAINTS.MAX_COMPLETED_MODULES);
        if (currentUser && currentUser.emailVerified) {
          const userPath = `users/${currentUser.uid}`;
          updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: sanitizeText(
              currentUser.displayName || 'Vocational Trainee',
              BLUEPRINT_CONSTRAINTS.DISPLAY_NAME_MAX_LEN,
            ),
            completedModules: next,
            accuracyScore: comparisonMetrics.diceScore,
            updatedAt: serverTimestamp(),
          }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, userPath));
        }
        return next;
      });
      showToast(
        language === 'en'
          ? `Milestone completed! Dice Similarity Score: ${comparisonMetrics.diceScore.toFixed(1)}%`
          : `Modul selesai! Skor Akurasi Dice: ${comparisonMetrics.diceScore.toFixed(1)}%`,
      );
    },
    [currentUser, comparisonMetrics.diceScore, language, showToast],
  );

  // One-click Interactive Guided Step Demonstrator for the 5 Lab Modules
  const handleRunGuidedStepAction = useCallback(
    (stepNumber: number) => {
      if (!volume) return;
      if (stepNumber === 1) {
        setSlices([20, 16, 23]);
        setLandmarks(detectAnatomicalLandmarks(volume));
        showToast(
          language === 'en'
            ? 'Step 1: Crosshairs centered on Mandibular Condyle & 5 anatomical landmarks detected.'
            : 'Modul 1: Crosshair dipusatkan pada Kondilus Mandibula & 5 titik anatomi terdeteksi.',
        );
      } else if (stepNumber === 2) {
        setMinHU(380);
        setMaxHU(2450);
        recordAuditAction(
          'THRESHOLD_UPDATE',
          'Module 2: Hounsfield Thresholding',
          'Calibrated cortical bone threshold window to 380 - 2450 HU.',
        );
        showToast(
          language === 'en'
            ? 'Step 2: Cortical bone threshold calibrated to +380..+2450 HU.'
            : 'Modul 2: Ambang batas tulang kortikal dikalibrasi ke +380..+2450 HU.',
        );
      } else if (stepNumber === 3) {
        handleSeedRegionGrow([20, 16, 23]);
      } else if (stepNumber === 4) {
        handleCleanAllDentalScatter();
        handleRemoveIslands();
      } else if (stepNumber === 5) {
        setCompareMode(true);
        setShowTitaniumImplant(true);
        showToast(
          language === 'en'
            ? `Step 5: Expert Reference Comparison active (Dice Score: ${comparisonMetrics.diceScore.toFixed(1)}%). Ready for .STL export.`
            : `Modul 5: Perbandingan Referensi Ahli aktif (Skor Dice: ${comparisonMetrics.diceScore.toFixed(1)}%). Siap ekspor .STL.`,
        );
      }
      handleCompleteModule(`mod_${stepNumber}_${['mpr', 'hu', 'region', 'scatter', 'stl'][stepNumber - 1]}`);
    },
    [
      volume,
      language,
      showToast,
      recordAuditAction,
      handleSeedRegionGrow,
      handleCleanAllDentalScatter,
      handleRemoveIslands,
      comparisonMetrics.diceScore,
      handleCompleteModule,
    ],
  );

  // Sync current SegmentationSession to Firestore Cloud
  const handleSyncToCloud = useCallback(async () => {
    if (!volume) return;
    if (!currentUser) {
      showToast(
        language === 'en'
          ? 'Please sign in with Google first to sync sessions to Cloud Firestore.'
          : 'Silakan masuk dengan Google terlebih dahulu untuk sinkronisasi ke Cloud Firestore.',
      );
      return;
    }
    setIsSyncingCloud(true);
    const sessionId = sanitizeId(`sess_${currentUser.uid.slice(0, 12)}_${volume.id}`);
    const sessionPath = `sessions/${sessionId}`;

    try {
      const checksum = await computeEncryptedDigest({
        sessionId,
        ownerId: currentUser.uid,
        minHU,
        maxHU,
        dice: comparisonMetrics.diceScore,
      });

      const existingSnap = await getDoc(doc(db, 'sessions', sessionId));
      if (existingSnap.exists()) {
        await updateDoc(doc(db, 'sessions', sessionId), {
          datasetId: sanitizeText(volume.id, BLUEPRINT_CONSTRAINTS.DATASET_ID_MAX_LEN),
          datasetName: sanitizeText(volume.name, BLUEPRINT_CONSTRAINTS.DATASET_NAME_MAX_LEN),
          minHU,
          maxHU,
          scatterCleanedCount,
          islandsRemovedCount,
          regionGrown: regionFilterMask !== null,
          diceSimilarityScore: comparisonMetrics.diceScore,
          encryptedChecksum: sanitizeText(checksum, BLUEPRINT_CONSTRAINTS.CHECKSUM_MAX_LEN),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'sessions', sessionId), {
          sessionId,
          ownerId: currentUser.uid,
          datasetId: sanitizeText(volume.id, BLUEPRINT_CONSTRAINTS.DATASET_ID_MAX_LEN),
          datasetName: sanitizeText(volume.name, BLUEPRINT_CONSTRAINTS.DATASET_NAME_MAX_LEN),
          minHU,
          maxHU,
          scatterCleanedCount,
          islandsRemovedCount,
          regionGrown: regionFilterMask !== null,
          diceSimilarityScore: comparisonMetrics.diceScore,
          encryptedChecksum: sanitizeText(checksum, BLUEPRINT_CONSTRAINTS.CHECKSUM_MAX_LEN),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await recordAuditAction(
        'CLOUD_SYNC',
        'Cloud Synchronization',
        `Synchronized session ${sessionId} (Dice: ${comparisonMetrics.diceScore.toFixed(1)}%, HU: ${minHU}..${maxHU}).`,
      );
      showToast(
        language === 'en'
          ? 'Segmentation session & encrypted checksum synchronized to Cloud Firestore.'
          : 'Sesi segmentasi & checksum terenkripsi berhasil disinkronkan ke Cloud Firestore.',
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, sessionPath);
    } finally {
      setIsSyncingCloud(false);
    }
  }, [
    volume,
    currentUser,
    minHU,
    maxHU,
    scatterCleanedCount,
    islandsRemovedCount,
    regionFilterMask,
    comparisonMetrics.diceScore,
    language,
    showToast,
    recordAuditAction,
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const customRecord = await parseUploadedVolumeFile(file);
      setVolume(customRecord);
      setErasedVoxels(new Uint8Array(customRecord.huData.length));
      setRegionFilterMask(null);
      setLandmarks(detectAnatomicalLandmarks(customRecord));
      showToast(
        language === 'en'
          ? `Loaded local volumetric dataset: ${file.name}`
          : `Berhasil memuat file volumetrik lokal: ${file.name}`,
      );
    } catch (err) {
      showToast(
        language === 'en'
          ? 'Could not parse file. Ensure valid .nii, .dcm, or .json format.'
          : 'Gagal membaca file. Pastikan format .nii, .dcm, atau .json valid.',
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      showToast(
        language === 'en'
          ? 'Signed in with Google Workspace / Email.'
          : 'Berhasil masuk dengan akun email Google.',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      showToast(msg);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A192F] text-slate-900 dark:text-white flex flex-col">
        {/* Mandatory Clinical Safety & Non-Surgical Training Gate */}
        {!disclaimerAccepted && (
          <SafetyDisclaimerModal
            language={language}
            onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'id' : 'en'))}
            onAcknowledge={() => {
              setDisclaimerAccepted(true);
              recordAuditAction(
                'DISCLAIMER_ACK',
                'Safety Gate',
                'User acknowledged non-clinical training disclaimer and virtualized phantom data policy.',
              );
            }}
          />
        )}

        {/* Top Bar Contract: Strict 1-Row, 3-Zone Header separated by gap-8 */}
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A192F]">
          {/* Zone 1: Single Text Element Wordmark */}
          <a
            href="#workstation"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('workstation');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Karina 3D Lab
          </a>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('overview');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'overview'
                  ? 'text-[#0088AA] dark:text-[#00E5FF] underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navOverview}
            </a>
            <a
              href="#workstation"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('workstation');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'workstation'
                  ? 'text-[#0088AA] dark:text-[#00E5FF] underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navWorkstation}
            </a>
            <a
              href="#guided-lab"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('guided_lab');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'guided_lab'
                  ? 'text-[#0088AA] dark:text-[#00E5FF] underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navGuidedLab}
            </a>
            <a
              href="#glossary"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('glossary');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'glossary'
                  ? 'text-[#0088AA] dark:text-[#00E5FF] underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navGlossaryAi}
            </a>
            <a
              href="#audit"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('audit');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'audit'
                  ? 'text-[#0088AA] dark:text-[#00E5FF] underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navAuditDashboard}
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button
                onClick={() => signOutUser()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-[#112240] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signOut} ({currentUser.displayName?.split(' ')[0] || 'User'})
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00E5FF] text-[#0A192F] hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signInGoogle}
              </button>
            )}
          </div>
        </header>

        {/* Non-Clinical Safety Notice & Secondary Workspace Utility Toolbar */}
        <div className="bg-slate-100 dark:bg-[#112240]/90 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-[#FFD700] font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t.disclaimerBanner}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Section Switcher */}
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as ActiveSection)}
              className="md:hidden px-2.5 py-1.5 rounded-md bg-white dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              <option value="overview">{t.navOverview}</option>
              <option value="workstation">{t.navWorkstation}</option>
              <option value="guided_lab">{t.navGuidedLab}</option>
              <option value="glossary">{t.navGlossaryAi}</option>
              <option value="audit">{t.navAuditDashboard}</option>
            </select>

            {/* Bilingual Toggle (English / Bahasa Indonesia) */}
            <button
              onClick={() => setLanguage((l) => (l === 'en' ? 'id' : 'en'))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#00E5FF] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[#0088AA] dark:text-[#00E5FF]" />
              <span>{language === 'en' ? 'EN · Bahasa Indonesia' : 'ID · English'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#00E5FF] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{language === 'en' ? 'Light Mode' : 'Mode Terang'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>{language === 'en' ? 'Dark Navy' : 'Mode Gelap'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast Feedback Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-40 max-w-md bg-[#0A192F] text-white border border-[#00E5FF] rounded-xl px-4 py-3 shadow-xl flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-6 py-6">
          {activeSection === 'overview' && (
            <KarinaLandingSection
              language={language}
              userDisplayName={currentUser?.displayName || null}
              userRole={userRole}
              onSignIn={handleGoogleSignIn}
              onEnterWorkstation={() => setActiveSection('workstation')}
              onEnterGuidedLab={() => setActiveSection('guided_lab')}
              onEnterGlossary={() => setActiveSection('glossary')}
            />
          )}

          {(activeSection === 'workstation' || activeSection === 'guided_lab') && volume && (
            <div className="space-y-6">
              {/* Top Workstation Controls Bar: Dataset Selector, Local Import, Window/Level, Calibration Scale & CAD Exports */}
              <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Sample Dataset Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {t.datasetLabel}:
                    </label>
                    <select
                      value={datasetId}
                      onChange={(e) =>
                        setDatasetId(
                          e.target.value as 'tmj_condyle_scatter' | 'full_cranium_arch',
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="tmj_condyle_scatter">{t.datasetTmj}</option>
                      <option value="full_cranium_arch">{t.datasetCranium}</option>
                    </select>
                  </div>

                  {/* Local NIfTI / DICOM / JSON Import */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".nii,.dcm,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#0088AA] dark:text-[#00E5FF]" />
                    <span>{t.uploadDicomNifti}</span>
                  </button>

                  {/* Window / Level Presets */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setWindowPreset('bone')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        windowPreset === 'bone'
                          ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.presetBone}
                    </button>
                    <button
                      onClick={() => setWindowPreset('soft')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        windowPreset === 'soft'
                          ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.presetSoft}
                    </button>
                    <button
                      onClick={() => setWindowPreset('metal')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        windowPreset === 'metal'
                          ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.presetMetal}
                    </button>
                  </div>
                </div>

                {/* Right Group: Millimeter Calibration Scale (0.5 - 1.0 mm) & 3D Exports (.STL, .OBJ, .STEP) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {t.calibrationPrecisionLabel}:
                    </span>
                    {[0.5, 0.75, 1.0].map((mmVal) => (
                      <button
                        key={mmVal}
                        onClick={() => setCalibrationMm(mmVal)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer tabular-nums ${
                          calibrationMm === mmVal
                            ? 'bg-[#FFD700] text-[#0A192F] font-bold'
                            : 'bg-slate-100 dark:bg-[#0A192F] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {mmVal.toFixed(2)}mm
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      exportMeshToSTL(meshData, volume.name);
                      recordAuditAction(
                        'MESH_EXPORT',
                        'Module 5: 3D Printing Export',
                        `Exported Binary .STL (${meshData.triangleCount} triangles, Dice: ${comparisonMetrics.diceScore.toFixed(1)}%).`,
                      );
                      showToast('Downloaded Binary .STL file for 3D printing.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.exportStlBtn}</span>
                  </button>

                  <button
                    onClick={() => {
                      exportMeshToOBJ(meshData, volume.name);
                      recordAuditAction(
                        'MESH_EXPORT',
                        'Module 5: CAD Export',
                        `Exported Wavefront .OBJ (${meshData.triangleCount} triangles).`,
                      );
                      showToast('Downloaded Wavefront .OBJ mesh.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.exportObjBtn}</span>
                  </button>

                  <button
                    onClick={() => {
                      exportMeshToSTEP(meshData, volume.name, xyzOffsetMm, calibrationMm);
                      recordAuditAction(
                        'MESH_EXPORT',
                        'Module 5: STEP CAD Export',
                        `Exported ISO-10303-21 .STEP file with XYZ datum [${xyzOffsetMm.join(',')}].`,
                      );
                      showToast('Downloaded ISO-10303-21 .STEP CAD file.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#FFD700] text-xs font-semibold text-slate-800 dark:text-[#FFD700] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.exportStepBtn}</span>
                  </button>
                </div>
              </div>

              {/* Core 12-Column Grid: Left 8 Columns (4-Viewport Grid + Odontogram Teeth Bar) | Right 4 Columns (Segmentation Controls & Guided Lab) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 8 Columns: 4-Screen Visualization (Axial, Coronal, Sagittal + 3D Rotating WebGL Model) */}
                <div className="lg:col-span-8 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Viewport 1: Axial (Z) */}
                    <MprSliceViewer
                      plane="axial"
                      language={language}
                      volume={volume}
                      activeMask={activeMask}
                      slices={slices}
                      windowWidth={windowConfig.width}
                      windowLevel={windowConfig.level}
                      activeTool={activeTool}
                      brushRadius={brushRadius}
                      compareMode={compareMode}
                      calibrationMm={calibrationMm}
                      landmarks={landmarks}
                      onSliceChange={setSlices}
                      onEraseVoxels={handleEraseVoxels}
                      onSeedRegionGrow={handleSeedRegionGrow}
                      onRecordMeasurement={(distMm, planeLabel) => {
                        recordAuditAction(
                          'CALIBRATION_MEASURE',
                          'Millimeter Quality Control',
                          `Measured ${distMm.toFixed(2)} mm on ${planeLabel} slice at ±${calibrationMm.toFixed(2)} mm calibration.`,
                        );
                        showToast(`Measured ${distMm.toFixed(2)} mm on ${planeLabel} plane.`);
                      }}
                    />

                    {/* Viewport 2: Coronal (Y) */}
                    <MprSliceViewer
                      plane="coronal"
                      language={language}
                      volume={volume}
                      activeMask={activeMask}
                      slices={slices}
                      windowWidth={windowConfig.width}
                      windowLevel={windowConfig.level}
                      activeTool={activeTool}
                      brushRadius={brushRadius}
                      compareMode={compareMode}
                      calibrationMm={calibrationMm}
                      landmarks={landmarks}
                      onSliceChange={setSlices}
                      onEraseVoxels={handleEraseVoxels}
                      onSeedRegionGrow={handleSeedRegionGrow}
                      onRecordMeasurement={(distMm, planeLabel) => {
                        recordAuditAction(
                          'CALIBRATION_MEASURE',
                          'Millimeter Quality Control',
                          `Measured ${distMm.toFixed(2)} mm on ${planeLabel} slice at ±${calibrationMm.toFixed(2)} mm calibration.`,
                        );
                        showToast(`Measured ${distMm.toFixed(2)} mm on ${planeLabel} plane.`);
                      }}
                    />

                    {/* Viewport 3: Sagittal (X) */}
                    <MprSliceViewer
                      plane="sagittal"
                      language={language}
                      volume={volume}
                      activeMask={activeMask}
                      slices={slices}
                      windowWidth={windowConfig.width}
                      windowLevel={windowConfig.level}
                      activeTool={activeTool}
                      brushRadius={brushRadius}
                      compareMode={compareMode}
                      calibrationMm={calibrationMm}
                      landmarks={landmarks}
                      onSliceChange={setSlices}
                      onEraseVoxels={handleEraseVoxels}
                      onSeedRegionGrow={handleSeedRegionGrow}
                      onRecordMeasurement={(distMm, planeLabel) => {
                        recordAuditAction(
                          'CALIBRATION_MEASURE',
                          'Millimeter Quality Control',
                          `Measured ${distMm.toFixed(2)} mm on ${planeLabel} slice at ±${calibrationMm.toFixed(2)} mm calibration.`,
                        );
                        showToast(`Measured ${distMm.toFixed(2)} mm on ${planeLabel} plane.`);
                      }}
                    />

                    {/* Viewport 4: Real-Time 3D WebGL Marching Cubes & XYZ Axis Viewport */}
                    <ThreeViewport
                      language={language}
                      meshData={meshData}
                      referenceMeshData={referenceMeshData}
                      meshOpacity={meshOpacity}
                      wireframe={wireframe}
                      compareMode={compareMode}
                      nerveOpacity={nerveOpacity}
                      teeth={teeth}
                      showTitaniumImplant={showTitaniumImplant}
                      showLaserScanner={showLaserScanner}
                      slices={slices}
                      xyzOffsetMm={xyzOffsetMm}
                      onToggleTooth={handleToggleTooth}
                      onChangeXyzOffset={setXyzOffsetMm}
                    />
                  </div>

                  {/* Interactive Upper (Maxillofacial) & Lower (Mandibular) Dentition Odontogram Bar */}
                  <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
                          ODONTOGRAM & SELECTIVE TOOTH EXTRACTION SIMULATOR
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t.teethManagerTitle}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetAllTeethVisibility(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#00E5FF]" />
                          <span>{t.showAllTeeth}</span>
                        </button>
                        <button
                          onClick={() => handleSetAllTeethVisibility(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.hideAllTeeth}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Upper Maxillofacial Teeth */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {t.upperTeethLabel}
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {teeth
                            .filter((item) => item.arch === 'upper')
                            .map((tooth) => (
                              <button
                                key={tooth.id}
                                onClick={() => handleToggleTooth(tooth.id)}
                                title={language === 'en' ? tooth.nameEn : tooth.nameId}
                                className={`py-1.5 px-1 rounded text-center font-mono text-xs transition-all cursor-pointer border ${
                                  tooth.visible
                                    ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-slate-900 dark:text-[#00E5FF] font-bold'
                                    : 'bg-slate-200/50 dark:bg-[#112240] border-slate-300 dark:border-slate-800 text-slate-400 line-through'
                                }`}
                              >
                                {tooth.fdiNumber}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Lower Mandibular Teeth */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {t.lowerTeethLabel}
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {teeth
                            .filter((item) => item.arch === 'lower')
                            .map((tooth) => (
                              <button
                                key={tooth.id}
                                onClick={() => handleToggleTooth(tooth.id)}
                                title={language === 'en' ? tooth.nameEn : tooth.nameId}
                                className={`py-1.5 px-1 rounded text-center font-mono text-xs transition-all cursor-pointer border ${
                                  tooth.visible
                                    ? 'bg-[#FFD700]/15 border-[#FFD700] text-amber-900 dark:text-[#FFD700] font-bold'
                                    : 'bg-slate-200/50 dark:bg-[#112240] border-slate-300 dark:border-slate-800 text-slate-400 line-through'
                                }`}
                              >
                                {tooth.fdiNumber}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 4 Columns: Hounsfield Thresholding, Scatter Cleanup Toolkit, Nerve & Prosthetic Controls, and 5-Step Guided Lab */}
                <div className="lg:col-span-4 space-y-5">
                  {/* 1. Hounsfield Unit (HU) Dual-Slider Thresholding Panel */}
                  <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t.huThresholdTitle}
                      </h2>
                      <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] tabular-nums">
                        {minHU} .. {maxHU} HU
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                          <span>{t.minHu}</span>
                          <span>{minHU} HU</span>
                        </div>
                        <input
                          type="range"
                          min={-500}
                          max={2000}
                          step={10}
                          value={minHU}
                          onChange={(e) => {
                            const val = Math.min(maxHU - 50, parseInt(e.target.value, 10));
                            setMinHU(val);
                          }}
                          className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                          <span>{t.maxHu}</span>
                          <span>{maxHU} HU</span>
                        </div>
                        <input
                          type="range"
                          min={500}
                          max={3150}
                          step={10}
                          value={maxHU}
                          onChange={(e) => {
                            const val = Math.max(minHU + 50, parseInt(e.target.value, 10));
                            setMaxHU(val);
                          }}
                          className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Quick Clinical HU Presets */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            setMinHU(350);
                            setMaxHU(2450);
                          }}
                          className="px-2 py-1.5 rounded bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Cortical (350-2450)
                        </button>
                        <button
                          onClick={() => {
                            setMinHU(160);
                            setMaxHU(1400);
                          }}
                          className="px-2 py-1.5 rounded bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Trabecular (160+)
                        </button>
                        <button
                          onClick={() => {
                            setMinHU(2200);
                            setMaxHU(3150);
                          }}
                          className="px-2 py-1.5 rounded bg-slate-100 dark:bg-[#0A192F] hover:border-[#FFD700] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-amber-700 dark:text-[#FFD700] cursor-pointer"
                        >
                          Enamel/Metal
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Scatter & Metal Artifact Cleanup Toolkit */}
                  <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t.cleanupToolkitTitle}
                      </h2>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Cleaned: {scatterCleanedCount} vox
                      </span>
                    </div>

                    {/* Interactive Pointer Tool Mode Selector */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setActiveTool('navigate')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeTool === 'navigate'
                            ? 'bg-[#00E5FF] text-[#0A192F] border-[#00E5FF] font-semibold'
                            : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Crosshair className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.toolNavigate}</span>
                      </button>

                      <button
                        onClick={() => setActiveTool('brush')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeTool === 'brush'
                            ? 'bg-[#00E5FF] text-[#0A192F] border-[#00E5FF] font-semibold'
                            : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Eraser className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.toolBrushErase}</span>
                      </button>

                      <button
                        onClick={() => setActiveTool('lasso')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeTool === 'lasso'
                            ? 'bg-[#00E5FF] text-[#0A192F] border-[#00E5FF] font-semibold'
                            : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.toolLassoErase}</span>
                      </button>

                      <button
                        onClick={() => setActiveTool('region_grow')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeTool === 'region_grow'
                            ? 'bg-[#FFD700] text-[#0A192F] border-[#FFD700] font-semibold'
                            : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.toolRegionGrow}</span>
                      </button>

                      <button
                        onClick={() => setActiveTool('caliper')}
                        className={`col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeTool === 'caliper'
                            ? 'bg-[#FFD700] text-[#0A192F] border-[#FFD700] font-semibold'
                            : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Ruler className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t.toolCaliper} (±{calibrationMm.toFixed(2)} mm)
                        </span>
                      </button>
                    </div>

                    {activeTool === 'brush' && (
                      <div className="flex items-center justify-between gap-3 text-xs font-mono">
                        <span>Brush Radius: {brushRadius} vox</span>
                        <input
                          type="range"
                          min={1}
                          max={4}
                          value={brushRadius}
                          onChange={(e) => setBrushRadius(parseInt(e.target.value, 10))}
                          className="w-36 accent-[#00E5FF] cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Automated Volumetric Cleanup Actions */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <button
                        onClick={() => handleSeedRegionGrow([20, 16, 23])}
                        className="w-full py-2 px-3 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/50 hover:bg-[#00E5FF]/25 text-slate-900 dark:text-[#00E5FF] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {t.autoSeparateCondyleBtn}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleRemoveIslands}
                          className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          {t.removeIslandsBtn}
                        </button>
                        <button
                          onClick={handleCleanAllDentalScatter}
                          className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#FFD700] text-xs font-medium text-slate-800 dark:text-[#FFD700] transition-colors cursor-pointer"
                        >
                          {language === 'en' ? 'Trim Dental Scatter' : 'Bersihkan Hamburan'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setLandmarks(detectAnatomicalLandmarks(volume));
                            showToast(
                              language === 'en'
                                ? '5 Craniomaxillofacial Landmarks segmented on 2D slices.'
                                : '5 Titik Anatomi Kraniomaksilofasial ditandai pada irisan 2D.',
                            );
                          }}
                          className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          {t.detectLandmarksBtn}
                        </button>
                        <button
                          onClick={handleResetRawVolume}
                          className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-red-400 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.resetVolumeBtn}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Mandibular Nerve Pathway, 3D Mesh Smoothing, Titanium Prosthetic & Laser Scan Controls */}
                  <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.nervePathwayTitle}
                    </h2>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-amber-700 dark:text-[#FFD700] mb-1 tabular-nums">
                        <span>{t.nerveOpacityLabel}</span>
                        <span>{Math.round(nerveOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={nerveOpacity}
                        onChange={(e) => setNerveOpacity(parseFloat(e.target.value))}
                        className="w-full accent-[#FFD700] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                        <span>{t.meshOpacityLabel}</span>
                        <span>{Math.round(meshOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={1}
                        step={0.05}
                        value={meshOpacity}
                        onChange={(e) => setMeshOpacity(parseFloat(e.target.value))}
                        className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                        <span>{t.meshSmoothingLabel}</span>
                        <span>{smoothingIterations} passes</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={1}
                        value={smoothingIterations}
                        onChange={(e) => setSmoothingIterations(parseInt(e.target.value, 10))}
                        className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                        <span className="font-medium">{t.titaniumImplantToggle}</span>
                        <input
                          type="checkbox"
                          checked={showTitaniumImplant}
                          onChange={(e) => {
                            setShowTitaniumImplant(e.target.checked);
                            if (e.target.checked) {
                              recordAuditAction(
                                'PROSTHETIC_ALIGN',
                                '3D Prosthetic Titanium Fit',
                                'Activated Ti-6Al-4V TMJ condylar prosthetic implant & fossa cup alignment.',
                              );
                            }
                          }}
                          className="w-4 h-4 accent-[#00E5FF]"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                        <span className="font-medium">{t.laserScannerToggle}</span>
                        <input
                          type="checkbox"
                          checked={showLaserScanner}
                          onChange={(e) => setShowLaserScanner(e.target.checked)}
                          className="w-4 h-4 accent-[#00E5FF]"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                        <span className="font-medium">{t.wireframeToggle}</span>
                        <input
                          type="checkbox"
                          checked={wireframe}
                          onChange={(e) => setWireframe(e.target.checked)}
                          className="w-4 h-4 accent-[#00E5FF]"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Module Guided Vocational Lab Workflow & Reference Comparison Overlay Panel */}
              <GuidedLabPanel
                language={language}
                activeStepIndex={activeLabStep}
                completedModuleIds={completedModules}
                comparisonMetrics={comparisonMetrics}
                compareMode={compareMode}
                onSelectStep={setActiveLabStep}
                onCompleteModule={handleCompleteModule}
                onRunGuidedStepAction={handleRunGuidedStepAction}
                onToggleCompareMode={() => setCompareMode((c) => !c)}
                onExportStl={() => {
                  exportMeshToSTL(meshData, volume.name);
                  recordAuditAction(
                    'MESH_EXPORT',
                    'Module 5: Guided STL Export',
                    `Exported verified .STL mesh (Dice: ${comparisonMetrics.diceScore.toFixed(1)}%).`,
                  );
                }}
              />
            </div>
          )}

          {activeSection === 'glossary' && (
            <AiGlossaryAssistant
              language={language}
              labContextSummary={`Dataset: ${volume?.name || datasetId}, HU Window: ${minHU} to ${maxHU} HU, Dice Score vs Reference: ${comparisonMetrics.diceScore.toFixed(1)}%, Calibration Precision: ${calibrationMm} mm`}
              onNotify={showToast}
            />
          )}

          {activeSection === 'audit' && (
            <AuditPerformanceDashboard
              language={language}
              auditLogs={auditLogs}
              userDisplayName={currentUser?.displayName || null}
              userEmail={currentUser?.email || null}
              userRole={userRole}
              cacheLatencyMs={cacheLatencyMs}
              meshComputeMs={meshData.computeTimeMs}
              triangleCount={meshData.triangleCount}
              diceScore={comparisonMetrics.diceScore}
              minHU={minHU}
              maxHU={maxHU}
              calibrationMm={calibrationMm}
              isSyncingCloud={isSyncingCloud}
              onSyncToCloud={handleSyncToCloud}
              onChangeRole={(newRole) => setUserRole(newRole)}
            />
          )}
        </main>

        {/* Quiet Clinical Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0A192F]">
          <span>
            Karina 3D Lab · Interactive Indonesian & English Vocational Workstation for CT Segmentation, Scatter Artifact Cleanup, and 3D Skeletal Anatomical Modeling and computer tomography
          </span>
          <span>
            For Educational & Synthetic Phantom Training Only — Not for Clinical Surgical Use
          </span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
