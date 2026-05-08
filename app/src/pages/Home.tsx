import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  Play,
  Download,
  Code2,
  Sparkles,
  Clock,
  BarChart3,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import AnimationViewer, { type AnimationStep } from "@/components/AnimationViewer";
import StepTimeline from "@/components/StepTimeline";
import ComplexityViz from "@/components/ComplexityViz";

const PLAYBACK_STEP_MS = 1600;

const DEMO_CODE = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

arr = [64, 34, 25, 12, 22, 11, 90]
sorted_arr = bubble_sort(arr)`;

const DEMO_CODE2 = `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
result = binary_search(arr, 23)`;

const DEMO_CODE3 = `def selection_sort(arr):
    for i in range(len(arr)):
        min_idx = i
        for j in range(i + 1, len(arr)):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

arr = [64, 25, 12, 22, 11]
sorted_arr = selection_sort(arr)`;

export default function Home() {
  const [code, setCode] = useState(DEMO_CODE);
  const [isExplaining, setIsExplaining] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{
    title: string;
    algorithmType: string;
    complexity: string;
    steps: AnimationStep[];
    initialArray: number[];
    narration: string;
    visualizationType?: string;
    detectedPattern?: boolean;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const explainMutation = trpc.explanation.explain.useMutation();
  const manimMutation = trpc.manim.generate.useMutation();

  const handleExplain = useCallback(async () => {
    if (!code.trim()) return;
    setIsExplaining(true);
    setAnalysisError(null);
    setExplanation(null);
    setCurrentStep(0);
    setIsPlaying(false);

    try {
      const result = await explainMutation.mutateAsync({
        code,
        language: "python",
      });
      if (result.success && result.data) {
        setExplanation(result.data);
        setIsPlaying(result.data.steps.length > 1);
      }
    } catch (error) {
      console.error("Failed to explain code:", error);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Analysis failed. Add a GEMINI_API_KEY to your .env file for AI-powered explanations (get a free key at aistudio.google.com)."
      );
    } finally {
      setIsExplaining(false);
    }
  }, [code, explainMutation]);

  const handleDownloadManim = useCallback(async () => {
    if (!explanation) return;
    const result = await manimMutation.mutateAsync({
      title: explanation.title,
      steps: explanation.steps,
      initialArray: explanation.initialArray,
    });
    if (result.success) {
      const blob = new Blob([result.script], { type: "text/x-python" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${explanation.algorithmType}_visualization.py`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [explanation, manimMutation]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && explanation && currentStep < explanation.steps.length - 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= explanation.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, PLAYBACK_STEP_MS / playbackSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, explanation, currentStep, playbackSpeed]);

  const handlePlayPause = useCallback(() => {
    if (!explanation) return;
    if (currentStep >= explanation.steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying((prev) => !prev);
  }, [explanation, currentStep]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
  }, []);

  const handleFirst = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleLast = useCallback(() => {
    if (explanation) {
      setCurrentStep(explanation.steps.length - 1);
      setIsPlaying(false);
    }
  }, [explanation]);

  const stepDescriptions = explanation?.steps.map((s) => s.description) ?? [];
  const canExportManim =
    !!explanation &&
    explanation.initialArray.length > 0 &&
    explanation.steps.some((step) => step.arrayState && step.arrayState.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <Sparkles className="h-5 w-5 text-slate-900" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              Explain<span className="text-amber-400">My</span>Code
            </h1>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 ml-2">
              AI Powered
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Code Input */}
          <div className="flex flex-col gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-sm font-semibold text-slate-200">
                      Code Input
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      onClick={() => setCode(DEMO_CODE)}
                    >
                      Bubble Sort
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      onClick={() => setCode(DEMO_CODE2)}
                    >
                      Binary Search
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      onClick={() => setCode(DEMO_CODE3)}
                    >
                      Selection Sort
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono text-sm bg-slate-950 border-slate-700 text-slate-300 min-h-[320px] resize-none focus-visible:ring-amber-500/50"
                  placeholder="Paste your Python code here..."
                  spellCheck={false}
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleExplain}
                      disabled={isExplaining || !code.trim()}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                    >
                      <Zap className="h-4 w-4 mr-1.5" />
                      {isExplaining ? "AI Analyzing..." : "Analyze"}
                    </Button>
                    {explanation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExplanation(null);
                          setCurrentStep(0);
                          setIsPlaying(false);
                        }}
                        className="border-slate-700 text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
                {analysisError && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-400">Patterns</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Any Code Flow
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-slate-400">Speed</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Auto-play
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-slate-400">Export</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Storyboard
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Animation & Explanation */}
          <div className="flex flex-col gap-4">
            {explanation ? (
              <>
                {/* Algorithm Info */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-emerald-400" />
                        <CardTitle className="text-sm font-semibold text-slate-200">
                          {explanation.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                          {explanation.algorithmType}
                        </Badge>
                        <Badge className="text-xs bg-slate-800 text-amber-400 border-slate-700 font-mono">
                          {explanation.complexity}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {explanation.narration}
                    </p>
                  </CardContent>
                </Card>

                {/* Animation Viewer */}
                <AnimationViewer
                  steps={explanation.steps}
                  initialArray={explanation.initialArray}
                  currentStep={currentStep}
                  code={code}
                  visualizationType={explanation.visualizationType}
                />

                {/* Timeline */}
                <StepTimeline
                  totalSteps={explanation.steps.length}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onStepChange={handleStepChange}
                  onFirst={handleFirst}
                  onLast={handleLast}
                  descriptions={stepDescriptions}
                />

                {/* Complexity Visualization */}
                <ComplexityViz
                  complexity={explanation.complexity}
                  currentStep={currentStep}
                  totalSteps={explanation.steps.length}
                  algorithmType={explanation.algorithmType}
                />

                {/* Step Breakdown */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-200">
                      Step-by-Step Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="flex flex-col gap-1">
                        {explanation.steps.map((step, idx) => (
                          <button
                            key={step.step}
                            onClick={() => handleStepChange(idx)}
                            className={`flex items-start gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                              idx === currentStep
                                ? "bg-amber-500/10 border border-amber-500/30"
                                : "hover:bg-slate-800 border border-transparent"
                            }`}
                          >
                            <span
                              className={`text-xs font-mono font-semibold mt-0.5 min-w-[24px] ${
                                idx === currentStep ? "text-amber-400" : "text-slate-500"
                              }`}
                            >
                              {step.step + 1}
                            </span>
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  idx === currentStep ? "text-slate-200" : "text-slate-400"
                                }`}
                              >
                                {step.description}
                              </p>
                              {step.visual && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] mt-1 ${
                                    idx === currentStep
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {step.visual}
                                </Badge>
                              )}
                            </div>
                            {idx === currentStep && (
                              <ChevronRight className="h-4 w-4 text-amber-400 mt-0.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {canExportManim && (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-purple-400" />
                          <CardTitle className="text-sm font-semibold text-slate-200">
                            Manim Export
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400 mb-3">
                        Download a Manim Python script for array-style visualizations.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleDownloadManim}
                        disabled={manimMutation.isPending}
                        className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        {manimMutation.isPending
                          ? "Generating..."
                          : "Download Manim Script (.py)"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 min-h-[500px] bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <div className="bg-slate-800 p-4 rounded-full">
                  <Sparkles className="h-8 w-8 text-slate-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-300 mb-1">
                    Ready to Explain
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Enter your Python code and click &quot;Analyze&quot; to generate
                    an AI-powered animated step-by-step breakdown.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ArrowRight className="h-3 w-3" />
                  <span>Powered by Gemini AI · falls back to Kimi or Ollama</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
