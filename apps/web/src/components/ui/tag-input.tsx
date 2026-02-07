import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagInputProps {
  /** Current list of tags */
  value: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Custom class for the container */
  className?: string;
  /** Badge color variant */
  variant?: 'default' | 'red' | 'blue' | 'amber';
  /** Whether the input is disabled */
  disabled?: boolean;
}

const VARIANT_STYLES = {
  default: 'bg-slate-100 text-slate-700 border-slate-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
};

export function TagInput({
  value,
  onChange,
  placeholder = 'Escriba y presione Enter...',
  className,
  variant = 'default',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm ring-offset-background focus-within:ring-1 focus-within:ring-emerald-600 focus-within:ring-offset-0 cursor-text',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
            VARIANT_STYLES[variant],
          )}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:opacity-70 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[120px] outline-none bg-transparent placeholder:text-slate-500 py-1"
      />
    </div>
  );
}
