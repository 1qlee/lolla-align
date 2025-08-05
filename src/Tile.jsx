import { forwardRef } from "react";

/**
 * @typedef {object} Point
 * @property {number} x - The x-coordinate (row index) of the tile in the grid.
 * @property {number} y - The y-coordinate (column index) of the tile in the grid.
 */

/**
 * Tile component represents a single letter tile in the Align gameboard.
 * It can be either a locked tile (non-draggable) or a draggable tile.
 *
 * @param {object} props - The properties for the Tile component.
 * @param {string} props.id - A unique identifier for the tile, typically its position in the grid (e.g., 'tile-1', 'tile-25').
 * @param {string} props.string - The letter character displayed on the tile.
 * @param {0 | 1} props.kind - The type of tile: `0` for non-draggable (locked), `1` for draggable.
 * @param {Point} props.point - The x and y grid coordinates for the tile's position.
 * @returns {JSX.Element | null} A React `div` element representing the tile, or `null` if `point` data is invalid.
 */

const Tile = forwardRef(({ id, string, kind, point }, ref) => {
  return (
    <div
      id={id}
      ref={ref}
      data-locked={kind}
      data-point={`${point.x},${point.y}`}
      className={`tile h-full w-full rounded-full flex items-center justify-center font-bold aspect-square no-select select-none leading-none ${
        kind === 0
          ? "select-none pointer-events-none text-primary-600"
          : "bg-white border-2 border-primary-600 text-gray-700"
      }`}
    >
      <span className="text-trim-start">{string}</span>
    </div>
  );
});

export default Tile;
