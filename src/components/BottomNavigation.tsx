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
    <nav className="fixed bottom-0 left-0 right-0 glass border-t-0 border-border/20 z-20">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 px-2 organic-hover ${
                isActive
                  ? 'text-primary bg-primary/10 rounded-t-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'scale-110' : ''} />
                <span className="text-xs mt-1 font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="w-full py-2 text-center text-xs text-muted-foreground border-t border-border/10">
        <a href="https://www.bion.global" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
          Powered by Bion ⚡
        </a>
      </div>
    </nav>
  );
};