
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
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Maintain focus more aggressively
  const maintainFocus = useCallback(() => {
    if (shouldMaintainFocus && inputRef.current && !disabled && !isLocalSubmitting && !isSubmitting) {
      const timer = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          console.log('Refocusing input');
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [shouldMaintainFocus, disabled, isLocalSubmitting, isSubmitting]);

  // Focus input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
        setShouldMaintainFocus(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [disabled]);

  // Reset states when syllable changes and refocus
  useEffect(() => {
    setError('');
    setIsLocalSubmitting(false);
    setShouldMaintainFocus(true);
    // Refocus input when syllable changes
    const timer = setTimeout(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentSyllable, disabled]);

  // Maintain focus during re-renders
  useEffect(() => {
    return maintainFocus();
  }, [maintainFocus]);

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
    setShouldMaintainFocus(false); // Stop trying to maintain focus during submission
    
    try {
      const success = await onSubmit(trimmedWord.toLowerCase());
      if (success) {
        setWord('');
        // Refocus input after successful submission
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            setShouldMaintainFocus(true);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error in word submission:', err);
      setError('Fejl ved indsendelse - prøv igen');
      setShouldMaintainFocus(true);
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
    if (error) setError('');
    setShouldMaintainFocus(true); // Ensure we maintain focus while typing
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key, 'Current word:', word, 'Input focused:', document.activeElement === inputRef.current);
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key detected, calling handleSubmit');
      handleSubmit();
    }
  };

  const handleInputFocus = () => {
    console.log('Input focused');
    setShouldMaintainFocus(true);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('Input blurred');
    // Only allow blur if we're clicking on the submit button or form is disabled
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || (!relatedTarget.closest('button') && !disabled && !isLocalSubmitting && !isSubmitting)) {
      // Re-focus if blur wasn't intentional
      setTimeout(() => {
        if (inputRef.current && shouldMaintainFocus) {
          inputRef.current.focus();
        }
      }, 10);
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
