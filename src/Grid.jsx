import Tile from "./Tile";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import {
  ACTIVE_COLOR,
  ACTIVE_SUBCOLOR,
  ACTIVE_TILE_BG,
  ACTIVE_TILE_SHADOW,
  COMPLETED_TILE_BG,
  COMPLETED_TILE_SHADOW,
  DEFAULT_DURATION,
  DEFAULT_EASE,
  DEFAULT_TILE_BG,
  DEFAULT_TILE_SHADOW,
  DRAGGABLE,
  HALF_DURATION,
  HIDDEN_BORDER,
  HIT_TILE_BG,
  LOCKED_TILE_BG,
  MEDIUM_EDGE_RESISTANCE,
  NO_SCALE,
  QUARTER_DURATION,
  SLIGHT_DOWNSCALE,
  SLIGHT_UPSCALE,
  UNDRAGGABLE,
} from "./data/grid.constants";

gsap.registerPlugin(useGSAP, Draggable, Flip);

export default function Grid({
  puzzleIndex,
  pauseTimer,
  setGameCompleted,
  cells: initialCells,
  alphaGroups,
  setPuzzleData,
}) {
  const tileRefs = useRef([]);
  const flipState = useRef(null);
  const draggedTile = useRef(null);
  const prevHitTile = useRef(null);
  const gridContainerRef = useRef(null);
  const zIndexRef = useRef(undefined);
  const cellsRef = useRef(null);

  const [cells, setCells] = useState([]);
  const [pointsToCheck, setPointsToCheck] = useState([]);

  useEffect(() => {
    const sortedCells = [...initialCells];

    sortedCells.sort((a, b) => {
      // First, compare by the 'x' coordinate.
      if (a.point.x !== b.point.x) {
        return a.point.x - b.point.x; // Sort ascending by x
      }
      // If 'x' coordinates are the same, then compare by the 'y' coordinate.
      else {
        return a.point.y - b.point.y; // Sort ascending by y
      }
    });

    // Map over the sorted array to add an unique 'id' to each cell.
    // This is important for Flip animation due to creating a unique key in the map render
    const cellsWithIds = sortedCells.map((cell, index) => ({
      ...cell,
      id: `cell-${index + 1}`,
    }));

    setCells(cellsWithIds);
    cellsRef.current = cellsWithIds;
  }, [initialCells]);

  useGSAP(
    () => {
      // Check if the game is completed so we can fire the endgame animations
      if (cells.length > 0 && cells.every((cell) => cell.kind === 0)) {
        pauseTimer();
        // use a timeline to manage sequential tweens
        const gameCompletionTl = gsap.timeline({
          delay: 1,
          onComplete: () => {
            // Arbitrary 1s pause before onGameComplete is called for more natural progression
            gsap.delayedCall(0.5, () => {
              setGameCompleted(true);
            });
          },
        });
        const numRows = 5;
        const numCols = 5;

        // Iterate through each row in order to apply staggered completion tweens
        for (let r = 0; r < numRows; r++) {
          const rowElements = [];

          for (let c = 0; c < numCols; c++) {
            const cell = cells[r * numCols + c];
            rowElements.push(`#${cell.id}`);
          }

          const rows = rowElements.join(", ");

          // Add tween for the current row
          gameCompletionTl.to(rows, {
            backgroundColor: ACTIVE_COLOR,
            color: ACTIVE_SUBCOLOR,
            yoyo: true,
            repeat: 1,
            duration: QUARTER_DURATION,
          });
        }

        // Do the same iteration for each column
        for (let c = 0; c < numCols; c++) {
          const colElements = [];
          for (let r = 0; r < numRows; r++) {
            const cell = cells[r * numCols + c]; // Still access via row-major index
            colElements.push(`#${cell.id}`);
          }

          const cols = colElements.join(", ");

          // Add tween for the current column
          gameCompletionTl.to(cols, {
            backgroundColor: ACTIVE_COLOR,
            color: ACTIVE_SUBCOLOR,
            yoyo: true,
            repeat: 1,
            duration: QUARTER_DURATION,
          });
        }
      }
    },
    { dependencies: [cells] }
  );

  useGSAP(
    () => {
      const draggableRefs = tileRefs.current.filter(
        (ref) => ref.dataset.locked === String(DRAGGABLE)
      );

      // This enables Draggable on all Tiles that are not locked (e.g. draggable)
      Draggable.create(draggableRefs, {
        bounds: gridContainerRef.current,
        edgeResistance: MEDIUM_EDGE_RESISTANCE,
        onPress: function () {
          draggedTile.current = this.target;
          zIndexRef.current = draggedTile.current?.style.zIndex;

          // reset pointerEvents on all draggable tiles
          gsap.set(draggableRefs, {
            pointerEvents: "auto",
          });

          gsap.fromTo(
            this.target,
            {
              boxShadow: DEFAULT_TILE_SHADOW,
              background: DEFAULT_TILE_BG,
            },
            {
              scale: SLIGHT_UPSCALE,
              boxShadow: ACTIVE_TILE_SHADOW,
              background: ACTIVE_TILE_BG,
              duration: DEFAULT_DURATION,
            }
          );

          gsap.to(this.target.parentElement, {
            borderColor: ACTIVE_COLOR,
            duration: DEFAULT_DURATION,
          });
        },
        // fires before dragEnd
        onRelease: function () {
          // we need to reset the dragged tile animations when no drag has occurred
          // but make sure to not reset it when a hitTile exists
          if (!prevHitTile.current) {
            gsap.to(this.target, {
              scale: NO_SCALE,
              boxShadow: DEFAULT_TILE_SHADOW,
              background: DEFAULT_TILE_BG,
              x: 0,
              y: 0,
              duration: DEFAULT_DURATION,
            });
            gsap.to(this.target.parentElement, {
              borderColor: HIDDEN_BORDER,
              delay: HALF_DURATION,
              duration: DEFAULT_DURATION,
            });
          }
        },
        onDrag: function () {
          var i = tileRefs.current.length;
          let highestCoverage = 0;
          let hitTileWithHighestCoverage = null;
          const draggedTileZindex = draggedTile.current?.style.zIndex;

          // When we drag a tile while a swap is animating, the zIndex ordering gets messed up
          // This condition is only true for this exact scenario.
          if (!draggedTileZindex || draggedTileZindex < zIndexRef.current) {
            // Resets the dragged tile's zIndex to the appropriate number
            gsap.set(draggedTile.current, {
              zIndex: zIndexRef.current,
            });
          }

          // Continous loop to detect and update the Tile with the 'highest coverage'
          // aka the Tile that has the greatest overlap with the dragged Tile
          while (--i > -1) {
            if (this.hitTest(tileRefs.current[i], "0%")) {
              const hitTile = tileRefs.current[i];

              // Skip locked tiles
              if (hitTile?.dataset.locked === UNDRAGGABLE) {
                continue;
              }

              // Check for the percentage of overlap, from 100% down to 1%
              for (let p = 100; p >= 1; p--) {
                if (this.hitTest(hitTile, `${p}%`)) {
                  if (p > highestCoverage) {
                    highestCoverage = p;
                    hitTileWithHighestCoverage = hitTile;
                  }
                  // Once we've found the highest overlap for this tile, we can break this inner loop
                  break;
                }
              }
            }
          }

          // As the hit tile with highest coverage changes, we need to apply animations accordingly
          if (hitTileWithHighestCoverage !== prevHitTile.current) {
            // revert animation on the previous highest coverage tile
            if (prevHitTile.current) {
              gsap.to(prevHitTile.current.parentElement, {
                borderColor: HIDDEN_BORDER,
                duration: DEFAULT_DURATION,
              });

              gsap.to(prevHitTile.current, {
                scale: NO_SCALE,
                background: DEFAULT_TILE_BG,
                duration: DEFAULT_DURATION,
              });
            }

            // apply animation to newest highest coverage tile
            if (hitTileWithHighestCoverage) {
              gsap.to(hitTileWithHighestCoverage.parentElement, {
                borderColor: ACTIVE_COLOR,
                duration: DEFAULT_DURATION,
              });
              gsap.fromTo(
                hitTileWithHighestCoverage,
                {
                  scale: NO_SCALE,
                  background: DEFAULT_TILE_BG,
                },
                {
                  scale: SLIGHT_DOWNSCALE,
                  background: HIT_TILE_BG,
                  duration: DEFAULT_DURATION,
                }
              );
            }

            // update previous hit tile to current highest coverage hit tile
            prevHitTile.current = hitTileWithHighestCoverage;
          }
        },
        onDragEnd: function () {
          if (prevHitTile.current) {
            flipState.current = Flip.getState(tileRefs.current);
            // Create a copy of the cells so that we can perform the swap of two cells
            const newCells = structuredClone(cells);
            const draggedTilePoint = this.target.dataset.point;
            const hitTilePoint = prevHitTile.current.dataset.point;

            // find the index of the dragged and hit tiles
            const draggedTileIndex = newCells.findIndex(
              (item) => `${item.point.x},${item.point.y}` === draggedTilePoint
            );
            const hitTileIndex = newCells.findIndex(
              (item) => `${item.point.x},${item.point.y}` === hitTilePoint
            );

            // Get references to the actual tile objects
            const draggedTileTemp = newCells[draggedTileIndex];
            const hitTileTemp = newCells[hitTileIndex];

            // We need to save the lines that are going to be checked for completion
            const points = [draggedTileTemp.point, hitTileTemp.point];
            // Set guarantees uniqueness
            const uniqueLines = new Set();

            points.forEach((point) => {
              // where key is x and y
              for (const key in point) {
                if (Object.hasOwnProperty.call(point, key)) {
                  // Create a small object for each key-value pair
                  const line = { [key]: point[key] };
                  // Stringify to ensure uniqueness based on content, not reference
                  // Same line values will be 'rejected'
                  uniqueLines.add(JSON.stringify(line));
                }
              }
            });

            // Convert the Set of stringified objects back to an array of objects
            const result = Array.from(uniqueLines).map((str) =>
              JSON.parse(str)
            );

            // we need to set the points to check to check completion later
            setPointsToCheck(result);

            // Swap the 'point' properties of the two tiles
            const tempPoint = { ...draggedTileTemp.point };
            draggedTileTemp.point = { ...hitTileTemp.point };
            hitTileTemp.point = tempPoint;

            // Now, swap the positions of the tile objects in the array
            newCells[draggedTileIndex] = hitTileTemp;
            newCells[hitTileIndex] = draggedTileTemp;

            setCells(newCells);
            // sync cellsRef with cells in order to trigger Flip animation
            cellsRef.current = newCells;

            setPuzzleData((prev) => {
              return {
                ...prev,
                moves: +prev.moves + 1,
              };
            });

            // must reset the position of the dragged tile for Flip to work correctly
            gsap.set(draggedTile.current, {
              x: 0,
              y: 0,
            });
          }

          // another zIndex "hack" to make sure zIndex returns to an appropriate value
          // when releasing a tile that was dragged during a swap
          zIndexRef.current = draggedTile.current
            ? draggedTile.current.style.zIndex
            : undefined;
        },
      });
    },
    { dependencies: [cells] }
  );

  useGSAP(
    () => {
      // check the lines for the cells that were swapped for completion
      function checkLines() {
        // create shallow copy of cells array
        let cellsCopy = [...cells];
        const completedLines = [];

        pointsToCheck.forEach((point) => {
          const axis = Object.keys(point)[0];
          const isRow = axis === "x" ? true : false;
          const lineNum = isRow ? point.x : point.y;

          // keep track of how many letters are correct
          let correctLetters = [];

          // get all the cells in this line
          const lineCells = cellsCopy.filter(
            (cell) => (isRow ? cell.point.x : cell.point.y) === lineNum
          );

          // check the cells in this line against the appropriate section of the alphaGroup
          // remember that alphaGroup is an array ordered by column lines from left to right
          if (isRow) {
            for (let row = 0; row < 5; row++) {
              if (lineCells[row].string === alphaGroups[row * 5 + lineNum]) {
                correctLetters.push(lineCells[row]);
              }
            }
          } else {
            for (let col = 0; col < 5; col++) {
              if (lineCells[col].string === alphaGroups[lineNum * 5 + col]) {
                correctLetters.push(lineCells[col]);
              }
            }
          }

          // if all five letters in the line are correct, push correctLetters to completedLines
          if (correctLetters.length === 5) {
            completedLines.push(correctLetters);
          }

          // reset correct letters after each line loop
          correctLetters = [];
        });

        return completedLines;
      }

      const completedLines = checkLines();

      // Before a flip animation completes, we need to ensure several things:
      // 1. Prevent interrupting actions to hit and dragged tiles during the flip animation
      // 2. Reset the dragged tile and hit tile animations
      // 3. Check for completed lines and update the cells state accordingly
      function handleFlipStart() {
        // disable pointer events for the dragged tile and the previous hit tile
        // this prevents any interrupting action during the flip animation
        gsap.set([draggedTile.current, prevHitTile.current], {
          pointerEvents: "none",
        });

        gsap.set(prevHitTile.current, {
          // set the hit tile to the same zIndex as the dragged tile
          // this is a "hack" to make sure the hit tile is below the dragged tile
          zIndex: parseInt(draggedTile.current.style.zIndex, 10),
        });

        // reset the dragged tile, hit tile and their parents' animation states
        gsap.to(draggedTile.current, {
          boxShadow: DEFAULT_TILE_SHADOW,
          background: DEFAULT_TILE_BG,
          duration: DEFAULT_DURATION,
        });
        gsap.set(draggedTile.current.parentElement, {
          borderColor: HIDDEN_BORDER,
          delay: HALF_DURATION,
          duration: DEFAULT_DURATION,
          overwrite: true,
        });
        gsap.to(prevHitTile.current, {
          background: DEFAULT_TILE_BG,
          duration: DEFAULT_DURATION,
        });
        gsap.set(prevHitTile.current.parentElement, {
          borderColor: HIDDEN_BORDER,
          delay: HALF_DURATION,
          duration: DEFAULT_DURATION,
          overwrite: true,
        });
        gsap.to([prevHitTile.current, draggedTile.current], {
          scale: NO_SCALE,
          duration: DEFAULT_DURATION,
        });

        if (completedLines.length > 0) {
          // Get the current cells from the ref
          const currentCells = cellsRef.current;

          // Create a Set of IDs of all cells that need to be updated to kind: 0
          const idsToMakeUndraggable = new Set();
          completedLines.forEach((line) => {
            line.forEach((cell) => idsToMakeUndraggable.add(cell.id));
          });

          // Use map to create a NEW array.
          // For each cell, if its ID is in the set of IDs to update, return a NEW object with kind: 0.
          // Otherwise, return the original cell object.
          const updatedCells = currentCells.map((cell) => {
            if (idsToMakeUndraggable.has(cell.id)) {
              return { ...cell, kind: 0 }; // Return a NEW object for the updated cell
            }
            return cell; // Return the original object for unchanged cells
          });

          // Update the cells state with the new undraggable cells
          setCells(updatedCells);
        }
      }

      // This is how we animate completed lines
      function handleFlipComplete() {
        // After the flip animation is complete, we need to re-enable pointer events
        gsap.set([draggedTile.current, prevHitTile.current], {
          pointerEvents: "auto",
        });

        if (completedLines.length > 0) {
          completedLines.forEach((line) => {
            const allCells = line.map((cell) => `#${cell.id}`);
            const draggableCells = line
              .filter((l) => l.kind === 1)
              .map((cell) => `#${cell.id}`);
            const draggableIds = draggableCells.join(", ");
            const allIds = allCells.join(", ");

            const completionTl = gsap.timeline();

            gsap.set(draggableIds, {
              pointerEvents: "none",
            });

            completionTl.to(allIds, {
              background: COMPLETED_TILE_BG,
              boxShadow: COMPLETED_TILE_SHADOW,
              color: ACTIVE_SUBCOLOR,
              scale: NO_SCALE,
              ease: DEFAULT_EASE,
              duration: DEFAULT_DURATION,
              stagger: {
                amount: HALF_DURATION,
                from: "start",
              },
            });

            completionTl.to(allIds, {
              scale: SLIGHT_DOWNSCALE,
              duration: HALF_DURATION,
              ease: DEFAULT_EASE,
            });

            completionTl.to(allIds, {
              background: LOCKED_TILE_BG,
              boxShadow: "none",
              color: ACTIVE_COLOR,
              scale: NO_SCALE,
              y: 0,
              ease: DEFAULT_EASE,
              duration: DEFAULT_DURATION,
            });
          });
        }

        // reset hit tile ref
        prevHitTile.current = null;
      }

      if (flipState.current) {
        // Apply the flip state to animate the grid items
        Flip.from(flipState.current, {
          duration: DEFAULT_DURATION,
          scale: true,
          ease: DEFAULT_EASE,
          onStart: handleFlipStart,
          onComplete: handleFlipComplete,
        });
      }
    },
    { dependencies: [cellsRef.current] }
  );

  return (
    <div
      ref={gridContainerRef}
      className="touch-none perspective-midrange relative grid grid-cols-5 p-2 gap-1 w-full aspect-square mx-auto bg-primary-100 rounded-md border-2 border-orange-800"
    >
      {cells.map((cell, index) => (
        <div
          key={`${cell.id}-${puzzleIndex}` || index}
          className={`grid border-dashed aspect-square place-items-center relative border-2 border-transparent aspect-square rounded-full`}
        >
          <Tile {...cell} ref={(el) => (tileRefs.current[index] = el)} />
        </div>
      ))}
    </div>
  );
}
