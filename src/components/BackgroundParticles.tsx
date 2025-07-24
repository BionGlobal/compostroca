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
      
      {/* Elementos orgânicos adicionais */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-earth/10 blur-xl float" />
      <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full bg-secondary/15 blur-lg float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/3 right-1/4 w-12 h-12 rounded-full bg-primary-glow/20 blur-md float" style={{ animationDelay: '6s' }} />
    </div>
  );
};