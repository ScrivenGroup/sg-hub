"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import type { GanttLayoutItem } from "../logic/gantt-layout";
import { todayChartX, type GanttXScale } from "../logic/gantt-x-scale";
import {
  blitGanttScene,
  devicePx,
  mirrorGanttScene,
  newGanttScene,
  paintGanttTimeline,
  paintGanttTimescale,
  readGanttPaintTheme,
  type GanttCamera,
  type GanttDragShift,
} from "../logic/gantt-paint";
import type { LoadGrain } from "../logic/resource-load";
import type { GanttMarker } from "../logic/scheduling";

export type GanttCanvasHandle = {
  /** Repaint the whole viewport. First land, zoom, filters, drop. */
  paint: () => void;
  /** Camera moved at the same scale: shift the pixels, paint the new edge. */
  pan: () => void;
};

type Shared = {
  cameraRef: React.MutableRefObject<GanttCamera>;
  /** Live scale. A zoom gesture updates this before React catches up. */
  scaleRef: React.MutableRefObject<GanttXScale>;
  /** The scale React last committed — a repaint trigger, not the paint source. */
  scale: GanttXScale;
  months: number;
  winStart: { y: number; m: number };
  grain: LoadGrain;
};

type TimelineProps = Shared & {
  items: GanttLayoutItem[];
  markersByRow: Map<string, GanttMarker[]>;
  dueBeforeIdx: number | null;
  showSummarised: boolean;
  /** Marker an overlay is drawing during a drag — left out of the scene. */
  hideKeyRef: React.MutableRefObject<string | null>;
  /** Marker held at a dropped position until its saved date arrives. */
  dragShiftRef: React.MutableRefObject<GanttDragShift | null>;
  pulseKey: string | null;
  className?: string;
  style?: CSSProperties;
};

export const GanttTimelineCanvas = forwardRef<GanttCanvasHandle, TimelineProps>(
  function GanttTimelineCanvas(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const pulseTRef = useRef(0);
    const sceneRef = useRef(newGanttScene());

    const camera = (canvas: HTMLCanvasElement) => {
      const p = propsRef.current;
      const parent = canvas.parentElement;
      const cam = p.cameraRef.current;
      return {
        x: cam.x,
        y: cam.y,
        w: cam.w > 1 ? cam.w : parent?.clientWidth || 800,
        h: cam.h > 1 ? cam.h : parent?.clientHeight || 480,
      };
    };

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const cam = camera(canvas);
      const scale = p.scaleRef.current;
      paintGanttTimeline(canvas, {
        camera: cam,
        scale,
        months: p.months,
        winStart: p.winStart,
        todayX: todayChartX(scale),
        grain: p.grain,
        items: p.items,
        markersByRow: p.markersByRow,
        dueBeforeIdx: p.dueBeforeIdx,
        showSummarised: p.showSummarised,
        theme: readGanttPaintTheme(canvas),
        drag: p.dragShiftRef.current,
        hideKey: p.hideKeyRef.current,
        pulseKey: p.pulseKey,
        pulseT: pulseTRef.current,
      });
      const dpr = devicePx();
      mirrorGanttScene(
        sceneRef.current,
        canvas,
        Math.round(cam.x * dpr),
        Math.round(cam.y * dpr),
      );
    };

    const pan = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const cam = camera(canvas);
      const dpr = devicePx();
      const devX = Math.round(cam.x * dpr);
      const devY = Math.round(cam.y * dpr);
      const scene = sceneRef.current;
      if (scene.valid && scene.devX === devX && scene.devY === devY) return;
      const strips = blitGanttScene(canvas, scene, devX, devY, dpr);
      if (!strips) {
        paint();
        return;
      }
      const theme = readGanttPaintTheme(canvas);
      const scale = p.scaleRef.current;
      const todayX = todayChartX(scale);
      for (const clip of strips) {
        paintGanttTimeline(canvas, {
          camera: cam,
          scale,
          months: p.months,
          winStart: p.winStart,
          todayX,
          grain: p.grain,
          items: p.items,
          markersByRow: p.markersByRow,
          dueBeforeIdx: p.dueBeforeIdx,
          showSummarised: p.showSummarised,
          theme,
          drag: p.dragShiftRef.current,
          hideKey: p.hideKeyRef.current,
          pulseKey: p.pulseKey,
          pulseT: pulseTRef.current,
          clip,
        });
      }
      mirrorGanttScene(scene, canvas, devX, devY);
    };

    const paintRef = useRef(paint);
    paintRef.current = paint;
    const panRef = useRef(pan);
    panRef.current = pan;

    useImperativeHandle(
      ref,
      () => ({
        paint: () => paintRef.current(),
        pan: () => panRef.current(),
      }),
      [],
    );

    // Real scene changes only. Never the drag or the camera.
    useLayoutEffect(() => {
      paintRef.current();
    }, [
      props.items,
      props.markersByRow,
      props.scale,
      props.grain,
      props.months,
      props.dueBeforeIdx,
      props.showSummarised,
      props.pulseKey,
    ]);

    useEffect(() => {
      const parent = canvasRef.current?.parentElement;
      if (!parent || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(() => paintRef.current());
      ro.observe(parent);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      if (!props.pulseKey) return;
      let id = 0;
      const started = performance.now();
      const tick = (now: number) => {
        pulseTRef.current = ((now - started) / 800) % 1;
        paintRef.current();
        id = window.requestAnimationFrame(tick);
      };
      id = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(id);
    }, [props.pulseKey]);

    return (
      <canvas
        ref={canvasRef}
        className={`pointer-events-none block ${props.className || ""}`}
        style={props.style}
        aria-hidden
      />
    );
  },
);

type ScaleProps = Shared & {
  years: { y: number; start: number; span: number }[];
  viewH: number;
  className?: string;
  style?: CSSProperties;
};

export const GanttTimescaleCanvas = forwardRef<GanttCanvasHandle, ScaleProps>(
  function GanttTimescaleCanvas(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const sceneRef = useRef(newGanttScene());

    const viewW = (canvas: HTMLCanvasElement) => {
      const p = propsRef.current;
      const cam = p.cameraRef.current;
      return cam.w > 1 ? cam.w : canvas.parentElement?.clientWidth || 800;
    };

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const cameraX = p.cameraRef.current.x;
      const scale = p.scaleRef.current;
      paintGanttTimescale(canvas, {
        cameraX,
        viewW: viewW(canvas),
        viewH: p.viewH,
        scale,
        months: p.months,
        winStart: p.winStart,
        todayX: todayChartX(scale),
        grain: p.grain,
        years: p.years,
        theme: readGanttPaintTheme(canvas),
      });
      const dpr = devicePx();
      mirrorGanttScene(sceneRef.current, canvas, Math.round(cameraX * dpr), 0);
    };

    const pan = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const cameraX = p.cameraRef.current.x;
      const dpr = devicePx();
      const devX = Math.round(cameraX * dpr);
      const scene = sceneRef.current;
      if (scene.valid && scene.devX === devX) return;
      const strips = blitGanttScene(canvas, scene, devX, 0, dpr);
      if (!strips) {
        paint();
        return;
      }
      const theme = readGanttPaintTheme(canvas);
      const scale = p.scaleRef.current;
      const todayX = todayChartX(scale);
      for (const clip of strips) {
        paintGanttTimescale(canvas, {
          cameraX,
          viewW: viewW(canvas),
          viewH: p.viewH,
          scale,
          months: p.months,
          winStart: p.winStart,
          todayX,
          grain: p.grain,
          years: p.years,
          theme,
          clip,
        });
      }
      mirrorGanttScene(scene, canvas, devX, 0);
    };

    const paintRef = useRef(paint);
    paintRef.current = paint;
    const panRef = useRef(pan);
    panRef.current = pan;

    useImperativeHandle(
      ref,
      () => ({
        paint: () => paintRef.current(),
        pan: () => panRef.current(),
      }),
      [],
    );

    useLayoutEffect(() => {
      paintRef.current();
    }, [
      props.scale,
      props.grain,
      props.months,
      props.years,
      props.viewH,
    ]);

    useEffect(() => {
      const parent = canvasRef.current?.parentElement;
      if (!parent || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(() => paintRef.current());
      ro.observe(parent);
      return () => ro.disconnect();
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={`pointer-events-none block h-full w-full ${props.className || ""}`}
        style={props.style}
        aria-hidden
      />
    );
  },
);
