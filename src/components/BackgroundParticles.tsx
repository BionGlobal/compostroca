import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

export const BackgroundParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 15; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 8 + 4,
          opacity: Math.random() * 0.4 + 0.1,
          delay: Math.random() * 8,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary/20 particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
      
      {/* Enhanced organic elements */}
      <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-gradient-mesh blur-2xl float opacity-60" />
      <div className="absolute bottom-20 right-16 w-20 h-20 rounded-full bg-gradient-secondary blur-xl float-delayed opacity-40" />
      <div className="absolute top-1/3 right-1/4 w-16 h-16 rounded-full bg-gradient-accent blur-lg float opacity-50" style={{ animationDelay: '6s' }} />
      <div className="absolute bottom-1/3 left-1/4 w-12 h-12 rounded-full bg-gradient-primary blur-md float opacity-30" style={{ animationDelay: '9s' }} />
      
      {/* Technological mesh overlay */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-5" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
    </div>
  );
};