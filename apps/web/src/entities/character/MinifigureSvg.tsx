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
    switch (provider) {
      case 'azure':
        return (
          <g transform="translate(38, 65)">
            <polygon points="0,-6 -6,6 6,6" fill="#FFFFFF" opacity="0.9" />
            <polygon points="-3,2 3,2 4,4 -4,4" fill={colors.torso.front} />
          </g>
        );
      case 'aws':
        return (
          <text
            x="38"
            y="68"
            fill="#FFFFFF"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            transform="rotate(26.5 38 68)"
            opacity="0.9"
          >
            AWS
          </text>
        );
      case 'gcp':
        return (
          <text
            x="38"
            y="68"
            fill="#555555"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            transform="rotate(26.5 38 68)"
            opacity="0.9"
          >
            GCP
          </text>
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
