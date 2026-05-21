'use client';

import { motion } from 'framer-motion';
import MathText from '@/components/content/MathText';
import type { Flashcard } from '@/content/types';

interface FlashcardCardProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}

export default function FlashcardCard({ card, flipped, onFlip }: FlashcardCardProps) {
  return (
    <div
      className="perspective-1000 cursor-pointer select-none"
      onClick={onFlip}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="relative h-64 w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border bg-card p-8 text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-lg font-medium">
            <MathText text={card.front} />
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border bg-primary/5 p-8 text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-base">
            <MathText text={card.back} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
