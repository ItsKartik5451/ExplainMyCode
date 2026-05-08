import type { AnimationStep } from "./code-parser";

function generateManimImports(): string {
  return `from manim import *

class AlgorithmVisualization(Scene):
    def construct(self):
        # Configuration
        self.camera.background_color = "#1a1a2e"
        
        # Title
        title = Text("Algorithm Visualization", font_size=36, color=WHITE)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        self.wait(0.5)
`;
}

function generateArrayCreation(array: number[]): string {
  const elements = array.map((val, i) => `            ArrayElement(value=${val}, index=${i}),`);
  return `
        # Create array elements
        array_elements = VGroup(
${elements.join("\n")}
        )
        array_elements.arrange(RIGHT, buff=0.5)
        array_elements.move_to(ORIGIN)
        
        self.play(Create(array_elements))
        self.wait(0.3)
`;
}

function stepToManim(step: AnimationStep): string {
  const lines: string[] = [];
  
  // Description text
  const safeDesc = step.description.replace(/"/g, '\\"').replace(/\n/g, " ");
  lines.push(`        # Step ${step.step}: ${safeDesc}`);
  lines.push(`        desc = Text("${safeDesc}", font_size=24, color=YELLOW)`);
  lines.push(`        desc.to_edge(DOWN, buff=0.5)`);
  lines.push(`        self.play(Write(desc))`);
  lines.push(`        self.wait(0.5)`);

  // Visual effects based on type
  switch (step.visual) {
    case "compare":
      if (step.compare) {
        lines.push(`        # Highlight comparison`);
        lines.push(`        self.play(
            array_elements[${step.compare[0]}].animate.set_color(RED),
            array_elements[${step.compare[1]}].animate.set_color(RED),
        )`);
      }
      break;
    case "swap":
      if (step.swap) {
        lines.push(`        # Animate swap`);
        lines.push(`        self.play(
            array_elements[${step.swap[0]}].animate.shift(DOWN * 0.5),
            array_elements[${step.swap[1]}].animate.shift(UP * 0.5),
        )`);
        lines.push(`        self.play(
            Swap(array_elements[${step.swap[0]}], array_elements[${step.swap[1]}]),
        )`);
      }
      break;
    case "highlight":
      if (step.highlights) {
        for (const idx of step.highlights) {
          lines.push(`        self.play(array_elements[${idx}].animate.set_color(GREEN))`);
        }
      }
      break;
    case "sorted_position":
      if (step.highlights) {
        for (const idx of step.highlights) {
          lines.push(`        self.play(array_elements[${idx}].animate.set_color(BLUE))`);
        }
      }
      break;
    case "found":
      if (step.highlights) {
        for (const idx of step.highlights) {
          lines.push(`        self.play(array_elements[${idx}].animate.set_color(GREEN).scale(1.2))`);
        }
      }
      break;
    case "complete":
      lines.push(`        # Complete animation`);
      if (step.arrayState) {
        for (let i = 0; i < step.arrayState.length; i++) {
          lines.push(`        self.play(array_elements[${i}].animate.set_color(GREEN))`);
        }
      }
      break;
    case "no_swap":
    case "no_match":
      lines.push(`        self.play(FadeOut(desc))`);
      break;
    case "pass_end":
      if (step.highlights) {
        for (const idx of step.highlights) {
          lines.push(`        self.play(array_elements[${idx}].animate.set_color(PURPLE))`);
        }
      }
      break;
  }

  lines.push(`        self.play(FadeOut(desc))`);
  lines.push(`        self.wait(0.2)`);
  
  return lines.join("\n");
}

export function generateManimScript(
  _title: string,
  steps: AnimationStep[],
  initialArray: number[]
): string {
  const parts: string[] = [];
  
  parts.push(generateManimImports());
  parts.push(`        # Create array: [${initialArray.join(", ")}]`);
  parts.push(generateArrayCreation(initialArray));
  
  for (let i = 0; i < steps.length; i++) {
    parts.push(stepToManim(steps[i]));
  }
  
  parts.push(`
        # Final message
        final = Text("Algorithm Complete!", font_size=30, color=GREEN)
        final.to_edge(DOWN, buff=1)
        self.play(Write(final))
        self.wait(1)
`);

  // Add helper class
  parts.unshift(`from manim import *

class ArrayElement(VGroup):
    def __init__(self, value, index, **kwargs):
        super().__init__(**kwargs)
        rect = Rectangle(width=1, height=1, color=WHITE)
        text = Text(str(value), font_size=24, color=WHITE)
        idx_text = Text(str(index), font_size=16, color=GRAY)
        idx_text.next_to(rect, DOWN, buff=0.1)
        text.move_to(rect.get_center())
        self.add(rect, text, idx_text)
        self.value = value
        self.index = index

`);

  return parts.join("\n");
}

export function generateMinimalManimScript(
  title: string,
  steps: AnimationStep[],
  initialArray: number[]
): string {
  const script = generateManimScript(title, steps, initialArray);
  
  // Add __main__ block for easy execution
  return `${script}

if __name__ == "__main__":
    import subprocess
    import sys
    
    # Render the scene
    cmd = ["manim", "-pql", __file__, "AlgorithmVisualization"]
    subprocess.run(cmd)
`;
}
