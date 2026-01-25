import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SliceCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

export function SliceCelebration({ show, onComplete }: SliceCelebrationProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
  }>>([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: [
          "hsl(var(--foreground) / 0.8)",
          "hsl(var(--foreground) / 0.6)",
          "hsl(var(--muted-foreground) / 0.7)",
          "hsl(var(--foreground) / 0.4)",
        ][Math.floor(Math.random() * 4)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Play slice sound
      playSliceSound();

      // Cleanup after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Monochrome slice line */}
          <motion.div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-foreground/60 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ 
              scaleX: [0, 1, 1],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ boxShadow: "0 0 20px hsl(var(--foreground) / 0.3), 0 0 40px hsl(var(--foreground) / 0.2)" }}
          />

          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-sm"
              style={{
                left: `${particle.x}%`,
                top: `50%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
              }}
              initial={{ 
                y: 0,
                opacity: 1,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
                y: [0, -100 - Math.random() * 200, 300],
                x: [0, (Math.random() - 0.5) * 200],
                opacity: [0, 1, 1, 0],
                rotate: particle.rotation + 720,
                scale: [0, 1, 1, 0.5]
              }}
              transition={{ 
                duration: 1.2 + Math.random() * 0.5,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Central burst */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--foreground) / 0.15) 0%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 3, 4],
              opacity: [0, 0.6, 0]
            }}
            transition={{ duration: 0.8 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slice sound effect using Web Audio API
export function playSliceSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a "slice" swoosh sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);

    // Add a second higher-pitched swoosh for richness
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.type = "triangle";
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode2.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator2.start(audioContext.currentTime);
    oscillator2.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Silently fail if audio context isn't available
    console.log("Audio not available");
  }
}
