import { memo, useId } from 'react';
import type { CloudProvider } from './minifigureFaceColors';
import { getMinifigureFaceColors } from './minifigureFaceColors';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';

interface MinifigureProps {
  provider: CloudProvider;
  scale?: number;
  className?: string;
}

export const MinifigureSvg = memo(function MinifigureSvg({
  provider,
  scale = 1,
  className,
}: MinifigureProps) {
  const studId = useId().replace(/:/g, '_');
  const colors = getMinifigureFaceColors(provider);

  const width = 100;
  const height = 130;
  
  const renderLogo = () => {
    // Logo is placed on the torso front face, centered around (38, 66).
    // The skewY(26.5) aligns the logo with the isometric torso angle.
    // Each logo is ~14×14 simplified vector mark of the cloud provider.
    switch (provider) {
      case 'azure':
        // Simplified Azure logo — the iconic right-leaning quadrilateral shape
        return (
          <g data-part="logo" transform="translate(38, 66) skewY(26.5)" opacity="0.92">
            <path
              d="M -5 -5 L 0 -7 L 5 -1 L 2 0 Z"
              fill="#FFFFFF"
            />
            <path
              d="M -2 0 L 2 0 L 5 5 L -5 5 L -3 1 Z"
              fill="#FFFFFF"
              opacity="0.7"
            />
          </g>
        );
      case 'aws':
        // Simplified AWS logo — smile arrow swoosh under text
        return (
          <g data-part="logo" transform="translate(38, 64) skewY(26.5)" opacity="0.92">
            <text
              x="0"
              y="0"
              fill="#FFFFFF"
              fontSize="7"
              fontFamily="system-ui, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
            >
              AWS
            </text>
            <path
              d="M -6 4 Q 0 7 6 4"
              stroke="#FF9900"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 3 3 L 7 3.5 L 4 5.5"
              fill="#FF9900"
            />
          </g>
        );
      case 'gcp':
        // Simplified GCP logo — Google Cloud hexagonal shape with 4-color accents
        return (
          <g data-part="logo" transform="translate(38, 66) skewY(26.5)" opacity="0.92">
            <polygon
              points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3"
              fill="none"
              stroke="#4285F4"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="0" y1="-6" x2="0" y2="-3" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5.2" y1="3" x2="2.6" y2="1.5" stroke="#FBBC05" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="-5.2" y1="3" x2="-2.6" y2="1.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2" fill="#4285F4" />
          </g>
        );
      default:
        return null;
    }
  };

  const studColors = {
    main: colors.skin.main,
    shadow: colors.skin.shade,
    highlight: '#FFF4B3',
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      
    >
      <StudDefs studId={studId} studColors={studColors} />

      <g data-part="back-arm">
        <polygon points="18,52 26,48 22,68 14,72" fill={colors.torso.side} />
        <ellipse cx="18" cy="70" rx="4" ry="5" fill={colors.skin.shade} transform="rotate(-20 18 70)" />
      </g>

      <g data-part="torso">
        <polygon points="26,48 50,36 74,48 50,60" fill={colors.torso.top} />
        <polygon points="26,48 50,60 46,80 30,72" fill={colors.torso.front} />
        <polygon points="50,60 74,48 62,72 46,80" fill={colors.torso.side} />
        
        {renderLogo()}
      </g>

      <g data-part="hips">
        <polygon points="30,72 46,80 46,86 30,78" fill={colors.legs.front} />
        <polygon points="46,80 62,72 62,78 46,86" fill={colors.legs.side} />
      </g>

      <g data-part="back-leg">
        <polygon points="30,78 44,85 44,110 30,103" fill={colors.legs.front} />
        <polygon points="44,85 46,84 46,109 44,110" fill={colors.legs.side} />
      </g>

      <g data-part="front-leg">
        <polygon points="48,83 62,90 62,115 48,108" fill={colors.legs.front} />
        <polygon points="62,90 64,89 64,114 62,115" fill={colors.legs.side} />
      </g>

      <g data-part="front-arm">
        <polygon points="74,48 82,52 86,76 78,72" fill={colors.torso.front} />
        <ellipse cx="82" cy="74" rx="4" ry="5" fill={colors.skin.main} transform="rotate(20 82 74)" />
      </g>

      <g data-part="head">
        <ellipse cx="50" cy="38" rx="10" ry="5" fill="#000000" opacity="0.15" />
        <path d="M 32 22 L 32 38 A 18 9 0 0 0 68 38 L 68 22 Z" fill={colors.skin.shade} />
        <ellipse cx="50" cy="22" rx="18" ry="9" fill={colors.skin.main} />
        
        <g data-part="face">
          <circle cx="39" cy="29" r="1.5" fill="#000000" opacity="0.8" />
          <circle cx="49" cy="34" r="1.5" fill="#000000" opacity="0.8" />
          <path d="M 37 33 Q 44 39 51 36" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8" />
        </g>
      </g>

      <g data-part="stud">
        <StudGrid studId={studId} studs={[{ key: 'head-stud', x: 50, y: 17 }]} />
      </g>
    </svg>
  );
});
