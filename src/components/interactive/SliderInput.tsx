'use client';

import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SliderInputProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  precision?: number;
}

export function SliderInput({
  label,
  min,
  max,
  step,
  value,
  onChange,
  precision = 2,
}: SliderInputProps) {
  return (
    <div className="grid grid-cols-[1fr_80px] items-center gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(val) => {
            const v = Array.isArray(val) ? val[0] : val;
            onChange(v);
          }}
        />
      </div>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value.toFixed(precision)}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)));
          }
        }}
        className="h-7 text-xs tabular-nums"
      />
    </div>
  );
}
