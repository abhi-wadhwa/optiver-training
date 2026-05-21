'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Flashcard } from '@/content/types';
import { useProgressStore } from '@/stores/progress-store';
import FlashcardCard from './FlashcardCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashcardDeckProps {
  cards: Flashcard[];
  dayNumber: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function FlashcardDeck({ cards, dayNumber }: FlashcardDeckProps) {
  const [deck, setDeck] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const recordFlashcardReview = useProgressStore((s) => s.recordFlashcardReview);
  const dayProgress = useProgressStore((s) => s.getDayProgress(dayNumber));

  const reviewed = dayProgress.flashcardsReviewed.length;
  const total = cards.length;
  const currentCard = deck[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      if (flipped && currentCard) {
        recordFlashcardReview(dayNumber, currentCard.id);
      }
      setFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, deck.length, flipped, currentCard, dayNumber, recordFlashcardReview]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => {
      if (!prev && currentCard) {
        recordFlashcardReview(dayNumber, currentCard.id);
      }
      return !prev;
    });
  }, [currentCard, dayNumber, recordFlashcardReview]);

  const handleShuffle = () => {
    setDeck(shuffleArray(cards));
    setCurrentIndex(0);
    setFlipped(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, goNext, goPrev]);

  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No flashcards for this day.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {reviewed}/{total} reviewed
        </span>
        <Button variant="outline" size="sm" onClick={handleShuffle} className="gap-1">
          <Shuffle className="size-3.5" />
          Shuffle
        </Button>
      </div>

      <Progress value={total > 0 ? (reviewed / total) * 100 : 0} />

      {currentCard && (
        <FlashcardCard card={currentCard} flipped={flipped} onFlip={handleFlip} />
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {deck.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={currentIndex === deck.length - 1}
          className="gap-1"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Space to flip, Arrow keys to navigate
      </div>
    </div>
  );
}
