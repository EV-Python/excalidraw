import { fireEvent, screen, act } from "@testing-library/react";

import { CaptureUpdateAction } from "@excalidraw/element";

import { createUndoAction, createRedoAction } from "../actions/actionHistory";
import { Excalidraw } from "../index";
import { getNormalizedZoom } from "../scene";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { render, unmountComponent } from "./test-utils";

const { h } = window;

beforeEach(async () => {
  localStorage.clear();
  await render(<Excalidraw handleKeyboardGlobally />);
  const source = API.createElement({
    type: "rectangle",
    x: 200,
    y: 200,
    width: 120,
    height: 80,
    backgroundColor: "#ffc9c9",
    strokeColor: "#c92a2a",
    strokeWidth: 2,
  });
  API.updateScene({
    elements: [source],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  API.setSelectedElements([source]);
});

afterEach(unmountComponent);

const handle = () =>
  screen.getByRole("button", { name: "Create connected shape right" });
const start = () =>
  fireEvent.pointerDown(handle(), {
    pointerId: 1,
    button: 0,
    clientX: 346,
    clientY: 240,
  });
const move = () =>
  fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 600, clientY: 400 });

describe("flowchart drag handles", () => {
  it("previews without mutating the source and commits a styled, bound pair", () => {
    const before = JSON.stringify(h.elements);
    start();
    move();
    expect(JSON.stringify(h.elements)).toBe(before);
    expect(h.app.flowchart.pendingNodes).toHaveLength(2);
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(h.elements).toHaveLength(3);
    const [source, node, arrow] = h.elements;
    expect(node).toMatchObject({
      type: "rectangle",
      x: 540,
      y: 360,
      backgroundColor: source.backgroundColor,
      strokeColor: source.strokeColor,
      strokeWidth: source.strokeWidth,
    });
    expect(arrow.type === "arrow" && arrow.startBinding?.elementId).toBe(
      source.id,
    );
    expect(arrow.type === "arrow" && arrow.endBinding?.elementId).toBe(node.id);
    expect(source.boundElements).toContainEqual({
      id: arrow.id,
      type: "arrow",
    });
    expect(h.state.selectedElementIds[node.id]).toBe(true);
  });

  it.each(["escape", "pointercancel", "lostpointercapture", "unmount"])(
    "discards %s without any scene mutation",
    (reason) => {
      const elements = [...h.elements];
      const before = JSON.stringify(h.elements);
      start();
      move();
      const button = handle();
      if (reason === "escape") {
        Keyboard.keyPress("Escape");
        fireEvent.pointerUp(button, { pointerId: 1 });
      } else if (reason === "unmount") {
        unmountComponent();
      } else {
        fireEvent(handle(), new Event(reason, { bubbles: true }));
        fireEvent.pointerUp(handle(), { pointerId: 1 });
      }
      expect(JSON.stringify(elements)).toBe(before);
      expect(h.app.flowchart.pendingNodes).toBeNull();
    },
  );

  it("does not commit on a click or modifier release during a drag", () => {
    start();
    Keyboard.keyUp("Control");
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(h.elements).toHaveLength(1);
  });

  it("supports keyboard activation with existing directional placement", () => {
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(h.elements).toHaveLength(3);
    expect(h.state.editingTextElement).toBeNull();
    expect(h.elements[1]).toMatchObject({ x: 420, y: 200 });
    API.executeAction(createUndoAction(h.history));
    expect(h.elements.filter((element) => !element.isDeleted)).toHaveLength(1);
    API.executeAction(createRedoAction(h.history));
    expect(h.elements.filter((element) => !element.isDeleted)).toHaveLength(3);
  });

  it("places a diamond under the pointer with zoom, pan and editor offsets", () => {
    const diamond = API.createElement({
      type: "diamond",
      x: 200,
      y: 200,
      width: 120,
      height: 80,
    });
    API.setElements([diamond]);
    API.setSelectedElements([diamond]);
    API.setAppState({
      zoom: { value: getNormalizedZoom(2) },
      scrollX: 50,
      scrollY: -20,
      offsetLeft: 30,
      offsetTop: 40,
    });
    start();
    move();
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(h.elements[1]).toMatchObject({
      type: "diamond",
      x: (600 - 30) / 2 - 50 - 60,
      y: (400 - 40) / 2 + 20 - 40,
    });
  });

  it("hides handles for locked, multiple, non-node and view-mode selections", () => {
    act(() => h.app.scene.mutateElement(h.elements[0], { locked: true }));
    expect(
      screen.queryByRole("group", { name: "Create connected shape" }),
    ).toBeNull();
    act(() => h.app.scene.mutateElement(h.elements[0], { locked: false }));
    API.setAppState({ viewModeEnabled: true });
    expect(
      screen.queryByRole("group", { name: "Create connected shape" }),
    ).toBeNull();
    API.setAppState({ viewModeEnabled: false });
    const ellipse = API.createElement({ type: "ellipse" });
    API.setElements([ellipse]);
    API.setSelectedElements([ellipse]);
    expect(
      screen.queryByRole("group", { name: "Create connected shape" }),
    ).toBeNull();
  });
});
