export function attachHorizontalPointerResize({
  resizer,
  classTarget,
  activeClass = "is-resizing",
  onStart,
  onResize,
  onEnd,
  onCancel,
} = {}) {
  if (!resizer?.addEventListener || typeof onResize !== "function") {
    return { destroy() {} };
  }

  const startResize = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (onStart?.(event.clientX, event) === false) {
      return;
    }
    classTarget?.classList?.add(activeClass);
    resizer.setPointerCapture?.(event.pointerId);
    onResize(event.clientX, event);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) {
        return;
      }
      onResize(moveEvent.clientX, moveEvent);
    };
    const finishResize = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) {
        return;
      }
      if (resizer.hasPointerCapture?.(endEvent.pointerId)) {
        resizer.releasePointerCapture?.(endEvent.pointerId);
      }
      classTarget?.classList?.remove(activeClass);
      resizer.removeEventListener("pointermove", handlePointerMove);
      resizer.removeEventListener("pointerup", finishResize);
      resizer.removeEventListener("pointercancel", finishResize);
      if (endEvent.type === "pointercancel") {
        onCancel?.(endEvent.clientX, endEvent);
      } else {
        onEnd?.(endEvent.clientX, endEvent);
      }
    };

    resizer.addEventListener("pointermove", handlePointerMove);
    resizer.addEventListener("pointerup", finishResize);
    resizer.addEventListener("pointercancel", finishResize);
  };

  resizer.addEventListener("pointerdown", startResize);
  return {
    destroy() {
      resizer.removeEventListener("pointerdown", startResize);
    },
  };
}
