import { Minus, Plus, Maximize2 } from 'lucide-react';
import './ZoomControls.css';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToContent: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFitToContent }: ZoomControlsProps) {
  const pct = Math.round(zoom * 100);

  return (
    <div className="zoom-controls" data-testid="zoom-controls">
      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomOut}
        disabled={zoom <= 0.3}
        aria-label="Zoom out"
        title="Zoom out (Ctrl+−)"
      >
        <Minus size={14} />
      </button>

      <span className="zoom-level" aria-label={`Zoom level ${pct}%`}>
        {pct}%
      </span>

      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomIn}
        disabled={zoom >= 3.0}
        aria-label="Zoom in"
        title="Zoom in (Ctrl++)"
      >
        <Plus size={14} />
      </button>

      <span className="zoom-separator" />

      <button
        type="button"
        className="zoom-btn"
        onClick={onFitToContent}
        aria-label="Fit to screen"
        title="Fit to screen (Ctrl+0)"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
