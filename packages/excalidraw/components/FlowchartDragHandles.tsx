import { useEffect, useRef } from "react";

import {
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import type { LinkDirection } from "@excalidraw/element";
import type {
  ExcalidrawFlowchartNodeElement,
  NonDeleted,
} from "@excalidraw/element/types";

import "./FlowchartDragHandles.scss";

import type App from "./App";

const directions: { direction: LinkDirection; icon: string }[] = [
  { direction: "up", icon: "↑" },
  { direction: "right", icon: "→" },
  { direction: "down", icon: "↓" },
  { direction: "left", icon: "←" },
];

export const FlowchartDragHandles = ({
  app,
  element,
}: {
  app: App;
  element: NonDeleted<ExcalidrawFlowchartNodeElement>;
}) => {
  const drag = useRef<{
    pointerId: number;
    direction: LinkDirection;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const cancel = () => {
      drag.current = null;
      app.flowchart.cancelDrag();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drag.current) {
        event.preventDefault();
        cancel();
      }
    };
    app.ownerWindow.addEventListener("keydown", escape, true);
    app.ownerWindow.addEventListener("blur", cancel);
    return () => {
      app.ownerWindow.removeEventListener("keydown", escape, true);
      app.ownerWindow.removeEventListener("blur", cancel);
      cancel();
    };
  }, [app, element.id]);

  return (
    <div
      className="flowchart-drag-handles"
      role="group"
      aria-label="Create connected shape"
    >
      {directions.map(({ direction, icon }) => {
        const horizontal = direction === "left" || direction === "right";
        const { x, y } = sceneCoordsToViewportCoords(
          {
            sceneX:
              element.x +
              (horizontal
                ? direction === "right"
                  ? element.width
                  : 0
                : element.width / 2),
            sceneY:
              element.y +
              (horizontal
                ? element.height / 2
                : direction === "down"
                ? element.height
                : 0),
          },
          app.state,
        );
        return (
          <button
            key={direction}
            type="button"
            className="flowchart-drag-handle"
            aria-label={`Create connected shape ${direction}`}
            title={`Drag to create ${direction}; Enter to add. Double-click the new shape to label it.`}
            style={{
              left:
                x -
                app.state.offsetLeft +
                (horizontal ? (direction === "right" ? 26 : -26) : 0),
              top:
                y -
                app.state.offsetTop +
                (horizontal ? 0 : direction === "down" ? 26 : -26),
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              event.stopPropagation();
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              drag.current = {
                pointerId: event.pointerId,
                direction,
                x: event.clientX,
                y: event.clientY,
                moved: false,
              };
              app.flowchart.previewDrag(element, direction);
            }}
            onPointerMove={(event) => {
              const active = drag.current;
              if (!active || active.pointerId !== event.pointerId) {
                return;
              }
              event.stopPropagation();
              if (
                Math.hypot(event.clientX - active.x, event.clientY - active.y) <
                  5 &&
                !active.moved
              ) {
                return;
              }
              active.moved = true;
              const position = viewportCoordsToSceneCoords(event, app.state);
              app.flowchart.previewDrag(element, active.direction, {
                x: position.x - element.width / 2,
                y: position.y - element.height / 2,
              });
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              const active = drag.current;
              drag.current = null;
              if (active?.pointerId === event.pointerId && active.moved) {
                app.flowchart.commitDrag();
              } else {
                app.flowchart.cancelDrag();
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
              app.flowchart.cancelDrag();
            }}
            onLostPointerCapture={() => {
              drag.current = null;
              app.flowchart.cancelDrag();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                if (!event.repeat && !drag.current) {
                  app.flowchart.previewDrag(element, direction);
                  app.flowchart.commitDrag();
                }
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (event.detail === 0) {
                app.flowchart.previewDrag(element, direction);
                app.flowchart.commitDrag();
              }
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
};
