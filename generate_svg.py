def generate(name, top_face_col, side_col, stud_top_col):
    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 169">')
    out.append(f'  <g>')
    out.append(f'    <!-- Left face -->')
    out.append(f'    <polygon points="0,83.0 140.0,166 140.0,169 0,86.0" fill="{side_col}" />')
    
    # We also need the right face color.
    # In public-subnet.svg: 
    # Left face: #1B5E20
    # Right face: #2E7D32
    # Top face: #43A047
    # So we need to parse it correctly, or just use slightly different logic.
    pass
