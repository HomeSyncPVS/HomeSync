import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Sparkles, 
  Search, 
  Undo2, 
  Redo2, 
  Save, 
  Wand2, 
  X, 
  ShieldAlert,
  Edit2,
  Layers,
  RotateCcw,
  PlusCircle,
  LayoutGrid
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import type { SocietyResponse, FlatUpdateRequest } from '../types/auth';

// Schematic Types (Distinguishes Real DB IDs vs. Local Temp IDs)
export interface SchematicUnit {
  tempId: string;
  dbId?: string; // Real backend UUID if existing
  number: string;
  type: string;
  size: number;
  occupancy_status?: string;
}

export interface SchematicFloor {
  tempId: string;
  dbId?: string; // Real backend UUID if existing
  floorNumber: number;
  name: string;
  units: SchematicUnit[];
}

export interface SchematicWing {
  tempId: string;
  dbId?: string; // Real backend UUID if existing
  name: string;
  floors: SchematicFloor[];
}

export interface PatternUnitConfig {
  type: string;
  size: number; // in sq.ft
  count: number;
}

export interface CustomPattern {
  id: string;
  name: string;
  items: PatternUnitConfig[];
}

export interface UnitTypeItem {
  type: string;
  label: string;
  defaultSize: number;
  color: string;
  badgeBg: string;
}

const DEFAULT_UNIT_TYPES: UnitTypeItem[] = [
  { type: '1BHK', label: '1 BHK', defaultSize: 650, color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  { type: '2BHK', label: '2 BHK', defaultSize: 1000, color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  { type: '3BHK', label: '3 BHK', defaultSize: 1450, color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  { type: '4BHK', label: '4 BHK', defaultSize: 2100, color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  { type: 'Studio', label: 'Studio', defaultSize: 450, color: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200' },
  { type: 'Penthouse', label: 'Penthouse', defaultSize: 3000, color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
];

export const ResidencyStructureSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Society Info
  const [society, setSociety] = useState<SocietyResponse | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mode: First-Time Creation (0 records) vs. Existing Structure Editor
  const [isEditMode, setIsEditMode] = useState(false);

  // Original Snapshot (Immutable snapshot of database records upon load)
  const [originalSnapshot, setOriginalSnapshot] = useState<SchematicWing[]>([]);

  // Current Working Schematic (Local design state)
  const [schematic, setSchematic] = useState<SchematicWing[]>([]);

  // Custom User-Created Patterns (Single Source of Truth, 0 default patterns)
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([]);

  // Selected Wing & Navigation
  const [selectedWingId, setSelectedWingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabMobile, setActiveTabMobile] = useState<'navigator' | 'canvas' | 'generator'>('canvas');

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<SchematicWing[][]>([]);
  const [redoStack, setRedoStack] = useState<SchematicWing[][]>([]);

  // Unit Types Library
  const [unitTypes] = useState<UnitTypeItem[]>(DEFAULT_UNIT_TYPES);

  // Bulk flat type selection
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // Modals & Action States
  const [activeModal, setActiveModal] = useState<
    'addWing' | 'renameWing' | 'duplicateWing' | 'deleteWing' |
    'addFloor' | 'generateFloors' | 'duplicateFloor' | 'deleteFloor' |
    'generateFlats' | 'editUnit' | 'createPattern' | 'editPattern' |
    'patternMismatch' | 'saveChanges' | 'discardChanges' | null
  >(null);

  // Active Target references for modals
  const [targetWingId, setTargetWingId] = useState<string | null>(null);
  const [targetFloorId, setTargetFloorId] = useState<string | null>(null);
  const [targetUnit, setTargetUnit] = useState<{ wingId: string; floorId: string; unit: SchematicUnit } | null>(null);
  const [targetPatternId, setTargetPatternId] = useState<string | null>(null);
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);

  // Modal Form Inputs
  const [modalWingName, setModalWingName] = useState('');
  const [modalFloorName, setModalFloorName] = useState('');
  const [modalFloorNumber, setModalFloorNumber] = useState<number | ''>(1);
  const [modalStartFlatNumber, setModalStartFlatNumber] = useState<string>('101');
  const [modalFlatCount, setModalFlatCount] = useState<number>(4);
  const [modalFlatIncrement, setModalFlatIncrement] = useState<number>(1);
  const [modalDefaultFlatType, setModalDefaultFlatType] = useState<string>('2BHK');

  // Generate Flats Method Selector
  const [genMethod, setGenMethod] = useState<'manual' | 'pattern'>('manual');
  const [selectedPatternIdInModal, setSelectedPatternIdInModal] = useState<string>('');
  const [patternSearchQuery, setPatternSearchQuery] = useState<string>('');

  // Multi-floor generator inputs
  const [genFloorsCount, setGenFloorsCount] = useState<number>(5);
  const [genStartFloorNum, setGenStartFloorNum] = useState<number>(1);

  // Custom Pattern Form Inputs (Type + Sq.Ft. + Quantity)
  const [patternName, setPatternName] = useState('');
  const [patternItems, setPatternItems] = useState<PatternUnitConfig[]>([
    { type: '1BHK', size: 650, count: 2 },
    { type: '2BHK', size: 950, count: 3 },
    { type: '3BHK', size: 1250, count: 1 },
  ]);

  // Save / Publish Progress States
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // ----------------------------------------------------
  // FETCH EXISTING STRUCTURE OR START FROM SCRATCH
  // ----------------------------------------------------
  const loadExistingStructure = useCallback(async () => {
    if (!user?.society_id) return;
    setIsLoadingExisting(true);
    setLoadError(null);

    try {
      const soc = await authService.getSociety(user.society_id);
      setSociety(soc);

      const wings = await authService.listWings(user.society_id);

      if (wings.length === 0) {
        setIsEditMode(false);
        setOriginalSnapshot([]);
        setSchematic([]);
        setSelectedWingId(null);
      } else {
        setIsEditMode(true);
        const fullWings: SchematicWing[] = await Promise.all(
          wings.map(async (w) => {
            const floors = await authService.listFloors(w.id);
            const floorsWithFlats = await Promise.all(
              floors.map(async (fl) => {
                const flats = await authService.listFlats(w.id, fl.id);
                return {
                  tempId: `floor-db-${fl.id}`,
                  dbId: fl.id,
                  floorNumber: fl.floor_number,
                  name: fl.floor_number === 0 ? 'Ground Floor' : `Floor ${fl.floor_number}`,
                  units: flats.map((f) => ({
                    tempId: `flat-db-${f.id}`,
                    dbId: f.id,
                    number: f.flat_number,
                    type: f.flat_type,
                    size: f.flat_size,
                    occupancy_status: f.occupancy_status,
                  })),
                };
              })
            );
            floorsWithFlats.sort((a, b) => b.floorNumber - a.floorNumber);
            return {
              tempId: `wing-db-${w.id}`,
              dbId: w.id,
              name: w.name,
              floors: floorsWithFlats,
            };
          })
        );

        setOriginalSnapshot(JSON.parse(JSON.stringify(fullWings)));
        setSchematic(JSON.parse(JSON.stringify(fullWings)));
        if (fullWings.length > 0) {
          setSelectedWingId(fullWings[0].tempId);
        }
      }
    } catch (err: any) {
      setLoadError(err.message || 'Unable to load residency structure.');
    } finally {
      setIsLoadingExisting(false);
    }
  }, [user?.society_id]);

  useEffect(() => {
    loadExistingStructure();
  }, [loadExistingStructure]);

  // Helper to push history state
  const updateSchematicWithHistory = (newSchematic: SchematicWing[]) => {
    setUndoStack((prev) => [...prev.slice(-20), schematic]);
    setRedoStack([]);
    setSchematic(newSchematic);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [schematic, ...prev]);
    setUndoStack((prev) => prev.slice(0, -1));
    setSchematic(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, schematic]);
    setRedoStack((prev) => prev.slice(1));
    setSchematic(next);
  };

  // Save Draft locally
  const handleSaveDraft = () => {
    if (user?.society_id) {
      localStorage.setItem(`homesync_schematic_${user.society_id}`, JSON.stringify(schematic));
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2500);
    }
  };

  // ----------------------------------------------------
  // DIFF ENGINE: CALCULATE CREATED, UPDATED, DELETED
  // ----------------------------------------------------
  const diff = useMemo(() => {
    // 1. Wings
    const createdWings = schematic.filter((w) => !w.dbId);
    const updatedWings = schematic.filter((w) => {
      if (!w.dbId) return false;
      const original = originalSnapshot.find((ow) => ow.dbId === w.dbId);
      return original && original.name !== w.name;
    });
    const deletedWings = originalSnapshot.filter((ow) => !schematic.some((w) => w.dbId === ow.dbId));

    // 2. Floors
    const createdFloors: Array<{ wing: SchematicWing; floor: SchematicFloor }> = [];
    const updatedFloors: Array<{ wing: SchematicWing; floor: SchematicFloor; original: SchematicFloor }> = [];
    const deletedFloors: Array<{ wingDbId: string; floorDbId: string; name: string }> = [];

    schematic.forEach((w) => {
      w.floors.forEach((fl) => {
        if (!fl.dbId) {
          createdFloors.push({ wing: w, floor: fl });
        } else {
          const origWing = originalSnapshot.find((ow) => ow.dbId === w.dbId);
          const origFloor = origWing?.floors.find((ofl) => ofl.dbId === fl.dbId);
          if (origFloor && (origFloor.floorNumber !== fl.floorNumber || origFloor.name !== fl.name)) {
            updatedFloors.push({ wing: w, floor: fl, original: origFloor });
          }
        }
      });
    });

    originalSnapshot.forEach((ow) => {
      ow.floors.forEach((ofl) => {
        const stillExists = schematic.some((w) => w.floors.some((fl) => fl.dbId === ofl.dbId));
        if (!stillExists && ofl.dbId && ow.dbId) {
          deletedFloors.push({ wingDbId: ow.dbId, floorDbId: ofl.dbId, name: ofl.name });
        }
      });
    });

    // 3. Flats
    const createdFlats: Array<{ wing: SchematicWing; floor: SchematicFloor; unit: SchematicUnit }> = [];
    const updatedFlats: Array<{ 
      unit: SchematicUnit; 
      original: SchematicUnit;
      changedNumber: boolean;
      changedType: boolean;
      changedSize: boolean;
    }> = [];
    const deletedFlats: Array<{ flatDbId: string; number: string }> = [];

    schematic.forEach((w) => {
      w.floors.forEach((fl) => {
        fl.units.forEach((u) => {
          if (!u.dbId) {
            createdFlats.push({ wing: w, floor: fl, unit: u });
          } else {
            let origUnit: SchematicUnit | undefined;
            for (const ow of originalSnapshot) {
              for (const ofl of ow.floors) {
                const found = ofl.units.find((ou) => ou.dbId === u.dbId);
                if (found) {
                  origUnit = found;
                  break;
                }
              }
              if (origUnit) break;
            }
            if (origUnit) {
              const changedNumber = origUnit.number !== u.number;
              const changedType = origUnit.type !== u.type;
              const changedSize = origUnit.size !== u.size;

              if (changedNumber || changedType || changedSize) {
                updatedFlats.push({ 
                  unit: u, 
                  original: origUnit,
                  changedNumber,
                  changedType,
                  changedSize
                });
              }
            }
          }
        });
      });
    });

    originalSnapshot.forEach((ow) => {
      ow.floors.forEach((ofl) => {
        ofl.units.forEach((ou) => {
          const stillExists = schematic.some((w) => w.floors.some((fl) => fl.units.some((u) => u.dbId === ou.dbId)));
          if (!stillExists && ou.dbId) {
            deletedFlats.push({ flatDbId: ou.dbId, number: ou.number });
          }
        });
      });
    });

    const totalChanges = 
      createdWings.length + updatedWings.length + deletedWings.length +
      createdFloors.length + updatedFloors.length + deletedFloors.length +
      createdFlats.length + updatedFlats.length + deletedFlats.length;

    return {
      createdWings,
      updatedWings,
      deletedWings,
      createdFloors,
      updatedFloors,
      deletedFloors,
      createdFlats,
      updatedFlats,
      deletedFlats,
      totalChanges,
    };
  }, [schematic, originalSnapshot]);

  // ----------------------------------------------------
  // WING ACTIONS
  // ----------------------------------------------------
  const handleOpenAddWing = () => {
    setModalWingName('');
    setActiveModal('addWing');
  };

  const handleConfirmAddWing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalWingName.trim()) return;
    const newWingId = `wing-temp-${Date.now()}`;
    const newWing: SchematicWing = {
      tempId: newWingId,
      name: modalWingName.trim(),
      floors: [],
    };
    const updated = [...schematic, newWing];
    updateSchematicWithHistory(updated);
    setSelectedWingId(newWingId);
    setActiveModal(null);
    setModalWingName('');
  };

  const handleOpenRenameWing = (wing: SchematicWing) => {
    setTargetWingId(wing.tempId);
    setModalWingName(wing.name);
    setActiveModal('renameWing');
  };

  const handleConfirmRenameWing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalWingName.trim() || !targetWingId) return;
    const updated = schematic.map((w) => {
      if (w.tempId !== targetWingId) return w;
      return { ...w, name: modalWingName.trim() };
    });
    updateSchematicWithHistory(updated);
    setActiveModal(null);
    setTargetWingId(null);
  };

  const handleOpenDuplicateWing = (wing: SchematicWing) => {
    setTargetWingId(wing.tempId);
    setModalWingName(`${wing.name} Copy`);
    setActiveModal('duplicateWing');
  };

  const handleConfirmDuplicateWing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalWingName.trim() || !targetWingId) return;
    const sourceWing = schematic.find((w) => w.tempId === targetWingId);
    if (!sourceWing) return;

    const newWingId = `wing-temp-${Date.now()}`;
    const clonedFloors: SchematicFloor[] = sourceWing.floors.map((f, fIdx) => ({
      tempId: `floor-temp-${Date.now()}-${fIdx}`,
      floorNumber: f.floorNumber,
      name: f.name,
      units: f.units.map((u, uIdx) => ({
        tempId: `unit-temp-${Date.now()}-${fIdx}-${uIdx}`,
        number: u.number,
        type: u.type,
        size: u.size,
      })),
    }));

    const newWing: SchematicWing = {
      tempId: newWingId,
      name: modalWingName.trim(),
      floors: clonedFloors,
    };

    const updated = [...schematic, newWing];
    updateSchematicWithHistory(updated);
    setSelectedWingId(newWingId);
    setActiveModal(null);
    setTargetWingId(null);
  };

  const handleOpenDeleteWing = (wing: SchematicWing) => {
    setTargetWingId(wing.tempId);
    setActiveModal('deleteWing');
  };

  const handleConfirmDeleteWing = () => {
    if (!targetWingId) return;
    const updated = schematic.filter((w) => w.tempId !== targetWingId);
    updateSchematicWithHistory(updated);
    if (selectedWingId === targetWingId) {
      setSelectedWingId(updated.length > 0 ? updated[0].tempId : null);
    }
    setActiveModal(null);
    setTargetWingId(null);
  };

  // ----------------------------------------------------
  // FLOOR ACTIONS
  // ----------------------------------------------------
  const handleOpenAddFloor = (wingId: string) => {
    setTargetWingId(wingId);
    const targetWing = schematic.find((w) => w.tempId === wingId);
    const maxFloor = targetWing?.floors.reduce((max, f) => Math.max(max, f.floorNumber), 0) || 0;
    const nextNum = maxFloor + 1;
    setModalFloorNumber(nextNum);
    setModalFloorName(nextNum === 0 ? 'Ground Floor' : `Floor ${nextNum}`);
    setActiveModal('addFloor');
  };

  const handleConfirmAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWingId || modalFloorNumber === '') return;
    const updated = schematic.map((w) => {
      if (w.tempId !== targetWingId) return w;
      const newFloor: SchematicFloor = {
        tempId: `floor-temp-${Date.now()}`,
        floorNumber: Number(modalFloorNumber),
        name: modalFloorName.trim() || `Floor ${modalFloorNumber}`,
        units: [],
      };
      const sorted = [...w.floors, newFloor].sort((a, b) => b.floorNumber - a.floorNumber);
      return { ...w, floors: sorted };
    });
    updateSchematicWithHistory(updated);
    setActiveModal(null);
  };

  const handleOpenGenerateFloors = (wingId: string) => {
    setTargetWingId(wingId);
    setGenFloorsCount(5);
    setGenStartFloorNum(1);
    setActiveModal('generateFloors');
  };

  const handleConfirmGenerateFloors = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWingId || !genFloorsCount) return;
    const updated = schematic.map((w) => {
      if (w.tempId !== targetWingId) return w;
      const newFloors: SchematicFloor[] = [];
      for (let i = 0; i < genFloorsCount; i++) {
        const fNum = genStartFloorNum + i;
        newFloors.push({
          tempId: `floor-temp-${Date.now()}-${fNum}`,
          floorNumber: fNum,
          name: fNum === 0 ? 'Ground Floor' : `Floor ${fNum}`,
          units: [],
        });
      }
      const existing = w.floors.filter((f) => !newFloors.some((nf) => nf.floorNumber === f.floorNumber));
      const combined = [...existing, ...newFloors].sort((a, b) => b.floorNumber - a.floorNumber);
      return { ...w, floors: combined };
    });
    updateSchematicWithHistory(updated);
    setActiveModal(null);
  };

  const handleOpenDuplicateFloor = (wingId: string, floor: SchematicFloor) => {
    setTargetWingId(wingId);
    setTargetFloorId(floor.tempId);
    const targetWing = schematic.find((w) => w.tempId === wingId);
    const maxFloor = targetWing?.floors.reduce((max, f) => Math.max(max, f.floorNumber), 0) || 0;
    const nextNum = maxFloor + 1;
    setModalFloorNumber(nextNum);
    setModalStartFlatNumber(`${nextNum}01`);
    setActiveModal('duplicateFloor');
  };

  const handleConfirmDuplicateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWingId || !targetFloorId || modalFloorNumber === '') return;
    const targetWing = schematic.find((w) => w.tempId === targetWingId);
    const sourceFloor = targetWing?.floors.find((f) => f.tempId === targetFloorId);
    if (!sourceFloor) return;

    const startNumInt = parseInt(modalStartFlatNumber, 10) || Number(modalFloorNumber) * 100 + 1;
    const duplicatedUnits: SchematicUnit[] = sourceFloor.units.map((u, idx) => ({
      tempId: `unit-temp-${Date.now()}-${idx}`,
      number: `${startNumInt + idx}`,
      type: u.type,
      size: u.size,
    }));

    const newFloor: SchematicFloor = {
      tempId: `floor-temp-${Date.now()}`,
      floorNumber: Number(modalFloorNumber),
      name: `Floor ${modalFloorNumber}`,
      units: duplicatedUnits,
    };

    const updated = schematic.map((w) => {
      if (w.tempId !== targetWingId) return w;
      const sorted = [...w.floors, newFloor].sort((a, b) => b.floorNumber - a.floorNumber);
      return { ...w, floors: sorted };
    });
    updateSchematicWithHistory(updated);
    setActiveModal(null);
  };

  const handleOpenDeleteFloor = (wingId: string, floorId: string) => {
    setTargetWingId(wingId);
    setTargetFloorId(floorId);
    setActiveModal('deleteFloor');
  };

  const handleConfirmDeleteFloor = () => {
    if (!targetWingId || !targetFloorId) return;
    const updated = schematic.map((w) => {
      if (w.tempId !== targetWingId) return w;
      return {
        ...w,
        floors: w.floors.filter((f) => f.tempId !== targetFloorId),
      };
    });
    updateSchematicWithHistory(updated);
    setActiveModal(null);
  };

  // ----------------------------------------------------
  // FLAT GENERATION MODAL (MANUAL + PATTERN MODES)
  // ----------------------------------------------------
  const handleOpenGenerateFlats = (wingId: string, floor: SchematicFloor) => {
    setTargetWingId(wingId);
    setTargetFloorId(floor.tempId);
    const suggestedStart = `${floor.floorNumber}01`;
    setModalStartFlatNumber(suggestedStart);
    setModalFlatCount(4);
    setModalFlatIncrement(1);
    setModalDefaultFlatType('2BHK');
    setGenMethod('manual');
    if (customPatterns.length > 0) {
      setSelectedPatternIdInModal(customPatterns[0].id);
    } else {
      setSelectedPatternIdInModal('');
    }
    setPatternSearchQuery('');
    setActiveModal('generateFlats');
  };

  // Filtered patterns in modal
  const filteredPatterns = useMemo(() => {
    if (!patternSearchQuery.trim()) return customPatterns;
    return customPatterns.filter((p) => p.name.toLowerCase().includes(patternSearchQuery.toLowerCase()));
  }, [customPatterns, patternSearchQuery]);

  const activeSelectedPattern = useMemo(() => {
    return customPatterns.find((p) => p.id === selectedPatternIdInModal) || (customPatterns.length > 0 ? customPatterns[0] : null);
  }, [customPatterns, selectedPatternIdInModal]);

  // Preview of Flat Numbers (Manual Mode)
  const manualFlatNumberPreview = useMemo(() => {
    const start = parseInt(modalStartFlatNumber, 10);
    if (isNaN(start) || modalFlatCount <= 0) {
      return [modalStartFlatNumber];
    }
    const count = Math.min(modalFlatCount, 8);
    const previewList: string[] = [];
    for (let i = 0; i < count; i++) {
      previewList.push(`${start + (i * modalFlatIncrement)}`);
    }
    return previewList;
  }, [modalStartFlatNumber, modalFlatCount, modalFlatIncrement]);

  // Preview of Pattern Generated Units (Pattern Mode)
  const patternFlatPreview = useMemo(() => {
    if (!activeSelectedPattern) return [];
    const start = parseInt(modalStartFlatNumber, 10);
    let currentIdx = 0;
    const previewList: Array<{ number: string; type: string; size: number }> = [];

    activeSelectedPattern.items.forEach((item) => {
      for (let i = 0; i < item.count; i++) {
        const num = isNaN(start) ? `${modalStartFlatNumber}-${currentIdx + 1}` : `${start + (currentIdx * modalFlatIncrement)}`;
        previewList.push({
          number: num,
          type: item.type,
          size: item.size,
        });
        currentIdx++;
      }
    });

    return previewList;
  }, [activeSelectedPattern, modalStartFlatNumber, modalFlatIncrement]);

  // Confirm Flat Generation (Handles both Manual & Pattern)
  const handleConfirmGenerateFlats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWingId || !targetFloorId) return;
    const targetWing = schematic.find((w) => w.tempId === targetWingId);
    const targetFloor = targetWing?.floors.find((f) => f.tempId === targetFloorId);
    if (!targetFloor) return;

    if (genMethod === 'manual') {
      // MANUAL GENERATION
      if (!modalFlatCount) return;
      const startNum = parseInt(modalStartFlatNumber, 10);
      const newUnits: SchematicUnit[] = [];
      const typeMeta = unitTypes.find((ut) => ut.type === modalDefaultFlatType);

      for (let i = 0; i < modalFlatCount; i++) {
        const num = isNaN(startNum) ? `${modalStartFlatNumber}-${i + 1}` : `${startNum + (i * modalFlatIncrement)}`;
        newUnits.push({
          tempId: `unit-temp-${Date.now()}-${i}`,
          number: num,
          type: modalDefaultFlatType,
          size: typeMeta?.defaultSize || 1000,
        });
      }

      const updated = schematic.map((w) => {
        if (w.tempId !== targetWingId) return w;
        return {
          ...w,
          floors: w.floors.map((fl) => {
            if (fl.tempId !== targetFloorId) return fl;
            return { ...fl, units: newUnits };
          }),
        };
      });

      updateSchematicWithHistory(updated);
      setActiveModal(null);
    } else {
      // USE PATTERN MODE
      if (!activeSelectedPattern) return;
      const totalPatternUnits = activeSelectedPattern.items.reduce((s, it) => s + it.count, 0);

      if (targetFloor.units.length > 0) {
        // Floor already has flats!
        if (targetFloor.units.length === totalPatternUnits) {
          // Exact quantity match -> Apply pattern mapping directly in current order, FLAT NUMBERS UNCHANGED!
          executeApplyPatternToExistingFloor(targetWingId, targetFloorId, activeSelectedPattern);
          setActiveModal(null);
        } else {
          // Mismatch -> Show Mismatch Options
          setTargetPatternId(activeSelectedPattern.id);
          setActiveModal('patternMismatch');
        }
      } else {
        // New / Empty floor -> Generate flats based on user's starting flat number & pattern
        const startNum = parseInt(modalStartFlatNumber, 10);
        let currentIdx = 0;
        const newUnits: SchematicUnit[] = [];

        activeSelectedPattern.items.forEach((item) => {
          for (let i = 0; i < item.count; i++) {
            const num = isNaN(startNum) ? `${modalStartFlatNumber}-${currentIdx + 1}` : `${startNum + (currentIdx * modalFlatIncrement)}`;
            newUnits.push({
              tempId: `unit-temp-${Date.now()}-${currentIdx}`,
              number: num,
              type: item.type,
              size: item.size,
            });
            currentIdx++;
          }
        });

        const updated = schematic.map((w) => {
          if (w.tempId !== targetWingId) return w;
          return {
            ...w,
            floors: w.floors.map((fl) => {
              if (fl.tempId !== targetFloorId) return fl;
              return { ...fl, units: newUnits };
            }),
          };
        });

        updateSchematicWithHistory(updated);
        setActiveModal(null);
      }
    }
  };

  const handleOpenEditUnit = (wingId: string, floorId: string, unit: SchematicUnit) => {
    setTargetUnit({ wingId, floorId, unit: { ...unit } });
    setActiveModal('editUnit');
  };

  const handleConfirmEditUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnit) return;
    const { wingId, floorId, unit } = targetUnit;

    const updated = schematic.map((w) => {
      if (w.tempId !== wingId) return w;
      return {
        ...w,
        floors: w.floors.map((fl) => {
          if (fl.tempId !== floorId) return fl;
          return {
            ...fl,
            units: fl.units.map((u) => (u.tempId === unit.tempId ? unit : u)),
          };
        }),
      };
    });

    updateSchematicWithHistory(updated);
    setActiveModal(null);
    setTargetUnit(null);
  };

  const handleDeleteUnit = (wingId: string, floorId: string, unitTempId: string) => {
    const updated = schematic.map((w) => {
      if (w.tempId !== wingId) return w;
      return {
        ...w,
        floors: w.floors.map((fl) => {
          if (fl.tempId !== floorId) return fl;
          return {
            ...fl,
            units: fl.units.filter((u) => u.tempId !== unitTempId),
          };
        }),
      };
    });
    updateSchematicWithHistory(updated);
  };

  // ----------------------------------------------------
  // CUSTOM PATTERNS (SINGLE SOURCE OF TRUTH)
  // ----------------------------------------------------
  const handleOpenCreatePattern = () => {
    setPatternName('');
    setPatternItems([
      { type: '1BHK', size: 650, count: 2 },
      { type: '2BHK', size: 950, count: 3 },
      { type: '3BHK', size: 1250, count: 1 },
    ]);
    setEditingPatternId(null);
    setActiveModal('createPattern');
  };

  const handleOpenEditPattern = (pattern: CustomPattern) => {
    setPatternName(pattern.name);
    setPatternItems(JSON.parse(JSON.stringify(pattern.items)));
    setEditingPatternId(pattern.id);
    setActiveModal('createPattern');
  };

  const handleDuplicateCustomPattern = (pattern: CustomPattern) => {
    const newPattern: CustomPattern = {
      id: `pattern-${Date.now()}`,
      name: `${pattern.name} Copy`,
      items: JSON.parse(JSON.stringify(pattern.items)),
    };
    setCustomPatterns((prev) => [...prev, newPattern]);
  };

  const handleSaveCustomPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternName.trim()) return;

    if (editingPatternId) {
      setCustomPatterns((prev) =>
        prev.map((p) =>
          p.id === editingPatternId
            ? { ...p, name: patternName.trim(), items: patternItems.filter((it) => it.count > 0) }
            : p
        )
      );
      setActiveModal(null);
    } else {
      const newPatternId = `pattern-${Date.now()}`;
      const newPattern: CustomPattern = {
        id: newPatternId,
        name: patternName.trim(),
        items: patternItems.filter((it) => it.count > 0),
      };
      setCustomPatterns((prev) => [...prev, newPattern]);
      setSelectedPatternIdInModal(newPatternId);
      // If we opened pattern creator from generate flats modal, return back to it
      if (targetFloorId) {
        setGenMethod('pattern');
        setActiveModal('generateFlats');
      } else {
        setActiveModal(null);
      }
    }
    setEditingPatternId(null);
  };

  const handleDeleteCustomPattern = (patternId: string) => {
    setCustomPatterns((prev) => prev.filter((p) => p.id !== patternId));
    if (selectedPatternIdInModal === patternId) {
      setSelectedPatternIdInModal('');
    }
  };

  // Direct mapping on matching existing floor (Flat numbers PRESERVED 100%)
  const executeApplyPatternToExistingFloor = (wingId: string, floorId: string, pattern: CustomPattern) => {
    const flattenedConfig: Array<{ type: string; size: number }> = [];
    pattern.items.forEach((item) => {
      for (let i = 0; i < item.count; i++) {
        flattenedConfig.push({ type: item.type, size: item.size });
      }
    });

    const updated = schematic.map((w) => {
      if (w.tempId !== wingId) return w;
      return {
        ...w,
        floors: w.floors.map((fl) => {
          if (fl.tempId !== floorId) return fl;
          return {
            ...fl,
            units: fl.units.map((u, idx) => {
              const cfg = flattenedConfig[idx];
              if (!cfg) return u;
              return {
                ...u, // Retains existing flat number, tempId, and dbId!
                type: cfg.type,
                size: cfg.size,
              };
            }),
          };
        }),
      };
    });

    updateSchematicWithHistory(updated);
  };

  // Bulk Unit Type Assignment
  const handleToggleSelectUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => 
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleBulkAssignType = (type: string) => {
    if (selectedUnitIds.length === 0) return;
    const typeMeta = unitTypes.find((ut) => ut.type === type);
    const updated = schematic.map((w) => ({
      ...w,
      floors: w.floors.map((fl) => ({
        ...fl,
        units: fl.units.map((u) => {
          if (selectedUnitIds.includes(u.tempId)) {
            return { ...u, type, size: typeMeta?.defaultSize || u.size };
          }
          return u;
        }),
      })),
    }));
    updateSchematicWithHistory(updated);
    setSelectedUnitIds([]);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalWings = schematic.length;
    const totalFloors = schematic.reduce((acc, w) => acc + w.floors.length, 0);
    const totalUnits = schematic.reduce((acc, w) => acc + w.floors.reduce((fAcc, fl) => fAcc + fl.units.length, 0), 0);
    const byType: Record<string, number> = {};

    schematic.forEach((w) => {
      w.floors.forEach((fl) => {
        fl.units.forEach((u) => {
          byType[u.type] = (byType[u.type] || 0) + 1;
        });
      });
    });

    return { totalWings, totalFloors, totalUnits, byType };
  }, [schematic]);

  // Validation Checks Before Save / Publish
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (schematic.length === 0) {
      issues.push('No wings in blueprint. Add at least one wing.');
      return issues;
    }

    const wingNames = new Set<string>();
    schematic.forEach((w) => {
      if (!w.name.trim()) {
        issues.push('A wing is missing a name.');
      } else if (wingNames.has(w.name.trim().toLowerCase())) {
        issues.push(`Duplicate wing name: "${w.name}".`);
      }
      wingNames.add(w.name.trim().toLowerCase());

      if (w.floors.length === 0) {
        issues.push(`${w.name} has no floors added.`);
      }

      const unitNumbers = new Set<string>();
      w.floors.forEach((fl) => {
        if (fl.units.length === 0) {
          issues.push(`${w.name} → ${fl.name} has no flats.`);
        }
        fl.units.forEach((u) => {
          if (!u.number.trim()) {
            issues.push(`${w.name} → ${fl.name} contains an empty flat number.`);
          }
          if (unitNumbers.has(u.number.trim())) {
            issues.push(`${w.name} has duplicate flat number: "${u.number}".`);
          }
          unitNumbers.add(u.number.trim());
        });
      });
    });

    return issues;
  }, [schematic]);

  // ----------------------------------------------------
  // SAVE CHANGES (ONLY PERSIST DIFF TO DATABASE)
  // ----------------------------------------------------
  const handleExecuteSaveOrPublish = async () => {
    if (!user?.society_id) {
      setSaveError('No active residency session found.');
      return;
    }
    if (validationIssues.length > 0) {
      setSaveError('Please fix all blueprint validation issues before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (!isEditMode) {
        // SCENARIO A: First-time Publish (All items are new)
        for (let wIdx = 0; wIdx < schematic.length; wIdx++) {
          const wing = schematic[wIdx];
          setSaveProgress(`Creating ${wing.name} (${wIdx + 1} of ${schematic.length})...`);
          
          const createdWing = await authService.createWing({
            name: wing.name,
            society_id: user.society_id,
          });

          for (let fIdx = 0; fIdx < wing.floors.length; fIdx++) {
            const floor = wing.floors[fIdx];
            setSaveProgress(`Building ${wing.name} → Floor ${floor.floorNumber}...`);

            const createdFloor = await authService.createFloor({
              floor_number: floor.floorNumber,
              wing_id: createdWing.id,
            });

            for (const unit of floor.units) {
              await authService.createFlat({
                flat_number: unit.number,
                flat_type: unit.type,
                flat_size: unit.size || 1000,
                occupancy_status: 'VACANT',
                floor_id: createdFloor.id,
                wing_id: createdWing.id,
                society_id: user.society_id,
              });
            }
          }
        }
      } else {
        // SCENARIO B: Existing Structure (Save ONLY Changed Records!)
        
        // 1. DELETE removed flats
        for (const df of diff.deletedFlats) {
          setSaveProgress(`Removing deleted Flat ${df.number}...`);
          await authService.deleteFlat(df.flatDbId);
        }

        // 2. DELETE removed floors
        for (const dfl of diff.deletedFloors) {
          setSaveProgress(`Removing deleted ${dfl.name}...`);
          await authService.deleteFloor(dfl.floorDbId);
        }

        // 3. DELETE removed wings
        for (const dw of diff.deletedWings) {
          if (dw.dbId) {
            setSaveProgress(`Removing deleted ${dw.name}...`);
            await authService.deleteWing(dw.dbId);
          }
        }

        // 4. UPDATE modified wings
        for (const uw of diff.updatedWings) {
          if (uw.dbId) {
            setSaveProgress(`Updating ${uw.name}...`);
            await authService.updateWing(uw.dbId, { name: uw.name });
          }
        }

        // 5. UPDATE modified flats (Only send fields that actually changed!)
        for (const uf of diff.updatedFlats) {
          if (uf.unit.dbId) {
            setSaveProgress(`Updating Flat ${uf.unit.number}...`);
            const updatePayload: FlatUpdateRequest = {};
            if (uf.changedNumber) updatePayload.flat_number = uf.unit.number;
            if (uf.changedType) updatePayload.flat_type = uf.unit.type;
            if (uf.changedSize) updatePayload.flat_size = uf.unit.size;

            await authService.updateFlat(uf.unit.dbId, updatePayload);
          }
        }

        // 6. CREATE newly added wings, their floors & flats
        for (const cw of diff.createdWings) {
          setSaveProgress(`Creating new ${cw.name}...`);
          const createdWing = await authService.createWing({
            name: cw.name,
            society_id: user.society_id,
          });

          for (const floor of cw.floors) {
            const createdFloor = await authService.createFloor({
              floor_number: floor.floorNumber,
              wing_id: createdWing.id,
            });

            for (const unit of floor.units) {
              await authService.createFlat({
                flat_number: unit.number,
                flat_type: unit.type,
                flat_size: unit.size || 1000,
                occupancy_status: 'VACANT',
                floor_id: createdFloor.id,
                wing_id: createdWing.id,
                society_id: user.society_id,
              });
            }
          }
        }

        // 7. CREATE newly added floors & their flats in existing wings
        for (const cf of diff.createdFloors) {
          if (cf.wing.dbId) {
            setSaveProgress(`Adding ${cf.floor.name} to ${cf.wing.name}...`);
            const createdFloor = await authService.createFloor({
              floor_number: cf.floor.floorNumber,
              wing_id: cf.wing.dbId,
            });

            for (const unit of cf.floor.units) {
              await authService.createFlat({
                flat_number: unit.number,
                flat_type: unit.type,
                flat_size: unit.size || 1000,
                occupancy_status: 'VACANT',
                floor_id: createdFloor.id,
                wing_id: cf.wing.dbId,
                society_id: user.society_id,
              });
            }
          }
        }

        // 8. CREATE newly added flats in existing floors
        for (const cfl of diff.createdFlats) {
          if (cfl.wing.dbId && cfl.floor.dbId && !cfl.unit.dbId) {
            setSaveProgress(`Adding Flat ${cfl.unit.number}...`);
            await authService.createFlat({
              flat_number: cfl.unit.number,
              flat_type: cfl.unit.type,
              flat_size: cfl.unit.size || 1000,
              occupancy_status: 'VACANT',
              floor_id: cfl.floor.dbId,
              wing_id: cfl.wing.dbId,
              society_id: user.society_id,
            });
          }
        }
      }

      // Success cleanup
      localStorage.removeItem(`homesync_schematic_${user.society_id}`);
      setSaveSuccess(true);
      setIsSaving(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes. Your working blueprint is preserved.');
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setSchematic(JSON.parse(JSON.stringify(originalSnapshot)));
    setActiveModal(null);
  };

  const activeWing = schematic.find((w) => w.tempId === selectedWingId) || (schematic.length > 0 ? schematic[0] : null);
  const targetFloor = activeWing?.floors.find((f) => f.tempId === targetFloorId);
  const targetPattern = customPatterns.find((p) => p.id === targetPatternId) || activeSelectedPattern;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="h-16 px-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-headline font-bold text-lg text-white tracking-tight">HomeSync</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {isEditMode ? 'Structure Editor' : 'Blueprint Builder'}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-4 border-l border-slate-800">
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Basic Info
            </span>
            <span>/</span>
            <span className="text-white font-bold">{isEditMode ? 'Edit Structure (B04)' : 'Blueprint (B04)'}</span>
            <span>/</span>
            <span className="text-slate-500">Settings (B05)</span>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Changes Badge */}
          {isEditMode && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              diff.totalChanges > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
            }`}>
              {diff.totalChanges} {diff.totalChanges === 1 ? 'change' : 'changes'} pending
            </span>
          )}

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Discard Changes (for Edit Mode) */}
          {isEditMode && diff.totalChanges > 0 && (
            <button
              type="button"
              onClick={() => setActiveModal('discardChanges')}
              className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/80 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Publish or Save Changes CTA */}
          <button
            type="button"
            onClick={() => setActiveModal('saveChanges')}
            disabled={schematic.length === 0 || (isEditMode && diff.totalChanges === 0)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold rounded-xl shadow-glow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isEditMode ? 'Save Changes' : 'Publish Structure'}</span>
          </button>
        </div>
      </header>

      {/* Toast */}
      {draftSavedToast && (
        <div className="fixed top-20 right-6 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl z-50 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Blueprint draft saved locally!</span>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden bg-slate-950 border-b border-slate-800 p-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTabMobile('navigator')}
          className={`flex-1 py-1.5 rounded-lg font-semibold ${activeTabMobile === 'navigator' ? 'bg-primary text-white' : 'text-slate-400'}`}
        >
          Wings ({stats.totalWings})
        </button>
        <button
          onClick={() => setActiveTabMobile('canvas')}
          className={`flex-1 py-1.5 rounded-lg font-semibold ${activeTabMobile === 'canvas' ? 'bg-primary text-white' : 'text-slate-400'}`}
        >
          Schematic ({stats.totalUnits})
        </button>
        <button
          onClick={() => setActiveTabMobile('generator')}
          className={`flex-1 py-1.5 rounded-lg font-semibold ${activeTabMobile === 'generator' ? 'bg-primary text-white' : 'text-slate-400'}`}
        >
          Patterns ({customPatterns.length})
        </button>
      </div>

      {/* 3-Column Layout */}
      {isLoadingExisting ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading residency structure...</span>
        </div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <h3 className="font-bold text-white text-lg">Unable to load residency structure</h3>
          <p className="text-xs text-slate-400">{loadError}</p>
          <button
            onClick={loadExistingStructure}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* ==================================================== */}
          {/* LEFT PANEL: STRUCTURE NAVIGATOR                      */}
          {/* ==================================================== */}
          <aside className={`w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 ${activeTabMobile === 'navigator' ? 'block w-full' : 'hidden md:flex'}`}>
            <div className="p-4 border-b border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Active Residency</span>
              <div className="font-headline font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{society?.name || 'Residency'}</span>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="p-3 bg-slate-900/50 border-b border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px] font-semibold">Wings</span>
                <span className="font-bold text-white text-sm">{stats.totalWings}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px] font-semibold">Floors</span>
                <span className="font-bold text-white text-sm">{stats.totalFloors}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px] font-semibold">Units</span>
                <span className="font-bold text-primary text-sm">{stats.totalUnits}</span>
              </div>
            </div>

            {/* Wings Tree List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span>Structure Tree</span>
                <button
                  type="button"
                  onClick={handleOpenAddWing}
                  className="text-primary hover:text-indigo-400 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Wing</span>
                </button>
              </div>

              {schematic.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500 space-y-2">
                  <p>No wings added yet.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddWing}
                    className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-semibold rounded-lg text-xs"
                  >
                    + Add First Wing
                  </button>
                </div>
              ) : (
                schematic.map((wing) => {
                  const isSelected = wing.tempId === selectedWingId;
                  const wingUnits = wing.floors.reduce((sum, f) => sum + f.units.length, 0);

                  return (
                    <div
                      key={wing.tempId}
                      className={`rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/15 border-primary text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                      onClick={() => {
                        setSelectedWingId(wing.tempId);
                        setActiveTabMobile('canvas');
                      }}
                    >
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {wing.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm block truncate max-w-[100px]">{wing.name}</span>
                              {!wing.dbId && (
                                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded">NEW</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {wing.floors.length} Floors • {wingUnits} Units
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRenameWing(wing);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Rename Wing"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDuplicateWing(wing);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Duplicate Wing"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteWing(wing);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                            title="Delete Wing"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Validation in Navigator */}
            {validationIssues.length > 0 && (
              <div className="p-3 m-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1 text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>{validationIssues.length} issues to resolve</span>
                </div>
                <p className="text-[11px] text-rose-400 leading-tight">Resolve before saving.</p>
              </div>
            )}
          </aside>

          {/* ==================================================== */}
          {/* CENTER PANEL: VISUAL SCHEMATIC CANVAS                */}
          {/* ==================================================== */}
          <main className={`flex-1 bg-slate-900 flex flex-col overflow-hidden ${activeTabMobile === 'canvas' ? 'block' : 'hidden md:flex'}`}>
            {schematic.length === 0 ? (
              /* EMPTY FIRST-TIME STATE */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="max-w-md w-full p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-6 animate-fadeIn">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-glow">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-2xl text-white">Build your residency structure</h2>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      Start by adding your first wing. Build the physical blueprint in local state before publishing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddWing}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Wing</span>
                  </button>
                </div>
              </div>
            ) : !activeWing ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a wing from the navigator to view its structure.
              </div>
            ) : (
              <>
                {/* Canvas Header */}
                <div className="h-14 px-6 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {activeWing.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-headline font-bold text-base text-white flex items-center gap-2">
                        {activeWing.name}
                        <button
                          type="button"
                          onClick={() => handleOpenRenameWing(activeWing)}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Rename Wing"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </h2>
                      <span className="text-xs text-slate-400">
                        {activeWing.floors.length} Floors • {activeWing.floors.reduce((s, f) => s + f.units.length, 0)} Units
                      </span>
                    </div>
                  </div>

                  {/* Quick Floor Actions */}
                  <div className="flex items-center gap-2">
                    <div className="relative hidden lg:block w-44">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search unit #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddFloor(activeWing.tempId)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Floor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGenerateFloors(activeWing.tempId)}
                      className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center gap-1.5 transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Generate Floors</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Flat Type Toolbar */}
                {selectedUnitIds.length > 0 && (
                  <div className="px-6 py-2.5 bg-primary/10 border-b border-primary/30 flex items-center justify-between text-xs animate-fadeIn shrink-0">
                    <span className="font-semibold text-primary">
                      {selectedUnitIds.length} {selectedUnitIds.length === 1 ? 'unit' : 'units'} selected
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 mr-1">Set Type:</span>
                      {unitTypes.map((ut) => (
                        <button
                          key={ut.type}
                          type="button"
                          onClick={() => handleBulkAssignType(ut.type)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-[11px] font-semibold"
                        >
                          {ut.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedUnitIds([])}
                        className="ml-2 text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Stacked Floors View */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeWing.floors.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl p-8 space-y-4 bg-slate-950/40">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-base text-white">No floors added to {activeWing.name}</h3>
                        <p className="text-slate-400 text-xs mt-1">Add individual floors or use the multi-floor generator.</p>
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddFloor(activeWing.tempId)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                        >
                          + Add Floor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenGenerateFloors(activeWing.tempId)}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold"
                        >
                          ⚡ Quick Generate Floors
                        </button>
                      </div>
                    </div>
                  ) : (
                    activeWing.floors.map((floor) => {
                      const matchesSearch = !searchQuery || floor.units.some((u) => u.number.toLowerCase().includes(searchQuery.toLowerCase()));

                      return (
                        <div
                          key={floor.tempId}
                          className={`rounded-2xl border bg-slate-950/80 transition-all ${
                            matchesSearch ? 'border-slate-800' : 'opacity-30 border-slate-800'
                          }`}
                        >
                          {/* Floor Bar */}
                          <div className="p-3 sm:px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-bold text-xs">
                                {floor.name}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {floor.units.length} {floor.units.length === 1 ? 'Unit' : 'Units'}
                              </span>
                              {!floor.dbId && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded">NEW</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Duplicate Floor */}
                              <button
                                type="button"
                                onClick={() => handleOpenDuplicateFloor(activeWing.tempId, floor)}
                                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center gap-1"
                                title="Duplicate Floor with new starting number"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Duplicate</span>
                              </button>

                              {/* Generate Flats CTA */}
                              <button
                                type="button"
                                onClick={() => handleOpenGenerateFlats(activeWing.tempId, floor)}
                                className="px-2.5 py-1 text-[11px] bg-primary/20 hover:bg-primary/30 text-primary rounded-lg border border-primary/30 flex items-center gap-1 font-semibold"
                              >
                                <Wand2 className="w-3 h-3" />
                                <span>Generate Flats</span>
                              </button>

                              {/* Delete Floor */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteFloor(activeWing.tempId, floor.tempId)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                                title="Delete Floor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Units Grid */}
                          <div className="p-4">
                            {floor.units.length === 0 ? (
                              <div className="py-5 text-center border border-dashed border-slate-800/80 rounded-xl space-y-2">
                                <p className="text-xs text-slate-500 italic">No flats added to this floor.</p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGenerateFlats(activeWing.tempId, floor)}
                                  className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                  <span>Generate Flats</span>
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {floor.units.map((unit) => {
                                  const isSelected = selectedUnitIds.includes(unit.tempId);
                                  const isHighlighted = searchQuery && unit.number.toLowerCase().includes(searchQuery.toLowerCase());

                                  return (
                                    <div
                                      key={unit.tempId}
                                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                                        isSelected
                                          ? 'bg-primary/25 border-primary ring-2 ring-primary'
                                          : isHighlighted
                                          ? 'bg-primary/20 border-primary ring-2 ring-primary/40'
                                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-850'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelectUnit(unit.tempId)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-slate-700 text-primary focus:ring-0 w-3.5 h-3.5"
                                          />
                                          <span className="font-mono font-bold text-sm text-white group-hover:text-primary transition-colors">
                                            {unit.number}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditUnit(activeWing.tempId, floor.tempId, unit)}
                                            className="text-slate-500 hover:text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit Unit"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteUnit(activeWing.tempId, floor.tempId, unit.tempId);
                                            }}
                                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Flat"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                                          unit.type === '1BHK' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                          unit.type === '2BHK' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                          unit.type === '3BHK' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                          unit.type === '4BHK' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                          'bg-slate-800 text-slate-300 border border-slate-700'
                                        }`}>
                                          {unit.type}
                                        </span>
                                        <span className="text-slate-500 text-[10px]">{unit.size} sq.ft</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </main>

          {/* ==================================================== */}
          {/* RIGHT PANEL: USER-CREATED PATTERNS & UNIT TYPES      */}
          {/* ==================================================== */}
          <aside className={`w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 ${activeTabMobile === 'generator' ? 'block w-full' : 'hidden lg:flex'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* User Custom Patterns */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    My Custom Patterns
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreatePattern}
                    className="text-primary hover:text-indigo-400 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Pattern</span>
                  </button>
                </div>

                {customPatterns.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500 space-y-2">
                    <p>No custom patterns created yet.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreatePattern}
                      className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-semibold rounded-lg text-xs"
                    >
                      + Create Pattern
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customPatterns.map((pattern) => {
                      const totalUnits = pattern.items.reduce((s, it) => s + it.count, 0);
                      return (
                        <div key={pattern.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 group">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-white">{pattern.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPattern(pattern)}
                                className="text-slate-400 hover:text-white p-1"
                                title="Edit Pattern"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateCustomPattern(pattern)}
                                className="text-slate-400 hover:text-white p-1"
                                title="Duplicate Pattern"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPattern(pattern.id)}
                                className="text-slate-400 hover:text-rose-400 p-1"
                                title="Delete Pattern"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {pattern.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                                <span className="font-semibold text-slate-200">{it.type} ({it.size} sq.ft)</span>
                                <span className="text-primary font-bold">× {it.count}</span>
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800">
                            <span>Total Units: <strong className="text-white">{totalUnits}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unit Types Palette */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Unit Types Library
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {unitTypes.map((ut) => {
                    const count = stats.byType[ut.type] || 0;
                    return (
                      <div key={ut.type} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{ut.label}</span>
                          <span className="text-[10px] text-slate-500">{ut.defaultSize} sq.ft</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS                                               */}
      {/* ==================================================== */}

      {/* 1. Add Wing Modal */}
      {activeModal === 'addWing' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">Add New Wing</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddWing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Wing Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={modalWingName}
                  onChange={(e) => setModalWingName(e.target.value)}
                  placeholder="e.g. Tower A, North Wing, Block 1"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalWingName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                >
                  Add Wing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rename Wing Modal */}
      {activeModal === 'renameWing' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">Rename Wing</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRenameWing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Wing Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={modalWingName}
                  onChange={(e) => setModalWingName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalWingName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Duplicate Wing Modal */}
      {activeModal === 'duplicateWing' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">Duplicate Wing</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDuplicateWing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Wing Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={modalWingName}
                  onChange={(e) => setModalWingName(e.target.value)}
                  placeholder="e.g. Tower B"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalWingName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                >
                  Clone Wing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Wing Modal */}
      {activeModal === 'deleteWing' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline font-bold text-lg text-rose-400">Delete Wing?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will remove this wing and all its configured floors and flats from your blueprint.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWing}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
              >
                Delete Wing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Floor Modal */}
      {activeModal === 'addFloor' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">Add Floor</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddFloor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Floor Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={modalFloorNumber}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setModalFloorNumber(val);
                      setModalFloorName(val === 0 ? 'Ground Floor' : `Floor ${val}`);
                    }}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Floor Name
                  </label>
                  <input
                    type="text"
                    value={modalFloorName}
                    onChange={(e) => setModalFloorName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalFloorNumber === ''}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white"
                >
                  Add Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Multi-Floor Generator Modal */}
      {activeModal === 'generateFloors' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                <h3 className="font-headline font-bold text-lg text-white">Generate Multiple Floors</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGenerateFloors} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Total Floors <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={genFloorsCount}
                    onChange={(e) => setGenFloorsCount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Start Floor # <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={genStartFloorNum}
                    onChange={(e) => setGenStartFloorNum(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-400">
                Will create: <strong className="text-white">Floor {genStartFloorNum}</strong> through <strong className="text-white">Floor {genStartFloorNum + genFloorsCount - 1}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!genFloorsCount}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white"
                >
                  Generate {genFloorsCount} Floors
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Duplicate Floor Modal */}
      {activeModal === 'duplicateFloor' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">Duplicate Floor</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDuplicateFloor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    New Floor # <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={modalFloorNumber}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setModalFloorNumber(val);
                      setModalStartFlatNumber(`${val}01`);
                    }}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Starting Flat # <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalStartFlatNumber}
                    onChange={(e) => setModalStartFlatNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalFloorNumber === '' || !modalStartFlatNumber.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white"
                >
                  Duplicate Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Delete Floor Modal */}
      {activeModal === 'deleteFloor' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline font-bold text-lg text-rose-400">Delete Floor?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will remove this floor and its flats from your blueprint.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFloor}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
              >
                Delete Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Generate Flats Modal (MANUAL + PATTERN MODES) */}
      {activeModal === 'generateFlats' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-headline font-bold text-lg text-white">Generate Flats</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Generation Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Generation Method
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setGenMethod('manual')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    genMethod === 'manual'
                      ? 'bg-primary text-white shadow-glow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenMethod('pattern')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    genMethod === 'pattern'
                      ? 'bg-primary text-white shadow-glow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Use Pattern</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmGenerateFlats} className="space-y-4 pt-1">
              {genMethod === 'manual' ? (
                /* ================= MANUAL MODE ================= */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Starting Flat # <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={modalStartFlatNumber}
                        onChange={(e) => setModalStartFlatNumber(e.target.value)}
                        required
                        autoFocus
                        placeholder="101"
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Total Flats <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={modalFlatCount}
                        onChange={(e) => setModalFlatCount(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Number Increment
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={modalFlatIncrement}
                        onChange={(e) => setModalFlatIncrement(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Default Type
                      </label>
                      <select
                        value={modalDefaultFlatType}
                        onChange={(e) => setModalDefaultFlatType(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                      >
                        {unitTypes.map((ut) => (
                          <option key={ut.type} value={ut.type}>{ut.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Flat Numbers Preview
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {manualFlatNumberPreview.map((num, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono font-bold text-primary">
                          {num}
                        </span>
                      ))}
                      {modalFlatCount > manualFlatNumberPreview.length && (
                        <span className="text-xs text-slate-500 font-mono py-0.5">
                          ... (+{modalFlatCount - manualFlatNumberPreview.length} more)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!modalFlatCount || !modalStartFlatNumber.trim()}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white"
                    >
                      Generate {modalFlatCount} Flats
                    </button>
                  </div>
                </>
              ) : (
                /* ================= USE PATTERN MODE ================= */
                <>
                  {customPatterns.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-slate-800 rounded-2xl p-4 space-y-3">
                      <p className="text-xs text-slate-400">No custom patterns created yet.</p>
                      <button
                        type="button"
                        onClick={handleOpenCreatePattern}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Create Custom Pattern</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Pattern Selector & Search */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Select Custom Pattern <span className="text-red-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleOpenCreatePattern}
                            className="text-[11px] font-semibold text-primary hover:text-indigo-400 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Create New</span>
                          </button>
                        </div>

                        {customPatterns.length > 4 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Search patterns..."
                              value={patternSearchQuery}
                              onChange={(e) => setPatternSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        <select
                          value={selectedPatternIdInModal}
                          onChange={(e) => setSelectedPatternIdInModal(e.target.value)}
                          required
                          className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-primary"
                        >
                          {filteredPatterns.map((p) => {
                            const count = p.items.reduce((s, it) => s + it.count, 0);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} ({count} units)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Starting Flat # & Increment */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                            Starting Flat # <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={modalStartFlatNumber}
                            onChange={(e) => setModalStartFlatNumber(e.target.value)}
                            required
                            placeholder="101"
                            className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                            Number Increment
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={modalFlatIncrement}
                            onChange={(e) => setModalFlatIncrement(Number(e.target.value))}
                            className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                      </div>

                      {/* Pattern Configuration Preview */}
                      {activeSelectedPattern && (
                        <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{activeSelectedPattern.name}</span>
                            <span className="text-primary font-bold">
                              Total: {activeSelectedPattern.items.reduce((s, it) => s + it.count, 0)} Units
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {activeSelectedPattern.items.map((it, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 font-medium">
                                {it.type} ({it.size} sq.ft) × {it.count}
                              </span>
                            ))}
                          </div>

                          {/* Generated Flat Preview */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Generated Flat Preview:
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                              {patternFlatPreview.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded font-mono">
                                  <span className="font-bold text-white">{item.number}</span>
                                  <span className="text-slate-400">{item.type} — {item.size} sq.ft</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!activeSelectedPattern || !modalStartFlatNumber.trim()}
                          className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                        >
                          Generate {activeSelectedPattern ? activeSelectedPattern.items.reduce((s, it) => s + it.count, 0) : 0} Flats
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 10. Edit Unit Modal */}
      {activeModal === 'editUnit' && targetUnit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-base text-white">Edit Unit {targetUnit.unit.number}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEditUnit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Flat Number
                </label>
                <input
                  type="text"
                  value={targetUnit.unit.number}
                  onChange={(e) => setTargetUnit({
                    ...targetUnit,
                    unit: { ...targetUnit.unit, number: e.target.value },
                  })}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Flat Type
                </label>
                <select
                  value={targetUnit.unit.type}
                  onChange={(e) => {
                    const ut = unitTypes.find((t) => t.type === e.target.value);
                    setTargetUnit({
                      ...targetUnit,
                      unit: { ...targetUnit.unit, type: e.target.value, size: ut?.defaultSize || targetUnit.unit.size },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  {unitTypes.map((ut) => (
                    <option key={ut.type} value={ut.type}>{ut.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Area (sq.ft)
                </label>
                <input
                  type="number"
                  value={targetUnit.unit.size}
                  onChange={(e) => setTargetUnit({
                    ...targetUnit,
                    unit: { ...targetUnit.unit, size: Number(e.target.value) },
                  })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Create / Edit Custom Pattern Modal (Unit Type + Sq.Ft. + Quantity) */}
      {activeModal === 'createPattern' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-headline font-bold text-lg text-white">
                {editingPatternId ? 'Edit Custom Pattern' : 'Create Custom Pattern'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Pattern Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="e.g. Standard Floor, Premium Tower Floor"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Unit Configurations (Type + Sq.Ft. + Quantity)
                  </span>
                  <span className="text-xs text-primary font-bold">
                    Total Units: {patternItems.reduce((s, it) => s + it.count, 0)}
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {patternItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-slate-300">Unit {idx + 1}</span>
                        {patternItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPatternItems(patternItems.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Type</label>
                          <select
                            value={item.type}
                            onChange={(e) => {
                              const newType = e.target.value;
                              const ut = unitTypes.find((t) => t.type === newType);
                              const updated = [...patternItems];
                              updated[idx] = { 
                                ...updated[idx], 
                                type: newType, 
                                size: ut?.defaultSize || updated[idx].size 
                              };
                              setPatternItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                          >
                            {unitTypes.map((ut) => (
                              <option key={ut.type} value={ut.type}>{ut.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Area (sq.ft)</label>
                          <input
                            type="number"
                            min={100}
                            max={10000}
                            value={item.size}
                            onChange={(e) => {
                              const updated = [...patternItems];
                              updated[idx].size = Number(e.target.value);
                              setPatternItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={item.count}
                            onChange={(e) => {
                              const updated = [...patternItems];
                              updated[idx].count = Number(e.target.value);
                              setPatternItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPatternItems([...patternItems, { type: '2BHK', size: 1000, count: 1 }])}
                  className="text-xs text-primary hover:text-indigo-400 font-semibold flex items-center gap-1 mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Unit Configuration</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!patternName.trim() || patternItems.reduce((s, it) => s + it.count, 0) === 0}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                >
                  Save Pattern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Pattern Quantity Mismatch Modal (No silent renumbering / modification!) */}
      {activeModal === 'patternMismatch' && targetFloor && targetPattern && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-headline font-bold text-base text-white">Pattern Quantity Mismatch</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pattern <strong>"{targetPattern.name}"</strong> contains <strong className="text-white">{targetPattern.items.reduce((s, it) => s + it.count, 0)} units</strong>, but <strong>{targetFloor.name}</strong> currently has <strong className="text-white">{targetFloor.units.length} flats</strong>.
            </p>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-200 block">Existing flat numbers are never silently modified.</span>
              <p className="text-[11px]">To apply this pattern directly, ensure the floor has the same number of flats, or edit the pattern configurations.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs rounded-xl border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                Manage Flats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Discard Changes Modal */}
      {activeModal === 'discardChanges' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline font-bold text-base text-rose-400">Discard all pending changes?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will revert your working blueprint to the database state ({diff.totalChanges} changes will be discarded).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. Save Changes / Publish Structure Modal */}
      {activeModal === 'saveChanges' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
            {saveSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="font-headline text-2xl font-bold text-white">
                  {isEditMode ? 'Changes Saved Successfully!' : 'Residency Structure Published!'}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your physical structure is synchronized with the database ({stats.totalWings} Wings, {stats.totalFloors} Floors, {stats.totalUnits} Units).
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/onboarding/settings')}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <span>Continue to Advanced Settings (B05)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : isSaving ? (
              <div className="text-center space-y-4 py-6">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h3 className="font-headline text-xl font-bold text-white">Saving Changes to Database...</h3>
                <p className="text-xs text-primary font-mono bg-primary/10 border border-primary/20 py-2 px-4 rounded-xl inline-block">
                  {saveProgress || 'Synchronizing changes...'}
                </p>
                <p className="text-xs text-slate-400">Please do not close your browser window.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-headline font-bold text-lg text-white">
                      {isEditMode ? 'Review & Save Changes' : 'Review & Publish Structure'}
                    </h3>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {saveError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* Diff Summary for Edit Mode */}
                {isEditMode ? (
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Changes to be Saved ({diff.totalChanges} operations)
                    </span>
                    <div className="space-y-2 text-xs">
                      {/* Created items */}
                      {(diff.createdWings.length > 0 || diff.createdFloors.length > 0 || diff.createdFlats.length > 0) && (
                        <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-1 text-emerald-300">
                          <span className="font-bold flex items-center gap-1 text-emerald-200">
                            + Created:
                          </span>
                          <p className="text-[11px]">
                            {[
                              diff.createdWings.length ? `${diff.createdWings.length} wings` : '',
                              diff.createdFloors.length ? `${diff.createdFloors.length} floors` : '',
                              diff.createdFlats.length ? `${diff.createdFlats.length} flats` : '',
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Updated items */}
                      {(diff.updatedWings.length > 0 || diff.updatedFlats.length > 0) && (
                        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-1 text-amber-300">
                          <span className="font-bold flex items-center gap-1 text-amber-200">
                            ✎ Updated:
                          </span>
                          <p className="text-[11px]">
                            {[
                              diff.updatedWings.length ? `${diff.updatedWings.length} wings` : '',
                              diff.updatedFlats.length ? `${diff.updatedFlats.length} flats` : '',
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Deleted items */}
                      {(diff.deletedWings.length > 0 || diff.deletedFloors.length > 0 || diff.deletedFlats.length > 0) && (
                        <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-xl space-y-1 text-rose-300">
                          <span className="font-bold flex items-center gap-1 text-rose-200">
                            − Deleted:
                          </span>
                          <p className="text-[11px]">
                            {[
                              diff.deletedWings.length ? `${diff.deletedWings.length} wings` : '',
                              diff.deletedFloors.length ? `${diff.deletedFloors.length} floors` : '',
                              diff.deletedFlats.length ? `${diff.deletedFlats.length} flats` : '',
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Summary Metrics for First-time Publish */
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs block">Wings</span>
                      <span className="text-2xl font-bold text-white">{stats.totalWings}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs block">Floors</span>
                      <span className="text-2xl font-bold text-white">{stats.totalFloors}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs block">Total Units</span>
                      <span className="text-2xl font-bold text-primary">{stats.totalUnits}</span>
                    </div>
                  </div>
                )}

                {/* Validation warnings if any */}
                {validationIssues.length > 0 && (
                  <div className="p-4 bg-amber-950/40 border border-amber-800 text-amber-300 rounded-2xl text-xs space-y-1">
                    <span className="font-bold block text-amber-200">Validation issues detected:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {validationIssues.slice(0, 3).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-900 text-xs font-semibold"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSaveOrPublish}
                    disabled={validationIssues.length > 0}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-glow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isEditMode ? 'Confirm & Save Changes' : 'Confirm & Publish Structure'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidencyStructureSetupPage;
