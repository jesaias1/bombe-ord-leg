
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WordInputProps {
  onSubmit: (word: string) => void;
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
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Reset submission state when syllable changes
  useEffect(() => {
    setHasSubmitted(false);
    setError('');
  }, [currentSyllable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) {
      setError('Indtast et ord');
      return;
    }

    if (!word.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
      return;
    }

    if (hasSubmitted || isSubmitting) {
      console.log('Preventing duplicate submission');
      return;
    }

    setHasSubmitted(true);
    setError('');
    
    try {
      await onSubmit(word.trim().toLowerCase());
      setWord('');
    } catch (err) {
      console.error('Error in word submission:', err);
      setHasSubmitted(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
    if (error) setError('');
    if (hasSubmitted && !isSubmitting) setHasSubmitted(false);
  };

  const isDisabled = disabled || hasSubmitted || isSubmitting;

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="text"
            value={word}
            onChange={handleInputChange}
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
          {isSubmitting ? 'Sender...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};
