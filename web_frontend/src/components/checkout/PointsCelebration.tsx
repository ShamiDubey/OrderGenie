'use client';

import { useState, useEffect } from 'react';

interface PointsCelebrationProps {
  pointsEarned: number;
  orderNumber: string;
  onComplete: () => void;
}

export function PointsCelebration({ pointsEarned, orderNumber, onComplete }: PointsCelebrationProps) {
  const [showPoints, setShowPoints] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);

  useEffect(() => {
    // Start showing points after initial animation
    const showTimer = setTimeout(() => {
      setShowPoints(true);
    }, 500);

    return () => clearTimeout(showTimer);
  }, []);

  // Animate the points counter
  useEffect(() => {
    if (showPoints && animatedPoints < pointsEarned) {
      const increment = Math.ceil(pointsEarned / 30);
      const timer = setTimeout(() => {
        setAnimatedPoints((prev) => Math.min(prev + increment, pointsEarned));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [showPoints, animatedPoints, pointsEarned]);

  // Auto-proceed after animation completes
  useEffect(() => {
    if (animatedPoints >= pointsEarned && showPoints) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(completeTimer);
    }
  }, [animatedPoints, pointsEarned, showPoints, onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-500/90 to-orange-600/90 flex items-center justify-center z-50 overflow-hidden">
      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              backgroundColor: ['#fbbf24', '#f59e0b', '#ffffff', '#fcd34d', '#fef3c7'][
                Math.floor(Math.random() * 5)
              ],
            }}
          />
        ))}
      </div>

      {/* Floating stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <svg
            key={i}
            className="floating-star absolute w-6 h-6 text-yellow-200/30"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      <div className="relative bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl transform celebration-card">
        {/* Crown/Star Badge */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg star-burst">
              <svg
                className="w-14 h-14 text-white drop-shadow-md"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            {/* Sparkles around star */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-300 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-3 w-3 h-3 bg-yellow-200 rounded-full animate-ping delay-150" />
            <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-yellow-200 rounded-full animate-ping delay-300" />
          </div>
        </div>

        <div className="pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Congratulations!</h2>
          <p className="text-gray-500 mb-6">Order #{orderNumber} placed successfully</p>

          {/* Points Display */}
          <div className="relative mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border-2 border-amber-200">
              <div className="text-sm font-medium text-amber-600 mb-1">You earned</div>
              <div className="flex items-center justify-center gap-2">
                <svg
                  className={`w-10 h-10 text-amber-500 ${showPoints ? 'animate-bounce' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                  {animatedPoints}
                </span>
              </div>
              <div className="text-lg font-semibold text-amber-700 mt-1">Royalty Points!</div>
            </div>

            {/* Sparkle effects */}
            {showPoints && (
              <>
                <div className="absolute top-2 right-4 sparkle" />
                <div className="absolute bottom-4 left-6 sparkle delay-200" />
                <div className="absolute top-1/2 right-8 sparkle delay-400" />
              </>
            )}
          </div>

          <p className="text-gray-500 text-sm mb-4">
            Points have been added to your account instantly!
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading order details...
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.5;
          }
        }

        @keyframes celebration-pop {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.05) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes star-burst {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(251, 191, 36, 0);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }

        .confetti-particle {
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear infinite;
        }

        .floating-star {
          animation: float 4s ease-in-out infinite;
        }

        .celebration-card {
          animation: celebration-pop 0.6s ease-out forwards;
        }

        .star-burst {
          animation: star-burst 2s ease-in-out infinite;
        }

        .sparkle {
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #fbbf24 0%, transparent 70%);
          animation: sparkle 1s ease-in-out infinite;
        }

        .sparkle.delay-200 {
          animation-delay: 0.2s;
        }

        .sparkle.delay-400 {
          animation-delay: 0.4s;
        }

        .delay-150 {
          animation-delay: 0.15s;
        }

        .delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}
