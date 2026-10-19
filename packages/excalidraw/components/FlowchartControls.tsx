import { sceneCoordsToViewportCoords } from "@excalidraw/common";
import { getCommonBounds } from "@excalidraw/element";

import type { LinkDirection } from "@excalidraw/element";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { t } from "../i18n";

import { useApp, useExcalidrawAppState } from "./App";

import "./FlowchartControls.scss";

/** Screen-sized controls around the rotated selection's scene bounds. */
export const FlowchartControls = ({
  elements,
}: {
  elements: readonly NonDeletedExcalidrawElement[];
}) => {
  const app = useApp();
  const state = useExcalidrawAppState();
  const element = elements[0];

  if (
    elements.length !== 1 ||
    !element ||
    (element.type !== "rectangle" && element.type !== "diamond") ||
    element.locked ||
    state.activeTool.type !== "selection" ||
    state.viewModeEnabled ||
    state.editingTextElement ||
    state.newElement ||
    state.selectionElement ||
    state.resizingElement ||
    state.isRotating ||
    state.selectedElementsAreBeingDragged ||
    state.cursorButton === "down" ||
    state.contextMenu ||
    state.openMenu ||
    state.openDialog ||
    state.showHyperlinkPopup ||
    state.editingGroupId ||
    Object.values(state.selectedGroupIds).some(Boolean) ||
    app.flowchart.isCreatingChart
  ) {
    return null;
  }

  const [x1, y1, x2, y2] = getCommonBounds([element]);
  const positions: Record<LinkDirection, [number, number]> = {
    up: [(x1 + x2) / 2, y1],
    right: [x2, (y1 + y2) / 2],
    down: [(x1 + x2) / 2, y2],
    left: [x1, (y1 + y2) / 2],
  };
  // Constant pixel spacing keeps these targets usable at every zoom level.
  const offsets: Record<LinkDirection, [number, number]> = {
    // Leave the existing rotation handle reachable above the selection.
    up: [0, -48],
    right: [28, 0],
    down: [0, 28],
    left: [-28, 0],
  };
  const labels: Record<LinkDirection, string> = {
    up: t("flowchart.addAbove"),
    right: t("flowchart.addRight"),
    down: t("flowchart.addBelow"),
    left: t("flowchart.addLeft"),
  };

  return (
    <div className="flowchart-controls">
      {(Object.keys(positions) as LinkDirection[]).map((direction) => {
        const [sceneX, sceneY] = positions[direction];
        const { x, y } = sceneCoordsToViewportCoords({ sceneX, sceneY }, state);
        const [dx, dy] = offsets[direction];
        return (
          <button
            key={direction}
            type="button"
            className="flowchart-controls__add"
            aria-label={labels[direction]}
            title={labels[direction]}
            style={{
              left: x - state.offsetLeft + dx,
              top: y - state.offsetTop + dy,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onKeyUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              app.flowchart.createNode(direction);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        );
      })}
    </div>
  );
};
