import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = '', showText = true }) => {
  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* Abstract geometric mountain & terrain contour mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-white"
      >
        {/* Outer institutional square frame with subtle chamfer */}
        <rect x="2" y="2" width="28" height="28" rx="6" className="fill-slate-800 stroke-slate-700" strokeWidth="1.5" />
        
        {/* Background terrain contour */}
        <path
          d="M6 22L13 14L19 20L26 12"
          className="stroke-slate-500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Foreground prominent mountain ridge */}
        <path
          d="M6 25L14 16L18 20L26 11"
          className="stroke-white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Focal geographic monitoring beacon */}
        <circle cx="26" cy="11" r="2.5" className="fill-blue-500" />
      </svg>

      {showText && (
        <span className="font-bold tracking-wider text-sm text-white font-sans uppercase">
          PRITHVI WATCH
        </span>
      )}
    </div>
  );
};
