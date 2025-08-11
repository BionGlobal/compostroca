import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  variant?: 'default' | 'primary' | 'earth';
  tooltip?: string;
}

export const StatCard = ({ title, value, icon, description, variant = 'default', tooltip }: StatCardProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-primary text-primary-foreground';
      case 'earth':
        return 'bg-gradient-earth text-earth-foreground';
      default:
        return 'bg-card text-card-foreground';
    }
  };

  return (
    <Card className={`${getVariantClasses()} border-0 organic-hover bounce-in`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-sm opacity-80">{title}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 opacity-60 hover:opacity-100 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-xs text-xs" avoidCollisions>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs opacity-70 mt-1">{description}</p>
            )}
          </div>
          <div className="text-3xl opacity-80 float">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};