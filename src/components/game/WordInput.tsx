import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WordInputProps {
  onSubmit: (word: string) => Promise<boolean>;
  disabled: boolean;
  currentSyllable: string;
  placeholder?: string;
  isSubmitting?: boolean;
  currentWord?: string;
  onWordChange?: (word: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const WordInput: React.FC<WordInputProps> = ({
  onSubmit,
  disabled,
  currentSyllable,
  placeholder = "Skriv dit ord her...",
  isSubmitting = false,
  currentWord = '',
  onWordChange,
  onKeyDown,
  inputRef
}) => {
  const [word, setWord] = useState(currentWord);
  const [error, setError] = useState<string>('');
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  // Focus input when component mounts or becomes enabled
  useEffect(() => {
    if (!disabled && finalInputRef.current) {
      finalInputRef.current.focus();
    }
  }, [disabled]);

  // Sync with external currentWord prop
  useEffect(() => {
    setWord(currentWord);
  }, [currentWord]);

  // Reset state when syllable changes
  useEffect(() => {
    setWord('');
    setError('');
    onWordChange?.('');
  }, [currentSyllable, onWordChange]);

  // Sync with external isSubmitting state
  useEffect(() => {
    setIsLocalSubmitting(isSubmitting);
  }, [isSubmitting]);

  const handleSubmit = async () => {
    if (!word.trim() || isLocalSubmitting || disabled) return;

    // Clear any previous errors
    setError('');

    // Validate word contains syllable
    if (!word.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
      return;
    }

    setIsLocalSubmitting(true);
    
    try {
      const success = await onSubmit(word.trim());
      if (success) {
        setWord('');
        onWordChange?.('');
      }
      // If unsuccessful, keep the word in the input for retry
    } catch (err) {
      console.error('Error submitting word:', err);
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setWord(newWord);
    onWordChange?.(newWord);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Mobile-optimized input with larger touch targets */}
      <div className="relative">
        <Input
          ref={finalInputRef}
          type="text"
          value={word}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLocalSubmitting}
          className="w-full h-12 text-lg pr-20 text-center font-medium border-2 focus:border-primary transition-all
                     bg-background/80 backdrop-blur-sm shadow-lg
                     disabled:bg-muted/50 disabled:text-muted-foreground
                     placeholder:text-muted-foreground/60"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        
        {/* Submit button inside input for mobile */}
        <Button
          onClick={handleSubmit}
          disabled={disabled || isLocalSubmitting || !word.trim()}
          size="sm"
          className="absolute right-1 top-1 h-10 w-10 p-0 rounded-md
                     bg-primary hover:bg-primary/90 text-primary-foreground
                     disabled:bg-muted/50 disabled:text-muted-foreground
                     transition-all duration-200"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Help tooltip for mobile users */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Find ord med "{currentSyllable}"</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">
                Skriv ord der indeholder stavelsen "{currentSyllable}". 
                Eksempel: Hvis stavelsen er "lu", kan du skrive "hus<strong>lu</strong>k" eller "<strong>lu</strong>fte".
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-destructive text-sm text-center font-medium animate-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      {/* Loading state for mobile */}
      {isLocalSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Tjekker ord...</span>
        </div>
      )}
    </div>
  );
};
