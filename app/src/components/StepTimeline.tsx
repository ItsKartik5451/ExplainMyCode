import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface StepTimelineProps {
  totalSteps: number;
  currentStep: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepChange: (step: number) => void;
  onFirst: () => void;
  onLast: () => void;
  descriptions: string[];
}

export default function StepTimeline({
  totalSteps,
  currentStep,
  isPlaying,
  onPlayPause,
  onStepChange,
  onFirst,
  onLast,
  descriptions,
}: StepTimelineProps) {
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-800 rounded-lg p-4 border border-slate-700">
      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onFirst}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep <= 0}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={onPlayPause}
          className="h-10 w-10 bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
          disabled={currentStep >= totalSteps - 1}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onLast}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="ml-auto text-sm text-slate-400 font-medium">
          Step {currentStep + 1} / {totalSteps}
        </div>
      </div>

      {/* Timeline slider */}
      <div className="flex items-center gap-3">
        <Slider
          value={[currentStep]}
          max={totalSteps - 1}
          min={0}
          step={1}
          onValueChange={(value) => onStepChange(value[0])}
          className="flex-1"
        />
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step description */}
      {descriptions[currentStep] && (
        <div className="mt-1 px-3 py-2 bg-slate-700/50 rounded-md">
          <p className="text-sm text-slate-200">{descriptions[currentStep]}</p>
        </div>
      )}

      {/* Mini step indicators */}
      {totalSteps > 0 && totalSteps <= 30 && (
        <div className="flex gap-1 mt-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= currentStep ? "bg-amber-500" : "bg-slate-600 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
