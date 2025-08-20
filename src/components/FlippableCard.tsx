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
          "relative w-full h-[320px] sm:h-[360px] transition-all duration-700 transform-style-preserve-3d cursor-pointer hover:scale-[1.02] hover:shadow-lg",
          isFlipped ? "rotate-y-180" : ""
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Face Frontal */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-xl glass-light border border-border/20 overflow-hidden shadow-soft",
          gradientClass
        )}>
          <div className="relative h-full p-5 sm:p-6">
            {/* Indicador de flip com glow effect */}
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 group-hover:bg-white/40 transition-all duration-300 group-hover:scale-110">
                <RotateCcw className="w-4 h-4 text-white/80 group-hover:text-white transition-colors group-hover:rotate-180 duration-300" />
              </div>
            </div>
            {frontContent}
          </div>
        </div>

        {/* Face Traseira */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-xl glass-light border border-border/20 rotate-y-180 overflow-hidden shadow-soft",
          gradientClass
        )}>
          <div className="relative h-full p-5 sm:p-6">
            {/* Indicador de flip com glow effect */}
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 group-hover:bg-white/40 transition-all duration-300 group-hover:scale-110">
                <RotateCcw className="w-4 h-4 text-white/80 group-hover:text-white transition-colors group-hover:-rotate-180 duration-300" />
              </div>
            </div>
            {backContent}
          </div>
        </div>
      </div>
    </div>
  );
};