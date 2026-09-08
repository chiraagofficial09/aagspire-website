import React, { useState, useEffect, useRef } from 'react';
import { FireLogo } from './FireLogo';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  showSpinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
  minHeight?: string;
  fallbackText?: string;
  minLoadingDuration?: number;
}

export const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  showSpinner = true,
  spinnerSize = 'md',
  minHeight,
  fallbackText = 'Image unavailable',
  loading = 'lazy',
  decoding = 'async',
  minLoadingDuration = 1000,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const handleBlur = () => setIsRevealed(false);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, []);

  // Reset loading state whenever src changes and enforce minimum 1 second loading time
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    startTimeRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If already in browser cache, honor minimum 1 second duration for Fire Logo
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      const elapsed = Date.now() - startTimeRef.current;
      const delay = Math.max(0, minLoadingDuration - elapsed);
      timerRef.current = setTimeout(() => {
        setIsLoaded(true);
      }, delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, minLoadingDuration]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const elapsed = Date.now() - startTimeRef.current;
    const delay = Math.max(0, minLoadingDuration - elapsed);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setIsLoaded(true);
    }, delay);

    if (rest.onLoad) rest.onLoad(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoaded(true);
    if (rest.onError) rest.onError(e);
  };

  const sizeConfig = {
    sm: {
      ring: 'w-8 h-8 border',
      logo: 'w-4 h-4',
    },
    md: {
      ring: 'w-11 h-11 border-[1.5px]',
      logo: 'w-5 h-5',
    },
    lg: {
      ring: 'w-16 h-16 border-2',
      logo: 'w-8 h-8',
    },
  };

  return (
    <div
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={minHeight && !isLoaded ? { minHeight } : undefined}
    >
      {/* Loading Skeleton & Shimmer Animation */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-0 bg-[#0d0d0d] flex items-center justify-center overflow-hidden">
          {/* Animated gradient shimmer sweep */}
          <div className="skeleton-shimmer" />

          {/* Glowing Center Fire Flame Loader */}
          {showSpinner && (
            <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 select-none">
              <div className="relative flex items-center justify-center">
                {/* Rotating subtle ember accent ring */}
                <div
                  className={`${sizeConfig[spinnerSize].ring} border-white/10 border-t-ember/90 border-r-ember/30 rounded-full animate-spin shadow-[0_0_20px_rgba(255,90,31,0.35)]`}
                />
                {/* Fire Logo centered with flame glow and pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <FireLogo
                    className={`${sizeConfig[spinnerSize].logo} animate-flame-pulse`}
                    animated
                    glow
                  />
                </div>
              </div>

              {spinnerSize === 'lg' && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-ember font-bold animate-pulse">
                    Igniting Artwork...
                  </span>
                  <span className="text-[9px] font-mono tracking-wider text-white/40">
                    AAGSPIRE HIGH-RES
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Fallback */}
      {hasError ? (
        <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center bg-[#0d0d0d] text-white/40 p-4 text-center border border-white/5">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2 text-white/30">
            !
          </div>
          <span className="text-xs">{fallbackText}</span>
        </div>
      ) : (
        <div
          className="relative w-full h-full select-none protected-image"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={loading}
            decoding={decoding}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onLoad={handleLoad}
            onError={handleError}
            className={`${className} transition-all duration-700 ease-out select-none pointer-events-none ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
            }`}
            style={
              {
                WebkitUserDrag: 'none',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
                ...rest.style,
              } as React.CSSProperties
            }
            {...rest}
          />
          {/* Transparent Protection Shield Overlay: Blocks right-click saving & image dragging */}
          <div
            className="absolute inset-0 z-10 select-none bg-transparent cursor-inherit"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-hidden="true"
          />

          {/* Mobile Screenshot Protection: Shows card on mobile unless actively held; taking a Power button screenshot forces fingers off or blur, capturing the card */}
          {isTouchDevice && isLoaded && !hasError && !wrapperClassName.includes('rounded-full') && (
            <div
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 text-center select-none transition-opacity duration-150 ${
                isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
              }`}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setIsRevealed(true);
                } else {
                  setIsRevealed(false);
                }
              }}
              onTouchEnd={() => setIsRevealed(false)}
              onTouchCancel={() => setIsRevealed(false)}
            >
              <div className="w-10 h-10 rounded-xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember mb-2 shadow-[0_0_20px_rgba(255,90,31,0.25)]">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white mb-0.5">
                This artwork is protected by <span className="text-ember">Aagspire</span>
              </h3>
              <p className="text-[11px] text-white/50">
                Touch &amp; hold to view
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
