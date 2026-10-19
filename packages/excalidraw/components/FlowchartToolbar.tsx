import { useState } from "react";

import { sceneCoordsToViewportCoords } from "@excalidraw/common";
import { getCommonBounds, type LinkDirection } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { t } from "../i18n";

import { getFlowchartToolbarNode } from "./App.flowchart";

import "./FlowchartToolbar.scss";

import type App from "./App";

export const FlowchartToolbar = ({
  app,
  selectedElements,
}: {
  app: App;
  selectedElements: readonly NonDeletedExcalidrawElement[];
}) => {
  const [direction, setDirection] = useState<LinkDirection>("down");
  const node = getFlowchartToolbarNode(selectedElements, app.state);
  if (!node || app.flowchart.isCreatingChart) {
    return null;
  }

  const [x1, , x2, y2] = getCommonBounds([node]);
  const { x, y } = sceneCoordsToViewportCoords(
    { sceneX: (x1 + x2) / 2, sceneY: y2 },
    app.state,
  );
  // Canvas coordinates are viewport-relative; DOM overlay coordinates are local.
  const left = Math.max(
    8,
    Math.min(app.state.width - 212, x - app.state.offsetLeft - 102),
  );
  const top = Math.max(
    72,
    Math.min(app.state.height - 60, y - app.state.offsetTop + 16),
  );

  return (
    <div
      className="flowchart-toolbar"
      role="group"
      aria-label={t("flowchart.toolbar")}
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // Native select/Tab/Enter retain their normal behavior, not canvas shortcuts.
        event.stopPropagation();
        if (event.key === "Escape") {
          app.focusContainer();
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <select
        aria-label={t("flowchart.direction")}
        value={direction}
        onChange={(event) => setDirection(event.target.value as LinkDirection)}
      >
        <option value="down">↓ {t("flowchart.down")}</option>
        <option value="right">→ {t("flowchart.right")}</option>
        <option value="up">↑ {t("flowchart.up")}</option>
        <option value="left">← {t("flowchart.left")}</option>
      </select>
      <button
        type="button"
        onClick={() => app.flowchart.addStep(direction)}
        title={t("flowchart.hint")}
      >
        <span aria-hidden="true">＋</span> {t("flowchart.addStep")}
      </button>
    </div>
  );
};
