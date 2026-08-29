"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

export interface FileDrop {
  readonly dragging: boolean;
  readonly handlers: {
    readonly onDragEnter: (event: DragEvent) => void;
    readonly onDragOver: (event: DragEvent) => void;
    readonly onDragLeave: (event: DragEvent) => void;
    readonly onDrop: (event: DragEvent) => void;
  };
}

const carriesFile = (event: DragEvent): boolean => Array.from(event.dataTransfer?.types ?? []).includes("Files");

export function useFileDrop(onFile: (file: File) => void): FileDrop {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback((event: DragEvent) => {
    if (!carriesFile(event)) return;
    event.preventDefault();
    depth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    if (!carriesFile(event)) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((event: DragEvent) => {
    if (!carriesFile(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!carriesFile(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return { dragging, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
