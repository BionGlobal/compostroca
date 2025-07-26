import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ value, onChange, disabled = false }) => {
  const labels = ['', 'Regular', 'Bom', 'Ótimo'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            className={cn(
              "p-1 transition-colors",
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              size={24}
              className={cn(
                "transition-colors",
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-sm text-muted-foreground">
          {labels[value]}
        </span>
      )}
    </div>
  );
};