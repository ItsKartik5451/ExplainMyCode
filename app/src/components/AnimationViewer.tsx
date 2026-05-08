import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export type AnimationStep = {
  step: number;
  description: string;
  visual: string;
  highlights?: number[];
  swap?: [number, number];
  compare?: [number, number];
  arrayState?: number[];
  complexity?: string;
  lineNumber?: number;
  activeLines?: number[];
  variables?: Record<string, string>;
  output?: string;
  callStack?: string[];
  dataStructures?: Array<{
    name: string;
    values: Array<string | number>;
  }>;
  focus?: string;
  operation?: string;
};

const BAR_WIDTH = 46;
const BAR_GAP = 10;
const MAX_BAR_HEIGHT = 190;
const BASE_Y = 255;
const MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MOTION_DURATION = "720ms";

type BarItem = {
  id: string;
  value: number;
  index: number;
};

type AnimationFrame = {
  step: AnimationStep;
  items: BarItem[];
};

interface AnimationViewerProps {
  steps: AnimationStep[];
  initialArray: number[];
  currentStep: number;
  code?: string;
  visualizationType?: string;
}

function getBarColor(index: number, step: AnimationStep): string {
  if (step.highlights?.includes(index)) {
    if (step.visual === "found" || step.visual === "complete") return "#22c55e";
    if (step.visual === "sorted_position") return "#38bdf8";
    if (step.visual === "pass_end") return "#a78bfa";
    return "#f59e0b";
  }

  if (step.compare?.includes(index)) return "#ef4444";
  if (step.swap?.includes(index)) return "#f59e0b";

  if (step.visual === "discard_left" || step.visual === "discard_right") {
    const rangeStart = step.highlights?.[0] ?? 0;
    const rangeEnd = step.highlights?.[step.highlights.length - 1] ?? 0;
    return index >= rangeStart && index <= rangeEnd ? "#64748b" : "#334155";
  }

  return "#475569";
}

function getBarHeight(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || maxValue === 0) return 40;
  return Math.max(40, (value / maxValue) * MAX_BAR_HEIGHT);
}

function getBarX(index: number, totalCount: number): number {
  const totalWidth = totalCount * BAR_WIDTH + (totalCount - 1) * BAR_GAP;
  const startX = -totalWidth / 2 + BAR_WIDTH / 2;
  return startX + index * (BAR_WIDTH + BAR_GAP);
}

function createInitialItems(values: number[]): BarItem[] {
  const counts = new Map<number, number>();

  return values.map((value, index) => {
    const occurrence = counts.get(value) ?? 0;
    counts.set(value, occurrence + 1);

    return {
      id: `${value}-${occurrence}`,
      value,
      index,
    };
  });
}

function assignItemsToValues(previousItems: BarItem[], values: number[]): BarItem[] {
  const usedIds = new Set<string>();

  return values.map((value, index) => {
    const item =
      previousItems
        .filter((candidate) => candidate.value === value && !usedIds.has(candidate.id))
        .sort((a, b) => Math.abs(a.index - index) - Math.abs(b.index - index))[0] ??
      previousItems.find((candidate) => !usedIds.has(candidate.id));

    if (!item) {
      return {
        id: `${value}-new-${index}-${values.length}`,
        value,
        index,
      };
    }

    usedIds.add(item.id);
    return { ...item, value, index };
  });
}

function getFirstArrayState(steps: AnimationStep[], initialArray: number[]): number[] {
  return initialArray.length > 0
    ? initialArray
    : steps.find((step) => step.arrayState && step.arrayState.length > 0)?.arrayState ?? [];
}

function buildFrames(steps: AnimationStep[], initialArray: number[]): AnimationFrame[] {
  let previousItems = createInitialItems(getFirstArrayState(steps, initialArray));

  return steps.map((step) => {
    const values = step.arrayState ?? previousItems.map((item) => item.value);
    const items = values.length > 0 ? assignItemsToValues(previousItems, values) : [];
    previousItems = items;

    return { step, items };
  });
}

function getValuesByIndex(items: BarItem[]): number[] {
  const values: number[] = [];
  items.forEach((item) => {
    values[item.index] = item.value;
  });
  return values.filter((value) => value !== undefined);
}

function getLift(index: number, step: AnimationStep): number {
  if (step.swap?.includes(index)) return -24;
  if (step.compare?.includes(index)) return -12;
  if (step.highlights?.includes(index)) return -8;
  return 0;
}

function getRenderIndex(index: number, step: AnimationStep): number {
  if (!step.swap || step.visual !== "swap") return index;

  const [from, to] = step.swap;
  if (index === from) return to;
  if (index === to) return from;
  return index;
}

function getActiveLines(step: AnimationStep, codeLines: string[], safeStep: number, totalSteps: number) {
  if (step.activeLines?.length) return new Set(step.activeLines);
  if (step.lineNumber) return new Set([step.lineNumber]);

  const executableLines = codeLines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0);
  const inferredIndex = Math.min(
    executableLines.length - 1,
    Math.floor((safeStep / Math.max(totalSteps - 1, 1)) * executableLines.length),
  );

  return new Set([executableLines[inferredIndex]?.lineNumber ?? 1]);
}

function getAccumulatedVariables(steps: AnimationStep[], safeStep: number) {
  return steps.slice(0, safeStep + 1).reduce<Record<string, string>>((acc, step) => {
    if (step.variables) {
      Object.entries(step.variables).forEach(([key, value]) => {
        acc[key] = String(value);
      });
    }
    return acc;
  }, {});
}

function getLatestOutput(steps: AnimationStep[], safeStep: number) {
  return [...steps.slice(0, safeStep + 1)].reverse().find((step) => step.output)?.output;
}

function getOperationLabel(step: AnimationStep) {
  return step.operation || step.focus || step.visual.replace(/_/g, " ");
}

function getStageNodes(step: AnimationStep) {
  const nodes = ["read", "execute", "state", "output"];
  const active =
    step.visual === "io"
      ? "output"
      : step.visual === "assign" || step.visual === "data_update"
        ? "state"
        : "execute";

  return nodes.map((node) => ({ node, active: node === active }));
}

function ArrayScene({
  frame,
  maxValue,
}: {
  frame: AnimationFrame;
  maxValue: number;
}) {
  const displayItems = frame.items;
  const displayArray = getValuesByIndex(displayItems);

  return (
    <svg
      viewBox="-380 -48 760 360"
      className="h-[330px] w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="stage-grid" width="38" height="38" patternUnits="userSpaceOnUse">
          <path d="M 38 0 L 0 0 0 38" fill="none" stroke="#334155" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="-380" y="-48" width="760" height="360" fill="url(#stage-grid)" opacity="0.45" />

      {displayItems.map((item) => {
        const { id, index, value } = item;
        const renderIndex = getRenderIndex(index, frame.step);
        const x = getBarX(renderIndex, displayArray.length);
        const height = getBarHeight(value, maxValue);
        const color = getBarColor(index, frame.step);
        const isAnimated =
          frame.step.highlights?.includes(index) ||
          frame.step.compare?.includes(index) ||
          frame.step.swap?.includes(index);
        const lift = getLift(index, frame.step);

        return (
          <g
            key={id}
            style={{
              transform: `translate(${x}px, ${BASE_Y + lift}px)`,
              transition: `transform ${MOTION_DURATION} ${MOTION_EASING}, opacity 360ms ease`,
              transformBox: "fill-box",
              transformOrigin: "center bottom",
            }}
          >
            <rect
              x={-BAR_WIDTH / 2}
              y={-height}
              width={BAR_WIDTH}
              height={height}
              rx={5}
              fill={color}
              stroke={isAnimated ? "#ffffff" : "transparent"}
              strokeWidth={isAnimated ? 2 : 0}
              style={{
                transition: `height ${MOTION_DURATION} ${MOTION_EASING}, y ${MOTION_DURATION} ${MOTION_EASING}, fill 320ms ease, stroke 240ms ease, filter 240ms ease`,
                filter: isAnimated ? "drop-shadow(0 0 14px rgba(255,255,255,0.38))" : "none",
              }}
            />
            <text
              x={0}
              y={-height / 2 + 6}
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="700"
              style={{ pointerEvents: "none" }}
            >
              {value}
            </text>
          </g>
        );
      })}

      {displayArray.map((_, index) => {
        const x = getBarX(index, displayArray.length);
        return (
          <text
            key={`index-${index}`}
            x={x}
            y={BASE_Y + 20}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
            style={{ pointerEvents: "none" }}
          >
            {index}
          </text>
        );
      })}

      {frame.step.compare && frame.step.visual === "compare" && (
        <g>
          {frame.step.compare.map((idx) => {
            const x = getBarX(idx, displayArray.length);
            const value = displayArray[idx] ?? 1;
            return (
              <polygon
                key={`arrow-${idx}`}
                points={`${x - 6},${BASE_Y - getBarHeight(value, maxValue) - 18} ${x + 6},${BASE_Y - getBarHeight(value, maxValue) - 18} ${x},${BASE_Y - getBarHeight(value, maxValue) - 6}`}
                fill="#ef4444"
                style={{ animation: "compare-bob 900ms ease-in-out infinite" }}
              />
            );
          })}
        </g>
      )}

      {frame.step.swap && (
        <path
          d={`M ${getBarX(frame.step.swap[0], displayArray.length)},${BASE_Y + 35} Q ${
            (getBarX(frame.step.swap[0], displayArray.length) +
              getBarX(frame.step.swap[1], displayArray.length)) /
            2
          },${BASE_Y + 62} ${getBarX(frame.step.swap[1], displayArray.length)},${BASE_Y + 35}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5,3"
          style={{ animation: "dash 900ms linear infinite" }}
        />
      )}
    </svg>
  );
}

function DataStructureScene({ step }: { step: AnimationStep }) {
  const dataStructures = step.dataStructures || [];
  
  if (dataStructures.length === 0) {
    return <FlowScene step={step} />;
  }

  return (
    <div className="relative flex min-h-[330px] flex-col justify-between overflow-hidden rounded-md border border-slate-800 bg-slate-950 p-5">
      <div className="absolute inset-0 opacity-60 stage-sheen" />
      <div className="relative z-10 flex flex-1 items-center justify-center gap-8 overflow-x-auto">
        {dataStructures.map((ds, dsIndex) => {
          const nameLower = ds.name.toLowerCase();
          const isStack = nameLower.includes("stack");
          const isQueue = nameLower.includes("queue");
          const isMap = nameLower.includes("map") || nameLower.includes("dict") || nameLower.includes("set");
          
          return (
            <div key={`${ds.name}-${dsIndex}`} className="flex flex-col items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{ds.name}</div>
              
              {isStack && (
                <div className="flex flex-col-reverse justify-start min-h-[200px] w-24 rounded-b-md border-2 border-t-0 border-slate-700 bg-slate-900/50 p-2 gap-2 overflow-y-auto">
                  {ds.values.map((val, i) => (
                    <div key={`${val}-${i}`} className="flex h-10 w-full shrink-0 items-center justify-center rounded bg-amber-500/20 border border-amber-500/50 text-amber-100 font-mono text-sm shadow-[0_0_10px_rgba(245,158,11,0.2)] step-enter">
                      {val}
                    </div>
                  ))}
                  {ds.values.length === 0 && (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">Empty</div>
                  )}
                </div>
              )}
              
              {isQueue && (
                <div className="flex flex-row items-center min-w-[200px] h-20 rounded-md border-y-2 border-slate-700 bg-slate-900/50 px-2 gap-2 overflow-x-auto">
                  {ds.values.map((val, i) => (
                    <div key={`${val}-${i}`} className="flex min-w-[3rem] h-12 shrink-0 items-center justify-center rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 font-mono text-sm shadow-[0_0_10px_rgba(16,185,129,0.2)] step-enter">
                      {val}
                    </div>
                  ))}
                  {ds.values.length === 0 && (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">Empty</div>
                  )}
                </div>
              )}
              
              {isMap && (
                <div className="flex flex-wrap items-start justify-center gap-3 max-w-[400px] p-4 rounded-md border border-slate-700 bg-slate-900/50 overflow-y-auto max-h-[220px]">
                  {ds.values.map((val, i) => {
                    const strVal = String(val);
                    const parts = strVal.includes(':') ? strVal.split(/:(.+)/) : [strVal, ''];
                    return (
                      <div key={`${val}-${i}`} className="flex items-stretch rounded overflow-hidden border border-purple-500/30 step-enter shrink-0">
                        <div className="bg-purple-500/20 px-2 py-1 flex items-center justify-center text-purple-200 font-mono text-xs">{parts[0].trim()}</div>
                        {parts.length > 1 && parts[1]?.trim() !== '' && (
                          <div className="bg-slate-800 px-2 py-1 flex items-center justify-center text-slate-300 font-mono text-xs border-l border-purple-500/30">{parts[1].trim()}</div>
                        )}
                      </div>
                    );
                  })}
                  {ds.values.length === 0 && (
                    <div className="flex w-full items-center justify-center text-xs text-slate-600">Empty</div>
                  )}
                </div>
              )}
              
              {!isStack && !isQueue && !isMap && (
                <div className="flex flex-wrap items-start justify-center gap-2 max-w-[400px] p-3 rounded-md border border-slate-700 bg-slate-900/50 overflow-y-auto max-h-[220px]">
                  {ds.values.map((val, i) => (
                    <div key={`${val}-${i}`} className="flex min-w-[2.5rem] px-2 h-10 shrink-0 items-center justify-center rounded bg-sky-500/20 border border-sky-500/30 text-sky-200 font-mono text-sm step-enter">
                      {val}
                    </div>
                  ))}
                  {ds.values.length === 0 && (
                    <div className="flex w-full items-center justify-center text-xs text-slate-600">Empty</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div key={step.step} className="relative z-10 mt-6 step-enter rounded-md border border-slate-700 bg-slate-900/90 p-4">
        <Badge className="mb-3 bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">
          {getOperationLabel(step)}
        </Badge>
        <p className="text-lg font-semibold leading-snug text-slate-100">
          {step.focus || step.description}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {step.description}
        </p>
      </div>
    </div>
  );
}

// ─── ArrayBoxesScene ─────────────────────────────────────────────────────────
// Used for array manipulation: rotation, reversal, two-pointer, searching, etc.
// Shows elements as labeled boxes (index visible) instead of height bars.
function ArrayBoxesScene({ frame }: { frame: AnimationFrame }) {
  const { step } = frame;
  const array = getValuesByIndex(frame.items);
  if (array.length === 0) return null;

  const BOX = 52;
  const GAP = 8;
  const totalWidth = array.length * BOX + (array.length - 1) * GAP;
  const startX = -totalWidth / 2;
  const BASE_Y = 80;

  return (
    <svg viewBox="-380 -80 760 320" className="h-[330px] w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="boxes-grid" width="38" height="38" patternUnits="userSpaceOnUse">
          <path d="M 38 0 L 0 0 0 38" fill="none" stroke="#334155" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="-380" y="-80" width="760" height="320" fill="url(#boxes-grid)" opacity="0.3" />

      {array.map((value, index) => {
        const x = startX + index * (BOX + GAP);
        const isHighlighted = step.highlights?.includes(index);
        const isCompared = step.compare?.includes(index);
        const isSwapped = step.swap?.includes(index);

        let fill = "#1e293b";
        let stroke = "#475569";
        let glow = "none";
        let textColor = "#cbd5e1";

        if (isSwapped) {
          fill = "#78350f"; stroke = "#f59e0b";
          glow = "drop-shadow(0 0 12px rgba(245,158,11,0.6))";
          textColor = "#fef3c7";
        } else if (isCompared) {
          fill = "#450a0a"; stroke = "#ef4444";
          glow = "drop-shadow(0 0 12px rgba(239,68,68,0.6))";
          textColor = "#fee2e2";
        } else if (isHighlighted) {
          fill = "#172554"; stroke = "#60a5fa";
          glow = "drop-shadow(0 0 12px rgba(96,165,250,0.5))";
          textColor = "#bfdbfe";
        }

        return (
          <g
            key={`${index}-${value}`}
            style={{
              transform: `translateX(${x}px)`,
              transition: `transform 500ms cubic-bezier(0.22,1,0.36,1)`,
            }}
          >
            {/* pointer arrows above highlighted boxes */}
            {isHighlighted && (
              <polygon
                points={`${BOX / 2 - 6},${BASE_Y - 14} ${BOX / 2 + 6},${BASE_Y - 14} ${BOX / 2},${BASE_Y - 4}`}
                fill="#60a5fa"
                style={{ animation: "compare-bob 900ms ease-in-out infinite" }}
              />
            )}
            {isCompared && (
              <polygon
                points={`${BOX / 2 - 6},${BASE_Y - 14} ${BOX / 2 + 6},${BASE_Y - 14} ${BOX / 2},${BASE_Y - 4}`}
                fill="#ef4444"
                style={{ animation: "compare-bob 900ms ease-in-out infinite" }}
              />
            )}

            <rect
              x={0} y={BASE_Y} width={BOX} height={BOX} rx={8}
              fill={fill} stroke={stroke} strokeWidth={2}
              style={{ transition: "fill 300ms ease, stroke 200ms ease", filter: glow }}
            />
            <text
              x={BOX / 2} y={BASE_Y + BOX / 2 + 7}
              textAnchor="middle" fill={textColor}
              fontSize={value > 99 ? 14 : 18} fontWeight="700"
              style={{ pointerEvents: "none" }}
            >
              {value}
            </text>
            {/* index label below box */}
            <text
              x={BOX / 2} y={BASE_Y + BOX + 18}
              textAnchor="middle" fill="#64748b" fontSize={12}
              style={{ pointerEvents: "none" }}
            >
              [{index}]
            </text>
          </g>
        );
      })}

      {/* swap arc */}
      {step.swap && (() => {
        const [a, b] = step.swap;
        const ax = startX + a * (BOX + GAP) + BOX / 2;
        const bx = startX + b * (BOX + GAP) + BOX / 2;
        const my = BASE_Y + BOX + 40;
        return (
          <path
            d={`M ${ax},${BASE_Y + BOX + 4} Q ${(ax + bx) / 2},${my} ${bx},${BASE_Y + BOX + 4}`}
            fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3"
            style={{ animation: "dash 900ms linear infinite" }}
          />
        );
      })()}
    </svg>
  );
}

function FlowScene({ step }: { step: AnimationStep }) {
  const nodes = getStageNodes(step);

  return (
    <div className="relative flex min-h-[330px] flex-col justify-between overflow-hidden rounded-md border border-slate-800 bg-slate-950 p-5">
      <div className="absolute inset-0 opacity-60 stage-sheen" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        {nodes.map(({ node, active }, index) => (
          <div key={node} className="flex flex-1 items-center">
            <div
              className={`flex h-16 flex-1 items-center justify-center rounded-md border text-xs font-semibold uppercase tracking-wide transition-all duration-500 ${
                active
                  ? "border-amber-400 bg-amber-400/15 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.22)]"
                  : "border-slate-700 bg-slate-900 text-slate-500"
              }`}
            >
              {node}
            </div>
            {index < nodes.length - 1 && (
              <div className="relative h-px w-8 bg-slate-700">
                <span className="flow-particle absolute -top-1 block h-2 w-2 rounded-full bg-amber-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div key={step.step} className="relative z-10 step-enter rounded-md border border-slate-700 bg-slate-900/90 p-4">
        <Badge className="mb-3 bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">
          {getOperationLabel(step)}
        </Badge>
        <p className="text-lg font-semibold leading-snug text-slate-100">
          {step.focus || step.description}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {step.description}
        </p>
      </div>
    </div>
  );
}

function CodePanel({
  codeLines,
  activeLines,
}: {
  codeLines: string[];
  activeLines: Set<number>;
}) {
  const visibleLines = codeLines.length > 0 ? codeLines : ["// paste code and analyze"];

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Execution Focus
      </div>
      <div className="max-h-60 overflow-auto p-2 font-mono text-xs">
        {visibleLines.map((line, index) => {
          const lineNumber = index + 1;
          const active = activeLines.has(lineNumber);

          return (
            <div
              key={`${lineNumber}-${line}`}
              className={`grid grid-cols-[2.5rem_1fr] rounded px-2 py-1 transition-all duration-500 ${
                active
                  ? "bg-amber-400/15 text-slate-50 shadow-[inset_3px_0_0_rgba(245,158,11,1)]"
                  : "text-slate-500"
              }`}
            >
              <span className={active ? "text-amber-300" : "text-slate-600"}>
                {lineNumber}
              </span>
              <span className="whitespace-pre-wrap break-words">
                {line || " "}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatePanel({
  variables,
  output,
  callStack,
  dataStructures,
}: {
  variables: Record<string, string>;
  output?: string;
  callStack?: string[];
  dataStructures?: AnimationStep["dataStructures"];
}) {
  const variableEntries = Object.entries(variables);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          State
        </div>
        <div className="flex min-h-16 flex-wrap gap-2">
          {variableEntries.length > 0 ? (
            variableEntries.map(([key, value]) => (
              <span
                key={key}
                className="step-enter rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
              >
                <span className="text-sky-300">{key}</span>
                <span className="mx-1 text-slate-500">=</span>
                <span className="text-emerald-300">{value}</span>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-600">Waiting for state changes</span>
          )}
        </div>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Output / Stack
        </div>
        <div className="min-h-16 space-y-2 text-sm text-slate-300">
          {output && (
            <div className="rounded bg-slate-900 px-2 py-1 font-mono text-emerald-300">
              {output}
            </div>
          )}
          {callStack && callStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {callStack.map((frame) => (
                <Badge key={frame} variant="outline" className="border-slate-700 text-slate-300">
                  {frame}
                </Badge>
              ))}
            </div>
          )}
          {!output && (!callStack || callStack.length === 0) && (
            <span className="text-sm text-slate-600">No output yet</span>
          )}
        </div>
      </div>

      {dataStructures && dataStructures.length > 0 && (
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3 md:col-span-2">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Data Structures
          </div>
          <div className="space-y-2">
            {dataStructures.map((item) => (
              <div key={item.name} className="flex flex-wrap items-center gap-2">
                <span className="min-w-20 text-xs font-semibold uppercase text-slate-500">
                  {item.name}
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.values.map((value, index) => (
                    <span
                      key={`${item.name}-${index}-${value}`}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    >
                      {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnimationViewer({
  steps,
  initialArray,
  currentStep,
  code = "",
  visualizationType,
}: AnimationViewerProps) {
  const frames = useMemo(
    () => buildFrames(steps, initialArray),
    [steps, initialArray],
  );
  const safeStep = Math.min(Math.max(currentStep, 0), Math.max(frames.length - 1, 0));
  const currentFrame = frames[safeStep];
  const currentStepData = currentFrame?.step;
  const codeLines = useMemo(() => code.split(/\r?\n/), [code]);
  const activeLines = currentStepData
    ? getActiveLines(currentStepData, codeLines, safeStep, steps.length)
    : new Set<number>();
  const variables = getAccumulatedVariables(steps, safeStep);
  const output = getLatestOutput(steps, safeStep);
  const maxValue = Math.max(
    ...frames.flatMap((frame) => frame.items.map((item) => item.value)),
    ...initialArray,
    1,
  );
  const hasArrayScene = frames.some((frame) => frame.items.length > 0);

  if (!steps.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
        <p className="text-slate-400">Enter code and click Analyze to see animation</p>
      </div>
    );
  }

  if (!currentStepData || !currentFrame) return null;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Animated Visualization
            </p>
            <h3 className="mt-1 text-sm font-semibold text-slate-100">
              {currentStepData.focus || currentStepData.description}
            </h3>
          </div>
          <Badge className="bg-slate-800 text-amber-300 hover:bg-slate-800">
            {safeStep + 1}/{steps.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {(() => {
          // Determine which scene to show based on visualizationType or data present
          const vt = visualizationType ?? (hasArrayScene ? "array_bars" : "code_flow");
          const hasDS = !!(currentStepData.dataStructures && currentStepData.dataStructures.length > 0);

          if (vt === "array_bars" && hasArrayScene) {
            return (
              <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <ArrayScene frame={currentFrame} maxValue={maxValue} />
              </div>
            );
          }
          if ((vt === "array_boxes" || vt === "string_chars") && hasArrayScene) {
            return (
              <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <ArrayBoxesScene frame={currentFrame} />
              </div>
            );
          }
          if (hasDS) {
            return <DataStructureScene step={currentStepData} />;
          }
          if (hasArrayScene) {
            // Array present but no specific type — use bars for sorting-like, boxes otherwise
            const sortLike = ["array_bars", "merge_sort", "bubble_sort", "selection_sort", "insertion_sort"];
            return (
              <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                {sortLike.includes(vt)
                  ? <ArrayScene frame={currentFrame} maxValue={maxValue} />
                  : <ArrayBoxesScene frame={currentFrame} />}
              </div>
            );
          }
          return <FlowScene step={currentStepData} />;
        })()}

        <CodePanel codeLines={codeLines} activeLines={activeLines} />

        <StatePanel
          variables={variables}
          output={output}
          callStack={currentStepData.callStack}
          dataStructures={currentStepData.dataStructures}
        />
      </div>
    </div>
  );
}
