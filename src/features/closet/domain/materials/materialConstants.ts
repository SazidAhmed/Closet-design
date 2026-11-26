// Business Logic Constants for Closet Material Selection
// ======================================================

export const MATERIAL_IDS = {
  // Special material IDs
  GLASS_DOOR_TYPE_ID: 7,
  ALUMINUM_GLASS_DOOR_ID: 57,
  FINISHED_INTERIOR_PARENT_ID: 7,
  FINISHED_INTERIOR_SPECIAL_DRAWER_ID: 12,

  // Hierarchical material structure
  HIERARCHICAL_PARENT_ID: 7, // "Finished Interior" ID
  HIERARCHICAL_CHILDREN_IDS: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], // Children IDs 8-18
}

// Grain selection constants
export const GRAIN_IDS = {
  N_A: 1,
  VERTICAL: 2,
  HORIZONTAL: 3,
  HORIZONTAL_UPCHARGE: 4,
}

// Grain selection logic flags
export const GRAIN_FLAGS = {
  HAS_GRAIN: 1,
  NO_GRAIN: 0,
  ONLY_VERTICAL: 1,
  ALLOWS_BOTH: 0,
}

// Box materials that have color children
export const BOX_MATERIALS_WITH_COLORS = [5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// "Finished Interior" variants (parent and all children)
export const FINISHED_INTERIOR_IDS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// Drawer types to exclude when door finish material has specific style_ids
export const EXCLUDED_DRAWER_TYPE_IDS = [1, 2, 3, 9, 13, 14]

// Style IDs that restrict drawer types
export const RESTRICTIVE_STYLE_IDS = [140, 131, 132, 170]

// Glass/Mirror Type fallback Data
export const GLASS_MIRROR_DATA = {
  PARENTS: {
    GLASS: { id: 'glass', key: 'glass', title: 'Glass' },
    MIRROR: { id: 'mirror', key: 'mirror', title: 'Mirror' },
  },
  CHILDREN: {
    glass: [
      { id: 'clear', title: 'Clear', parentKey: 'glass' },
      { id: 'frosted', title: 'Frosted', parentKey: 'glass' },
      { id: 'grey', title: 'Grey', parentKey: 'glass' },
      { id: 'bronze', title: 'Bronze', parentKey: 'glass' },
    ],
    mirror: [
      { id: 'standard', title: 'Standard', parentKey: 'mirror' },
      { id: 'grey', title: 'Grey', parentKey: 'mirror' },
      { id: 'bronze', title: 'Bronze', parentKey: 'mirror' },
    ],
  },
}

// UI Constants
export const UI_CONSTANTS = {
  DEFAULT_IMAGE_URL: 'https://placehold.co/40x30',
  DEFAULT_MATERIAL_IMAGE: 'https://placehold.co/40x30',
  TOAST_POSITION: 'top-right' as const,
}

// Validation Messages
export const VALIDATION_MESSAGES = {
  DRAWER_PREREQUISITES: {
    BOTH_MISSING: 'Please select Box Material and Door Material first',
    BOX_MISSING: 'Please select Box Material first',
    DOOR_MISSING: 'Please select Door Material first',
  },
  GRAIN_SELECTION: {
    NO_COLOR_SELECTED: 'Please select Door Color first',
    NO_GRAIN_AVAILABLE: 'No grain options available for this color',
    ONLY_VERTICAL_AVAILABLE: 'Only vertical grain available for this color',
    VERTICAL_AND_HORIZONTAL_AVAILABLE: 'Vertical and horizontal grain options available',
    SELECT_GRAIN: 'Select grain option',
    GRAIN_RESET: 'Selected grain option is not available for this color.',
  },
  FORM_VALIDATION: {
    INCOMPLETE: 'Please select all required materials before proceeding.',
  },
  SUCCESS_MESSAGES: {
    ROOM_CREATED: 'Material selection saved successfully!',
    ORDER_SAVED: 'Order saved successfully!',
  },
  INFO_MESSAGES: {
    DRAWER_RESET_BOX: 'Selected drawer type is not compatible with this box material.',
    DRAWER_RESET_DOOR: 'Selected drawer type is not compatible with this door material.',
  },
}

// Default Material Structure
export const DEFAULT_MATERIAL_STRUCTURE = {
  box_materials: null,
  box_material_colors: null,
  door_types: null,
  door_finish_materials: null,
  glass_or_mirror: null,
  glass_mirror_type: null,
  door_finish_material_colors: null,
  grains: null,
  drawer_types: null,
  drawer_materials: null,
}
