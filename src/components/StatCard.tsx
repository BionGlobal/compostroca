import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  variant?: 'default' | 'primary' | 'earth';
}

export const StatCard = ({ title, value, icon, description, variant = 'default' }: StatCardProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-primary-foreground';
      case 'earth':
        return 'bg-earth text-earth-foreground';
      default:
        return 'bg-card text-card-foreground';
    }
  };

  return (
    <Card className={`${getVariantClasses()} glass-card border-0 tech-hover scale-in relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm opacity-90 mb-2 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gradient-primary mb-1">{value}</p>
            {description && (
              <p className="text-xs opacity-80 mt-1">{description}</p>
            )}
          </div>
          <div className="text-4xl opacity-90 pulse-glow">
            {icon}
          </div>
        </div>
        
        {/* Animated accent line */}
        <div className="mt-4 w-full h-1 bg-muted/20 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary rounded-full shimmer" style={{ width: '60%' }} />
        </div>
      </CardContent>
    </Card>
  );
};