# Organization Chart Style & Code Standards

## Color Palette

### Primary Colors
```css
--primary: #4f46e5;           /* Indigo - Primary brand color */
--primary-hover: #4338ca;     /* Darker indigo for hover states */
--primary-light: #6366f1;     /* Light indigo for gradients */
```

### Background Colors
```css
--bg-primary: #ffffff;        /* White - Main backgrounds */
--bg-secondary: #f8fafc;      /* Very light slate - Secondary backgrounds */
--bg-tertiary: #f1f5f9;       /* Light slate - Tertiary backgrounds */
--bg-canvas: #f9fafb;         /* Canvas background */
```

### Text Colors
```css
--text-primary: #1e293b;      /* Dark slate - Primary text */
--text-secondary: #475569;    /* Medium slate - Secondary text */
--text-tertiary: #64748b;     /* Light slate - Tertiary text */
--text-disabled: #94a3b8;     /* Very light slate - Disabled text */
```

### Border Colors
```css
--border-primary: #4f46e5;    /* Indigo - Primary borders */
--border-secondary: #e2e8f0;  /* Light slate - Secondary borders */
--border-tertiary: #cbd5e1;   /* Medium slate - Connection lines */
```

### State Colors
```css
--success: #22c55e;           /* Green - Success states */
--error: #ef4444;             /* Red - Error/delete states */
--warning: #f59e0b;           /* Orange - Warning/locked states */
--info: #3b82f6;              /* Blue - Info states */
```

## Typography

### Font Families
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

### Font Sizes
```css
--font-xs: 12px;              /* Small labels, hints */
--font-sm: 13px;              /* Members, buttons */
--font-base: 14px;            /* Body text, inputs */
--font-lg: 15px;              /* Emphasized text */
--font-xl: 16px;              /* Headers, titles */
--font-2xl: 20px;             /* Logo */
--font-3xl: 24px;             /* Modal titles (1.5rem) */
```

### Font Weights
```css
--font-regular: 400;          /* Normal text */
--font-medium: 500;           /* Emphasized text */
--font-semibold: 600;         /* Buttons, labels */
--font-bold: 700;             /* Headers, titles */
```

## Spacing

### Standard Spacing Scale
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Component-Specific Spacing
```css
/* Toolbar */
--toolbar-padding: 16px 32px;
--toolbar-gap: 8px;

/* Buttons */
--button-padding: 8px 14px;
--button-gap: 8px;

/* Modals */
--modal-padding: 32px;
--modal-gap: 24px;

/* Nodes */
--node-padding: 10px 15px;
--node-gap: 8px;
```

## Border Radius

### Standard Radius
```css
--radius-sm: 6px;             /* Small elements */
--radius-base: 8px;           /* Default radius */
--radius-lg: 10px;            /* Node headers */
--radius-xl: 12px;            /* Large elements */
--radius-2xl: 16px;           /* Modals */
--radius-full: 9999px;        /* Circular elements */
```

## Shadows

### Standard Shadows
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-base: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-md: 0 4px 14px rgba(79, 70, 229, 0.3);
--shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.15);
--shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.2);
```

### Interactive Shadows
```css
/* Node hover */
box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);

/* Button focus */
box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);

/* Modal */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
```

## Transitions

### Standard Transitions
```css
--transition-fast: 0.15s ease;
--transition-base: 0.2s ease;
--transition-slow: 0.3s ease;
```

### Common Transition Properties
```css
/* All-purpose smooth transition */
transition: all 0.2s ease;

/* Specific properties for performance */
transition: background 0.2s ease, transform 0.2s ease;
transition: opacity 0.2s ease, transform 0.2s ease;
transition: border-color 0.2s ease, box-shadow 0.2s ease;
```

## Component Specifications

### Toolbar
```css
height: auto;
padding: 16px 32px;
background: white;
border-bottom: 1px solid #e5e7eb;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

### Logo
```css
width: 40px;
height: 40px;
background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
border-radius: 8px;
box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
font-size: 20px;
font-weight: 700;
color: white;
```

### Buttons
```css
/* Secondary Button */
padding: 8px 14px;
background: #f1f5f9;
color: #475569;
border: 1px solid transparent;
border-radius: 6px;
font-size: 13px;
font-weight: 500;

/* Primary Button */
background: #4f46e5;
color: white;
border-color: #4f46e5;

/* Hover States */
secondary:hover -> background: #e2e8f0, border: #cbd5e1
primary:hover -> background: #4338ca
```

### Nodes
```css
/* Base Node */
background: white;
border: 2px solid #4f46e5;
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
min-width: 150px;
max-width: 300px;

/* Node Header */
background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
color: white;
padding: 10px 15px;
font-weight: 600;
font-size: 14px;
border-radius: 10px 10px 0 0;

/* Header for nodes without members */
border-radius: 10px;

/* Member Item */
padding: 8px 12px;
border-bottom: 1px solid #f1f5f9;
font-size: 13px;

/* Hover Effects */
transform: translateY(-2px);
box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
```

### Special Node States
```css
/* Independent Node */
border-color: #a855f7;
border-style: dashed;
.node-header -> gradient(#a855f7, #c084fc);

/* Locked Node */
border-color: #f59e0b;
box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);

/* Selected Node */
border-color: #ef4444;
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);

/* In-Group Node */
box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);
```

### Modals
```css
/* Modal Overlay */
background: rgba(0, 0, 0, 0.4);
backdrop-filter: blur(4px);

/* Modal Content */
background: white;
padding: 32px;
border-radius: 16px;
min-width: 400px;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
border: 1px solid rgba(255, 255, 255, 0.8);

/* Modal Title */
font-size: 1.5rem;
font-weight: 700;
color: #1e293b;
margin-bottom: 24px;
```

### Inputs
```css
/* Text Input */
padding: 10px 12px;
border: 1px solid #e2e8f0;
border-radius: 8px;
font-size: 14px;

/* Focus State */
border-color: #4f46e5;
box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);

/* Checkbox/Radio */
width: 16-18px;
height: 16-18px;
cursor: pointer;
```

### Context Menu
```css
background: white;
border-radius: 12px;
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
border: 1px solid #e5e7eb;
min-width: 180px;

/* Menu Item */
padding: 12px 16px;
font-size: 14px;
color: #475569;

/* Hover */
background: #f8fafc;
color: #4f46e5;

/* Delete Item */
color: #ef4444;
hover -> background: #fef2f2, color: #dc2626
```

### Zoom Controls
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(12px);
padding: 4px;
border-radius: 12px;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
border: 1px solid rgba(255, 255, 255, 0.5);

/* Zoom Button */
width: 32px;
height: 32px;
border-radius: 8px;
font-size: 16px;
font-weight: 600;
```

### Connection Lines
```css
stroke: #cbd5e1;
stroke-width: 2;
fill: none;

/* Temporary Connection (during drag) */
stroke: #e74c3c;
stroke-dasharray: 5,5;
```

### Tooltips
```css
background: rgba(0, 0, 0, 0.9);
color: white;
padding: 8px 12px;
border-radius: 6px;
font-size: 13px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

/* Tooltip Arrow */
border: 6px solid transparent;
border-bottom-color: rgba(0, 0, 0, 0.9);
```

## Canvas Specifications

### A3 Landscape Canvas
```javascript
Width: 2100px
Height: 1500px
Background: #f9fafb
Background Pattern: radial-gradient(circle, #e5e7eb 1px, transparent 1px)
Background Size: 20px 20px (adjusts with zoom)
```

### Zoom Levels
```javascript
Min: 0.25 (25%)
Max: 2.0 (200%)
Default: 1.0 (100%)
Step: 0.1 (10%)
```

### Node Spacing (Configurable)
```javascript
Horizontal: 120px (default)
Vertical: 100px (default)
Range: 50-300px
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        gap: 10px;
    }

    .toolbar-actions {
        flex-wrap: wrap;
        justify-content: center;
    }

    .modal-content {
        min-width: 90%;
        margin: 0 20px;
    }
}
```

## Print Styles

### A3 Landscape Print
```css
@page {
    size: A3 landscape;
    margin: 10mm;
}

/* Hide interactive elements */
.toolbar, .modal, .context-menu, .zoom-controls {
    display: none !important;
}

/* Adjust for print */
.canvas-container {
    background: white !important;
}

.org-node {
    box-shadow: none !important;
    border: 1.5px solid #333 !important;
}

.connection-line {
    stroke: #000 !important;
    stroke-width: 1.5 !important;
}
```

## Accessibility Standards

### Contrast Ratios (WCAG 2.1 AA)
- Primary text on white: 4.5:1 minimum
- Secondary text on white: 4.5:1 minimum
- Button text on primary: 4.5:1 minimum

### Focus Indicators
```css
/* All interactive elements */
:focus {
    outline: 2px solid #4f46e5;
    outline-offset: 2px;
}

/* Custom focus for inputs */
input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
```

### Keyboard Navigation
- Tab order follows visual flow
- All interactive elements reachable via keyboard
- ESC closes modals and context menus
- Ctrl+Z/Y for undo/redo
- Ctrl+/- for zoom
- Delete key removes selected node

## Performance Guidelines

### CSS Performance
```css
/* Use transform/opacity for animations (GPU accelerated) */
transition: transform 0.2s ease, opacity 0.2s ease;

/* Avoid animating layout properties */
/* DON'T: transition: width 0.2s ease; */
/* DO: transition: transform 0.2s ease; */

/* Use will-change sparingly */
.dragging {
    will-change: transform;
}
```

### JavaScript Performance
```javascript
// Debounce resize events
// Throttle scroll/drag events
// Use event delegation for dynamic content
// Clean up event listeners when removing elements
```

## Code Formatting

### Indentation
- 4 spaces (JavaScript, CSS)
- 4 spaces (HTML)

### Line Length
- Maximum 120 characters
- Break long lines at logical points

### Naming Conventions
```javascript
// Classes: PascalCase
class OrgChartApp { }

// Methods: camelCase
handleNodeMouseDown() { }

// Constants: UPPER_SNAKE_CASE
const MAX_ZOOM_LEVEL = 2;

// Variables: camelCase
let selectedNode = null;

// CSS Classes: kebab-case
.org-node { }
.node-header { }
.member-item { }
```

### File Organization
```
index.html          - HTML structure
app.js              - Application logic (single file)
styles.css          - All styles (single file)
.claude/
  └── skills/
      └── org-chart-dev/
          ├── SKILL.md
          ├── STANDARDS.md
          └── EXAMPLES.md
```

---

These standards ensure visual consistency, code quality, and maintainability across the entire organization chart generator project.
