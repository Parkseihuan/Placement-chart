# Organization Chart Development Examples

## Example 1: Adding a New Node Feature

### Scenario
Add a "note" field to nodes for additional comments.

### Implementation Steps

#### 1. Update Node Data Structure (app.js)
```javascript
createNode(data) {
    const id = `node-${this.nextId++}`;
    const node = {
        id,
        deptName: data.deptName || '새 부서',
        members: data.members || [],
        note: data.note || '', // NEW FIELD
        parentId: data.parentId || null,
        // ... rest of properties
    };
    // ...
}
```

#### 2. Add UI Element (index.html)
```html
<div class="form-group">
    <label for="nodeNote">메모 (선택사항)</label>
    <textarea id="nodeNote" rows="3" placeholder="부서에 대한 추가 메모..."></textarea>
</div>
```

#### 3. Add Styling (styles.css)
```css
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s ease;
}

.form-group textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.node-note {
    padding: 8px 12px;
    font-size: 12px;
    color: #64748b;
    font-style: italic;
    border-top: 1px solid #f1f5f9;
}
```

#### 4. Update Form Submit Handler (app.js)
```javascript
handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        deptName: document.getElementById('deptName').value.trim(),
        members: [...this.currentMembers],
        note: document.getElementById('nodeNote').value.trim(), // NEW
        // ... rest of data
    };

    // ... rest of handler
}
```

#### 5. Update renderNode (app.js)
```javascript
renderNode(node) {
    // ... existing code

    // Add note display after members
    let noteHtml = '';
    if (node.note) {
        noteHtml = `<div class="node-note">${this.escapeHtml(node.note)}</div>`;
    }

    element.innerHTML = `
        <div class="node-header">${this.escapeHtml(node.deptName)}</div>
        ${bodyHtml}
        ${noteHtml}
        <!-- anchors -->
    `;

    // ... rest of render
}
```

#### 6. Update Edit Modal (app.js)
```javascript
showEditNodeModal(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // ... existing code
    document.getElementById('nodeNote').value = node.note || ''; // NEW

    // ... rest of modal setup
}
```

---

## Example 2: Fixing a Layout Bug

### Scenario
Nodes with horizontal layout display incorrectly after editing.

### Investigation
```javascript
// Read the updateNodeElement method
// Found: Missing layout direction class update
```

### Fix
```javascript
updateNodeElement(node) {
    const element = document.getElementById(node.id);
    if (!element) return;

    // ... header update

    // FIX: Add layout direction class update
    if (node.layoutDirection === 'horizontal') {
        element.classList.add('layout-horizontal');
    } else {
        element.classList.remove('layout-horizontal');
    }

    // ... rest of method
}
```

### Test
1. Create node with vertical layout
2. Add members
3. Edit node → change to horizontal layout
4. Verify members display horizontally
5. Test undo/redo
6. Save and reload page

---

## Example 3: Adding Keyboard Shortcut

### Scenario
Add Ctrl+D to duplicate selected node.

### Implementation

#### 1. Add Handler to handleKeyDown (app.js)
```javascript
handleKeyDown(e) {
    // ... existing shortcuts

    // Duplicate node (Ctrl+D)
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (this.selectedNode) {
            this.duplicateNode(this.selectedNode);
        }
        return;
    }

    // ... rest of handlers
}
```

#### 2. Implement duplicateNode Method (app.js)
```javascript
duplicateNode(nodeId) {
    const original = this.nodes.get(nodeId);
    if (!original) return;

    // Create duplicate data
    const duplicateData = {
        deptName: `${original.deptName} (복사본)`,
        members: original.members.map(m => ({...m})),
        note: original.note,
        isIndependent: original.isIndependent,
        layoutDirection: original.layoutDirection,
        parentId: original.parentId,
        // Position offset
        x: original.x + 30,
        y: original.y + 30
    };

    // Create new node
    const newNode = this.createNode(duplicateData);

    // Select the new node
    this.selectNode(newNode.id);

    alert('노드가 복제되었습니다.');
}
```

#### 3. Add Tooltip (index.html)
```html
<!-- Add to context menu -->
<div class="menu-item" data-action="duplicate">노드 복제 (Ctrl+D)</div>
```

#### 4. Update Context Menu Handler (app.js)
```javascript
handleContextMenuClick(e) {
    const action = e.target.dataset.action;
    const nodeId = this.contextMenu.dataset.nodeId;

    if (!action || !nodeId) return;

    switch (action) {
        // ... existing cases
        case 'duplicate':
            this.duplicateNode(nodeId);
            break;
        // ...
    }

    this.hideContextMenu();
}
```

---

## Example 4: Updating Theme Color

### Scenario
Change primary color from indigo to blue.

### Implementation

#### 1. Update CSS Variables (styles.css)
```css
/* OLD */
--primary: #4f46e5;           /* Indigo */
--primary-hover: #4338ca;
--primary-light: #6366f1;

/* NEW */
--primary: #3b82f6;           /* Blue */
--primary-hover: #2563eb;
--primary-light: #60a5fa;
```

#### 2. Find and Replace in styles.css
```bash
# Search: #4f46e5
# Replace: #3b82f6

# Search: #4338ca
# Replace: #2563eb

# Search: #6366f1
# Replace: #60a5fa
```

#### 3. Update Specific Components
```css
/* Toolbar Logo */
.toolbar-logo {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}

/* Node Header */
.node-header {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

/* Primary Button */
.btn-primary {
    background: #3b82f6;
    border-color: #3b82f6;
}

.btn-primary:hover {
    background: #2563eb;
    border-color: #2563eb;
}
```

#### 4. Update Focus States
```css
/* Input Focus */
.form-group input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Button Hover */
.menu-item:hover {
    color: #3b82f6;
}
```

#### 5. Test All Components
- [ ] Toolbar and buttons
- [ ] Node headers
- [ ] Connection anchors
- [ ] Input focus states
- [ ] Modal elements
- [ ] Context menu hover

---

## Example 5: Optimizing Export Function

### Scenario
Export is slow for large org charts (100+ nodes).

### Investigation
```javascript
// Current implementation creates DOM clones synchronously
// This blocks the UI thread
```

### Optimization

#### 1. Add Loading Indicator
```javascript
async exportAsImage() {
    // Show loading
    const loadingEl = document.createElement('div');
    loadingEl.className = 'export-loading';
    loadingEl.innerHTML = `
        <div class="loading-spinner"></div>
        <p>이미지를 생성하는 중...</p>
    `;
    document.body.appendChild(loadingEl);

    try {
        // ... export logic
    } finally {
        // Hide loading
        loadingEl.remove();
    }
}
```

#### 2. Add Loading Styles (styles.css)
```css
.export-loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
}

.loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.export-loading p {
    margin-top: 16px;
    font-size: 16px;
    font-weight: 500;
}
```

#### 3. Use RequestAnimationFrame for Large Updates
```javascript
async cloneNodesAsync(nodes, minX, minY) {
    const fragments = document.createDocumentFragment();
    const nodeArray = Array.from(nodes.values());

    // Process nodes in chunks to avoid blocking
    const chunkSize = 20;
    for (let i = 0; i < nodeArray.length; i += chunkSize) {
        await new Promise(resolve => requestAnimationFrame(resolve));

        const chunk = nodeArray.slice(i, i + chunkSize);
        chunk.forEach(node => {
            const clone = this.createNodeClone(node, minX, minY);
            fragments.appendChild(clone);
        });
    }

    return fragments;
}

createNodeClone(node, minX, minY) {
    const element = document.getElementById(node.id);
    if (!element) return null;

    const clone = element.cloneNode(true);
    clone.style.left = `${node.x - minX}px`;
    clone.style.top = `${node.y - minY}px`;
    clone.classList.remove('selected', 'dragging');

    return clone;
}
```

---

## Example 6: Adding Data Validation

### Scenario
Prevent creating nodes with empty department names.

### Implementation

#### 1. Add Validation Function (app.js)
```javascript
validateNodeData(data) {
    const errors = [];

    // Department name required
    if (!data.deptName || data.deptName.trim() === '') {
        errors.push('부서명을 입력해주세요.');
    }

    // Department name length
    if (data.deptName && data.deptName.length > 50) {
        errors.push('부서명은 50자 이내로 입력해주세요.');
    }

    // Member validation
    data.members.forEach((member, index) => {
        if (!member.position && !member.name) {
            errors.push(`${index + 1}번째 직원의 정보가 비어있습니다.`);
        }
    });

    return errors;
}
```

#### 2. Update Form Submit Handler (app.js)
```javascript
handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        deptName: document.getElementById('deptName').value.trim(),
        members: [...this.currentMembers],
        // ... rest of data
    };

    // Validate data
    const errors = this.validateNodeData(data);
    if (errors.length > 0) {
        alert('입력 오류:\n\n' + errors.join('\n'));
        return;
    }

    // ... rest of handler
}
```

#### 3. Add Visual Feedback (styles.css)
```css
.form-group input.error,
.form-group textarea.error {
    border-color: #ef4444;
    background: #fef2f2;
}

.form-group .error-message {
    color: #ef4444;
    font-size: 12px;
    margin-top: 4px;
    display: block;
}
```

#### 4. Show Inline Errors (app.js)
```javascript
showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.classList.add('error');

    // Remove existing error message
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) existingError.remove();

    // Add new error message
    const errorEl = document.createElement('span');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
}

clearFieldErrors() {
    document.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}
```

---

## Example 7: Adding Unit Tests

### Scenario
Add basic tests for core functions.

### Implementation

#### 1. Create Test File (tests/app.test.js)
```javascript
describe('OrgChartApp', () => {
    let app;

    beforeEach(() => {
        // Setup
        document.body.innerHTML = `
            <div id="orgChart"></div>
            <svg id="connections"></svg>
        `;
        app = new OrgChartApp();
    });

    afterEach(() => {
        // Cleanup
        localStorage.clear();
    });

    describe('createNode', () => {
        it('should create a node with correct data', () => {
            const data = {
                deptName: '기획팀',
                members: [{ position: '팀장', name: '홍길동' }],
                x: 100,
                y: 100
            };

            const node = app.createNode(data);

            expect(node.deptName).toBe('기획팀');
            expect(node.members).toHaveLength(1);
            expect(node.x).toBe(100);
            expect(node.y).toBe(100);
        });

        it('should assign unique ID to each node', () => {
            const node1 = app.createNode({ deptName: 'A', x: 0, y: 0 });
            const node2 = app.createNode({ deptName: 'B', x: 0, y: 0 });

            expect(node1.id).not.toBe(node2.id);
        });
    });

    describe('getChildren', () => {
        it('should return child nodes', () => {
            const parent = app.createNode({ deptName: 'Parent', x: 0, y: 0 });
            const child1 = app.createNode({
                deptName: 'Child 1',
                parentId: parent.id,
                x: 0,
                y: 0
            });
            const child2 = app.createNode({
                deptName: 'Child 2',
                parentId: parent.id,
                x: 0,
                y: 0
            });

            const children = app.getChildren(parent.id);

            expect(children).toHaveLength(2);
            expect(children.map(c => c.id)).toContain(child1.id);
            expect(children.map(c => c.id)).toContain(child2.id);
        });
    });

    describe('undo/redo', () => {
        it('should undo node creation', () => {
            const initialSize = app.nodes.size;

            app.createNode({ deptName: 'Test', x: 0, y: 0 });
            expect(app.nodes.size).toBe(initialSize + 1);

            app.undo();
            expect(app.nodes.size).toBe(initialSize);
        });

        it('should redo undone action', () => {
            app.createNode({ deptName: 'Test', x: 0, y: 0 });
            const afterCreate = app.nodes.size;

            app.undo();
            expect(app.nodes.size).toBe(afterCreate - 1);

            app.redo();
            expect(app.nodes.size).toBe(afterCreate);
        });
    });
});
```

#### 2. Add Test Runner (package.json)
```json
{
    "scripts": {
        "test": "jest",
        "test:watch": "jest --watch"
    },
    "devDependencies": {
        "jest": "^29.0.0",
        "@testing-library/dom": "^9.0.0"
    }
}
```

#### 3. Run Tests
```bash
npm test
```

---

## Common Patterns

### Pattern 1: Adding Event Listener with Cleanup
```javascript
// Add listener
element.addEventListener('click', this.handler);

// Store reference for cleanup
this.listeners.set(element, this.handler);

// Cleanup when removing element
const handler = this.listeners.get(element);
if (handler) {
    element.removeEventListener('click', handler);
    this.listeners.delete(element);
}
```

### Pattern 2: State Update with Persistence
```javascript
updateState() {
    // 1. Update in-memory state
    this.nodes.set(nodeId, updatedNode);

    // 2. Update DOM
    this.updateNodeElement(updatedNode);

    // 3. Update connections
    this.updateConnections();

    // 4. Save for undo/redo
    this.saveState();

    // 5. Persist to localStorage
    this.saveToLocalStorage();
}
```

### Pattern 3: Modal Workflow
```javascript
// Show modal
showModal() {
    this.modal.classList.remove('hidden');
    this.inputField.focus();
}

// Handle submit
handleSubmit(e) {
    e.preventDefault();
    const data = this.getFormData();
    this.processData(data);
    this.hideModal();
}

// Handle cancel
handleCancel() {
    this.resetForm();
    this.hideModal();
}
```

---

These examples demonstrate common development tasks and patterns for the organization chart generator project.
