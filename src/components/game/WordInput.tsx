import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

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
  placeholder = "Skriv et dansk ord",
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

  useEffect(() => {
    if (!disabled && finalInputRef.current && !finalInputRef.current.matches(':focus')) {
      const timer = setTimeout(() => {
        finalInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  useEffect(() => {
    setWord(currentWord);
  }, [currentWord]);

  useEffect(() => {
    setWord('');
    setError('');
    onWordChange?.('');
  }, [currentSyllable, onWordChange]);

  useEffect(() => {
    setIsLocalSubmitting(isSubmitting);
  }, [isSubmitting]);

  const handleSubmit = async () => {
    if (!word.trim() || disabled) return;
    setError('');

    if (!word.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
      return;
    }

    setIsLocalSubmitting(true);
    
    try {
      const success = await onSubmit(word.trim());
      setWord('');
      onWordChange?.('');
      
      if (!success) {
        setTimeout(() => finalInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error('Error submitting word:', err);
      setWord('');
      onWordChange?.('');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setWord(newWord);
    onWordChange?.(newWord);
    if (error) setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="w-full space-y-2">
      {!disabled && currentSyllable && (
        <div className="text-center text-xs font-medium text-slate-400">
          Ordet skal indeholde <span className="font-mono font-bold text-orange-200">{currentSyllable.toUpperCase()}</span>
        </div>
      )}
      {/* Input row */}
      <div className="relative">
        <Input
          ref={finalInputRef}
          type="text"
          value={word}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-14 w-full rounded-lg border-white/10 bg-white/5 pr-14 text-center text-lg font-semibold text-white shadow-lg
                     placeholder:text-white/30
                     focus:border-orange-400/50 focus:ring-orange-400/20 focus:bg-white/8
                     disabled:bg-white/3 disabled:text-white/30
                     transition-all duration-200"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        
        <Button
          onClick={handleSubmit}
          disabled={disabled || !word.trim()}
          size="sm"
          className="absolute right-1.5 top-1.5 h-9 w-9 rounded-md p-0
                     bg-orange-500 hover:bg-orange-400 text-white
                     disabled:bg-white/5 disabled:text-white/20
                     transition-all duration-200 shadow-md"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm text-center font-medium animate-in slide-in-from-top-2 duration-300">
          {error}
          <button 
            onClick={() => {
              setError('');
              setIsLocalSubmitting(false);
              finalInputRef.current?.focus();
            }}
            className="ml-2 text-red-400/60 hover:text-red-300 underline text-xs"
          >
            Prøv igen
          </button>
        </div>
      )}

      {/* Loading */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span>Tjekker ord...</span>
        </div>
      )}
    </div>
  );
};
