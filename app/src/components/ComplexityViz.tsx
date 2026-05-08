import { useMemo } from "react";

interface ComplexityVizProps {
  complexity: string;
  currentStep: number;
  totalSteps: number;
  algorithmType: string;
}

function getComplexityData(complexity: string, _totalSteps: number) {
  const n = 10; // normalized n for visualization
  
  if (complexity.includes("log")) {
    // O(log n) - logarithmic curve
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: i,
      y: i === 0 ? 0 : Math.log2(i + 1) * 30,
    }));
  }
  
  if (complexity.includes("n²")) {
    // O(n²) - quadratic curve
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: i,
      y: Math.pow(i, 2) * 2.5,
    }));
  }
  
  if (complexity.includes("n)")) {
    // O(n) - linear
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: i,
      y: i * 25,
    }));
  }
  
  // Default
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: i,
    y: i * 25,
  }));
}

export default function ComplexityViz({
  complexity,
  currentStep,
  totalSteps,
  algorithmType,
}: ComplexityVizProps) {
  const data = useMemo(() => getComplexityData(complexity, totalSteps), [complexity, totalSteps]);
  
  const maxY = Math.max(...data.map((d) => d.y), 1);
  const progress = totalSteps > 0 ? currentStep / totalSteps : 0;
  const currentX = progress * 10;
  const currentY = data.find((d) => d.x >= currentX)?.y ?? 0;

  const points = data.map((d) => {
    const x = 30 + (d.x / 10) * 240;
    const y = 180 - (d.y / maxY) * 150;
    return `${x},${y}`;
  }).join(" ");

  const color = complexity.includes("log")
    ? "#22c55e"
    : complexity.includes("n²")
    ? "#ef4444"
    : "#3b82f6";

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Complexity</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300 font-mono">
          {complexity}
        </span>
      </div>

      <svg viewBox="0 0 300 200" className="w-full h-[160px]">
        {/* Grid */}
        <defs>
          <pattern id="complexGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="200" fill="url(#complexGrid)" rx="4" />

        {/* Axes */}
        <line x1="30" y1="180" x2="270" y2="180" stroke="#64748b" strokeWidth="1" />
        <line x1="30" y1="180" x2="30" y2="30" stroke="#64748b" strokeWidth="1" />

        {/* Labels */}
        <text x="150" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10">
          Input Size (n)
        </text>
        <text
          x="12"
          y="105"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
          transform="rotate(-90, 12, 105)"
        >
          Operations
        </text>

        {/* Curve */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fill area under curve */}
        <polygon
          fill={color}
          fillOpacity="0.1"
          points={`30,180 ${points} 270,180`}
        />

        {/* Current position indicator */}
        {currentStep > 0 && (
          <g>
            <circle
              cx={30 + (currentX / 10) * 240}
              cy={180 - (currentY / maxY) * 150}
              r="5"
              fill={color}
              stroke="white"
              strokeWidth="2"
            >
              <animate
                attributeName="r"
                values="5;7;5"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
            <line
              x1={30 + (currentX / 10) * 240}
              y1={180 - (currentY / maxY) * 150}
              x2={30 + (currentX / 10) * 240}
              y2="180"
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.5"
            />
          </g>
        )}

        {/* Algorithm label */}
        <text x="270" y="20" textAnchor="end" fill={color} fontSize="11" fontWeight="600">
          {algorithmType}
        </text>
      </svg>

      <div className="mt-2 text-xs text-slate-400">
        {complexity.includes("log") && "Logarithmic growth - very efficient for large inputs"}
        {complexity.includes("n²") && "Quadratic growth - becomes slow with large inputs"}
        {complexity.includes("n)") && !complexity.includes("n²") && "Linear growth - scales proportionally with input"}
      </div>
    </div>
  );
}
