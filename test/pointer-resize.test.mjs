import assert from "node:assert/strict";
import test from "node:test";

import { attachHorizontalPointerResize } from "../public/pointer-resize.js";

test("horizontal pointer resize follows the captured pointer until release", () => {
  const resizer = createEventTarget();
  const activeClasses = new Set();
  const pointerPositions = [];
  let prevented = false;
  let capturedPointer = null;
  resizer.setPointerCapture = (pointerId) => {
    capturedPointer = pointerId;
  };
  resizer.hasPointerCapture = (pointerId) => capturedPointer === pointerId;
  resizer.releasePointerCapture = (pointerId) => {
    assert.equal(pointerId, capturedPointer);
    capturedPointer = null;
  };
  const controller = attachHorizontalPointerResize({
    resizer,
    classTarget: {
      classList: {
        add: (className) => activeClasses.add(className),
        remove: (className) => activeClasses.delete(className),
      },
    },
    activeClass: "is-outline-resizing",
    onResize: (clientX) => pointerPositions.push(clientX),
  });

  resizer.emit("pointerdown", {
    clientX: 176,
    pointerId: 7,
    preventDefault: () => {
      prevented = true;
    },
  });
  resizer.emit("pointermove", { clientX: 248, pointerId: 7 });
  resizer.emit("pointermove", { clientX: 312, pointerId: 7 });

  assert.equal(prevented, true);
  assert.equal(capturedPointer, 7);
  assert.equal(activeClasses.has("is-outline-resizing"), true);
  assert.deepEqual(pointerPositions, [176, 248, 312]);

  resizer.emit("pointerup", { clientX: 312, pointerId: 7 });
  assert.equal(capturedPointer, null);
  assert.equal(activeClasses.has("is-outline-resizing"), false);

  resizer.emit("pointermove", { clientX: 400, pointerId: 7 });
  assert.deepEqual(pointerPositions, [176, 248, 312]);
  controller.destroy();
});

test("horizontal pointer resize exposes start, end, and cancel lifecycle callbacks", () => {
  const resizer = createEventTarget();
  const lifecycle = [];
  let capturedPointer = null;
  resizer.setPointerCapture = (pointerId) => {
    capturedPointer = pointerId;
  };
  resizer.hasPointerCapture = (pointerId) => capturedPointer === pointerId;
  resizer.releasePointerCapture = () => {
    capturedPointer = null;
  };

  attachHorizontalPointerResize({
    resizer,
    onStart: (clientX) => lifecycle.push(["start", clientX]),
    onResize: (clientX) => lifecycle.push(["resize", clientX]),
    onEnd: (clientX) => lifecycle.push(["end", clientX]),
    onCancel: (clientX) => lifecycle.push(["cancel", clientX]),
  });

  resizer.emit("pointerdown", {
    button: 0,
    clientX: 100,
    pointerId: 1,
    preventDefault() {},
  });
  resizer.emit("pointerup", { clientX: 160, pointerId: 1 });
  resizer.emit("pointerdown", {
    button: 0,
    clientX: 200,
    pointerId: 2,
    preventDefault() {},
  });
  resizer.emit("pointercancel", { clientX: 240, pointerId: 2 });

  assert.deepEqual(lifecycle, [
    ["start", 100],
    ["resize", 100],
    ["end", 160],
    ["start", 200],
    ["resize", 200],
    ["cancel", 240],
  ]);
});

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? new Set();
      handlers.add(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    emit(type, event) {
      for (const handler of [...(listeners.get(type) ?? [])]) {
        handler({ type, ...event });
      }
    },
  };
}
