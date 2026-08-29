import React, { useId } from 'react';

export interface FireLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  animated?: boolean;
  glow?: boolean;
}

export const FireLogo: React.FC<FireLogoProps> = ({
  className = 'w-8 h-8',
  size,
  animated = false,
  glow = true,
  style,
  ...props
}) => {
  const gradientId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12041.14 16041.44"
      width={size}
      height={size}
      className={`${className} ${animated ? 'animate-flame-pulse' : ''} ${
        glow ? 'drop-shadow-[0_0_15px_rgba(255,90,31,0.65)]' : ''
      } transition-all duration-300`}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      style={style}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="8682.58"
          y1="28323.59"
          x2="8494.86"
          y2="-10221.42"
        >
          {/* Fiery red base rising into bright ember and warm gold flame */}
          <stop offset="0%" stopColor="#E52E06" />
          <stop offset="50%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#F5A055" />
        </linearGradient>
      </defs>
      <g id="FireFlame">
        <path
          fill={`url(#${gradientId})`}
          fillRule="nonzero"
          d="M3647.57 16047.11c0,0 -4046.23,-1680.16 -3624.43,-5796.09 541.39,-5283.07 4563.78,-4675.03 5051.95,-10245.36 0,0 4137.4,1451.72 3072.8,7476.33 0,0 1863.03,145.17 1863.03,-2129.19 0,0 5613.31,6194 -1863.03,10694.31 1493.32,-3902.15 -2450.3,-3782.76 -2135.77,-6750.78 0,0 -818.3,294.35 -1554.33,1238.88 -1455.21,1867.43 -1597.83,3305 -810.22,5511.9z"
        />
      </g>
    </svg>
  );
};

export default FireLogo;
