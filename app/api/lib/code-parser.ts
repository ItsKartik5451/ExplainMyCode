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

export type ExplanationResult = {
  title: string;
  algorithmType: string;
  complexity: string;
  steps: AnimationStep[];
  initialArray: number[];
  narration: string;
  detectedPattern: boolean;
  visualizationType?: string;
};

const DEFAULT_ARRAY = [64, 34, 25, 12, 22, 11, 90];

export function extractArray(code: string): number[] {
  // Try to find array literal like [3, 1, 4, 1, 5]
  const match = code.match(/\[\s*([\d,\s]+)\s*\]/);
  if (match) {
    return match[1]
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  return [];
}

function generateBubbleSortSteps(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = [...arr];
  let stepNum = 0;

  steps.push({
    step: stepNum++,
    description: `Start with array: [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(n²)",
  });

  for (let i = 0; i < array.length - 1; i++) {
    steps.push({
      step: stepNum++,
      description: `Pass ${i + 1}: Looking at elements ${i === 0 ? "0 to n-1" : `0 to ${array.length - i - 1}`}`,
      visual: "pass_start",
      arrayState: [...array],
      complexity: `O(n²) - Pass ${i + 1} of ${array.length - 1}`,
    });

    let swapped = false;
    for (let j = 0; j < array.length - i - 1; j++) {
      steps.push({
        step: stepNum++,
        description: `Compare elements at index ${j} (${array[j]}) and ${j + 1} (${array[j + 1]})`,
        visual: "compare",
        compare: [j, j + 1],
        arrayState: [...array],
      });

      if (array[j] > array[j + 1]) {
        steps.push({
          step: stepNum++,
          description: `${array[j]} > ${array[j + 1]}: Swap them`,
          visual: "swap",
          swap: [j, j + 1],
          highlights: [j, j + 1],
          arrayState: [...array],
        });

        const temp = array[j];
        array[j] = array[j + 1];
        array[j + 1] = temp;
        swapped = true;

        steps.push({
          step: stepNum++,
          description: `Array after swap: [${array.join(", ")}]`,
          visual: "show_array",
          arrayState: [...array],
        });
      } else {
        steps.push({
          step: stepNum++,
          description: `${array[j]} ≤ ${array[j + 1]}: No swap needed`,
          visual: "no_swap",
          compare: [j, j + 1],
          arrayState: [...array],
        });
      }
    }

    steps.push({
      step: stepNum++,
      description: swapped
        ? `End of pass ${i + 1}. Element ${array[array.length - i - 1]} is now in its correct position.`
        : `End of pass ${i + 1}. No swaps - array is sorted!`,
      visual: "pass_end",
      highlights: [array.length - i - 1],
      arrayState: [...array],
    });

    if (!swapped) break;
  }

  steps.push({
    step: stepNum++,
    description: `Sorting complete! Final array: [${array.join(", ")}]`,
    visual: "complete",
    arrayState: [...array],
    complexity: "O(n²) worst case, O(n) best case",
  });

  return steps;
}

function generateSelectionSortSteps(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = [...arr];
  let stepNum = 0;

  steps.push({
    step: stepNum++,
    description: `Start with array: [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(n²)",
  });

  for (let i = 0; i < array.length - 1; i++) {
    let minIdx = i;
    
    steps.push({
      step: stepNum++,
      description: `Pass ${i + 1}: Assume index ${i} (${array[i]}) is the minimum`,
      visual: "select_min",
      highlights: [i],
      arrayState: [...array],
    });

    for (let j = i + 1; j < array.length; j++) {
      steps.push({
        step: stepNum++,
        description: `Compare current minimum ${array[minIdx]} at ${minIdx} with ${array[j]} at ${j}`,
        visual: "compare",
        compare: [minIdx, j],
        arrayState: [...array],
      });

      if (array[j] < array[minIdx]) {
        steps.push({
          step: stepNum++,
          description: `${array[j]} < ${array[minIdx]}: New minimum found at index ${j}`,
          visual: "new_min",
          highlights: [j],
          arrayState: [...array],
        });
        minIdx = j;
      }
    }

    if (minIdx !== i) {
      steps.push({
        step: stepNum++,
        description: `Swap minimum ${array[minIdx]} with element at index ${i}`,
        visual: "swap",
        swap: [i, minIdx],
        arrayState: [...array],
      });

      const temp = array[i];
      array[i] = array[minIdx];
      array[minIdx] = temp;

      steps.push({
        step: stepNum++,
        description: `Array after swap: [${array.join(", ")}]`,
        visual: "show_array",
        arrayState: [...array],
      });
    } else {
      steps.push({
        step: stepNum++,
        description: `Index ${i} already has the minimum - no swap needed`,
        visual: "no_swap",
        highlights: [i],
        arrayState: [...array],
      });
    }

    steps.push({
      step: stepNum++,
      description: `Element ${array[i]} is now in its correct sorted position`,
      visual: "sorted_position",
      highlights: Array.from({ length: i + 1 }, (_, k) => k),
      arrayState: [...array],
    });
  }

  steps.push({
    step: stepNum++,
    description: `Sorting complete! Final array: [${array.join(", ")}]`,
    visual: "complete",
    arrayState: [...array],
    complexity: "O(n²) - always performs ~n²/2 comparisons",
  });

  return steps;
}

function generateInsertionSortSteps(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = [...arr];
  let stepNum = 0;

  steps.push({
    step: stepNum++,
    description: `Start with array: [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(n²)",
  });

  steps.push({
    step: stepNum++,
    description: `First element ${array[0]} is trivially sorted`,
    visual: "sorted_position",
    highlights: [0],
    arrayState: [...array],
  });

  for (let i = 1; i < array.length; i++) {
    const key = array[i];
    let j = i - 1;

    steps.push({
      step: stepNum++,
      description: `Pick element ${key} at index ${i} as the key to insert`,
      visual: "select_key",
      highlights: [i],
      arrayState: [...array],
    });

    while (j >= 0 && array[j] > key) {
      steps.push({
        step: stepNum++,
        description: `${array[j]} > ${key}: Shift ${array[j]} one position right`,
        visual: "shift",
        highlights: [j, j + 1],
        arrayState: [...array],
      });

      array[j + 1] = array[j];
      j = j - 1;

      steps.push({
        step: stepNum++,
        description: `After shift: [${array.join(", ")}]`,
        visual: "show_array",
        arrayState: [...array],
      });
    }

    array[j + 1] = key;

    steps.push({
      step: stepNum++,
      description: `Insert ${key} at index ${j + 1}. Sorted portion: [${array.slice(0, i + 1).join(", ")}]`,
      visual: "insert",
      highlights: Array.from({ length: i + 1 }, (_, k) => k),
      arrayState: [...array],
    });
  }

  steps.push({
    step: stepNum++,
    description: `Sorting complete! Final array: [${array.join(", ")}]`,
    visual: "complete",
    arrayState: [...array],
    complexity: "O(n²) worst case, O(n) best case",
  });

  return steps;
}

function generateLinearSearchSteps(arr: number[], target: number | null): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = [...arr];
  const searchTarget = target ?? array[array.length - 1]; // default target
  let stepNum = 0;

  steps.push({
    step: stepNum++,
    description: `Search for ${searchTarget} in array [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(n)",
  });

  for (let i = 0; i < array.length; i++) {
    steps.push({
      step: stepNum++,
      description: `Check index ${i}: is ${array[i]} == ${searchTarget}?`,
      visual: "compare",
      compare: [i, i],
      highlights: [i],
      arrayState: [...array],
    });

    if (array[i] === searchTarget) {
      steps.push({
        step: stepNum++,
        description: `Found! ${searchTarget} is at index ${i}`,
        visual: "found",
        highlights: [i],
        arrayState: [...array],
        complexity: `O(n) - found at index ${i}`,
      });
      return steps;
    }

    steps.push({
      step: stepNum++,
      description: `${array[i]} ≠ ${searchTarget}: Continue searching`,
      visual: "no_match",
      arrayState: [...array],
    });
  }

  steps.push({
  step: stepNum++,
    description: `${searchTarget} not found in the array`,
    visual: "not_found",
    arrayState: [...array],
    complexity: "O(n) - element not present",
  });

  return steps;
}

function generateBinarySearchSteps(arr: number[], target: number | null): AnimationStep[] {
  // Binary search needs a sorted array
  const array = [...arr].sort((a, b) => a - b);
  const searchTarget = target ?? array[Math.floor(array.length / 2)];
  const steps: AnimationStep[] = [];
  let stepNum = 0;

  steps.push({
    step: stepNum++,
    description: `Binary search for ${searchTarget} in sorted array [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(log n)",
  });

  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    steps.push({
      step: stepNum++,
      description: `Search range: indices ${left} to ${right}. Middle index: ${mid} (value: ${array[mid]})`,
      visual: "search_range",
      highlights: Array.from({ length: right - left + 1 }, (_, k) => left + k),
      compare: [mid, mid],
      arrayState: [...array],
    });

    if (array[mid] === searchTarget) {
      steps.push({
        step: stepNum++,
        description: `Found! ${searchTarget} is at index ${mid}`,
        visual: "found",
        highlights: [mid],
        arrayState: [...array],
        complexity: `O(log n) - found at index ${mid}`,
      });
      return steps;
    }

    if (array[mid] < searchTarget) {
      steps.push({
        step: stepNum++,
        description: `${array[mid]} < ${searchTarget}: Search right half`,
        visual: "discard_left",
        highlights: Array.from({ length: right - mid }, (_, k) => mid + 1 + k),
        arrayState: [...array],
      });
      left = mid + 1;
    } else {
      steps.push({
        step: stepNum++,
        description: `${array[mid]} > ${searchTarget}: Search left half`,
        visual: "discard_right",
        highlights: Array.from({ length: mid - left }, (_, k) => left + k),
        arrayState: [...array],
      });
      right = mid - 1;
    }
  }

  steps.push({
    step: stepNum++,
    description: `${searchTarget} not found in the array`,
    visual: "not_found",
    arrayState: [...array],
    complexity: "O(log n) - element not present",
  });

  return steps;
}

function generateMergeSortSteps(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  let stepNum = 0;
  const array = [...arr];

  steps.push({
    step: stepNum++,
    description: `Start Merge Sort on [${array.join(", ")}]`,
    visual: "show_array",
    arrayState: [...array],
    complexity: "O(n log n)",
    focus: "Initial array",
    operation: "start",
    dataStructures: [
      { name: "Array", values: [...array] },
    ],
  });

  // We'll do a simulated merge sort, collecting steps at each merge
  function mergeSort(arr: number[], depth: number, offset: number): number[] {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    steps.push({
      step: stepNum++,
      description: `Divide [${arr.join(", ")}] → Left: [${left.join(", ")}] | Right: [${right.join(", ")}]`,
      visual: "pass_start",
      arrayState: [...array],
      highlights: Array.from({ length: arr.length }, (_, k) => offset + k),
      focus: `Split at depth ${depth + 1}`,
      operation: "divide",
      dataStructures: [
        { name: `Left (d${depth + 1})`, values: left },
        { name: `Right (d${depth + 1})`, values: right },
      ],
      variables: { depth: String(depth + 1), size: String(arr.length), mid: String(mid) },
    });

    const sortedLeft = mergeSort(left, depth + 1, offset);
    const sortedRight = mergeSort(right, depth + 1, offset + mid);

    // Merge step
    const merged: number[] = [];
    let i = 0, j = 0;

    while (i < sortedLeft.length && j < sortedRight.length) {
      steps.push({
        step: stepNum++,
        description: `Compare ${sortedLeft[i]} vs ${sortedRight[j]} → take ${sortedLeft[i] <= sortedRight[j] ? sortedLeft[i] : sortedRight[j]}`,
        visual: "compare",
        arrayState: [...array],
        compare: [offset + i, offset + mid + j],
        focus: "Merging",
        operation: "compare",
        dataStructures: [
          { name: "Left", values: sortedLeft },
          { name: "Right", values: sortedRight },
          { name: "Merged so far", values: merged },
        ],
        variables: {
          comparing: `${sortedLeft[i]} vs ${sortedRight[j]}`,
          leftIdx: String(i),
          rightIdx: String(j),
        },
      });

      if (sortedLeft[i] <= sortedRight[j]) {
        merged.push(sortedLeft[i++]);
      } else {
        merged.push(sortedRight[j++]);
      }
    }

    while (i < sortedLeft.length) merged.push(sortedLeft[i++]);
    while (j < sortedRight.length) merged.push(sortedRight[j++]);

    // Write merged values back into the global array so arrayState stays consistent
    for (let k = 0; k < merged.length; k++) {
      array[offset + k] = merged[k];
    }

    steps.push({
      step: stepNum++,
      description: `Merged into [${merged.join(", ")}] at positions ${offset}–${offset + merged.length - 1}`,
      visual: "sorted_position",
      arrayState: [...array],
      highlights: Array.from({ length: merged.length }, (_, k) => offset + k),
      focus: "Merge complete",
      operation: "merge",
      dataStructures: [
        { name: "Merged", values: merged },
      ],
      variables: { mergedSize: String(merged.length) },
    });

    return merged;
  }

  mergeSort(array.slice(), 0, 0);

  steps.push({
    step: stepNum++,
    description: `Merge Sort complete! Sorted: [${array.join(", ")}]`,
    visual: "complete",
    arrayState: [...array],
    complexity: "O(n log n) — always",
    focus: "Done",
    operation: "finish",
    dataStructures: [
      { name: "Sorted Array", values: [...array] },
    ],
  });

  return steps;
}

function detectAlgorithm(code: string): { type: string; target: number | null } {
  const lower = code.toLowerCase();

  // ── Highest-priority exact name checks ──────────────────────────────────
  if (lower.includes("merge_sort") || lower.includes("mergesort") || lower.includes("merge sort")) {
    return { type: "merge_sort", target: null };
  }
  if (lower.includes("quick_sort") || lower.includes("quicksort") || lower.includes("quick sort")) {
    return { type: "general_code", target: null };
  }
  if (lower.includes("bubble_sort") || lower.includes("bubblesort") || lower.includes("bubble sort")) {
    return { type: "bubble_sort", target: null };
  }
  if (lower.includes("selection_sort") || lower.includes("selectionsort") || lower.includes("selection sort")) {
    return { type: "selection_sort", target: null };
  }
  if (lower.includes("insertion_sort") || lower.includes("insertionsort") || lower.includes("insertion sort")) {
    return { type: "insertion_sort", target: null };
  }
  if (lower.includes("binary_search") || lower.includes("binarysearch") || lower.includes("binary search")) {
    return { type: "binary_search", target: null };
  }
  if (lower.includes("linear_search") || lower.includes("linearsearch") || lower.includes("linear search")) {
    return { type: "linear_search", target: null };
  }

  // ── Structural pattern checks (ordered from specific → generic) ──────────

  // Merge sort: divide array into two halves + recursive calls + merge
  if (
    lower.includes("merge") &&
    (lower.includes("left_half") || lower.includes("left half") || lower.includes("left[")) &&
    lower.includes("right")
  ) {
    return { type: "merge_sort", target: null };
  }

  // Binary search: needs mid + two-boundary variable
  if (
    (lower.includes("mid") || lower.includes("middle")) &&
    (lower.includes("left") || lower.includes("lo") || lower.includes("start")) &&
    (lower.includes("right") || lower.includes("hi") || lower.includes("end")) &&
    !lower.includes("merge") &&
    !lower.includes("left_half")
  ) {
    return { type: "binary_search", target: null };
  }

  // Bubble sort: swap adjacent elements in nested loops
  if (
    lower.includes("bubble") ||
    (lower.includes("swap") &&
      (lower.includes("arr[j]") || lower.includes("arr[i]")) &&
      lower.includes("for"))
  ) {
    return { type: "bubble_sort", target: null };
  }

  // Selection sort: find minimum index then swap
  if (
    (lower.includes("min_idx") || lower.includes("min_index") || lower.includes("min_i")) &&
    lower.includes("swap")
  ) {
    return { type: "selection_sort", target: null };
  }

  // Insertion sort: pick key element, shift larger elements right
  if (
    (lower.includes("key") || lower.includes("insert")) &&
    lower.includes("while") &&
    lower.includes("shift")
  ) {
    return { type: "insertion_sort", target: null };
  }

  // Linear search: iterate and compare against target
  if (
    lower.includes("for") &&
    (lower.includes("target") || lower.includes("search")) &&
    !lower.includes("swap") &&
    !lower.includes("merge")
  ) {
    return { type: "linear_search", target: null };
  }

  return { type: "general_code", target: null };
}

function detectTarget(code: string): number | null {
  const patterns = [
    /target\s*=\s*(\d+)/i,
    /key\s*=\s*(\d+)/i,
    /search\s*=\s*(\d+)/i,
    /find\s*=\s*(\d+)/i,
    /\(\s*(\d+)\s*\)/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function inferVisualForLine(line: string): string {
  const trimmed = line.trim().toLowerCase();

  if (!trimmed) return "code_focus";
  if (/^(for|while)\b/.test(trimmed)) return "loop";
  if (/^(if|elif|else|switch|case)\b/.test(trimmed)) return "branch";
  if (/^(return|yield)\b/.test(trimmed)) return "return";
  if (/\b(print|console\.log|input|readline|scanf)\b/.test(trimmed)) return "io";
  if (/^(def|function|class)\b/.test(trimmed)) return "call";
  if (/[^=!<>]=[^=]/.test(trimmed)) return "assign";
  return "code_focus";
}

function inferVariablesForLine(line: string): Record<string, string> | undefined {
  const match = line.match(/^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*;?\s*$/);
  if (!match) return undefined;

  return {
    [match[1]]: match[2].slice(0, 40),
  };
}

function generateGenericCodeSteps(code: string): AnimationStep[] {
  const sourceLines = code.split(/\r?\n/);
  const meaningfulLines = sourceLines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0);

  const selectedLines = meaningfulLines.slice(0, 18);
  const steps: AnimationStep[] = selectedLines.map(({ line, lineNumber }, index) => {
    const visual = inferVisualForLine(line);
    const trimmed = line.trim();
    const variables = inferVariablesForLine(line);

    return {
      step: index,
      description:
        visual === "loop"
          ? `Loop control reaches line ${lineNumber}: ${trimmed}`
          : visual === "branch"
            ? `Decision point at line ${lineNumber}: ${trimmed}`
            : visual === "assign"
              ? `State changes at line ${lineNumber}: ${trimmed}`
              : visual === "return"
                ? `The function produces a result at line ${lineNumber}: ${trimmed}`
                : `Execute line ${lineNumber}: ${trimmed}`,
      visual,
      lineNumber,
      activeLines: [lineNumber],
      variables,
      focus: trimmed,
      operation:
        visual === "code_focus"
          ? "execute"
          : visual.replace("_", " "),
    };
  });

  if (steps.length === 0) {
    return [
      {
        step: 0,
        description: "No executable code was detected.",
        visual: "code_focus",
        lineNumber: 1,
        activeLines: [1],
        focus: "empty input",
        operation: "inspect",
      },
    ];
  }

  steps.push({
    step: steps.length,
    description: "Execution walkthrough complete.",
    visual: "complete",
    lineNumber: selectedLines[selectedLines.length - 1]?.lineNumber ?? 1,
    activeLines: [selectedLines[selectedLines.length - 1]?.lineNumber ?? 1],
    focus: "complete",
    operation: "finish",
  });

  return steps;
}

export function parseAndExplain(code: string): ExplanationResult {
  const { type } = detectAlgorithm(code);
  const extractedArray = extractArray(code);
  const initialArray =
    extractedArray.length > 0
      ? extractedArray
      : type === "general_code"
        ? []
        : DEFAULT_ARRAY;
  const target = detectTarget(code);

  let steps: AnimationStep[];
  let title: string;
  let complexity: string;
  let narration: string;
  let visualizationType: string;

  switch (type) {
    case "bubble_sort":
      steps = generateBubbleSortSteps(initialArray);
      title = "Bubble Sort";
      complexity = "O(n²)";
      narration = `Bubble sort repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. This process continues until the list is sorted.`;
      visualizationType = "array_bars";
      break;
    case "selection_sort":
      steps = generateSelectionSortSteps(initialArray);
      title = "Selection Sort";
      complexity = "O(n²)";
      narration = `Selection sort divides the array into a sorted and unsorted region. It repeatedly finds the minimum element from the unsorted region and puts it at the end of the sorted region.`;
      visualizationType = "array_bars";
      break;
    case "insertion_sort":
      steps = generateInsertionSortSteps(initialArray);
      title = "Insertion Sort";
      complexity = "O(n²)";
      narration = `Insertion sort builds the final sorted array one element at a time. It takes each element and inserts it into its correct position within the already-sorted portion.`;
      visualizationType = "array_bars";
      break;
    case "linear_search":
      steps = generateLinearSearchSteps(initialArray, target);
      title = "Linear Search";
      complexity = "O(n)";
      narration = `Linear search checks each element in the array sequentially until the target is found or the end is reached. Simple but not efficient for large datasets.`;
      visualizationType = "array_boxes";
      break;
    case "binary_search":
      steps = generateBinarySearchSteps(initialArray, target);
      title = "Binary Search";
      complexity = "O(log n)";
      narration = `Binary search works on sorted arrays by repeatedly dividing the search interval in half. Compare the target with the middle element and eliminate half of the remaining elements.`;
      visualizationType = "array_bars";
      break;
    case "merge_sort":
      steps = generateMergeSortSteps(initialArray.length > 0 ? initialArray : DEFAULT_ARRAY);
      title = "Merge Sort";
      complexity = "O(n log n)";
      narration = `Merge sort is a divide-and-conquer algorithm. It recursively splits the array in half, sorts each half independently, then merges them back together. This gives a guaranteed O(n log n) time in all cases.`;
      visualizationType = "array_bars";
      break;
    case "general_code":
      steps = generateGenericCodeSteps(code);
      title = "Code Execution Walkthrough";
      complexity = "Depends on control flow";
      narration = `This visualization follows the code line by line, highlighting control flow, state changes, inputs, outputs, and return values.`;
      visualizationType = "code_flow";
      break;
    default:
      steps = generateGenericCodeSteps(code);
      title = "Code Analysis";
      complexity = "Unknown";
      narration = `This visualization follows the main execution flow and highlights meaningful state changes.`;
      visualizationType = "code_flow";
  }

  return {
    title,
    algorithmType: type,
    complexity,
    steps,
    initialArray,
    narration,
    visualizationType,
    detectedPattern: true,
  };
}
