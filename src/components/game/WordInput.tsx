
import { useState, useEffect } from 'react';
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

  // Reset states when syllable changes
  useEffect(() => {
    setError('');
    setIsLocalSubmitting(false);
  }, [currentSyllable]);

  // Reset local submitting when parent isSubmitting changes
  useEffect(() => {
    if (!isSubmitting) {
      setIsLocalSubmitting(false);
    }
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedWord = word.trim();
    
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isDisabled = disabled || isLocalSubmitting || isSubmitting;
  const showSubmitting = isLocalSubmitting || isSubmitting;

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <Input
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
          type="submit" 
          disabled={isDisabled || !word.trim()}
          className="px-6"
        >
          {showSubmitting ? 'Sender...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};
