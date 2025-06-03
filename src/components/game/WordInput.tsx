
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WordInputProps {
  onSubmit: (word: string) => void;
  disabled: boolean;
  currentSyllable: string;
  placeholder?: string;
}

export const WordInput = ({ onSubmit, disabled, currentSyllable, placeholder }: WordInputProps) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) {
      setError('Indtast et ord');
      return;
    }

    if (!word.toLowerCase().includes(currentSyllable.toLowerCase())) {
      setError(`Ordet skal indeholde "${currentSyllable}"`);
      return;
    }

    onSubmit(word.trim().toLowerCase());
    setWord('');
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="text"
            value={word}
            onChange={handleInputChange}
            placeholder={placeholder || `Indtast et ord med "${currentSyllable}"`}
            disabled={disabled}
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
          disabled={disabled || !word.trim()}
          className="px-6"
        >
          Send
        </Button>
      </form>
    </div>
  );
};
