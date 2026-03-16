const fs = require('fs');
const outDir = '/Users/yeongseonchoe/GitHub/cloudblocks/apps/web/src/shared/assets/plate-sprites';

function buildPlate(file, w, h, width, depth, colors, label, thickness) {
    let top, right, bottom, left;
    if (file === 'network') {
        top = {x: 576, y: 10};
        right = {x: 1142, y: 288};
        bottom = {x: 576, y: 566};
        left = {x: 10, y: 288};
    } else {
        top = {x: 224, y: 10};
        right = {x: 438, y: 112};
        bottom = {x: 224, y: 214};
        left = {x: 10, y: 112};
    }

    const rightAxis = { x: (right.x - top.x) / width, y: (right.y - top.y) / width };
    const downAxis = { x: (left.x - top.x) / depth, y: (left.y - top.y) / depth };

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <g id="stud-${file}">
      <ellipse cx="0" cy="7" rx="19" ry="9.5" fill="${colors.shadow}" />
      <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="${colors.top}" />
      <ellipse cx="0" cy="0" rx="11.4" ry="5.7" fill="${colors.highlight}" opacity="0.3" />
    </g>
  </defs>

  <!-- Faces -->
  <polygon points="${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}" fill="${colors.faceTop}" stroke="${colors.stroke}" stroke-width="1" stroke-opacity="0.6" />
  <polygon points="${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + thickness} ${left.x},${left.y + thickness}" fill="${colors.faceLeft}" />
  <polygon points="${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + thickness} ${bottom.x},${bottom.y + thickness}" fill="${colors.faceRight}" />

  <!-- Studs -->
  <g id="studs-${file}">\n`;
    
    // Z-order: back to front means we draw from lowest (r+c) to highest
    // r=0..depth-1, c=0..width-1 is a basic iteration that works reasonably well
    // Let's iterate r from 0 to depth-1, and c from width-1 down to 0 ? 
    // Wait, +c goes right (front), +r goes left (front). Either order works for non-overlapping studs 
    // since studs only overlap slightly horizontally/vertically if tight, but here rx=19 in a 64x32 grid - no overlap!
    for (let r = 0; r < depth; r++) {
        for (let c = 0; c < width; c++) {
            const sx = top.x + (c + 0.5) * rightAxis.x + (r + 0.5) * downAxis.x;
            const sy = top.y + (c + 0.5) * rightAxis.y + (r + 0.5) * downAxis.y;
            svg += `    <use href="#stud-${file}" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" />\n`;
        }
    }

    svg += `  </g>\n`;
    
    // Label positioning - left side
    const lx = left.x + (bottom.x - left.x) * 0.1;
    const ly = left.y + (bottom.y - left.y) * 0.1 + 30;
    
    svg += `  <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="white" font-family="sans-serif" font-weight="bold" font-size="24">${label}</text>\n`;
    svg += `</svg>\n`;

    fs.writeFileSync(`${outDir}/${file}.svg`, svg);
}

buildPlate('network', 1152, 586, 16, 20, {
    faceTop: '#2563EB', faceLeft: '#1D4ED8', faceRight: '#1E40AF', stroke: '#60A5FA', shadow: '#1D4ED8', top: '#60A5FA', highlight: '#93C5FD'
}, "🌐 VNet", 10);

buildPlate('public-subnet', 448, 234, 6, 8, {
    faceTop: '#22C55E', faceLeft: '#16A34A', faceRight: '#15803D', stroke: '#4ADE80', shadow: '#16A34A', top: '#4ADE80', highlight: '#86EFAC'
}, "🌍 Public", 10);

buildPlate('private-subnet', 448, 234, 6, 8, {
    faceTop: '#3B82F6', faceLeft: '#2563EB', faceRight: '#1D4ED8', stroke: '#93C5FD', shadow: '#2563EB', top: '#93C5FD', highlight: '#BFDBFE'
}, "🔒 Private", 10);
