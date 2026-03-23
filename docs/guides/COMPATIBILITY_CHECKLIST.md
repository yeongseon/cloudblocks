# Browser & Viewport Compatibility Checklist

> Covers issue #474.  
> Execute before every milestone release to verify cross-browser and responsive behavior.

---

## 1. Supported Browsers

| Browser | Version        | Priority      | Notes                                  |
| ------- | -------------- | ------------- | -------------------------------------- |
| Chrome  | Latest 2 major | **Primary**   | Most users, reference implementation   |
| Firefox | Latest 2 major | **Primary**   | Second-largest desktop share           |
| Safari  | Latest 2 major | **Primary**   | macOS/iOS users                        |
| Edge    | Latest 2 major | **Secondary** | Chromium-based, usually matches Chrome |

**Not supported**: Internet Explorer (any version).

---

## 2. Viewport Breakpoints

| Viewport           | Width       | Priority          | Expected Behavior                    |
| ------------------ | ----------- | ----------------- | ------------------------------------ |
| Desktop (large)    | ≥ 1440px    | **Primary**       | Full layout — canvas + all panels    |
| Desktop (standard) | 1024–1439px | **Primary**       | Full layout — panels may collapse    |
| Tablet (landscape) | 768–1023px  | **Secondary**     | Usable — panels overlay canvas       |
| Tablet (portrait)  | 600–767px   | **Secondary**     | Functional — reduced panel set       |
| Mobile             | < 600px     | **Informational** | Graceful message — "best on desktop" |

---

## 3. Pre-Release Checklist

### 3.1. Core Flows (Test on ALL Primary browsers)

| #   | Test Case                        | Chrome | Firefox | Safari | Edge |
| --- | -------------------------------- | ------ | ------- | ------ | ---- |
| 1   | App loads without console errors | ☐      | ☐       | ☐      | ☐    |
| 2   | Create new workspace             | ☐      | ☐       | ☐      | ☐    |
| 3   | Place a plate on canvas          | ☐      | ☐       | ☐      | ☐    |
| 4   | Place a block on plate           | ☐      | ☐       | ☐      | ☐    |
| 5   | Create connection between blocks | ☐      | ☐       | ☐      | ☐    |
| 6   | Validation panel shows results   | ☐      | ☐       | ☐      | ☐    |
| 7   | Generate Terraform code          | ☐      | ☐       | ☐      | ☐    |
| 8   | Generate Bicep code              | ☐      | ☐       | ☐      | ☐    |
| 9   | Generate Pulumi code             | ☐      | ☐       | ☐      | ☐    |
| 10  | Load a template                  | ☐      | ☐       | ☐      | ☐    |
| 11  | Undo/redo works (Ctrl+Z/Ctrl+Y)  | ☐      | ☐       | ☐      | ☐    |
| 12  | Export/import architecture JSON  | ☐      | ☐       | ☐      | ☐    |

### 3.2. Visual Rendering

| #   | Test Case                              | Chrome | Firefox | Safari | Edge |
| --- | -------------------------------------- | ------ | ------- | ------ | ---- |
| 1   | Isometric SVG renders correctly        | ☐      | ☐       | ☐      | ☐    |
| 2   | Studs visible on plates and blocks     | ☐      | ☐       | ☐      | ☐    |
| 3   | Connection lines render with arrows    | ☐      | ☐       | ☐      | ☐    |
| 4   | Drag-and-drop snaps to grid            | ☐      | ☐       | ☐      | ☐    |
| 5   | No visual overflow or clipping         | ☐      | ☐       | ☐      | ☐    |
| 6   | Dark/light text readable on all blocks | ☐      | ☐       | ☐      | ☐    |

### 3.3. Viewport Behavior

| #   | Test Case                       | Desktop (1440+) | Desktop (1024) | Tablet (768) |
| --- | ------------------------------- | --------------- | -------------- | ------------ |
| 1   | Canvas fills available space    | ☐               | ☐              | ☐            |
| 2   | Panels accessible (not cut off) | ☐               | ☐              | ☐            |
| 3   | Menu bar functional             | ☐               | ☐              | ☐            |
| 4   | Bottom panel visible            | ☐               | ☐              | ☐            |
| 5   | No horizontal scroll on canvas  | ☐               | ☐              | ☐            |

### 3.4. localStorage & Persistence

| #   | Test Case                                 | Status |
| --- | ----------------------------------------- | ------ |
| 1   | Fresh load (no localStorage) works        | ☐      |
| 2   | Existing data from previous version loads | ☐      |
| 3   | Architecture persists across page reload  | ☐      |
| 4   | Workspace switching preserves state       | ☐      |

---

## 4. Known Limitations

- **Safari**: SVG `filter` performance may differ — verify shadow rendering.
- **Firefox**: Clipboard API (`navigator.clipboard.writeText`) may require user gesture.
- **Mobile**: Canvas interaction (drag, connect) is not optimized for touch. Display a guidance message for mobile visitors.

---

## 5. Automated Checks (Future)

When Playwright E2E tests are added, automate sections 3.1 and 3.2 across Chrome and Firefox using `playwright.config.ts` projects:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];
```

Until then, execute this checklist manually before each release.
