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
    <Card className={`${getVariantClasses()} shadow-sm border-0`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm opacity-80 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs opacity-70 mt-1">{description}</p>
            )}
          </div>
          <div className="text-3xl opacity-80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};