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
import type { GanttXScale } from "../logic/gantt-x-scale";
import {
  paintGanttTimeline,
  paintGanttTimescale,
  readGanttPaintTheme,
  type GanttCamera,
  type GanttDragShift,
} from "../logic/gantt-paint";
import type { LoadGrain } from "../logic/resource-load";
import type { GanttMarker } from "../logic/scheduling";

export type GanttCanvasHandle = {
  paint: () => void;
};

type Shared = {
  cameraRef: React.MutableRefObject<GanttCamera>;
  scale: GanttXScale;
  months: number;
  winStart: { y: number; m: number };
  todayX: number;
  grain: LoadGrain;
};

type TimelineProps = Shared & {
  items: GanttLayoutItem[];
  markersByRow: Map<string, GanttMarker[]>;
  dueBeforeIdx: number | null;
  showSummarised: boolean;
  drag: GanttDragShift | null;
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

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const parent = canvas.parentElement;
      const cam = p.cameraRef.current;
      paintGanttTimeline(canvas, {
        camera: {
          x: cam.x,
          y: cam.y,
          w: cam.w > 1 ? cam.w : parent?.clientWidth || 800,
          h: cam.h > 1 ? cam.h : parent?.clientHeight || 480,
        },
        scale: p.scale,
        months: p.months,
        winStart: p.winStart,
        todayX: p.todayX,
        grain: p.grain,
        items: p.items,
        markersByRow: p.markersByRow,
        dueBeforeIdx: p.dueBeforeIdx,
        showSummarised: p.showSummarised,
        theme: readGanttPaintTheme(canvas),
        drag: p.drag,
        pulseKey: p.pulseKey,
        pulseT: pulseTRef.current,
      });
    };

    const paintRef = useRef(paint);
    paintRef.current = paint;

    useImperativeHandle(ref, () => ({ paint: () => paintRef.current() }), []);

    useLayoutEffect(() => {
      paintRef.current();
    }, [
      props.items,
      props.markersByRow,
      props.scale,
      props.grain,
      props.months,
      props.todayX,
      props.dueBeforeIdx,
      props.showSummarised,
      props.drag,
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

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const parent = canvas.parentElement;
      const cam = p.cameraRef.current;
      paintGanttTimescale(canvas, {
        cameraX: cam.x,
        viewW: cam.w > 1 ? cam.w : parent?.clientWidth || 800,
        viewH: p.viewH,
        scale: p.scale,
        months: p.months,
        winStart: p.winStart,
        todayX: p.todayX,
        grain: p.grain,
        years: p.years,
        theme: readGanttPaintTheme(canvas),
      });
    };

    const paintRef = useRef(paint);
    paintRef.current = paint;

    useImperativeHandle(ref, () => ({ paint: () => paintRef.current() }), []);

    useLayoutEffect(() => {
      paintRef.current();
    }, [
      props.scale,
      props.grain,
      props.months,
      props.todayX,
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
