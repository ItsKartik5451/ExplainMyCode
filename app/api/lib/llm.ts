import { env } from "./env";
import {
  parseAndExplain,
  type AnimationStep,
  type ExplanationResult,
} from "./code-parser";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const DEFAULT_LLM_TIMEOUT_MS = 60_000;  // 60s default — Ollama on CPU can be slow
const DEFAULT_TEMPERATURE = 0.2;

const VISUAL_TYPES = new Set([
  "code_focus", "assign", "branch", "loop", "call", "return", "io",
  "data_update", "show_array", "compare", "swap", "no_swap",
  "pass_start", "pass_end", "select_min", "new_min", "sorted_position",
  "complete", "found", "not_found", "search_range", "discard_left",
  "discard_right", "select_key", "shift", "insert", "no_match",
  "push", "pop", "enqueue", "dequeue", "highlight", "pointer_move",
]);

const VISUALIZATION_TYPES = new Set([
  "array_bars", "array_boxes", "stack", "queue", "hashmap",
  "string_chars", "data_structures", "code_flow",
]);

// ─── System prompt ────────────────────────────────────────────────────────────
const EXPLANATION_SYSTEM_PROMPT = `You are an expert computer science educator creating BEGINNER-FRIENDLY interactive animations. Your goal is to make ANY code understandable through clear, specific, step-by-step visual animation.

## STEP 1: CHOOSE A VISUALIZATION TYPE
Analyze the code and pick the single best "visualizationType":

- "array_bars"     → Sorting algorithms (bubble, merge, quick, selection, insertion sort). Bar heights represent values.
- "array_boxes"    → Array/list manipulation: rotation, reversal, two-pointer, sliding window, partitioning, searching. Shows elements as labeled boxes with index numbers.
- "stack"          → Stack-based algorithms: valid parentheses, balanced brackets, monotonic stack, DFS with stack. Shows a vertical stack container.
- "queue"          → Queue / BFS algorithms. Shows a horizontal queue container.
- "hashmap"        → Hash map / dictionary operations: two sum, frequency count, anagram grouping, memoization. Shows key→value pairs.
- "string_chars"   → String manipulation: palindrome, anagram check, reverse string, substring search. Shows characters as individual boxes.
- "data_structures"→ Multiple data structures at once, or linked lists, trees described textually.
- "code_flow"      → General code without a clear data structure focus (math calculations, class methods, etc).

## STEP 2: POPULATE STEPS CORRECTLY BY TYPE

### For "array_bars" (sorting):
- Every step MUST have "arrayState" with the current full array
- Use "compare": [i,j] when comparing two elements
- Use "swap": [i,j] when swapping two elements  
- Use "highlights": [i] for the element being placed/sorted
- visuals to use: show_array, compare, swap, no_swap, pass_start, pass_end, sorted_position, complete

### For "array_boxes" (array manipulation):
- Every step MUST have "arrayState" with the current full array
- Use "highlights": [i] or [i,j] for active pointers/indices
- Use "swap": [i,j] when elements are being swapped
- Include "variables" showing pointer names: {"left":"0","right":"5","mid":"2"}
- For two-pointer: highlights=[left_idx, right_idx] at every step
- For rotation: show elements shifting, arrayState changes each step
- visuals to use: show_array, compare, swap, highlight, pointer_move, complete

### For "stack":
- Every step MUST have "dataStructures": [{"name":"Stack","values":[...current stack contents...]}]
- ALSO include "variables" showing what character/item is being processed
- For parentheses: show the char being processed, then the stack after push/pop
- visuals to use: push, pop, compare, branch, complete, found, not_found

### For "queue":
- Every step MUST have "dataStructures": [{"name":"Queue","values":[...]}]
- Show items entering from right (enqueue) and leaving from left (dequeue)
- visuals to use: enqueue, dequeue, compare, complete

### For "hashmap":
- Every step MUST have "dataStructures": [{"name":"HashMap","values":["key: value","key2: value2",...]}]
- Format each entry as "key: value" string in the values array
- Show the map growing step by step
- visuals to use: data_update, compare, found, not_found, complete

### For "string_chars":
- Include "dataStructures": [{"name":"String","values":[..."each","character","as","string"...]}]
- Also include "arrayState" as char codes if helpful for highlighting
- Use "highlights": [i] for active character positions
- visuals to use: compare, highlight, swap, found, complete

### For "data_structures" and "code_flow":
- Focus on "variables", "callStack", "output", "dataStructures"
- Use "lineNumber" and "activeLines" to highlight code
- visuals: loop, branch, assign, call, return, io, code_focus, complete

## STEP 3: QUALITY RULES
1. Generate 10-25 steps (enough to fully show the algorithm, not too many)
2. "description": Write in plain English FOR A BEGINNER. Explain WHY, not just WHAT. Be specific with actual values.
   BAD: "Loop iteration 2"
   GOOD: "We're comparing 34 and 25. Since 34 > 25, we need to swap them to move the larger number right."
3. "focus": 2-4 word label visible in the animation badge (e.g., "Comparing elements", "Stack push", "Found target")
4. "operation": 1-2 word operation type (e.g., "compare", "push", "lookup")
5. "variables": Always include ALL relevant variables at current state (indices, pointers, flags, counts)
6. NEVER skip steps for an algorithm — show every meaningful operation
7. The "initialArray" should match the actual array in the code (extract from code). If no array, use []

## OUTPUT FORMAT
Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Human-readable algorithm name",
  "algorithmType": "snake_case_type",
  "complexity": "O(...) time, O(...) space",
  "narration": "2-3 sentence beginner-friendly explanation of what this code does and why",
  "visualizationType": "one of the 8 types above",
  "initialArray": [numbers from code or []],
  "steps": [
    {
      "step": 0,
      "description": "Beginner-friendly description with actual values",
      "visual": "one valid visual type",
      "focus": "Short label",
      "operation": "label",
      "variables": {"name": "value"},
      "highlights": [indices],
      "compare": [i, j],
      "swap": [i, j],
      "arrayState": [current array],
      "dataStructures": [{"name": "DS name", "values": ["item1", "item2"]}],
      "output": "any output/result",
      "activeLines": [1, 2]
    }
  ]
}`;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmProvider = "gemini" | "ollama" | "kimi";

type OllamaChatResponse = {
  message?: { content?: string };
  response?: string;
  error?: string;
};

type KimiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function buildUserPrompt(code: string, language: string): string {
  return `Analyze this ${language} code and produce a complete animation storyboard. Be specific — use actual values from the code in your descriptions. Make every step count.\n\nCODE:\n${code}`;
}

function getLlmTimeoutMs(): number {
  const configuredTimeout = Number(env.llmTimeoutMs);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_LLM_TIMEOUT_MS;
}

function getOllamaChatUrl(): string {
  const baseUrl = (env.ollamaBaseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
  if (baseUrl.endsWith("/api/chat")) return baseUrl;
  return baseUrl.endsWith("/api") ? `${baseUrl}/chat` : `${baseUrl}/api/chat`;
}

function getLlmProviderOrder(): LlmProvider[] {
  switch ((env.llmProvider || "auto").toLowerCase()) {
    case "gemini": return ["gemini"];
    case "ollama": return ["ollama"];
    case "kimi":   return ["kimi"];
    case "none":   return [];
    // Auto: try Gemini first (fastest + free tier), then Kimi, then Ollama
    default:       return ["gemini", "kimi", "ollama"];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.map((item) => Number(item));
  return numbers.every((item) => Number.isFinite(item)) ? numbers : undefined;
}

function readNumberPair(value: unknown): [number, number] | undefined {
  const numbers = readNumberArray(value);
  return numbers && numbers.length === 2 ? [numbers[0], numbers[1]] : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
}

function readVariables(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .filter(([key]) => key.trim().length > 0)
    .map(([key, rawValue]) => [key, String(rawValue).slice(0, 80)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readDataStructures(value: unknown): AnimationStep["dataStructures"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const dataStructures = value
    .filter(isRecord)
    .map((record) => {
      const name = readString(record, "name", "data");
      const values = Array.isArray(record.values)
        ? record.values
            .map((item) =>
              typeof item === "number" && Number.isFinite(item)
                ? item
                : String(item).slice(0, 60)
            )
            .slice(0, 32)
        : [];
      return { name, values };
    })
    .filter((item) => item.values.length > 0);
  return dataStructures.length > 0 ? dataStructures : undefined;
}

function normalizeVisual(value: unknown): string {
  if (typeof value === "string" && VISUAL_TYPES.has(value)) return value;
  return "code_focus";
}

function normalizeVisualizationType(value: unknown): string {
  if (typeof value === "string" && VISUALIZATION_TYPES.has(value)) return value;
  return "code_flow";
}

function normalizeSteps(value: unknown): AnimationStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((stepRecord, index) => {
      const step: AnimationStep = {
        step: index,
        description: readString(stepRecord, "description", `Step ${index + 1}`),
        visual: normalizeVisual(stepRecord.visual),
      };

      const highlights = readNumberArray(stepRecord.highlights);
      const swap = readNumberPair(stepRecord.swap);
      const compare = readNumberPair(stepRecord.compare);
      const arrayState = readNumberArray(stepRecord.arrayState);
      const activeLines = readNumberArray(stepRecord.activeLines);
      const variables = readVariables(stepRecord.variables);
      const callStack = readStringArray(stepRecord.callStack);
      const dataStructures = readDataStructures(stepRecord.dataStructures);
      const complexity = typeof stepRecord.complexity === "string" ? stepRecord.complexity : undefined;
      const lineNumber = Number(stepRecord.lineNumber);
      const focus = typeof stepRecord.focus === "string" ? stepRecord.focus : undefined;
      const operation = typeof stepRecord.operation === "string" ? stepRecord.operation : undefined;
      const output = typeof stepRecord.output === "string" ? stepRecord.output : undefined;

      if (highlights) step.highlights = highlights;
      if (swap) step.swap = swap;
      if (compare) step.compare = compare;
      if (arrayState) step.arrayState = arrayState;
      if (Number.isFinite(lineNumber) && lineNumber > 0) step.lineNumber = lineNumber;
      if (activeLines) step.activeLines = activeLines.filter((line) => line > 0);
      if (variables) step.variables = variables;
      if (callStack) step.callStack = callStack;
      if (dataStructures) step.dataStructures = dataStructures;
      if (focus) step.focus = focus;
      if (operation) step.operation = operation;
      if (output) step.output = output;
      if (complexity) step.complexity = complexity;

      return step;
    });
}

function extractJsonString(content: string): string {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedJson) return fencedJson[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function parseExplanationContent(content: string): ExplanationResult | null {
  try {
    const parsed = JSON.parse(extractJsonString(content)) as unknown;
    if (!isRecord(parsed)) return null;

    const steps = normalizeSteps(parsed.steps);
    if (steps.length === 0) return null;

    const firstArrayState =
      steps.find((step) => step.arrayState && step.arrayState.length > 0)?.arrayState ?? [];

    return {
      title: readString(parsed, "title", "Code Explanation"),
      algorithmType: readString(parsed, "algorithmType", "unknown"),
      complexity: readString(parsed, "complexity", "Unknown"),
      steps,
      initialArray: readNumberArray(parsed.initialArray) ?? firstArrayState,
      narration: readString(parsed, "narration", ""),
      detectedPattern: true,
      visualizationType: normalizeVisualizationType(parsed.visualizationType),
    };
  } catch {
    return null;
  }
}

async function callOllamaLLM(code: string, language: string): Promise<ExplanationResult | null> {
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: EXPLANATION_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(code, language) },
    ];

    const response = await fetch(getOllamaChatUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(getLlmTimeoutMs()),
      body: JSON.stringify({
        model: env.ollamaModel || "qwen2.5-coder",
        messages,
        stream: false,
        format: "json",
        keep_alive: env.ollamaKeepAlive || "5m",
        options: { temperature: DEFAULT_TEMPERATURE },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[llm] Ollama returned ${response.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content ?? data.response;
    if (!content) {
      console.warn(`[llm] Ollama returned no content: ${data.error ?? ""}`);
      return null;
    }

    return parseExplanationContent(content);
  } catch (error) {
    console.warn("[llm] Failed to call Ollama:", error);
    return null;
  }
}

async function callKimiLLM(code: string, language: string): Promise<ExplanationResult | null> {
  const apiKey = env.kimiApiKey || process.env.KIMI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(KIMI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          { role: "system", content: EXPLANATION_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(code, language) },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn(`[llm] Kimi returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as KimiChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return parseExplanationContent(content);
  } catch (error) {
    console.warn("[llm] Failed to call Kimi:", error);
    return null;
  }
}

async function callGeminiLLM(code: string, language: string): Promise<ExplanationResult | null> {
  const apiKey = env.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `${EXPLANATION_SYSTEM_PROMPT}\n\n${buildUserPrompt(code, language)}`;
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(getLlmTimeoutMs()),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: DEFAULT_TEMPERATURE,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[llm] Gemini returned ${response.status}: ${text.slice(0, 300)}`);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.warn("[llm] Gemini returned no content");
      return null;
    }

    return parseExplanationContent(content);
  } catch (error) {
    console.warn("[llm] Failed to call Gemini:", error);
    return null;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────
// LLM is tried FIRST for ALL code so we get rich, code-specific animations.
// Provider order (auto): Gemini → Kimi → Ollama → template fallback
export async function explainCode(code: string, language = "python"): Promise<ExplanationResult> {
  for (const provider of getLlmProviderOrder()) {
    let llmResult: ExplanationResult | null = null;
    if (provider === "gemini") {
      llmResult = await callGeminiLLM(code, language);
    } else if (provider === "kimi") {
      llmResult = await callKimiLLM(code, language);
    } else if (provider === "ollama") {
      llmResult = await callOllamaLLM(code, language);
    }

    if (llmResult && llmResult.steps.length > 0) {
      console.log(`[llm] Used ${provider} for visualization (type: ${llmResult.visualizationType})`);
      return llmResult;
    }
  }

  // Fallback: deterministic template parser (no LLM needed, works offline)
  console.log("[llm] No LLM available, using template parser");
  return parseAndExplain(code);
}
