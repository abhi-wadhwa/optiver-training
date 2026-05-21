export type Difficulty = 'easy' | 'medium' | 'hard' | 'interview';

export type InteractiveTool =
  | 'bs-calculator'
  | 'payoff-diagram'
  | 'greek-visualizer'
  | 'vol-surface'
  | 'dice-game'
  | 'market-maker'
  | 'put-call-parity'
  | 'delta-hedging'
  | 'speed-drill';

export type ContentBlock =
  | { type: 'text'; body: string }
  | { type: 'formula'; latex: string; label: string; explanation?: string }
  | {
      type: 'example';
      title: string;
      problem: string;
      solution: string[];
    }
  | { type: 'concept'; title: string; body: string }
  | { type: 'callout'; variant: 'tip' | 'warning' | 'key-insight'; body: string }
  | {
      type: 'interactive';
      tool: InteractiveTool;
      defaultParams?: Record<string, number>;
    }
  | { type: 'table'; headers: string[]; rows: string[][] };

interface ExerciseBase {
  id: string;
  difficulty: Difficulty;
  topic: string;
  tags: string[];
  timeEstimateSeconds: number;
  hint?: string;
  explanation: string;
  solutionSteps: string[];
  fromDay?: number;
}

export interface MultipleChoiceExercise extends ExerciseBase {
  exerciseType: 'multiple-choice';
  question: string;
  options: string[];
  correctIndex: number;
}

export interface NumericExercise extends ExerciseBase {
  exerciseType: 'numeric';
  question: string;
  correctAnswer: number;
  tolerance: number;
  unit?: string;
}

export interface MultiStepExercise extends ExerciseBase {
  exerciseType: 'multi-step';
  question: string;
  steps: {
    prompt: string;
    correctAnswer: number;
    tolerance: number;
    unit?: string;
    stepExplanation: string;
  }[];
}

export interface TrueFalseExercise extends ExerciseBase {
  exerciseType: 'true-false';
  statement: string;
  correct: boolean;
}

export interface FreeResponseExercise extends ExerciseBase {
  exerciseType: 'free-response';
  question: string;
  modelAnswer: string;
}

export interface SpeedDrillExercise extends ExerciseBase {
  exerciseType: 'speed-drill';
  timeLimitSeconds: number;
  problems: {
    prompt: string;
    correctAnswer: number;
    tolerance: number;
  }[];
}

export interface ScenarioExercise extends ExerciseBase {
  exerciseType: 'scenario';
  question: string;
  scenarios: {
    description: string;
    shocks: { variable: string; change: number }[];
    expectedAnswer: number;
    tolerance: number;
    unit?: string;
  }[];
}

export type Exercise =
  | MultipleChoiceExercise
  | NumericExercise
  | MultiStepExercise
  | TrueFalseExercise
  | FreeResponseExercise
  | SpeedDrillExercise
  | ScenarioExercise;

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export interface CheatSheetEntry {
  topic: string;
  formula: string;
  description: string;
}

export interface DayContent {
  dayNumber: number;
  title: string;
  subtitle: string;
  week: 1 | 2;
  chapters: string[];
  estimatedMinutes: number;
  prerequisites: number[];
  objectives: string[];
  theory: {
    sections: {
      title: string;
      blocks: ContentBlock[];
    }[];
  };
  exercises: Exercise[];
  cumulativeExercises: Exercise[];
  flashcards: Flashcard[];
  interactiveTools: InteractiveTool[];
  cheatSheet: CheatSheetEntry[];
  summary: string[];
}
