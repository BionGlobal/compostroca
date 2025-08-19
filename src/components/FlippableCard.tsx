import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlippableCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  gradientClass?: string;
}

export const FlippableCard = ({ 
  frontContent, 
  backContent, 
  className = "", 
  gradientClass = "" 
}: FlippableCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={cn("group perspective-1000 w-full", className)}>
      <div 
        className={cn(
          "relative w-full h-[280px] sm:h-[320px] transition-transform duration-700 transform-style-preserve-3d cursor-pointer",
          isFlipped ? "rotate-y-180" : ""
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Face Frontal */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-xl glass-light border border-border/20 overflow-hidden",
          gradientClass
        )}>
          <div className="relative h-full p-4 sm:p-6">
            {/* Indicador de flip */}
            <div className="absolute top-3 right-3 z-10">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/20 backdrop-blur-sm border border-border/30">
                <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
            {frontContent}
          </div>
        </div>

        {/* Face Traseira */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-xl glass-light border border-border/20 rotate-y-180 overflow-hidden",
          gradientClass
        )}>
          <div className="relative h-full p-4 sm:p-6">
            {/* Indicador de flip */}
            <div className="absolute top-3 right-3 z-10">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/20 backdrop-blur-sm border border-border/30">
                <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
            {backContent}
          </div>
        </div>
      </div>
    </div>
  );
};