import { useEffect } from "react";
import "./SliceAnimation.css";

interface SliceAnimationProps {
  onComplete: () => void;
  destinationUrl: string;
}

export function SliceAnimation({ onComplete }: SliceAnimationProps) {
  useEffect(() => {
    // Redirect after ~700ms animation (200 + 180 + 150 + buffer)
    const timer = setTimeout(() => {
      onComplete();
    }, 700);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="slice-animation-container">
      {/* Logo with slice effect */}
      <div className="slice-logo-wrapper">
        <span className="slice-logo-text">
          <span className="slice-brand">Slice</span>
          <span className="url-brand">URL</span>
        </span>
        
        {/* Diagonal slice line */}
        <div className="slice-line" />
      </div>

      {/* Footer */}
      <p className="slice-footer">sliceurl.app</p>
    </div>
  );
}
