# Machine Grid Sizing Implementation Plan

## Overview

Implement proper machine sizing on the grid system where different machine types occupy different amounts of grid cells:

- **Miners**: 2x2 grid cells (4 total cells)
- **Conveyors**: 1x1 grid cell
- **SellZone**: 1x1 grid cell
- **Plot**: 50x50 total grid cells

## Current Issues

1. Grid constants still reference generic GRID_COLS/GRID_ROWS instead of 50x50 plot
2. All machines are treated as 1x1 regardless of their actual size
3. Ghost models don't scale to show their grid footprint
4. Server placement doesn't validate multi-cell occupancy

## Implementation Steps

### Step 1: Update Grid Constants

**File**: `src/shared/types.ts`

```typescript
// Update from generic grid to plot-specific
export const PLOT_SIZE = 50; // 50x50 cells per plot
export const GRID_CELL_SIZE = 4; // studs per cell (200 studs / 50 cells)
export const PLOT_SIZE_STUDS = 200; // total plot size in studs

// Replace GRID_COLS/GRID_ROWS with PLOT_SIZE
```

### Step 2: Add Machine Size Definitions

**File**: `src/shared/types.ts`

```typescript
export interface MachineSize {
	width: number; // grid cells wide
	height: number; // grid cells tall
}

export const MACHINE_SIZES: Record<string, MachineSize> = {
	BaseMiner: { width: 2, height: 2 },
	Conveyor: { width: 1, height: 1 },
	SellZone: { width: 1, height: 1 },
};
```

### Step 3: Update Placement Controller Ghost Scaling

**File**: `src/client/placementController.ts`

#### 3.1: Scale Ghost Models

- Add `scaleMachineToGrid()` method to resize ghosts based on machine type
- Update `createGhostModel()` to apply proper scaling
- Update placeholder creation to use correct grid sizes

#### 3.2: Multi-Cell Collision Detection

- Update `isValidGridCoord()` to check all cells a machine would occupy
- Add `getMachineFootprint()` to calculate occupied cells
- Visual feedback for multi-cell placement validity

#### 3.3: Grid Snapping for Multi-Cell

- Update positioning logic to handle 2x2 machines properly
- Ensure proper alignment for different machine sizes

### Step 4: Update Server-Side Placement Logic

**File**: `src/server/grid.ts` (assumed to exist)

#### 4.1: Grid State Management

- Track occupied cells in plot grid state
- Validate multi-cell placement requests
- Handle machine removal from multiple cells

#### 4.2: Placement Validation

- Check if all cells for a machine size are available
- Return specific error messages for placement conflicts

### Step 5: Update Existing Machine Classes

**Files**: `src/server/models/miners/baseMiner.ts`, `src/server/models/conveyors/conveyorClass.ts`

#### 5.1: Add Size Properties

- Add static `size` property to each machine class
- Ensure consistent size definitions across client/server

#### 5.2: Update Spawn Methods

- Scale spawned models to match grid size
- Position correctly within their grid cells

### Step 6: Visual Grid Improvements

**File**: `src/client/placementController.ts`

#### 6.1: Multi-Cell Ghost Visualization

- Show footprint for 2x2 miners clearly
- Different visual styles for different machine types
- Clear grid cell boundaries

#### 6.2: Improved Feedback

- Color coding for valid/invalid placement areas
- Show which specific cells are blocked
- Preview of machine footprint

## Technical Details

### Grid Coordinate System

```typescript
// Machine placement for 2x2 miner at (5,5)
// Occupies cells: (5,5), (6,5), (5,6), (6,6)
interface GridFootprint {
	origin: GridCoord; // Top-left cell
	occupiedCells: GridCoord[]; // All cells occupied
}
```

### Scaling Logic

```typescript
// Convert machine template to grid-appropriate size
function scaleMachineToGrid(model: Model, machineType: string): void {
	const size = MACHINE_SIZES[machineType];
	const targetSize = new Vector3(
		size.width * GRID_CELL_SIZE,
		model.GetExtentsSize().Y, // Keep height unchanged
		size.height * GRID_CELL_SIZE,
	);
	// Apply scaling logic...
}
```

### Collision Detection

```typescript
// Check if machine can be placed at coordinate
function canPlaceMachine(coord: GridCoord, machineType: string, gridState: boolean[][]): boolean {
	const size = MACHINE_SIZES[machineType];

	// Check all cells the machine would occupy
	for (let x = 0; x < size.width; x++) {
		for (let z = 0; z < size.height; z++) {
			const cellX = coord.x + x;
			const cellZ = coord.z + z;

			if (cellX >= PLOT_SIZE || cellZ >= PLOT_SIZE || gridState[cellX][cellZ]) {
				return false; // Out of bounds or occupied
			}
		}
	}
	return true;
}
```

## Benefits

1. **Perfect Grid Alignment**: All machines fit precisely in their designated cell sizes
2. **Realistic Space Planning**: Miners take up more space, making placement strategic
3. **Visual Clarity**: Clear ghost previews show exactly what space will be used
4. **Collision Prevention**: No overlapping machines or invalid placements
5. **Scalability**: Easy to add new machine types with different sizes

## Testing Plan

1. **Miner Placement**: Verify 2x2 miners snap to grid and show proper footprint
2. **Conveyor Placement**: Verify 1x1 conveyors work as before
3. **Mixed Placement**: Test placing miners and conveyors near each other
4. **Edge Cases**: Test placement at plot boundaries
5. **Collision Detection**: Verify invalid placements are properly rejected

## Implementation Priority

1. **High Priority**: Grid constants and machine size definitions (foundation)
2. **High Priority**: Ghost scaling and visual feedback (user experience)
3. **Medium Priority**: Server validation and collision detection (correctness)
4. **Low Priority**: Advanced visual improvements (polish)

This plan ensures a professional grid-based placement system where machine sizes matter and placement feels precise and intentional.
