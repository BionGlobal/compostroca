import { NavLink } from 'react-router-dom';
import { Users, Package, RotateCcw, BarChart3 } from 'lucide-react';

const navItems = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/voluntarios', icon: Users, label: 'Voluntários' },
  { to: '/entregas', icon: Package, label: 'Entregas' },
  { to: '/lotes', icon: RotateCcw, label: 'Lotes' },
];

export const BottomNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border/10 z-20 backdrop-blur-xl">
      <div className="flex relative">
        {/* Animated background indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
        
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-4 px-3 tech-hover relative ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-primary rounded-b-full" />
                )}
                <div className={`${isActive ? 'glass-light rounded-xl p-2 pulse-glow' : 'p-2'} transition-all duration-300`}>
                  <Icon size={20} className={`${isActive ? 'scale-110 text-primary' : ''} transition-transform duration-300`} />
                </div>
                <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
                  isActive ? 'text-primary font-semibold' : ''
                }`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};