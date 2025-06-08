
import { useState, useEffect, useRef } from 'react';
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

  // Focus input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Reset states when syllable changes and refocus
  useEffect(() => {
    setError('');
    setIsLocalSubmitting(false);
    setWord('');
    // Refocus input when syllable changes
    const timer = setTimeout(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentSyllable, disabled]);

  // Reset local submitting when parent isSubmitting changes
  useEffect(() => {
    if (!isSubmitting) {
      setIsLocalSubmitting(false);
    }
  }, [isSubmitting]);

  const handleSubmit = async () => {
    const trimmedWord = word.trim();
    console.log('handleSubmit called with word:', trimmedWord);
    
    if (!trimmedWord) {
      setError('Indtast et ord');
      return;
    }

    if (!trimmedWord.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
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
        // Clear the word in parent component too
        if (onWordChange) {
          onWordChange('');
        }
        // Refocus input after successful submission
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error in word submission:', err);
      setError('Fejl ved indsendelse - prøv igen');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setWord(newWord);
    if (error) setError('');
    
    // Update the word in parent component as user types
    if (onWordChange) {
      onWordChange(newWord.trim());
    }
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
    <div className="w-full max-w-md">
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={word}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || `Indtast et ord med "${currentSyllable}"`}
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
