// 조직도 생성기 애플리케이션
class OrgChartApp {
    constructor() {
        this.nodes = new Map();
        this.selectedNode = null;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.nextId = 1;
        this.currentMembers = []; // 모달에서 현재 편집 중인 직원 목록

        // 캔버스 패닝(이동) 관련
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        // 연결선 드래그 관련
        this.isDraggingConnection = false;
        this.connectionStart = null;
        this.tempLine = null;

        // Undo/Redo 관련
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50; // 최대 50개 히스토리 유지

        // 헤더 정보
        this.chartTitle = '용인대학교 교직원 배치표';
        this.chartDate = '2024. 2. 8. 현재';

        this.initElements();
        this.initEventListeners();
        this.loadFromLocalStorage();
        this.saveState(); // 초기 상태 저장
    }

    initElements() {
        this.orgChart = document.getElementById('orgChart');
        this.connections = document.getElementById('connections');
        this.canvasContainer = document.querySelector('.canvas-container');
        this.nodeModal = document.getElementById('nodeModal');
        this.nodeForm = document.getElementById('nodeForm');
        this.contextMenu = document.getElementById('contextMenu');
        this.modalTitle = document.getElementById('modalTitle');
        this.fileInput = document.getElementById('fileInput');
    }

    initEventListeners() {
        // Toolbar buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
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

        // Canvas panning (화면 이동)
        this.canvasContainer.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));

        // Chart header events
        document.getElementById('chartTitle').addEventListener('blur', (e) => {
            this.chartTitle = e.target.textContent;
            this.saveToLocalStorage();
        });
        document.getElementById('chartDate').addEventListener('blur', (e) => {
            this.chartDate = e.target.textContent;
            this.saveToLocalStorage();
        });
    }

    // Node Management
    createNode(data) {
        const id = `node-${this.nextId++}`;
        const node = {
            id,
            deptName: data.deptName || '새 부서',
            members: data.members || [], // 배열로 여러 직원 관리
            parentId: data.parentId || null,
            isIndependent: data.isIndependent || false, // 독립 노드 여부
            layoutDirection: data.layoutDirection || 'vertical', // 직원 목록 레이아웃 (vertical/horizontal)
            connectionStart: data.connectionStart || 'bottom', // 부모의 어느 점에서 시작 (top/bottom/left/right)
            connectionEnd: data.connectionEnd || 'top', // 이 노드의 어느 점으로 연결 (top/bottom/left/right)
            x: data.x || 100,
            y: data.y || 100
        };

        this.nodes.set(id, node);
        this.renderNode(node);
        this.updateConnections();
        this.saveState();
        this.saveToLocalStorage();

        return node;
    }

    renderNode(node) {
        const element = document.createElement('div');
        element.className = 'org-node';
        if (node.isIndependent) {
            element.classList.add('independent-node');
        }
        if (node.layoutDirection === 'horizontal') {
            element.classList.add('layout-horizontal');
        }
        element.id = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;

        // 여러 직원 목록 생성
        let bodyHtml = '';
        if (node.members && node.members.length > 0) {
            const membersHtml = node.members.map(member => `
                <div class="member-item">
                    <span class="member-position">${this.escapeHtml(member.position)}</span>
                    <span class="member-name">${this.escapeHtml(member.name)}</span>
                </div>
            `).join('');
            bodyHtml = `<div class="node-body">${membersHtml}</div>`;
        }
        // 직원이 없으면 node-body를 아예 렌더링하지 않음

        element.innerHTML = `
            <div class="node-header">${this.escapeHtml(node.deptName)}</div>
            ${bodyHtml}
            <div class="connection-anchor top" data-direction="top"></div>
            <div class="connection-anchor bottom" data-direction="bottom"></div>
            <div class="connection-anchor left" data-direction="left"></div>
            <div class="connection-anchor right" data-direction="right"></div>
        `;

        element.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, node.id));
        element.addEventListener('contextmenu', (e) => this.showContextMenu(e, node.id));
        element.addEventListener('dblclick', () => this.editNode(node.id));

        // 연결점 이벤트 리스너
        const anchors = element.querySelectorAll('.connection-anchor');
        anchors.forEach(anchor => {
            anchor.addEventListener('mousedown', (e) => this.handleAnchorMouseDown(e, node.id));
            // 연결점에서 우클릭 메뉴 방지
            anchor.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        this.orgChart.appendChild(element);
    }

    updateNodeElement(node) {
        const element = document.getElementById(node.id);
        if (!element) return;

        // 헤더 업데이트
        element.querySelector('.node-header').textContent = node.deptName;

        // 멤버 목록 업데이트
        let nodeBody = element.querySelector('.node-body');

        if (node.members && node.members.length > 0) {
            const membersHtml = node.members.map(member => `
                <div class="member-item">
                    <span class="member-position">${this.escapeHtml(member.position)}</span>
                    <span class="member-name">${this.escapeHtml(member.name)}</span>
                </div>
            `).join('');

            // node-body가 없으면 생성
            if (!nodeBody) {
                const header = element.querySelector('.node-header');
                header.insertAdjacentHTML('afterend', `<div class="node-body">${membersHtml}</div>`);
            } else {
                nodeBody.innerHTML = membersHtml;
            }
        } else {
            // 직원이 없으면 node-body 제거
            if (nodeBody) {
                nodeBody.remove();
            }
        }

        // 연결점이 없으면 추가 (업데이트 시 사라질 수 있음)
        if (!element.querySelector('.connection-anchor')) {
            const anchorsHtml = `
                <div class="connection-anchor top" data-direction="top"></div>
                <div class="connection-anchor bottom" data-direction="bottom"></div>
                <div class="connection-anchor left" data-direction="left"></div>
                <div class="connection-anchor right" data-direction="right"></div>
            `;
            element.insertAdjacentHTML('beforeend', anchorsHtml);

            // 연결점 이벤트 리스너 재등록
            const anchors = element.querySelectorAll('.connection-anchor');
            anchors.forEach(anchor => {
                anchor.addEventListener('mousedown', (e) => this.handleAnchorMouseDown(e, node.id));
                // 연결점에서 우클릭 메뉴 방지
                anchor.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
        }
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
        this.saveState();
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

    // Connection Anchor Drag (연결점 드래그)
    handleAnchorMouseDown(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();

        const direction = e.target.dataset.direction; // top, bottom, left, right

        this.isDraggingConnection = true;
        this.connectionStart = {
            nodeId: nodeId,
            direction: direction, // 시작점 방향 저장
            x: e.clientX + this.canvasContainer.scrollLeft,
            y: e.clientY + this.canvasContainer.scrollTop
        };

        // 임시 연결선 생성
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.tempLine.setAttribute('stroke', '#e74c3c');
        this.tempLine.setAttribute('stroke-width', '2');
        this.tempLine.setAttribute('stroke-dasharray', '5,5');
        this.tempLine.setAttribute('x1', this.connectionStart.x);
        this.tempLine.setAttribute('y1', this.connectionStart.y);
        this.tempLine.setAttribute('x2', this.connectionStart.x);
        this.tempLine.setAttribute('y2', this.connectionStart.y);
        this.connections.appendChild(this.tempLine);
    }

    // Canvas Panning (화면 이동)
    handleCanvasMouseDown(e) {
        // 노드를 클릭한 경우는 패닝하지 않음
        if (e.target.closest('.org-node')) return;

        // 좌클릭만 허용
        if (e.button !== 0) return;

        this.isPanning = true;
        this.panStart = {
            x: e.clientX - this.canvasContainer.scrollLeft,
            y: e.clientY - this.canvasContainer.scrollTop
        };
        this.canvasContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }

    // Drag and Drop
    handleNodeMouseDown(e, nodeId) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        e.stopPropagation(); // 캔버스 패닝 방지

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
        // 연결선 드래그 처리
        if (this.isDraggingConnection && this.tempLine) {
            const x = e.clientX + this.canvasContainer.scrollLeft;
            const y = e.clientY + this.canvasContainer.scrollTop;
            this.tempLine.setAttribute('x2', x);
            this.tempLine.setAttribute('y2', y);
            return;
        }

        // 캔버스 패닝 처리
        if (this.isPanning) {
            const x = e.clientX - this.panStart.x;
            const y = e.clientY - this.panStart.y;
            this.canvasContainer.scrollLeft = -x;
            this.canvasContainer.scrollTop = -y;
            return;
        }

        // 노드 드래그 처리
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
        // 연결선 드래그 종료
        if (this.isDraggingConnection) {
            // 임시 선 제거
            if (this.tempLine) {
                this.tempLine.remove();
                this.tempLine = null;
            }

            // 타겟 앵커 또는 노드 찾기
            const targetAnchor = e.target.closest('.connection-anchor');
            const targetNode = e.target.closest('.org-node');

            if (targetNode && targetNode.id !== this.connectionStart.nodeId) {
                const targetNodeId = targetNode.id;
                const sourceNodeId = this.connectionStart.nodeId;

                // 연결 종료 방향 결정
                let endDirection = 'top'; // 기본값
                if (targetAnchor && targetAnchor.dataset.direction) {
                    endDirection = targetAnchor.dataset.direction;
                }

                // 연결 생성: 타겟 노드의 부모를 소스 노드로 설정
                const node = this.nodes.get(targetNodeId);
                if (node) {
                    node.parentId = sourceNodeId;
                    node.connectionStart = this.connectionStart.direction; // 소스의 앵커 방향
                    node.connectionEnd = endDirection; // 타겟의 앵커 방향
                    this.updateConnections();
                    this.saveState();
                    this.saveToLocalStorage();
                }
            }

            this.isDraggingConnection = false;
            this.connectionStart = null;
            return;
        }

        // 캔버스 패닝 종료
        if (this.isPanning) {
            this.isPanning = false;
            this.canvasContainer.style.cursor = 'default';
        }

        // 노드 드래그 종료
        if (!this.draggedNode) return;

        const element = document.getElementById(this.draggedNode.id);
        element.classList.remove('dragging');

        this.draggedNode = null;
        this.saveState();
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
            // 독립 노드는 연결선을 그리지 않음
            if (node.isIndependent) return;

            if (node.parentId && this.nodes.has(node.parentId)) {
                const parent = this.nodes.get(node.parentId);
                // 부모가 독립 노드인 경우도 연결선을 그리지 않음
                if (parent.isIndependent) return;

                this.drawConnection(parent, node);
            }
        });
    }

    // 앵커 포인트 좌표 계산 헬퍼 함수
    getAnchorPoint(node, direction) {
        const element = document.getElementById(node.id);
        if (!element) return { x: node.x, y: node.y };

        const width = element.offsetWidth;
        const height = element.offsetHeight;

        switch (direction) {
            case 'top':
                return { x: node.x + width / 2, y: node.y };
            case 'bottom':
                return { x: node.x + width / 2, y: node.y + height };
            case 'left':
                return { x: node.x, y: node.y + height / 2 };
            case 'right':
                return { x: node.x + width, y: node.y + height / 2 };
            default:
                return { x: node.x + width / 2, y: node.y };
        }
    }

    drawConnection(parent, child) {
        const parentEl = document.getElementById(parent.id);
        const childEl = document.getElementById(child.id);

        if (!parentEl || !childEl) return;

        // connectionStart는 부모의 앵커, connectionEnd는 자식의 앵커
        const startDirection = child.connectionStart || 'bottom';
        const endDirection = child.connectionEnd || 'top';

        const startPoint = this.getAnchorPoint(parent, startDirection);
        const endPoint = this.getAnchorPoint(child, endDirection);

        // 중간점을 계산하여 경로 생성
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // 방향에 따라 다른 경로 패턴 사용
        let d;
        if ((startDirection === 'top' || startDirection === 'bottom') &&
            (endDirection === 'top' || endDirection === 'bottom')) {
            // 수직-수평-수직 패턴
            const midY = (startPoint.y + endPoint.y) / 2;
            d = `M ${startPoint.x} ${startPoint.y}
                 L ${startPoint.x} ${midY}
                 L ${endPoint.x} ${midY}
                 L ${endPoint.x} ${endPoint.y}`;
        } else if ((startDirection === 'left' || startDirection === 'right') &&
                   (endDirection === 'left' || endDirection === 'right')) {
            // 수평-수직-수평 패턴
            const midX = (startPoint.x + endPoint.x) / 2;
            d = `M ${startPoint.x} ${startPoint.y}
                 L ${midX} ${startPoint.y}
                 L ${midX} ${endPoint.y}
                 L ${endPoint.x} ${endPoint.y}`;
        } else {
            // 혼합 패턴 (수직+수평 조합)
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            d = `M ${startPoint.x} ${startPoint.y}
                 L ${midX} ${midY}
                 L ${endPoint.x} ${endPoint.y}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-line');

        this.connections.appendChild(path);
    }

    // Modal
    showAddNodeModal(parentId = null) {
        this.modalTitle.textContent = parentId ? '하위 부서 추가' : '최상위 부서 추가';
        this.nodeForm.reset();
        document.getElementById('isIndependent').checked = false;
        this.nodeForm.dataset.mode = 'add';
        this.nodeForm.dataset.parentId = parentId || '';
        this.currentMembers = [];
        this.renderMembersList();
        this.nodeModal.classList.remove('hidden');
        document.getElementById('deptName').focus();
    }

    showAddChildModal(nodeId) {
        this.modalTitle.textContent = '하위 부서 추가';
        this.nodeForm.reset();
        document.getElementById('isIndependent').checked = false;
        this.nodeForm.dataset.mode = 'add-child';
        this.nodeForm.dataset.parentNodeId = nodeId;
        this.currentMembers = [];
        this.renderMembersList();
        this.nodeModal.classList.remove('hidden');
        document.getElementById('deptName').focus();
    }

    showAddSiblingModal(nodeId) {
        const node = this.nodes.get(nodeId);
        this.modalTitle.textContent = '형제 부서 추가';
        this.nodeForm.reset();
        document.getElementById('isIndependent').checked = false;
        this.nodeForm.dataset.mode = 'add-sibling';
        this.nodeForm.dataset.siblingNodeId = nodeId;
        this.nodeForm.dataset.parentId = node.parentId || '';
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
        document.getElementById('isIndependent').checked = node.isIndependent || false;

        // 레이아웃 방향 설정
        const layoutDirection = node.layoutDirection || 'vertical';
        const layoutRadio = document.querySelector(`input[name="layoutDirection"][value="${layoutDirection}"]`);
        if (layoutRadio) layoutRadio.checked = true;

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

        const layoutRadio = document.querySelector('input[name="layoutDirection"]:checked');
        const layoutDirection = layoutRadio ? layoutRadio.value : 'vertical';

        const data = {
            deptName: document.getElementById('deptName').value.trim(),
            members: [...this.currentMembers], // 현재 편집 중인 직원 목록 사용
            isIndependent: document.getElementById('isIndependent').checked,
            layoutDirection: layoutDirection
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
        } else if (mode === 'add-child') {
            // 하위 부서 추가: 부모의 바로 아래 중앙에 배치
            const parentId = this.nodeForm.dataset.parentNodeId;
            const parent = this.nodes.get(parentId);
            const siblings = this.getChildren(parentId);

            // 부모 아래 중앙에 배치
            let x = parent.x;
            let y = parent.y + 150;

            // 이미 자식이 있으면 옆으로 배치
            if (siblings.length > 0) {
                x = parent.x + siblings.length * 200;
            }

            data.parentId = parentId;
            data.x = x;
            data.y = y;

            this.createNode(data);
        } else if (mode === 'add-sibling') {
            // 형제 부서 추가: 같은 레벨 옆에 배치
            const siblingId = this.nodeForm.dataset.siblingNodeId;
            const sibling = this.nodes.get(siblingId);
            const parentId = sibling.parentId;

            let x, y;
            if (parentId) {
                // 부모가 있는 경우
                const parent = this.nodes.get(parentId);
                const siblings = this.getChildren(parentId);
                x = parent.x + siblings.length * 200;
                y = parent.y + 150;
            } else {
                // 최상위 노드인 경우
                const rootNodes = Array.from(this.nodes.values()).filter(n => !n.parentId);
                x = sibling.x + 250;
                y = sibling.y;
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
                node.isIndependent = data.isIndependent;
                node.layoutDirection = data.layoutDirection;

                // 요소 클래스 업데이트
                const element = document.getElementById(nodeId);
                if (element) {
                    // 독립 노드 클래스
                    if (node.isIndependent) {
                        element.classList.add('independent-node');
                    } else {
                        element.classList.remove('independent-node');
                    }

                    // 레이아웃 방향 클래스
                    if (node.layoutDirection === 'horizontal') {
                        element.classList.add('layout-horizontal');
                    } else {
                        element.classList.remove('layout-horizontal');
                    }
                }

                this.updateNodeElement(node);
                this.updateConnections(); // 연결선 다시 그리기
                this.saveState();
                this.saveToLocalStorage();
            }
        }

        this.hideModal();
    }

    // Context Menu
    showContextMenu(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();

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
                this.showAddChildModal(nodeId);
                break;
            case 'addSibling':
                this.showAddSiblingModal(nodeId);
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
        // Undo/Redo 단축키
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
            return;
        }

        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.redo();
            return;
        }

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

    // Undo/Redo Functions
    saveState() {
        const state = {
            nodes: Array.from(this.nodes.values()).map(node => ({...node})),
            nextId: this.nextId
        };

        // 새 상태를 저장할 때 redoStack 초기화
        this.redoStack = [];

        // undoStack에 현재 상태 추가
        this.undoStack.push(JSON.parse(JSON.stringify(state)));

        // 최대 크기 유지
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length <= 1) {
            console.log('더 이상 되돌릴 수 없습니다.');
            return;
        }

        // 현재 상태를 redoStack에 저장
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // 이전 상태 복원
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.restoreState(previousState);

        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.redoStack.length === 0) {
            console.log('더 이상 다시 실행할 수 없습니다.');
            return;
        }

        // redoStack에서 상태 가져오기
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);

        this.restoreState(nextState);
        this.updateUndoRedoButtons();
    }

    restoreState(state) {
        // 기존 노드 모두 제거
        this.orgChart.innerHTML = '';
        this.nodes.clear();

        // 상태 복원
        this.nextId = state.nextId;

        state.nodes.forEach(nodeData => {
            const node = {...nodeData};
            this.nodes.set(node.id, node);
            this.renderNode(node);
        });

        this.updateConnections();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
        }

        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
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
        this.saveState();
        this.saveToLocalStorage();
    }

    // Data Persistence
    saveToLocalStorage() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            nextId: this.nextId,
            chartTitle: this.chartTitle,
            chartDate: this.chartDate
        };
        localStorage.setItem('orgChartData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('orgChartData');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            this.nextId = data.nextId || 1;

            // 헤더 정보 복원
            if (data.chartTitle) {
                this.chartTitle = data.chartTitle;
                document.getElementById('chartTitle').textContent = data.chartTitle;
            }
            if (data.chartDate) {
                this.chartDate = data.chartDate;
                document.getElementById('chartDate').textContent = data.chartDate;
            }

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
                    isIndependent: nodeData.isIndependent || false,
                    layoutDirection: nodeData.layoutDirection || 'vertical',
                    connectionStart: nodeData.connectionStart || 'bottom',
                    connectionEnd: nodeData.connectionEnd || 'top',
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
            nextId: this.nextId,
            chartTitle: this.chartTitle,
            chartDate: this.chartDate
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

                // 헤더 정보 복원
                if (data.chartTitle) {
                    this.chartTitle = data.chartTitle;
                    document.getElementById('chartTitle').textContent = data.chartTitle;
                }
                if (data.chartDate) {
                    this.chartDate = data.chartDate;
                    document.getElementById('chartDate').textContent = data.chartDate;
                }

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
                        isIndependent: nodeData.isIndependent || false,
                        layoutDirection: nodeData.layoutDirection || 'vertical',
                        connectionStart: nodeData.connectionStart || 'bottom',
                        connectionEnd: nodeData.connectionEnd || 'top',
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
