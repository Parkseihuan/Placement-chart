// 조직도 생성기 애플리케이션
class OrgChartApp {
    constructor() {
        this.nodes = new Map();
        this.selectedNode = null;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.nextId = 1;
        this.currentMembers = []; // 모달에서 현재 편집 중인 직원 목록

        this.initElements();
        this.initEventListeners();
        this.loadFromLocalStorage();
    }

    initElements() {
        this.orgChart = document.getElementById('orgChart');
        this.connections = document.getElementById('connections');
        this.nodeModal = document.getElementById('nodeModal');
        this.nodeForm = document.getElementById('nodeForm');
        this.contextMenu = document.getElementById('contextMenu');
        this.modalTitle = document.getElementById('modalTitle');
        this.fileInput = document.getElementById('fileInput');
    }

    initEventListeners() {
        // Toolbar buttons
        document.getElementById('addRootBtn').addEventListener('click', () => this.showAddNodeModal());
        document.getElementById('autoLayoutBtn').addEventListener('click', () => this.autoLayout());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportAsImage());
        document.getElementById('saveDataBtn').addEventListener('click', () => this.saveToFile());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.fileInput.click());

        // File input
        this.fileInput.addEventListener('change', (e) => this.loadFromFile(e));

        // Modal events
        this.nodeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('addMemberBtn').addEventListener('click', () => this.addMember());

        // Context menu
        this.contextMenu.addEventListener('click', (e) => this.handleContextMenuClick(e));

        // Global events
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Prevent context menu on canvas
        this.orgChart.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Node Management
    createNode(data) {
        const id = `node-${this.nextId++}`;
        const node = {
            id,
            deptName: data.deptName || '새 부서',
            members: data.members || [], // 배열로 여러 직원 관리
            parentId: data.parentId || null,
            x: data.x || 100,
            y: data.y || 100
        };

        this.nodes.set(id, node);
        this.renderNode(node);
        this.updateConnections();
        this.saveToLocalStorage();

        return node;
    }

    renderNode(node) {
        const element = document.createElement('div');
        element.className = 'org-node';
        element.id = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;

        // 여러 직원 목록 생성
        let membersHtml = '';
        if (node.members && node.members.length > 0) {
            membersHtml = node.members.map(member => `
                <div class="member-item">
                    <span class="member-position">${this.escapeHtml(member.position)}</span>
                    <span class="member-name">${this.escapeHtml(member.name)}</span>
                </div>
            `).join('');
        } else {
            membersHtml = '<div class="member-item empty">직원 없음</div>';
        }

        element.innerHTML = `
            <div class="node-header">${this.escapeHtml(node.deptName)}</div>
            <div class="node-body">
                ${membersHtml}
            </div>
        `;

        element.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, node.id));
        element.addEventListener('contextmenu', (e) => this.showContextMenu(e, node.id));
        element.addEventListener('dblclick', () => this.editNode(node.id));

        this.orgChart.appendChild(element);
    }

    updateNodeElement(node) {
        const element = document.getElementById(node.id);
        if (!element) return;

        // 헤더 업데이트
        element.querySelector('.node-header').textContent = node.deptName;

        // 멤버 목록 업데이트
        const nodeBody = element.querySelector('.node-body');
        let membersHtml = '';
        if (node.members && node.members.length > 0) {
            membersHtml = node.members.map(member => `
                <div class="member-item">
                    <span class="member-position">${this.escapeHtml(member.position)}</span>
                    <span class="member-name">${this.escapeHtml(member.name)}</span>
                </div>
            `).join('');
        } else {
            membersHtml = '<div class="member-item empty">직원 없음</div>';
        }
        nodeBody.innerHTML = membersHtml;
    }

    deleteNode(nodeId) {
        // Delete all children first
        const children = this.getChildren(nodeId);
        children.forEach(child => this.deleteNode(child.id));

        // Remove from DOM
        const element = document.getElementById(nodeId);
        if (element) element.remove();

        // Remove from data
        this.nodes.delete(nodeId);
        this.updateConnections();
        this.saveToLocalStorage();
    }

    getChildren(parentId) {
        const children = [];
        this.nodes.forEach(node => {
            if (node.parentId === parentId) {
                children.push(node);
            }
        });
        return children;
    }

    // Drag and Drop
    handleNodeMouseDown(e, nodeId) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        const node = this.nodes.get(nodeId);
        const element = document.getElementById(nodeId);

        this.draggedNode = node;
        this.dragOffset = {
            x: e.clientX - node.x,
            y: e.clientY - node.y
        };

        element.classList.add('dragging');
        this.selectNode(nodeId);
    }

    handleMouseMove(e) {
        if (!this.draggedNode) return;

        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;

        // Update position
        this.draggedNode.x = Math.max(0, newX);
        this.draggedNode.y = Math.max(0, newY);

        const element = document.getElementById(this.draggedNode.id);
        element.style.left = `${this.draggedNode.x}px`;
        element.style.top = `${this.draggedNode.y}px`;

        this.updateConnections();
    }

    handleMouseUp(e) {
        if (!this.draggedNode) return;

        const element = document.getElementById(this.draggedNode.id);
        element.classList.remove('dragging');

        this.draggedNode = null;
        this.saveToLocalStorage();
    }

    // Selection
    selectNode(nodeId) {
        // Deselect previous
        if (this.selectedNode) {
            const prevElement = document.getElementById(this.selectedNode);
            if (prevElement) prevElement.classList.remove('selected');
        }

        this.selectedNode = nodeId;
        const element = document.getElementById(nodeId);
        if (element) element.classList.add('selected');
    }

    deselectAll() {
        if (this.selectedNode) {
            const element = document.getElementById(this.selectedNode);
            if (element) element.classList.remove('selected');
        }
        this.selectedNode = null;
    }

    // Connection Lines
    updateConnections() {
        this.connections.innerHTML = '';

        this.nodes.forEach(node => {
            if (node.parentId && this.nodes.has(node.parentId)) {
                const parent = this.nodes.get(node.parentId);
                this.drawConnection(parent, node);
            }
        });
    }

    drawConnection(parent, child) {
        const parentEl = document.getElementById(parent.id);
        const childEl = document.getElementById(child.id);

        if (!parentEl || !childEl) return;

        const parentRect = {
            x: parent.x + parentEl.offsetWidth / 2,
            y: parent.y + parentEl.offsetHeight
        };

        const childRect = {
            x: child.x + childEl.offsetWidth / 2,
            y: child.y
        };

        // Create path with vertical-horizontal-vertical pattern
        const midY = (parentRect.y + childRect.y) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${parentRect.x} ${parentRect.y}
                   L ${parentRect.x} ${midY}
                   L ${childRect.x} ${midY}
                   L ${childRect.x} ${childRect.y}`;

        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-line');

        this.connections.appendChild(path);
    }

    // Modal
    showAddNodeModal(parentId = null) {
        this.modalTitle.textContent = parentId ? '하위 부서 추가' : '최상위 부서 추가';
        this.nodeForm.reset();
        this.nodeForm.dataset.mode = 'add';
        this.nodeForm.dataset.parentId = parentId || '';
        this.currentMembers = [];
        this.renderMembersList();
        this.nodeModal.classList.remove('hidden');
        document.getElementById('deptName').focus();
    }

    showEditNodeModal(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        this.modalTitle.textContent = '부서 정보 편집';
        document.getElementById('deptName').value = node.deptName;

        // 기존 멤버 목록 로드
        this.currentMembers = node.members ? [...node.members] : [];
        this.renderMembersList();

        this.nodeForm.dataset.mode = 'edit';
        this.nodeForm.dataset.nodeId = nodeId;
        this.nodeModal.classList.remove('hidden');
        document.getElementById('deptName').focus();
    }

    hideModal() {
        this.nodeModal.classList.add('hidden');
        this.nodeForm.reset();
        this.currentMembers = [];
        this.renderMembersList();
    }

    // Member Management
    addMember() {
        const position = document.getElementById('memberPosition').value.trim();
        const name = document.getElementById('memberName').value.trim();

        if (!position && !name) {
            alert('보직 또는 성명을 입력해주세요.');
            return;
        }

        this.currentMembers.push({ position, name });
        this.renderMembersList();

        // Clear inputs
        document.getElementById('memberPosition').value = '';
        document.getElementById('memberName').value = '';
        document.getElementById('memberPosition').focus();
    }

    removeMember(index) {
        this.currentMembers.splice(index, 1);
        this.renderMembersList();
    }

    renderMembersList() {
        const membersList = document.getElementById('membersList');
        if (!membersList) return;

        if (this.currentMembers.length === 0) {
            membersList.innerHTML = '<div class="members-empty">직원이 없습니다. 아래에서 추가해주세요.</div>';
            return;
        }

        membersList.innerHTML = this.currentMembers.map((member, index) => `
            <div class="member-list-item">
                <span class="member-info">
                    <strong>${this.escapeHtml(member.position)}</strong>
                    ${this.escapeHtml(member.name)}
                </span>
                <button type="button" class="btn-remove" onclick="window.orgChartApp.removeMember(${index})" title="삭제">×</button>
            </div>
        `).join('');
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const data = {
            deptName: document.getElementById('deptName').value.trim(),
            members: [...this.currentMembers] // 현재 편집 중인 직원 목록 사용
        };

        const mode = this.nodeForm.dataset.mode;

        if (mode === 'add') {
            const parentId = this.nodeForm.dataset.parentId || null;
            let x = 100, y = 100;

            if (parentId) {
                const parent = this.nodes.get(parentId);
                const siblings = this.getChildren(parentId);
                x = parent.x + siblings.length * 180;
                y = parent.y + 150;
            } else {
                // Find a good position for root node
                const rootNodes = Array.from(this.nodes.values()).filter(n => !n.parentId);
                x = 100 + rootNodes.length * 200;
                y = 100;
            }

            data.parentId = parentId;
            data.x = x;
            data.y = y;

            this.createNode(data);
        } else if (mode === 'edit') {
            const nodeId = this.nodeForm.dataset.nodeId;
            const node = this.nodes.get(nodeId);
            if (node) {
                node.deptName = data.deptName;
                node.members = data.members;
                this.updateNodeElement(node);
                this.saveToLocalStorage();
            }
        }

        this.hideModal();
    }

    // Context Menu
    showContextMenu(e, nodeId) {
        e.preventDefault();
        this.selectNode(nodeId);
        this.contextMenu.dataset.nodeId = nodeId;
        this.contextMenu.style.left = `${e.clientX}px`;
        this.contextMenu.style.top = `${e.clientY}px`;
        this.contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    handleContextMenuClick(e) {
        const action = e.target.dataset.action;
        const nodeId = this.contextMenu.dataset.nodeId;

        if (!action || !nodeId) return;

        switch (action) {
            case 'edit':
                this.editNode(nodeId);
                break;
            case 'addChild':
                this.showAddNodeModal(nodeId);
                break;
            case 'delete':
                if (confirm('이 부서와 모든 하위 부서를 삭제하시겠습니까?')) {
                    this.deleteNode(nodeId);
                }
                break;
        }

        this.hideContextMenu();
    }

    editNode(nodeId) {
        this.showEditNodeModal(nodeId);
    }

    // Global Event Handlers
    handleGlobalClick(e) {
        // Hide context menu on click outside
        if (!this.contextMenu.contains(e.target)) {
            this.hideContextMenu();
        }

        // Deselect node on click outside
        if (!e.target.closest('.org-node') && !e.target.closest('.modal') && !e.target.closest('.context-menu')) {
            this.deselectAll();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.hideModal();
            this.hideContextMenu();
            this.deselectAll();
        }

        if (e.key === 'Delete' && this.selectedNode && !this.nodeModal.classList.contains('hidden') === false) {
            if (document.activeElement.tagName !== 'INPUT') {
                if (confirm('이 부서와 모든 하위 부서를 삭제하시겠습니까?')) {
                    this.deleteNode(this.selectedNode);
                }
            }
        }
    }

    // Auto Layout
    autoLayout() {
        const rootNodes = Array.from(this.nodes.values()).filter(n => !n.parentId);
        if (rootNodes.length === 0) return;

        // Calculate tree structure
        const layoutTree = (node, level, offset) => {
            const children = this.getChildren(node.id);
            let totalWidth = 0;

            if (children.length === 0) {
                totalWidth = 180;
            } else {
                children.forEach(child => {
                    totalWidth += layoutTree(child, level + 1, offset + totalWidth);
                });
            }

            // Center this node above its children
            const nodeWidth = Math.max(totalWidth, 180);
            node.x = offset + nodeWidth / 2 - 75;
            node.y = 100 + level * 150;

            const element = document.getElementById(node.id);
            if (element) {
                element.style.left = `${node.x}px`;
                element.style.top = `${node.y}px`;
            }

            return nodeWidth;
        };

        let totalOffset = 100;
        rootNodes.forEach(root => {
            const width = layoutTree(root, 0, totalOffset);
            totalOffset += width + 50;
        });

        this.updateConnections();
        this.saveToLocalStorage();
    }

    // Data Persistence
    saveToLocalStorage() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            nextId: this.nextId
        };
        localStorage.setItem('orgChartData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('orgChartData');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            this.nextId = data.nextId || 1;

            // Clear existing
            this.orgChart.innerHTML = '';
            this.nodes.clear();

            // Recreate nodes
            data.nodes.forEach(nodeData => {
                // 기존 데이터 호환성: position/personName을 members 배열로 변환
                let members = nodeData.members || [];
                if (!members.length && (nodeData.position || nodeData.personName)) {
                    members = [{ position: nodeData.position || '', name: nodeData.personName || '' }];
                }

                const node = {
                    id: nodeData.id,
                    deptName: nodeData.deptName,
                    members: members,
                    parentId: nodeData.parentId,
                    x: nodeData.x,
                    y: nodeData.y
                };
                this.nodes.set(node.id, node);
                this.renderNode(node);
            });

            this.updateConnections();
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    }

    saveToFile() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            nextId: this.nextId
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `조직도_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    loadFromFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // Clear existing
                this.orgChart.innerHTML = '';
                this.nodes.clear();

                this.nextId = data.nextId || 1;

                // Recreate nodes
                data.nodes.forEach(nodeData => {
                    // 기존 데이터 호환성: position/personName을 members 배열로 변환
                    let members = nodeData.members || [];
                    if (!members.length && (nodeData.position || nodeData.personName)) {
                        members = [{ position: nodeData.position || '', name: nodeData.personName || '' }];
                    }

                    const node = {
                        id: nodeData.id,
                        deptName: nodeData.deptName,
                        members: members,
                        parentId: nodeData.parentId,
                        x: nodeData.x,
                        y: nodeData.y
                    };
                    this.nodes.set(node.id, node);
                    this.renderNode(node);
                });

                this.updateConnections();
                this.saveToLocalStorage();
                alert('데이터를 성공적으로 불러왔습니다.');
            } catch (err) {
                alert('파일을 불러오는데 실패했습니다. JSON 형식을 확인해주세요.');
                console.error(err);
            }
        };
        reader.readAsText(file);

        // Reset file input
        e.target.value = '';
    }

    async exportAsImage() {
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas 라이브러리를 불러오는 중 오류가 발생했습니다.');
            return;
        }

        try {
            // 임시로 선택 해제
            const wasSelected = this.selectedNode;
            this.deselectAll();

            // 캔버스 생성 (고해상도)
            const canvas = await html2canvas(this.orgChart, {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도
                logging: false,
                useCORS: true
            });

            // 선택 복구
            if (wasSelected) {
                this.selectNode(wasSelected);
            }

            // PNG로 변환
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `조직도_${new Date().toISOString().slice(0, 10)}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');

        } catch (error) {
            console.error('이미지 저장 오류:', error);
            alert('이미지 저장 중 오류가 발생했습니다.\n브라우저의 인쇄 기능(Ctrl+P)을 이용하거나\n스크린샷을 활용해주세요.');
        }
    }

    // Utility
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.orgChartApp = new OrgChartApp();
});
