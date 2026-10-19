import { act, fireEvent, screen } from "@testing-library/react";

import { CaptureUpdateAction } from "@excalidraw/element";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { render, unmountComponent } from "./test-utils";

const { h } = window;

beforeEach(async () => {
  localStorage.clear();
  await render(<Excalidraw handleKeyboardGlobally />);
  API.setAppState({ width: 1200, height: 900 });
});

afterEach(unmountComponent);

const selectNode = (type: "rectangle" | "diamond" = "rectangle") => {
  const node = API.createElement({
    type,
    x: 350,
    y: 200,
    width: 160,
    height: 80,
    strokeColor: "#e03131",
    backgroundColor: "#ffec99",
    fillStyle: "solid",
    strokeWidth: 2,
  });
  API.updateScene({
    elements: [node],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  API.setSelectedElements([node]);
  return node;
};

describe("contextual Add step toolbar", () => {
  it.each(["up", "right", "down", "left"] as const)(
    "creates a same-style diamond and bound arrow %s",
    (direction) => {
      const source = selectNode("diamond");
      fireEvent.change(screen.getByLabelText("Next step direction"), {
        target: { value: direction },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add step" }));

      expect(h.elements).toHaveLength(3);
      const next = API.getSelectedElement();
      expect(next.id).not.toBe(source.id);
      expect(next).toMatchObject({
        type: source.type,
        strokeColor: source.strokeColor,
        backgroundColor: source.backgroundColor,
        fillStyle: source.fillStyle,
        strokeWidth: source.strokeWidth,
        width: source.width,
        height: source.height,
      });
      const arrow = h.elements.find((el) => el.type === "arrow");
      expect(arrow).toMatchObject({
        startBinding: { elementId: source.id },
        endBinding: { elementId: next.id },
      });
      if (direction === "up") {
        expect(next.y + next.height).toBeLessThan(source.y);
      } else if (direction === "down") {
        expect(next.y).toBeGreaterThan(source.y + source.height);
      } else if (direction === "left") {
        expect(next.x + next.width).toBeLessThan(source.x);
      } else {
        expect(next.x).toBeGreaterThan(source.x + source.width);
      }
    },
  );

  it("undoes and redoes the node and connector together", () => {
    selectNode();
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    Keyboard.undo();
    expect(h.elements.filter((el) => !el.isDeleted)).toHaveLength(1);
    Keyboard.redo();
    expect(h.elements.filter((el) => !el.isDeleted)).toHaveLength(3);
  });

  it("uses the existing Enter label editor after creation", () => {
    selectNode();
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    Keyboard.keyPress("Enter");
    expect(document.querySelector(".excalidraw-wysiwyg")).not.toBeNull();
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
  });

  it("does not show for locked, multiple or unsupported selections", () => {
    const source = selectNode();
    API.updateElement(source, { locked: true });
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
    API.updateElement(source, { locked: false });
    const ellipse = API.createElement({ type: "ellipse" });
    API.setElements([source, ellipse]);
    API.setSelectedElements([source, ellipse]);
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
    API.setSelectedElements([ellipse]);
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
    API.clearSelection();
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
  });

  it.each([
    { viewModeEnabled: true },
    {
      activeTool: {
        type: "rectangle" as const,
        customType: null,
        lastActiveTool: null,
        locked: false,
        fromSelection: false,
      },
    },
    { selectedElementsAreBeingDragged: true },
    { isRotating: true },
  ])("hides in incompatible editor modes: %j", (state) => {
    selectNode();
    API.setAppState((prev) => ({ ...prev, ...state }));
    expect(screen.queryByRole("group", { name: "Flowchart" })).toBeNull();
  });

  it("tracks zoom and pan in local canvas coordinates", () => {
    selectNode();
    const toolbar = screen.getByRole("group", { name: "Flowchart" });
    const before = toolbar.style.left;
    act(() =>
      h.app.setState({
        zoom: { value: 0.5 as typeof h.state.zoom.value },
        scrollX: 50,
        scrollY: 30,
      }),
    );
    expect(toolbar.style.left).not.toBe(before);
    expect(Number.parseFloat(toolbar.style.left)).toBeGreaterThanOrEqual(8);
  });

  it("keeps select keyboard events away from canvas shortcuts", () => {
    const source = selectNode();
    fireEvent.keyDown(screen.getByLabelText("Next step direction"), {
      key: "ArrowRight",
      ctrlKey: true,
    });
    expect(h.app.flowchart.isCreatingChart).toBe(false);
    expect(API.getSelectedElement().x).toBe(source.x);
  });
});
