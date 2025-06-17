
import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WordInputProps {
  onSubmit: (word: string) => Promise<boolean>;
  disabled: boolean;
  currentSyllable: string;
  placeholder?: string;
  isSubmitting?: boolean;
  onWordChange?: (word: string) => void;
}

export const WordInput = ({ 
  onSubmit, 
  disabled, 
  currentSyllable, 
  placeholder,
  isSubmitting = false,
  onWordChange
}: WordInputProps) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts or becomes enabled
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Reset states when syllable changes and ensure focus
  useEffect(() => {
    setError('');
    setIsLocalSubmitting(false);
    setWord('');
    
    // Focus input when syllable changes
    if (!disabled && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentSyllable, disabled]);

  // Reset local submitting when parent isSubmitting changes
  useEffect(() => {
    if (!isSubmitting) {
      setIsLocalSubmitting(false);
    }
  }, [isSubmitting]);

  // Memoize the word change callback to prevent unnecessary re-renders
  const handleWordChangeCallback = useCallback((newWord: string) => {
    if (onWordChange) {
      onWordChange(newWord);
    }
  }, [onWordChange]);

  // Debounce the word change callback to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      handleWordChangeCallback(word.trim());
    }, 100);

    return () => clearTimeout(timer);
  }, [word, handleWordChangeCallback]);

  const handleSubmit = async () => {
    const trimmedWord = word.trim();
    console.log('handleSubmit called with word:', trimmedWord);
    
    if (!trimmedWord) {
      setError('Indtast et ord');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    if (!trimmedWord.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    if (isLocalSubmitting || isSubmitting || disabled) {
      console.log('Preventing duplicate submission');
      return;
    }

    setIsLocalSubmitting(true);
    setError('');
    
    try {
      const success = await onSubmit(trimmedWord.toLowerCase());
      if (success) {
        setWord('');
        setTimeout(() => {
          if (inputRef.current && !disabled) {
            inputRef.current.focus();
          }
        }, 50);
      } else {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch (err) {
      console.error('Error in word submission:', err);
      setError('Fejl ved indsendelse - prøv igen');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setWord(newWord);
    if (error) setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key, 'Current word:', word, 'Input focused:', document.activeElement === inputRef.current);
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Enter key detected, calling handleSubmit');
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLocalSubmitting || isSubmitting;
  const showSubmitting = isLocalSubmitting || isSubmitting;

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Display only the syllable letters prominently */}
      <div className="text-center">
        <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl px-12 py-8 shadow-xl border-4 border-white">
          <div className="text-6xl font-black text-white tracking-widest drop-shadow-lg">
            {currentSyllable.toUpperCase()}
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={word}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Indtast dit ord her..."}
            disabled={isDisabled}
            className={cn(
              "text-lg",
              error && "border-red-500 focus:border-red-500"
            )}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>
        <Button 
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !word.trim()}
          className="px-6"
        >
          {showSubmitting ? 'Sender...' : 'Send'}
        </Button>
      </div>
    </div>
  );
};
