import * as THREE from 'three';
import { colors, containers, location, parentOf, resources } from './geometry';
import type { Moment } from './geometry';
import { connectedBlockIds, relationships } from './relationships';
import { inspectionPath } from './inspectionPath';
import type { MovePositions } from './geometry';
import { activeFixture } from './activeFixture';
import { displayRoute } from './routes';
import {
  destinationParent,
  firstAvailableInParent,
  relativeFromWorld,
  validateStudyMove,
} from './movement';
import type { StudyPlacement } from './movement';

export function mountThree(
  host: HTMLElement,
  moment: Moment,
  inspectedBlockId: string | null,
  inspectedConnectionId: string | null,
  zoom: number,
  onSelect: (id: string) => void,
  onPan: (x: number, z: number) => void,
  initialPan: { x: number; z: number },
  moved: MovePositions,
  onMove: (id: string, position: StudyPlacement) => void,
  onReject: (id: string) => void,
): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-35, 35, 23, -23, 0.1, 300);
  camera.zoom = zoom;
  let pan = { ...initialPan };
  camera.position.set(58 + pan.x, 72, 94 + pan.z);
  camera.lookAt(pan.x, 0, pan.z);
  scene.add(new THREE.AmbientLight(0xd8eafd, 1.9));
  const light = new THREE.DirectionalLight(0xffffff, 3.3);
  light.position.set(-23, 48, 22);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = light.shadow.camera.bottom = -55;
  light.shadow.camera.right = light.shadow.camera.top = 55;
  scene.add(light);
  const geometry: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const pickable: THREE.Object3D[] = [];
  const bodyById = new Map<string, THREE.Mesh>();
  const topById = new Map<string, THREE.Mesh>();
  const centers = new Map<string, THREE.Vector3>();
  const mesh = (w: number, h: number, d: number, color: string) => {
    const shape = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.06 });
    const result = new THREE.Mesh(shape, material);
    geometry.push(shape);
    materials.push(material);
    result.castShadow = result.receiveShadow = true;
    return result;
  };
  function routeRail(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: string,
    subdued: boolean,
    group: THREE.Group,
  ): void {
    const span = end.clone().sub(start);
    if (span.length() < 0.01) return;
    const vertical = Math.abs(span.y) > 0.01;
    const alongX = Math.abs(span.x) > 0.01;
    const sizes = (thickness: number): [number, number, number] => [
      alongX ? span.length() : thickness,
      vertical ? span.length() : thickness,
      !vertical && !alongX ? span.length() : thickness,
    ];
    const center = start.clone().add(end).multiplyScalar(0.5);
    const channel = mesh(...sizes(vertical ? 0.23 : 0.27), '#173d68');
    const channelMaterial = channel.material;
    if (channelMaterial instanceof THREE.MeshStandardMaterial) {
      channelMaterial.transparent = subdued;
      channelMaterial.opacity = subdued ? 0.22 : 1;
    }
    if (!vertical) channel.scale.y = 0.55;
    channel.castShadow = false;
    channel.position.copy(center);
    group.add(channel);
    const glow = mesh(...sizes(vertical ? 0.13 : 0.15), color);
    if (!vertical) glow.scale.y = 0.6;
    glow.castShadow = false;
    glow.receiveShadow = false;
    const material = glow.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissive.set(color);
      material.emissiveIntensity = subdued ? 0 : 0.9;
      material.transparent = subdued;
      material.opacity = subdued ? 0.2 : 1;
    }
    glow.position.copy(center);
    if (vertical) {
      glow.position.x += 0.09;
      glow.position.z += 0.09;
    } else {
      glow.position.y += 0.085;
    }
    group.add(glow);
  }
  const ground = mesh(66, 0.8, 36, '#e4edf8');
  ground.position.set(-6, -2.2, 0);
  ground.castShadow = false;
  scene.add(ground);
  for (const node of containers) {
    const position = location(node);
    const height = node.id === 'vnet' ? 1.7 : 2.6;
    const bottom = node.id === 'vnet' ? -1.2 : 0.45;
    const surface = mesh(
      node.frame.width,
      height,
      node.frame.depth,
      node.id === 'vnet' ? '#2865d2' : '#4b9ce9',
    );
    surface.position.set(position.x, bottom + height / 2, position.z);
    scene.add(surface);
  }
  const adjacentIds = inspectedBlockId ? new Set(connectedBlockIds(inspectedBlockId)) : null;
  for (const node of resources) {
    const position = location(node, moved);
    const base = parentOf(node, moved) === null ? -1.7 : 3.05;
    const raised =
      node.id === 'app' && moment === 'reject'
        ? 1.1
        : node.id === 'app' && moment === 'select'
          ? 0.5
          : 0;
    const body = mesh(
      3.5,
      3.4,
      3.5,
      node.resourceType === 'internet' ? '#687b94' : colors[node.category],
    );
    const bodyMaterial = body.material;
    if (adjacentIds?.has(node.id) && bodyMaterial instanceof THREE.MeshStandardMaterial) {
      bodyMaterial.emissive.set(colors[node.category]);
      bodyMaterial.emissiveIntensity = node.id === inspectedBlockId ? 0.38 : 0.13;
    }
    body.position.set(position.x, base + 1.9 + raised, position.z);
    body.userData.nodeId = node.id;
    pickable.push(body);
    bodyById.set(node.id, body);
    scene.add(body);
    const top = mesh(
      1.5,
      0.35,
      1.5,
      node.resourceType === 'internet' ? '#8193a8' : colors[node.category],
    );
    top.position.set(position.x, base + 3.8 + raised, position.z);
    topById.set(node.id, top);
    scene.add(top);
    centers.set(node.id, new THREE.Vector3(position.x, base + 4.2 + raised, position.z));
  }
  const rails = new THREE.Group();
  scene.add(rails);
  const previewRails = new THREE.Group();
  scene.add(previewRails);
  const routeGroups = new Map<string, THREE.Group>();
  function clearGroup(group: THREE.Group): void {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        const shapeIndex = geometry.indexOf(child.geometry);
        if (shapeIndex >= 0) geometry.splice(shapeIndex, 1);
        const materialIndex = materials.indexOf(child.material as THREE.Material);
        if (materialIndex >= 0) materials.splice(materialIndex, 1);
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }
  }
  function drawRails(positions: MovePositions): void {
    for (const group of routeGroups.values()) {
      clearGroup(group);
      rails.remove(group);
    }
    routeGroups.clear();
    for (const connection of activeFixture.connections) {
      const route = displayRoute(connection, positions);
      const group = new THREE.Group();
      rails.add(group);
      routeGroups.set(connection.id, group);
      const color = route.semantic === 'data' ? '#37d5ac' : '#42c9f5';
      const relationship = relationships.find((item) => item.id === route.id);
      const relevant =
        inspectedBlockId !== null &&
        relationship !== undefined &&
        (relationship.sourceId === inspectedBlockId || relationship.targetId === inspectedBlockId);
      for (let index = 1; index < route.points.length; index++) {
        const [ax, ay, az] = route.points[index - 1];
        const [bx, by, bz] = route.points[index];
        const transition = Math.abs(ay - by) > 0.01;
        const lift = transition ? 0 : 0.07;
        routeRail(
          new THREE.Vector3(ax, ay + lift, az),
          new THREE.Vector3(bx, by + lift, bz),
          color,
          inspectedBlockId !== null && !relevant,
          group,
        );
      }
    }
  }
  function drawPreviewRails(nodeId: string, positions: MovePositions): void {
    clearGroup(previewRails);
    for (const connection of activeFixture.connections) {
      const relationship = relationships.find((item) => item.id === connection.id);
      if (relationship?.sourceId !== nodeId && relationship?.targetId !== nodeId) continue;
      const original = routeGroups.get(connection.id);
      if (original) original.visible = false;
      const route = displayRoute(connection, positions);
      const color = route.semantic === 'data' ? '#bff8e9' : '#c9efff';
      for (let index = 1; index < route.points.length; index++) {
        const [ax, ay, az] = route.points[index - 1];
        const [bx, by, bz] = route.points[index];
        const start = new THREE.Vector3(ax, ay + 0.18, az);
        const end = new THREE.Vector3(bx, by + 0.18, bz);
        routeRail(start, end, color, false, previewRails);
      }
    }
  }
  function restoreRails(): void {
    clearGroup(previewRails);
    for (const group of routeGroups.values()) group.visible = true;
  }
  drawRails(moved);
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('aria-hidden', 'true');
  host.append(overlay);
  function point(world: THREE.Vector3): [number, number] {
    const projected = world.clone().project(camera);
    return [
      ((projected.x + 1) * host.clientWidth) / 2,
      ((1 - projected.y) * host.clientHeight) / 2,
    ];
  }
  function resize(): void {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height);
    camera.left = (-23 * width) / height;
    camera.right = (23 * width) / height;
    camera.top = 23;
    camera.bottom = -23;
    camera.updateProjectionMatrix();
    const labels = resources
      .map((node) => {
        const center = centers.get(node.id)!;
        const [x, y] = point(new THREE.Vector3(center.x, center.y - 2.4, center.z));
        const [px, py] = point(center);
        const port = `<ellipse cx="${px}" cy="${py + 5}" rx="12" ry="6" fill="#154b74"/><path d="M${px - 12} ${py} V${py + 5} A12 6 0 0 0 ${px + 12} ${py + 5} V${py}" fill="${colors[node.category]}"/><ellipse cx="${px}" cy="${py}" rx="12" ry="6" fill="${colors[node.category]}" stroke="white"/><ellipse cx="${px}" cy="${py - 1}" rx="6" ry="2.5" fill="white" opacity=".6"/>`;
        return `<g opacity="${adjacentIds && !adjacentIds.has(node.id) ? '.48' : '1'}">${port}<text x="${x}" y="${y}" text-anchor="middle" fill="white" stroke="#174273" stroke-width="2" paint-order="stroke" font-size="12" font-weight="bold">${node.name}</text></g>`;
      })
      .join('');
    const surfaceLabels = containers
      .map((node) => {
        const loc = location(node);
        const [x, y] = point(
          new THREE.Vector3(loc.x, node.id === 'vnet' ? 0.5 : 2.5, loc.z + node.frame.depth / 2),
        );
        return `<text x="${x}" y="${y}" text-anchor="middle" fill="white" stroke="#24538f" stroke-width="3" paint-order="stroke" font-size="14" font-weight="bold">${node.name.toUpperCase()}</text>`;
      })
      .join('');
    const selected = relationships.find((item) => item.id === inspectedConnectionId);
    let inspection = '';
    if (selected) {
      const from = centers.get(selected.sourceId);
      const to = centers.get(selected.targetId);
      if (from && to) {
        const source = point(from);
        const target = point(to);
        const { path, label } = inspectionPath(source, target, 62);
        const color = selected.semantic === 'data' ? '#118b70' : '#1675b6';
        inspection = `<g data-inspection-path="${selected.id}"><path d="${path}" stroke="#f7fcff" stroke-width="9" fill="none" stroke-linejoin="round"/><path d="${path}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round" marker-end="url(#inspection-arrow-${selected.semantic})"/><rect x="${label[0] - 23}" y="${label[1] - 15}" width="46" height="20" rx="7" fill="white" stroke="${color}"/><text x="${label[0]}" y="${label[1] - 1}" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${selected.semantic.toUpperCase()}</text></g>`;
      }
    }
    overlay.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="inspection-arrow-http" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#1675b6"/></marker><marker id="inspection-arrow-data" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#118b70"/></marker></defs>${labels}${surfaceLabels}${inspection}</svg>`;
    renderer.render(scene, camera);
  }
  const raycaster = new THREE.Raycaster();
  let dragStart: { x: number; y: number; panX: number; panZ: number } | null = null;
  let blockDrag: {
    id: string;
    start: THREE.Vector3;
    initial: { x: number; z: number };
    candidate: StudyPlacement | null;
    active: boolean;
  } | null = null;
  let dragged = false;
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  function hitPlane(event: PointerEvent, height: number): THREE.Vector3 | null {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, height, 0),
    );
    return raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
  }
  function pointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    dragStart = { x: event.clientX, y: event.clientY, panX: pan.x, panZ: pan.z };
    dragged = false;
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(pickable)[0];
    const id = hit?.object.userData.nodeId;
    const node = typeof id === 'string' ? resources.find((item) => item.id === id) : undefined;
    if (node) {
      const current = moved.get(node.id) ?? node.position;
      const height = parentOf(node, moved) ? 3.05 : -1.7;
      const start = hitPlane(event, height);
      if (start)
        blockDrag = {
          id: node.id,
          start,
          initial: { x: current.x, z: current.z },
          candidate: null,
          active: false,
        };
    }
    renderer.domElement.style.cursor = blockDrag ? 'grabbing' : 'grab';
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent): void {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    dragged = true;
    if (blockDrag) {
      blockDrag.active = true;
      const node = resources.find((item) => item.id === blockDrag?.id);
      const body = bodyById.get(blockDrag.id);
      const top = topById.get(blockDrag.id);
      if (!node || !body || !top) return;
      const height = parentOf(node, moved) ? 3.05 : -1.7;
      const hit = hitPlane(event, height);
      if (!hit) return;
      const startWorld = location(node, moved);
      const nextWorld = {
        x: startWorld.x + hit.x - blockDrag.start.x,
        z: startWorld.z + hit.z - blockDrag.start.z,
      };
      const targetParent = destinationParent(nextWorld);
      const candidate =
        targetParent !== parentOf(node, moved) && targetParent
          ? firstAvailableInParent(node, moved, targetParent)
          : validateStudyMove(
              node,
              relativeFromWorld(node, nextWorld, moved, targetParent),
              moved,
              targetParent,
            );
      blockDrag.candidate = candidate.valid ? candidate.position : null;
      const preview = candidate.valid
        ? location(node, new Map(moved).set(node.id, candidate.position))
        : nextWorld;
      const previewBase = candidate.valid && candidate.position.parentId ? 3.05 : height;
      body.position.set(preview.x, previewBase + 1.9, preview.z);
      top.position.set(preview.x, previewBase + 3.8, preview.z);
      centers.get(node.id)?.set(preview.x, previewBase + 4.2, preview.z);
      drawPreviewRails(
        node.id,
        candidate.valid ? new Map(moved).set(node.id, candidate.position) : moved,
      );
      const material = body.material;
      if (material instanceof THREE.MeshStandardMaterial)
        material.emissive.set(candidate.valid ? '#1b5947' : '#9a273e');
      resize();
      return;
    }
    const scale = 46 / (host.clientHeight * zoom);
    const next = {
      x: dragStart.panX + (-dx + dy) * scale * 0.7,
      z: dragStart.panZ + (dx + dy) * scale * 0.7,
    };
    camera.position.x += next.x - pan.x;
    camera.position.z += next.z - pan.z;
    pan = next;
    camera.lookAt(pan.x, 0, pan.z);
    onPan(pan.x, pan.z);
    resize();
  }
  function pointerUp(event: PointerEvent): void {
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    renderer.domElement.style.cursor = 'grab';
    if (!dragStart) return;
    dragStart = null;
    if (blockDrag) {
      const candidate = blockDrag;
      blockDrag = null;
      restoreRails();
      const node = resources.find((item) => item.id === candidate.id);
      if (
        node &&
        candidate.active &&
        candidate.candidate &&
        (candidate.candidate.x !== candidate.initial.x ||
          candidate.candidate.z !== candidate.initial.z ||
          candidate.candidate.parentId !== parentOf(node, moved))
      ) {
        onMove(candidate.id, candidate.candidate);
      } else {
        if (candidate.active && !candidate.candidate) {
          onReject(candidate.id);
          return;
        }
        if (node) {
          const origin = location(node, moved);
          const base = parentOf(node, moved) ? 3.05 : -1.7;
          bodyById.get(node.id)?.position.set(origin.x, base + 1.9, origin.z);
          topById.get(node.id)?.position.set(origin.x, base + 3.8, origin.z);
          centers.get(node.id)?.set(origin.x, base + 4.2, origin.z);
        }
        resize();
        drawRails(moved);
      }
      if (!candidate.active) onSelect(candidate.id);
      return;
    }
    if (dragged) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    const id = raycaster.intersectObjects(pickable)[0]?.object.userData.nodeId;
    if (typeof id === 'string') onSelect(id);
  }
  function pointerCancel(event: PointerEvent): void {
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId);
    dragStart = null;
    if (blockDrag) {
      const node = resources.find((item) => item.id === blockDrag?.id);
      if (node) {
        const origin = location(node, moved);
        const base = parentOf(node, moved) ? 3.05 : -1.7;
        bodyById.get(node.id)?.position.set(origin.x, base + 1.9, origin.z);
        topById.get(node.id)?.position.set(origin.x, base + 3.8, origin.z);
        centers.get(node.id)?.set(origin.x, base + 4.2, origin.z);
        const body = bodyById.get(node.id);
        if (body?.material instanceof THREE.MeshStandardMaterial) {
          body.material.emissive.set(adjacentIds?.has(node.id) ? colors[node.category] : 0);
        }
      }
    }
    blockDrag = null;
    restoreRails();
    drawRails(moved);
    renderer.domElement.style.cursor = 'grab';
    resize();
  }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return () => {
    observer.disconnect();
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    renderer.domElement.removeEventListener('pointercancel', pointerCancel);
    for (const item of geometry) item.dispose();
    for (const item of materials) item.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    overlay.remove();
  };
}
