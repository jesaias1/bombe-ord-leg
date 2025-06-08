
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
}

export const WordInput = ({ 
  onSubmit, 
  disabled, 
  currentSyllable, 
  placeholder,
  isSubmitting = false 
}: WordInputProps) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset states when syllable changes
  useEffect(() => {
    setError('');
    setIsLocalSubmitting(false);
    // Refocus input when syllable changes
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSyllable]);

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
        // Refocus input after successful submission
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch (err) {
      console.error('Error in word submission:', err);
      setError('Fejl ved indsendelse - prøv igen');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
    if (error) setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key, 'Current word:', word);
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
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
