---
name: org-chart-dev
description: Organizational chart generator development specialist. Use when working on the organization chart web application - adding features, fixing bugs, updating styling, or maintaining code consistency. Ensures adherence to project standards for HTML/CSS/JavaScript structure, modern indigo color scheme, and Korean localization.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Organization Chart Generator Development Skill

## Purpose
This skill provides specialized knowledge for developing and maintaining the organizational chart generator web application. It ensures consistency in code style, UI design, and functionality across all features.

## When to Use This Skill
- Adding new features to the org chart application
- Fixing bugs in node rendering, connections, or interactions
- Updating UI styling and layout
- Refactoring code for better maintainability
- Reviewing code changes for consistency
- Implementing Korean localization

## Project Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Modern CSS with indigo color scheme
- **Libraries**: html2canvas (for image export)
- **Storage**: LocalStorage for persistence
- **Canvas**: SVG for connection lines

### Key Files
- `index.html` - Main HTML structure with toolbar and modals
- `app.js` - Core application logic (OrgChartApp class)
- `styles.css` - All styling with modern indigo theme

### Architecture
- **Main Class**: `OrgChartApp` - Single class managing entire application
- **State Management**: Map of nodes, undo/redo stacks, version history
- **Event-Driven**: Event listeners for drag-drop, context menus, modals
- **Data Persistence**: LocalStorage + JSON export/import

## Design Standards

### Color Scheme (Modern Indigo)
```css
Primary: #4f46e5 (Indigo)
Primary Hover: #4338ca (Darker Indigo)
Secondary Background: #f1f5f9 (Light Slate)
Text Primary: #1e293b (Dark Slate)
Text Secondary: #64748b (Medium Slate)
Border: #e2e8f0 (Light Border)
Connection Lines: #cbd5e1 (Light Slate)
```

### Node Styling
```css
- Background: White (#ffffff)
- Border: 2px solid #4f46e5
- Border Radius: 12px
- Header: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- Hover: translateY(-2px) with purple shadow
```

### Typography
```css
- Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Header Font: 14px, weight 600
- Member Position: 13px, weight 600, color #64748b
- Member Name: 13px, regular, color #1e293b
```

### Canvas Specifications
```javascript
- Size: 2100px × 1500px (A3 landscape)
- Background: Radial gradient dot pattern (#e5e7eb dots on #f9fafb)
- Zoom Range: 25% - 200%
- Node Spacing: Configurable (default: horizontal 120px, vertical 100px)
```

## Core Features & Implementation Patterns

### 1. Node Management
```javascript
// Node data structure
{
    id: 'node-1',
    deptName: '부서명',
    members: [{ position: '팀장', name: '홍길동' }],
    parentId: 'node-0' | null,
    isIndependent: false,
    layoutDirection: 'vertical' | 'horizontal',
    locked: false,
    connectionStart: 'bottom',
    connectionEnd: 'top',
    x: 100,
    y: 100
}

// Key methods
createNode(data) - Create and render new node
updateNodeElement(node) - Update existing node DOM
deleteNode(nodeId) - Remove node and children
renderNode(node) - Create DOM element with event listeners
```

### 2. Connection Lines
```javascript
// SVG path generation with anchor points
drawConnection(parent, child) {
    // Calculate anchor positions (top/bottom/left/right)
    const startPoint = getAnchorPoint(parent, child.connectionStart);
    const endPoint = getAnchorPoint(child, child.connectionEnd);

    // Create path with midpoints for clean routing
    // Pattern: vertical-horizontal-vertical OR horizontal-vertical-horizontal
}
```

### 3. Undo/Redo System
```javascript
// State management
saveState() - Push current state to undoStack
undo() - Pop from undoStack, push to redoStack
redo() - Pop from redoStack, push to undoStack
restoreState(state) - Apply saved state to DOM

// State structure
{
    nodes: Array<Node>,
    nextId: number
}
```

### 4. Version Control
```javascript
// Version data structure
{
    id: 'version-1',
    name: 'v1.0 initial layout',
    timestamp: ISO string,
    data: {
        nodes: [...],
        chartTitle: '...',
        chartDate: '...',
        // ... all app state
    }
}

// Methods
saveCurrentVersion() - Create snapshot
restoreVersion(versionId) - Load snapshot
deleteVersion(versionId) - Remove snapshot
```

### 5. Drag & Drop
```javascript
// Node dragging
handleNodeMouseDown(e, nodeId) - Start drag
handleMouseMove(e) - Update position during drag
handleMouseUp(e) - End drag, save state

// Connection dragging
handleAnchorMouseDown(e, nodeId) - Start connection from anchor
// Mouse move draws temporary line
// Mouse up on another node creates parent-child relationship
```

### 6. Export System
```javascript
async exportAsImage() {
    // 1. Create temporary container with full A3 size (2100×1500)
    // 2. Clone all nodes with adjusted positions
    // 3. Clone SVG connection lines
    // 4. Clone chart headers (title, date)
    // 5. Use html2canvas with scale: 2 for high resolution
    // 6. Download as PNG
}
```

## Common Development Tasks

### Adding a New Feature
1. **Update State**: Add new properties to node/app state if needed
2. **Update UI**: Add HTML elements in index.html
3. **Add Styling**: Add CSS classes in styles.css with indigo theme
4. **Implement Logic**: Add methods to OrgChartApp class
5. **Event Listeners**: Register in initEventListeners()
6. **Persistence**: Update saveToLocalStorage() / loadFromLocalStorage()
7. **Test**: Verify undo/redo, version control compatibility

### Fixing Bugs
1. **Read Context**: Use Read tool to understand current implementation
2. **Identify Issue**: Check event listeners, state updates, DOM manipulation
3. **Test Scenarios**: Consider edge cases (empty nodes, no parent, etc.)
4. **Fix & Verify**: Update code, test undo/redo, check persistence
5. **Update Comments**: Add Korean comments for complex logic

### Updating Styles
1. **Consistency Check**: Ensure new styles match indigo color scheme
2. **Responsive**: Test on different zoom levels (25%-200%)
3. **Hover States**: Add smooth transitions (0.2s ease)
4. **Accessibility**: Maintain contrast ratios for text
5. **Print Styles**: Update @media print if needed

## Localization (Korean)

### UI Text Standards
```javascript
// Button labels
'최상위 부서 추가' - Add root department
'하위 부서 추가' - Add child department
'형제 부서 추가' - Add sibling department
'자동 배치' - Auto layout
'영역 선택' - Area selection
'간격 설정' - Spacing settings
'버전 관리' - Version management
'이미지 저장' - Save as image

// Modal titles
'부서 정보 편집' - Edit department info
'간격 설정' - Spacing settings
'버전 관리' - Version management

// Form labels
'부서명' - Department name
'보직' - Position
'성명' - Name
'독립 노드' - Independent node
'직원 목록 레이아웃' - Member list layout
```

### Comment Standards
```javascript
// Use Korean for complex business logic
// 부모의 바로 아래 중앙에 배치
// 이미 자식이 있으면 옆으로 배치

// Use English for technical terms
// Calculate anchor positions
// Update DOM element
```

## Code Quality Standards

### JavaScript
- Use ES6+ features (arrow functions, destructuring, template literals)
- Single class design (OrgChartApp)
- Clear method names in English
- Korean comments for business logic
- Event listener cleanup when removing nodes
- Error handling for user operations

### CSS
- Mobile-first approach with @media queries
- CSS custom properties for theme colors (consider for future)
- BEM-like naming (component-element-modifier)
- Transitions on interactive elements (0.2s ease)
- Print styles for A3 landscape output

### HTML
- Semantic HTML5 elements
- Accessible form labels and ARIA where needed
- Data attributes for state (data-tooltip, data-action)
- Korean text content with English subtitles where helpful

## Testing Checklist

Before committing changes:
- [ ] Test node creation (root, child, sibling)
- [ ] Test node editing (name, members, layout direction)
- [ ] Test drag & drop (nodes, connections, headers)
- [ ] Test undo/redo (multiple operations)
- [ ] Test version save/restore
- [ ] Test auto layout (respects locked nodes, groups)
- [ ] Test export (A3 size, all elements visible)
- [ ] Test zoom (25%-200%, mouse wheel with Ctrl)
- [ ] Test persistence (LocalStorage, JSON export/import)
- [ ] Test responsive layout (toolbar wraps on small screens)

## Git Commit Standards

### Commit Message Format
```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `style`: UI/styling changes (no logic change)
- `refactor`: Code restructuring (no feature change)
- `docs`: Documentation updates
- `chore`: Maintenance tasks

### Subject Guidelines
- Use Korean for user-facing features
- Use English for technical changes
- Be specific about what changed
- Examples:
  - "Add mouse wheel zoom functionality"
  - "Fix horizontal layout not working for members"
  - "Modernize UI design with clean indigo color scheme"

## Common Pitfalls to Avoid

1. **Forgetting Layout Direction**: Always update classList when changing layoutDirection
2. **Missing State Save**: Call saveState() and saveToLocalStorage() after modifications
3. **Event Listener Leaks**: Remove listeners when deleting nodes
4. **Export Issues**: Ensure full A3 canvas is exported (2100×1500)
5. **Z-index Conflicts**: Follow z-index hierarchy (connections:1, nodes:10, anchors:20, modals:2000+)
6. **Header Position**: Remember chartDatePos uses 'right', chartTitlePos uses 'left'
7. **Undo/Redo**: Don't modify state without going through saveState()

## Quick Reference Commands

```bash
# Start development server
python -m http.server 8000

# Check git status
git status

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push

# View recent commits
git log --oneline -10
```

## Future Improvements to Consider

- [ ] Add TypeScript for type safety
- [ ] Implement CSS custom properties for theme switching
- [ ] Add keyboard shortcuts for common operations
- [ ] Implement multi-select for bulk operations
- [ ] Add search/filter functionality for large org charts
- [ ] Export to PDF with proper A3 formatting
- [ ] Add org chart templates
- [ ] Implement collaborative editing (WebSockets)
- [ ] Add org chart statistics (total employees, depth, etc.)

---

This skill ensures all development work maintains consistency with the established patterns, design system, and code quality standards of the organization chart generator project.
