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
        this.chartTitlePos = { x: 100, y: 20 };
        this.chartDatePos = { x: null, y: 20 }; // x는 right 기준이므로 null

        // 헤더 드래그 관련
        this.draggedHeader = null;
        this.headerDragOffset = { x: 0, y: 0 };

        // 영역 선택 관련
        this.isSelectionMode = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionBox = null;
        this.selectedNodes = new Set(); // 선택된 노드 ID들
        this.nodeGroups = []; // 노드 그룹들
        this.nextGroupId = 1;

        // 노드 간격 설정
        this.horizontalSpacing = 85; // 수평 간격 (형제 노드)
        this.verticalSpacing = 75; // 수직 간격 (부모-자식)
        this.memberGap = 4; // 직원 항목 간격 (위아래)

        // 버전 관리
        this.versions = []; // 저장된 버전 목록
        this.nextVersionId = 1;

        // 화면 줌
        this.zoomLevel = 1; // 100%
        this.minZoom = 0.25; // 25%
        this.maxZoom = 2; // 200%

        // 그리드 스냅
        this.gridSize = 10; // 10px 그리드
        this.snapToGrid = true; // 그리드 스냅 활성화

        // 충돌 감지
        this.enableCollisionDetection = true; // 충돌 감지 활성화
        this.collisionPadding = 2; // 노드 간 최소 간격 (px) - 극도로 가깝게

        this.initElements();
        this.ensureSVG(); // SVG 요소 확인 및 생성
        this.initEventListeners();
        this.loadVersionsFromLocalStorage();
        this.loadFromLocalStorage();
        this.applyMemberGap(); // 교직원 간격 초기 적용
        this.saveState(); // 초기 상태 저장
    }

    initElements() {
        this.orgChart = document.getElementById('orgChart');
        this.connections = document.getElementById('connections');
        this.canvasContainer = document.querySelector('.canvas-container');
        this.nodeModal = document.getElementById('nodeModal');
        this.nodeForm = document.getElementById('nodeForm');
        this.spacingModal = document.getElementById('spacingModal');
        this.spacingForm = document.getElementById('spacingForm');
        this.positionModal = document.getElementById('positionModal');
        this.positionForm = document.getElementById('positionForm');
        this.versionModal = document.getElementById('versionModal');
        this.contextMenu = document.getElementById('contextMenu');
        this.modalTitle = document.getElementById('modalTitle');
        this.fileInput = document.getElementById('fileInput');
    }

    initEventListeners() {
        // Toolbar buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetToSample());
        document.getElementById('addRootBtn').addEventListener('click', () => this.showAddNodeModal());
        document.getElementById('autoLayoutBtn').addEventListener('click', () => this.autoLayout());
        document.getElementById('groupSelectionBtn').addEventListener('click', () => this.toggleSelectionMode());
        document.getElementById('spacingSettingsBtn').addEventListener('click', () => this.showSpacingModal());
        document.getElementById('versionBtn').addEventListener('click', () => this.showVersionModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportAsImage());
        document.getElementById('saveDataBtn').addEventListener('click', () => this.saveToFile());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.fileInput.click());

        // File input
        this.fileInput.addEventListener('change', (e) => this.loadFromFile(e));

        // Modal events
        this.nodeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('addMemberBtn').addEventListener('click', () => this.addMember());

        // Spacing modal events
        this.spacingForm.addEventListener('submit', (e) => this.handleSpacingFormSubmit(e));
        document.getElementById('cancelSpacingBtn').addEventListener('click', () => this.hideSpacingModal());

        // Position modal events
        this.positionForm.addEventListener('submit', (e) => this.handlePositionFormSubmit(e));
        document.getElementById('cancelPositionBtn').addEventListener('click', () => this.hidePositionModal());

        // Version modal events
        document.getElementById('saveVersionBtn').addEventListener('click', () => this.saveCurrentVersion());
        document.getElementById('closeVersionBtn').addEventListener('click', () => this.hideVersionModal());

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.zoomReset());

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

        // Mouse wheel zoom
        this.canvasContainer.addEventListener('wheel', (e) => this.handleMouseWheel(e));

        // Chart header events
        const chartTitleEl = document.getElementById('chartTitle');
        const chartDateEl = document.getElementById('chartDate');

        chartTitleEl.addEventListener('mousedown', (e) => this.handleHeaderMouseDown(e, 'title'));
        chartTitleEl.addEventListener('dblclick', (e) => this.handleHeaderDoubleClick(e, chartTitleEl));
        chartTitleEl.addEventListener('contextmenu', (e) => e.preventDefault());
        chartTitleEl.addEventListener('blur', (e) => {
            this.chartTitle = e.target.textContent;
            e.target.setAttribute('contenteditable', 'false');
            e.target.classList.remove('editing');
            this.saveToLocalStorage();
        });

        chartDateEl.addEventListener('mousedown', (e) => this.handleHeaderMouseDown(e, 'date'));
        chartDateEl.addEventListener('dblclick', (e) => this.handleHeaderDoubleClick(e, chartDateEl));
        chartDateEl.addEventListener('contextmenu', (e) => e.preventDefault());
        chartDateEl.addEventListener('blur', (e) => {
            this.chartDate = e.target.textContent;
            e.target.setAttribute('contenteditable', 'false');
            e.target.classList.remove('editing');
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
            locked: data.locked || false, // 위치 고정 여부
            connectionStart: data.connectionStart || 'bottom', // 부모의 어느 점에서 시작 (top/bottom/left/right)
            connectionEnd: data.connectionEnd || 'top', // 이 노드의 어느 점으로 연결 (top/bottom/left/right)
            x: data.x || 100,
            y: data.y || 100
        };

        this.nodes.set(id, node);
        this.renderNode(node);

        // 충돌 감지 및 위치 조정
        const resolvedPos = this.resolveCollision(id, node.x, node.y);
        if (resolvedPos.x !== node.x || resolvedPos.y !== node.y) {
            node.x = resolvedPos.x;
            node.y = resolvedPos.y;
            const element = document.getElementById(id);
            if (element) {
                element.style.left = `${node.x}px`;
                element.style.top = `${node.y}px`;
            }
        }

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
        if (node.locked) {
            element.classList.add('locked');
        }
        element.id = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;

        // 여러 직원 목록 생성
        let bodyHtml = '';
        const hasMembers = node.members && node.members.length > 0;
        if (hasMembers) {
            const membersHtml = node.members.map(member => `
                <div class="member-item">
                    <span class="member-position">${this.escapeHtml(member.position)}</span>
                    <span class="member-name">${this.escapeHtml(member.name)}</span>
                </div>
            `).join('');
            bodyHtml = `<div class="node-body">${membersHtml}</div>`;
        } else {
            // 직원이 없는 노드에 클래스 추가
            element.classList.add('no-members');
        }
        // 직원이 없으면 node-body를 아예 렌더링하지 않음

        element.innerHTML = `
            <div class="node-header">${this.escapeHtml(node.deptName)}</div>
            ${bodyHtml}
            <div class="quick-copy-buttons">
                <button class="quick-copy-btn quick-copy-top" data-direction="top" title="위로 복사">↑</button>
                <button class="quick-copy-btn quick-copy-right" data-direction="right" title="오른쪽으로 복사">→</button>
                <button class="quick-copy-btn quick-copy-bottom" data-direction="bottom" title="아래로 복사">↓</button>
                <button class="quick-copy-btn quick-copy-left" data-direction="left" title="왼쪽으로 복사">←</button>
            </div>
        `;

        element.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, node.id));
        element.addEventListener('contextmenu', (e) => this.showContextMenu(e, node.id));
        element.addEventListener('dblclick', () => this.editNode(node.id));

        // 빠른 복사 버튼 이벤트
        element.querySelectorAll('.quick-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.quickCopyNode(node.id, btn.dataset.direction);
            });
        });

        this.orgChart.appendChild(element);
    }

    updateNodeElement(node) {
        const element = document.getElementById(node.id);
        if (!element) return;

        // 헤더 업데이트
        element.querySelector('.node-header').textContent = node.deptName;

        // 레이아웃 방향 클래스 업데이트
        if (node.layoutDirection === 'horizontal') {
            element.classList.add('layout-horizontal');
        } else {
            element.classList.remove('layout-horizontal');
        }

        // 독립 노드 클래스 업데이트
        if (node.isIndependent) {
            element.classList.add('independent-node');
        } else {
            element.classList.remove('independent-node');
        }

        // 멤버 목록 업데이트
        let nodeBody = element.querySelector('.node-body');
        const hasMembers = node.members && node.members.length > 0;

        if (hasMembers) {
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
            // no-members 클래스 제거
            element.classList.remove('no-members');
        } else {
            // 직원이 없으면 node-body 제거
            if (nodeBody) {
                nodeBody.remove();
            }
            // no-members 클래스 추가
            element.classList.add('no-members');
        }
    }

    deleteNode(nodeId) {
        const nodeToDelete = this.nodes.get(nodeId);
        if (!nodeToDelete) return;

        // 자식 노드들의 위계 조정: 삭제되는 노드의 부모를 자식들의 새 부모로 설정
        const children = this.getChildren(nodeId);
        const newParentId = nodeToDelete.parentId; // 삭제되는 노드의 부모

        children.forEach(child => {
            child.parentId = newParentId; // 위계를 한 단계 올림
            this.updateNodeElement(child); // UI 업데이트
        });

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

    clearChart() {
        // 노드만 삭제하고 SVG는 유지
        const nodes = this.orgChart.querySelectorAll('.org-node');
        nodes.forEach(node => node.remove());

        // 연결선 초기화
        if (this.connections) {
            this.connections.innerHTML = '';
        }

        this.nodes.clear();
    }

    ensureSVG() {
        // SVG가 없으면 다시 생성
        if (!this.connections || !document.getElementById('connections')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'connections';
            this.orgChart.insertBefore(svg, this.orgChart.firstChild);
            this.connections = svg;
        }
    }

    // Connection Anchor Drag (연결점 드래그)
    handleAnchorMouseDown(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();

        const direction = e.target.dataset.direction; // top, bottom, left, right
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // 앵커의 실제 중심 위치 계산
        const anchorPoint = this.getAnchorPoint(node, direction);

        this.isDraggingConnection = true;
        this.connectionStart = {
            nodeId: nodeId,
            direction: direction, // 시작점 방향 저장
            x: anchorPoint.x,
            y: anchorPoint.y
        };

        // 임시 연결선 생성
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.tempLine.setAttribute('stroke', '#e74c3c');
        this.tempLine.setAttribute('stroke-width', '2');
        this.tempLine.setAttribute('stroke-dasharray', '5,5');
        this.tempLine.setAttribute('x1', anchorPoint.x);
        this.tempLine.setAttribute('y1', anchorPoint.y);
        this.tempLine.setAttribute('x2', anchorPoint.x);
        this.tempLine.setAttribute('y2', anchorPoint.y);
        this.connections.appendChild(this.tempLine);
    }

    // Header Drag (헤더 드래그)
    handleHeaderMouseDown(e, type) {
        // 우클릭은 무시
        if (e.button !== 0) {
            e.preventDefault();
            return;
        }

        // 편집 중이면 드래그하지 않음
        if (e.target.classList.contains('editing')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const element = e.target;
        const rect = element.getBoundingClientRect();

        this.draggedHeader = {
            type: type,
            element: element,
            isRight: type === 'date' // date는 right 기준
        };

        this.headerDragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleHeaderDoubleClick(e, element) {
        e.preventDefault();
        e.stopPropagation();

        // 편집 모드 활성화
        element.setAttribute('contenteditable', 'true');
        element.classList.add('editing');
        element.focus();

        // 텍스트 전체 선택
        const range = document.createRange();
        range.selectNodeContents(element);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // Selection Mode (영역 선택 모드)
    toggleSelectionMode() {
        this.isSelectionMode = !this.isSelectionMode;
        const btn = document.getElementById('groupSelectionBtn');

        if (this.isSelectionMode) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
            btn.textContent = '영역 선택 중...';
            this.canvasContainer.style.cursor = 'crosshair';
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            btn.textContent = '영역 선택';
            this.canvasContainer.style.cursor = 'default';
        }
    }

    // Canvas Panning (화면 이동)
    handleCanvasMouseDown(e) {
        // 노드를 클릭한 경우는 패닝하지 않음
        if (e.target.closest('.org-node')) return;

        // 헤더 요소를 클릭한 경우는 패닝하지 않음
        if (e.target.closest('.chart-title') || e.target.closest('.chart-date')) return;

        // 좌클릭만 허용
        if (e.button !== 0) return;

        // 영역 선택 모드인 경우
        if (this.isSelectionMode) {
            this.startSelection(e);
            return;
        }

        this.isPanning = true;
        this.panStart = {
            x: e.clientX + this.canvasContainer.scrollLeft,
            y: e.clientY + this.canvasContainer.scrollTop
        };
        this.canvasContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }

    // Area Selection (영역 선택)
    startSelection(e) {
        this.isSelecting = true;
        const rect = this.orgChart.getBoundingClientRect();

        this.selectionStart = {
            x: e.clientX - rect.left + this.canvasContainer.scrollLeft,
            y: e.clientY - rect.top + this.canvasContainer.scrollTop
        };

        // 선택 박스 생성
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = `${this.selectionStart.x}px`;
        this.selectionBox.style.top = `${this.selectionStart.y}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        this.orgChart.appendChild(this.selectionBox);
    }

    finishSelection() {
        if (!this.selectionBox) return;

        // 선택 영역 계산
        const boxRect = {
            left: parseFloat(this.selectionBox.style.left),
            top: parseFloat(this.selectionBox.style.top),
            width: parseFloat(this.selectionBox.style.width),
            height: parseFloat(this.selectionBox.style.height)
        };
        boxRect.right = boxRect.left + boxRect.width;
        boxRect.bottom = boxRect.top + boxRect.height;

        // 영역 내의 노드들 찾기
        const selectedNodes = [];
        this.nodes.forEach(node => {
            const element = document.getElementById(node.id);
            if (!element) return;

            const nodeRect = {
                left: node.x,
                top: node.y,
                width: element.offsetWidth,
                height: element.offsetHeight
            };
            nodeRect.right = nodeRect.left + nodeRect.width;
            nodeRect.bottom = nodeRect.top + nodeRect.height;

            // 겹치는지 확인
            if (boxRect.left < nodeRect.right &&
                boxRect.right > nodeRect.left &&
                boxRect.top < nodeRect.bottom &&
                boxRect.bottom > nodeRect.top) {
                selectedNodes.push(node.id);
            }
        });

        // 선택 박스 제거
        this.selectionBox.remove();
        this.selectionBox = null;
        this.isSelecting = false;

        // 선택된 노드들 저장 및 표시
        this.selectedNodes.clear();
        selectedNodes.forEach(nodeId => {
            this.selectedNodes.add(nodeId);
            const element = document.getElementById(nodeId);
            if (element) {
                element.classList.add('multi-selected');
            }
        });

        if (selectedNodes.length > 0) {
            console.log(`${selectedNodes.length}개 노드가 선택되었습니다. 드래그하여 함께 이동할 수 있습니다.`);

            // 2개 이상 선택된 경우 그룹 생성 제안
            if (selectedNodes.length >= 2) {
                const createGroup = confirm(
                    `${selectedNodes.length}개의 노드가 선택되었습니다.\n\n` +
                    `그룹으로 묶으시겠습니까?\n` +
                    `(그룹으로 묶으면 자동 배치 시 간격이 유지되며, 함께 이동할 수 있습니다)`
                );

                if (createGroup) {
                    this.createGroup(selectedNodes);
                    // 그룹 생성 후 다중 선택 해제
                    this.selectedNodes.forEach(nodeId => {
                        const element = document.getElementById(nodeId);
                        if (element) {
                            element.classList.remove('multi-selected');
                        }
                    });
                    this.selectedNodes.clear();
                }
            }
        }

        // 선택 모드 종료
        this.toggleSelectionMode();
    }

    createGroup(nodeIds) {
        const groupId = `group-${this.nextGroupId++}`;

        // 그룹 내 노드들의 상대적 위치 계산
        const nodePositions = nodeIds.map(nodeId => {
            const node = this.nodes.get(nodeId);
            return { nodeId, x: node.x, y: node.y };
        });

        // 기준점 계산 (첫 번째 노드)
        const baseNode = nodePositions[0];
        const relativePositions = nodePositions.map(pos => ({
            nodeId: pos.nodeId,
            offsetX: pos.x - baseNode.x,
            offsetY: pos.y - baseNode.y
        }));

        const group = {
            id: groupId,
            nodeIds: nodeIds,
            relativePositions: relativePositions,
            baseNodeId: baseNode.nodeId
        };

        this.nodeGroups.push(group);

        // 노드에 그룹 표시
        nodeIds.forEach(nodeId => {
            const element = document.getElementById(nodeId);
            if (element) {
                element.classList.add('in-group');
                element.dataset.groupId = groupId;
            }
        });

        this.saveToLocalStorage();
        alert(`${nodeIds.length}개의 노드로 그룹이 생성되었습니다. 자동 배치 시 간격이 유지됩니다.`);
    }

    removeGroup(groupId) {
        const groupIndex = this.nodeGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const group = this.nodeGroups[groupIndex];

        // 노드에서 그룹 표시 제거
        group.nodeIds.forEach(nodeId => {
            const element = document.getElementById(nodeId);
            if (element) {
                element.classList.remove('in-group');
                delete element.dataset.groupId;
            }
        });

        this.nodeGroups.splice(groupIndex, 1);
        this.saveToLocalStorage();
    }

    // Collision Detection
    getNodeBounds(node) {
        const element = document.getElementById(node.id);
        if (!element) return null;

        return {
            left: node.x - this.collisionPadding,
            right: node.x + element.offsetWidth + this.collisionPadding,
            top: node.y - this.collisionPadding,
            bottom: node.y + element.offsetHeight + this.collisionPadding
        };
    }

    checkCollision(nodeA, nodeB) {
        const boundsA = this.getNodeBounds(nodeA);
        const boundsB = this.getNodeBounds(nodeB);

        if (!boundsA || !boundsB) return false;

        return !(boundsA.right < boundsB.left ||
                 boundsA.left > boundsB.right ||
                 boundsA.bottom < boundsB.top ||
                 boundsA.top > boundsB.bottom);
    }

    findCollisions(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (!node) return [];

        const element = document.getElementById(nodeId);
        if (!element) return [];

        // 테스트용 임시 bounds 계산
        const testBounds = {
            left: x - this.collisionPadding,
            right: x + element.offsetWidth + this.collisionPadding,
            top: y - this.collisionPadding,
            bottom: y + element.offsetHeight + this.collisionPadding
        };

        const collisions = [];

        this.nodes.forEach((otherNode, otherId) => {
            if (otherId === nodeId) return;

            const otherBounds = this.getNodeBounds(otherNode);
            if (!otherBounds) return;

            if (!(testBounds.right < otherBounds.left ||
                  testBounds.left > otherBounds.right ||
                  testBounds.bottom < otherBounds.top ||
                  testBounds.top > otherBounds.bottom)) {
                collisions.push(otherNode);
            }
        });

        return collisions;
    }

    resolveCollision(nodeId, proposedX, proposedY) {
        if (!this.enableCollisionDetection) {
            return { x: proposedX, y: proposedY };
        }

        const collisions = this.findCollisions(nodeId, proposedX, proposedY);

        if (collisions.length === 0) {
            return { x: proposedX, y: proposedY };
        }

        // 충돌이 있는 경우, 가장 가까운 충돌 없는 위치 찾기
        const node = this.nodes.get(nodeId);
        const element = document.getElementById(nodeId);
        if (!node || !element) return { x: proposedX, y: proposedY };

        // 여러 방향으로 시도
        const directions = [
            { dx: 0, dy: -1 }, // 위
            { dx: 0, dy: 1 },  // 아래
            { dx: -1, dy: 0 }, // 왼쪽
            { dx: 1, dy: 0 },  // 오른쪽
            { dx: -1, dy: -1 }, // 왼쪽 위
            { dx: 1, dy: -1 },  // 오른쪽 위
            { dx: -1, dy: 1 },  // 왼쪽 아래
            { dx: 1, dy: 1 }    // 오른쪽 아래
        ];

        const step = this.gridSize; // 그리드 크기만큼 이동
        const maxAttempts = 20; // 최대 시도 횟수

        for (let distance = step; distance <= step * maxAttempts; distance += step) {
            for (const dir of directions) {
                const testX = proposedX + (dir.dx * distance);
                const testY = proposedY + (dir.dy * distance);

                if (testX < 0 || testY < 0) continue; // 캔버스 밖은 제외

                const testCollisions = this.findCollisions(nodeId, testX, testY);
                if (testCollisions.length === 0) {
                    return { x: testX, y: testY };
                }
            }
        }

        // 충돌을 해결할 수 없는 경우, 사용자가 드래그한 위치 유지
        return { x: proposedX, y: proposedY };
    }

    // Drag and Drop
    handleNodeMouseDown(e, nodeId) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        e.stopPropagation(); // 캔버스 패닝 방지

        const node = this.nodes.get(nodeId);
        const element = document.getElementById(nodeId);
        const containerRect = this.canvasContainer.getBoundingClientRect();

        this.draggedNode = node;
        // 줌과 스크롤을 고려한 오프셋 계산
        const clickX = (e.clientX - containerRect.left + this.canvasContainer.scrollLeft) / this.zoomLevel;
        const clickY = (e.clientY - containerRect.top + this.canvasContainer.scrollTop) / this.zoomLevel;

        this.dragOffset = {
            x: clickX - node.x,
            y: clickY - node.y
        };

        element.classList.add('dragging');
        this.selectNode(nodeId);
    }

    handleMouseMove(e) {
        // 영역 선택 드래그 처리
        if (this.isSelecting && this.selectionBox) {
            const rect = this.orgChart.getBoundingClientRect();
            const currentX = e.clientX - rect.left + this.canvasContainer.scrollLeft;
            const currentY = e.clientY - rect.top + this.canvasContainer.scrollTop;

            const left = Math.min(this.selectionStart.x, currentX);
            const top = Math.min(this.selectionStart.y, currentY);
            const width = Math.abs(currentX - this.selectionStart.x);
            const height = Math.abs(currentY - this.selectionStart.y);

            this.selectionBox.style.left = `${left}px`;
            this.selectionBox.style.top = `${top}px`;
            this.selectionBox.style.width = `${width}px`;
            this.selectionBox.style.height = `${height}px`;
            return;
        }

        // 헤더 드래그 처리
        if (this.draggedHeader) {
            const containerRect = this.canvasContainer.getBoundingClientRect();

            // 스크롤과 줌 레벨을 고려한 실제 위치 계산
            const newX = (e.clientX - containerRect.left + this.canvasContainer.scrollLeft) / this.zoomLevel - this.headerDragOffset.x;
            const newY = (e.clientY - containerRect.top + this.canvasContainer.scrollTop) / this.zoomLevel - this.headerDragOffset.y;

            if (this.draggedHeader.isRight) {
                // date는 right 기준
                const containerWidth = this.orgChart.offsetWidth;
                const elementWidth = this.draggedHeader.element.offsetWidth;
                const rightPos = containerWidth - newX - elementWidth;
                this.draggedHeader.element.style.right = `${Math.max(0, rightPos)}px`;
                this.draggedHeader.element.style.left = 'auto';
                this.chartDatePos.x = rightPos;
            } else {
                // title은 left 기준
                this.draggedHeader.element.style.left = `${Math.max(0, newX)}px`;
                this.draggedHeader.element.style.right = 'auto';
                this.chartTitlePos.x = newX;
            }

            this.draggedHeader.element.style.top = `${Math.max(0, newY)}px`;

            if (this.draggedHeader.type === 'title') {
                this.chartTitlePos.y = newY;
            } else {
                this.chartDatePos.y = newY;
            }

            return;
        }

        // 캔버스 패닝 처리
        if (this.isPanning) {
            this.canvasContainer.scrollLeft = this.panStart.x - e.clientX;
            this.canvasContainer.scrollTop = this.panStart.y - e.clientY;
            return;
        }

        // 노드 드래그 처리
        if (!this.draggedNode) return;

        const containerRect = this.canvasContainer.getBoundingClientRect();

        // 줌과 스크롤을 고려한 실제 위치 계산
        const mouseX = (e.clientX - containerRect.left + this.canvasContainer.scrollLeft) / this.zoomLevel;
        const mouseY = (e.clientY - containerRect.top + this.canvasContainer.scrollTop) / this.zoomLevel;

        const newX = mouseX - this.dragOffset.x;
        const newY = mouseY - this.dragOffset.y;

        // 이동량 계산
        const deltaX = newX - this.draggedNode.x;
        const deltaY = newY - this.draggedNode.y;

        // Update dragged node position
        this.draggedNode.x = Math.max(0, newX);
        this.draggedNode.y = Math.max(0, newY);

        const element = document.getElementById(this.draggedNode.id);
        element.style.left = `${this.draggedNode.x}px`;
        element.style.top = `${this.draggedNode.y}px`;

        // 다중 선택된 다른 노드들도 함께 이동
        if (this.selectedNodes.size > 1 && this.selectedNodes.has(this.draggedNode.id)) {
            this.selectedNodes.forEach(nodeId => {
                if (nodeId === this.draggedNode.id) return; // 이미 이동함

                const node = this.nodes.get(nodeId);
                if (node) {
                    node.x = Math.max(0, node.x + deltaX);
                    node.y = Math.max(0, node.y + deltaY);

                    const el = document.getElementById(nodeId);
                    if (el) {
                        el.style.left = `${node.x}px`;
                        el.style.top = `${node.y}px`;
                    }
                }
            });
        }

        // 그룹에 속한 다른 노드들도 함께 이동
        const draggedElement = document.getElementById(this.draggedNode.id);
        if (draggedElement && draggedElement.dataset.groupId) {
            const groupId = draggedElement.dataset.groupId;
            const group = this.nodeGroups.find(g => g.id === groupId);

            if (group) {
                group.nodeIds.forEach(nodeId => {
                    if (nodeId === this.draggedNode.id) return; // 이미 이동함
                    // 다중 선택에서 이미 처리된 노드는 건너뛰기
                    if (this.selectedNodes.size > 1 && this.selectedNodes.has(nodeId)) return;

                    const node = this.nodes.get(nodeId);
                    if (node) {
                        node.x = Math.max(0, node.x + deltaX);
                        node.y = Math.max(0, node.y + deltaY);

                        const el = document.getElementById(nodeId);
                        if (el) {
                            el.style.left = `${node.x}px`;
                            el.style.top = `${node.y}px`;
                        }
                    }
                });
            }
        }

        this.updateConnections();
    }

    handleMouseUp(e) {
        // 영역 선택 종료
        if (this.isSelecting && this.selectionBox) {
            this.finishSelection();
            return;
        }

        // 헤더 드래그 종료
        if (this.draggedHeader) {
            this.draggedHeader = null;
            this.saveToLocalStorage();
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

        // 그리드 스냅 적용
        if (this.snapToGrid) {
            this.draggedNode.x = Math.round(this.draggedNode.x / this.gridSize) * this.gridSize;
            this.draggedNode.y = Math.round(this.draggedNode.y / this.gridSize) * this.gridSize;
        }

        // 충돌 감지 및 해결 (5px까지는 허용, 그 이상 겹치면 방지)
        const resolvedPos = this.resolveCollision(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y);
        const deltaX = resolvedPos.x - this.draggedNode.x;
        const deltaY = resolvedPos.y - this.draggedNode.y;

        this.draggedNode.x = resolvedPos.x;
        this.draggedNode.y = resolvedPos.y;

        // 위치 업데이트
        element.style.left = `${this.draggedNode.x}px`;
        element.style.top = `${this.draggedNode.y}px`;

        // 다중 선택된 노드들도 충돌 회피 델타 적용
        if (this.selectedNodes.size > 1 && this.selectedNodes.has(this.draggedNode.id)) {
            this.selectedNodes.forEach(nodeId => {
                if (nodeId === this.draggedNode.id) return;

                const node = this.nodes.get(nodeId);
                if (node) {
                    node.x += deltaX;
                    node.y += deltaY;

                    if (this.snapToGrid) {
                        node.x = Math.round(node.x / this.gridSize) * this.gridSize;
                        node.y = Math.round(node.y / this.gridSize) * this.gridSize;
                    }

                    const el = document.getElementById(nodeId);
                    if (el) {
                        el.style.left = `${node.x}px`;
                        el.style.top = `${node.y}px`;
                    }
                }
            });
        }

        // 그룹에 속한 다른 노드들도 충돌 회피 델타 적용
        const draggedElement = document.getElementById(this.draggedNode.id);
        if (draggedElement && draggedElement.dataset.groupId) {
            const groupId = draggedElement.dataset.groupId;
            const group = this.nodeGroups.find(g => g.id === groupId);

            if (group) {
                group.nodeIds.forEach(nodeId => {
                    if (nodeId === this.draggedNode.id) return;
                    if (this.selectedNodes.size > 1 && this.selectedNodes.has(nodeId)) return;

                    const node = this.nodes.get(nodeId);
                    if (node) {
                        node.x += deltaX;
                        node.y += deltaY;

                        if (this.snapToGrid) {
                            node.x = Math.round(node.x / this.gridSize) * this.gridSize;
                            node.y = Math.round(node.y / this.gridSize) * this.gridSize;
                        }

                        const el = document.getElementById(nodeId);
                        if (el) {
                            el.style.left = `${node.x}px`;
                            el.style.top = `${node.y}px`;
                        }
                    }
                });
            }
        }

        // 연결선 다시 그리기
        this.updateConnections();

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

    // 앵커 포인트 좌표 계산 헬퍼 함수 (화면 표시용 - 실제 DOM 위치 사용)
    getAnchorPoint(node, direction) {
        const element = document.getElementById(node.id);
        if (!element) return { x: node.x, y: node.y };

        const rect = element.getBoundingClientRect();
        const containerRect = this.orgChart.getBoundingClientRect();

        const relativeX = rect.left - containerRect.left;
        const relativeY = rect.top - containerRect.top;

        switch (direction) {
            case 'top':
                return { x: relativeX + rect.width / 2, y: relativeY };
            case 'bottom':
                return { x: relativeX + rect.width / 2, y: relativeY + rect.height };
            case 'left':
                return { x: relativeX, y: relativeY + rect.height / 2 };
            case 'right':
                return { x: relativeX + rect.width, y: relativeY + rect.height / 2 };
            default:
                return { x: relativeX + rect.width / 2, y: relativeY + rect.height / 2 };
        }
    }

    // 앵커 포인트 좌표 계산 헬퍼 함수 (내보내기용 - 저장된 위치 사용)
    getAnchorPointForExport(node, direction) {
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
                return { x: node.x + width / 2, y: node.y + height / 2 };
        }
    }

    drawConnection(parent, child) {
        const parentEl = document.getElementById(parent.id);
        const childEl = document.getElementById(child.id);

        if (!parentEl || !childEl) return;

        // connectionStart는 부모의 앵커, connectionEnd는 자식의 앵커
        const startDirection = child.connectionStart || 'bottom';
        const endDirection = child.connectionEnd || 'top';

        // 노드의 실제 크기 가져오기
        // offsetWidth/Height는 CSS transform의 영향을 받지 않으므로 원본 크기를 반환함
        const parentWidth = parentEl.offsetWidth;
        const parentHeight = parentEl.offsetHeight;
        const childWidth = childEl.offsetWidth;
        const childHeight = childEl.offsetHeight;

        // SVG는 orgChart의 자식으로 같은 좌표계 공유
        // node.x, node.y를 직접 SVG 좌표로 사용
        let startX, startY, endX, endY;

        // 부모 앵커 포인트
        switch (startDirection) {
            case 'top':
                startX = parent.x + parentWidth / 2;
                startY = parent.y;
                break;
            case 'bottom':
                startX = parent.x + parentWidth / 2;
                startY = parent.y + parentHeight;
                break;
            case 'left':
                startX = parent.x;
                startY = parent.y + parentHeight / 2;
                break;
            case 'right':
                startX = parent.x + parentWidth;
                startY = parent.y + parentHeight / 2;
                break;
            default:
                startX = parent.x + parentWidth / 2;
                startY = parent.y + parentHeight;
        }

        // 자식 앵커 포인트
        switch (endDirection) {
            case 'top':
                endX = child.x + childWidth / 2;
                endY = child.y;
                break;
            case 'bottom':
                endX = child.x + childWidth / 2;
                endY = child.y + childHeight;
                break;
            case 'left':
                endX = child.x;
                endY = child.y + childHeight / 2;
                break;
            case 'right':
                endX = child.x + childWidth;
                endY = child.y + childHeight / 2;
                break;
            default:
                endX = child.x + childWidth / 2;
                endY = child.y;
        }

        const startPoint = { x: startX, y: startY };
        const endPoint = { x: endX, y: endY };

        // 중간점을 계산하여 경로 생성
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // 방향에 따라 다른 경로 패턴 사용
        let d;
        if ((startDirection === 'top' || startDirection === 'bottom') &&
            (endDirection === 'top' || endDirection === 'bottom')) {
            // 수직-수평-수직 패턴
            let midY = (startPoint.y + endPoint.y) / 2;

            // 중간 지점이 다른 노드와 충돌하는지 확인하고 조정
            midY = this.adjustPathToAvoidNodes(startPoint.x, endPoint.x, midY, parent.id, child.id, 'horizontal');

            d = `M ${startPoint.x} ${startPoint.y}
                 L ${startPoint.x} ${midY}
                 L ${endPoint.x} ${midY}
                 L ${endPoint.x} ${endPoint.y}`;
        } else if ((startDirection === 'left' || startDirection === 'right') &&
                   (endDirection === 'left' || endDirection === 'right')) {
            // 수평-수직-수평 패턴
            let midX = (startPoint.x + endPoint.x) / 2;

            // 중간 지점이 다른 노드와 충돌하는지 확인하고 조정
            midX = this.adjustPathToAvoidNodes(startPoint.y, endPoint.y, midX, parent.id, child.id, 'vertical');

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

    // 연결선이 노드를 피하도록 경로 조정
    adjustPathToAvoidNodes(start, end, mid, parentId, childId, direction) {
        const minCoord = Math.min(start, end);
        const maxCoord = Math.max(start, end);
        const margin = 10; // 노드 주변 여백

        // 모든 노드를 확인
        for (const [nodeId, node] of this.nodes) {
            // 부모와 자식 노드는 제외
            if (nodeId === parentId || nodeId === childId) continue;

            const nodeEl = document.getElementById(nodeId);
            if (!nodeEl) continue;

            const nodeWidth = nodeEl.offsetWidth;
            const nodeHeight = nodeEl.offsetHeight;

            if (direction === 'horizontal') {
                // 수평선이 노드와 충돌하는지 확인
                const nodeTop = node.y - margin;
                const nodeBottom = node.y + nodeHeight + margin;
                const nodeLeft = node.x - margin;
                const nodeRight = node.x + nodeWidth + margin;

                // 수평선이 노드의 Y 범위를 통과하고, X 범위에 겹치는지 확인
                if (mid >= nodeTop && mid <= nodeBottom &&
                    !(maxCoord < nodeLeft || minCoord > nodeRight)) {
                    // 충돌 발생: 노드 위 또는 아래로 우회
                    const distanceToTop = Math.abs(mid - nodeTop);
                    const distanceToBottom = Math.abs(mid - nodeBottom);

                    if (distanceToTop < distanceToBottom) {
                        mid = nodeTop - margin;
                    } else {
                        mid = nodeBottom + margin;
                    }
                }
            } else {
                // 수직선이 노드와 충돌하는지 확인
                const nodeTop = node.y - margin;
                const nodeBottom = node.y + nodeHeight + margin;
                const nodeLeft = node.x - margin;
                const nodeRight = node.x + nodeWidth + margin;

                // 수직선이 노드의 X 범위를 통과하고, Y 범위에 겹치는지 확인
                if (mid >= nodeLeft && mid <= nodeRight &&
                    !(maxCoord < nodeTop || minCoord > nodeBottom)) {
                    // 충돌 발생: 노드 좌 또는 우로 우회
                    const distanceToLeft = Math.abs(mid - nodeLeft);
                    const distanceToRight = Math.abs(mid - nodeRight);

                    if (distanceToLeft < distanceToRight) {
                        mid = nodeLeft - margin;
                    } else {
                        mid = nodeRight + margin;
                    }
                }
            }
        }

        return mid;
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

        // 연결 지점 설정
        document.getElementById('connectionStart').value = node.connectionStart || 'bottom';
        document.getElementById('connectionEnd').value = node.connectionEnd || 'top';

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

    // Spacing Settings Modal
    showSpacingModal() {
        document.getElementById('horizontalSpacing').value = this.horizontalSpacing;
        document.getElementById('verticalSpacing').value = this.verticalSpacing;
        document.getElementById('memberGap').value = this.memberGap;
        this.spacingModal.classList.remove('hidden');
        document.getElementById('horizontalSpacing').focus();
    }

    hideSpacingModal() {
        this.spacingModal.classList.add('hidden');
        this.spacingForm.reset();
    }

    handleSpacingFormSubmit(e) {
        e.preventDefault();

        this.horizontalSpacing = parseInt(document.getElementById('horizontalSpacing').value);
        this.verticalSpacing = parseInt(document.getElementById('verticalSpacing').value);
        this.memberGap = parseInt(document.getElementById('memberGap').value);

        // Apply member gap to all nodes dynamically
        this.applyMemberGap();

        this.hideSpacingModal();
        this.saveToLocalStorage();

        alert(`간격이 설정되었습니다.\n수평: ${this.horizontalSpacing}px, 수직: ${this.verticalSpacing}px, 직원 항목: ${this.memberGap}px\n\n자동 배치를 클릭하여 노드 간격을 적용하세요.`);
    }

    // Position Adjustment Modal
    showPositionModal(nodeId) {
        this.positionForm.dataset.nodeId = nodeId;
        document.getElementById('offsetUp').value = 0;
        document.getElementById('offsetRight').value = 0;
        this.positionModal.classList.remove('hidden');
        document.getElementById('offsetUp').focus();
    }

    hidePositionModal() {
        this.positionModal.classList.add('hidden');
        this.positionForm.reset();
        delete this.positionForm.dataset.nodeId;
    }

    handlePositionFormSubmit(e) {
        e.preventDefault();

        const nodeId = this.positionForm.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        if (!node) return;

        const offsetUp = parseInt(document.getElementById('offsetUp').value) || 0;
        const offsetRight = parseInt(document.getElementById('offsetRight').value) || 0;

        // 위로 = y 감소, 아래로 = y 증가
        // 오른쪽 = x 증가, 왼쪽 = x 감소
        node.x = Math.max(0, node.x + offsetRight);
        node.y = Math.max(0, node.y - offsetUp);

        // 그리드 스냅 적용
        if (this.snapToGrid) {
            node.x = Math.round(node.x / this.gridSize) * this.gridSize;
            node.y = Math.round(node.y / this.gridSize) * this.gridSize;
        }

        // UI 업데이트
        const element = document.getElementById(nodeId);
        if (element) {
            element.style.left = `${node.x}px`;
            element.style.top = `${node.y}px`;
        }

        this.updateConnections();
        this.hidePositionModal();
        this.saveState();
        this.saveToLocalStorage();
    }

    applyMemberGap() {
        // Apply padding to all member items dynamically
        const style = document.createElement('style');
        style.id = 'member-gap-style';

        // Remove existing style if any
        const existingStyle = document.getElementById('member-gap-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        style.textContent = `
            .member-item {
                padding: ${this.memberGap}px 12px !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Member Management
    addMember() {
        const type = document.getElementById('memberType').value;
        const position = document.getElementById('memberPosition').value.trim();
        const name = document.getElementById('memberName').value.trim();
        const note = document.getElementById('memberNote').value.trim();

        if (!position && !name) {
            alert('보직 또는 성명을 입력해주세요.');
            return;
        }

        this.currentMembers.push({
            type: type || 'staff',
            position,
            name,
            note: note || ''
        });
        this.renderMembersList();

        // Clear inputs
        document.getElementById('memberType').value = 'staff';
        document.getElementById('memberPosition').value = '';
        document.getElementById('memberName').value = '';
        document.getElementById('memberNote').value = '';
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
            membersList.innerHTML = '<div class="members-empty">교직원이 없습니다. 아래에서 추가해주세요.</div>';
            return;
        }

        membersList.innerHTML = this.currentMembers.map((member, index) => {
            const typeLabel = (member.type === 'faculty') ? '교원' : '직원';
            const typeBadge = `<span class="member-type-badge member-type-${member.type || 'staff'}">${typeLabel}</span>`;
            const noteText = member.note ? `<span class="member-note">${this.escapeHtml(member.note)}</span>` : '';

            return `
            <div class="member-list-item">
                <span class="member-info">
                    ${typeBadge}
                    <strong>${this.escapeHtml(member.position)}</strong>
                    ${this.escapeHtml(member.name)}
                    ${noteText}
                </span>
                <button type="button" class="btn-remove" onclick="window.orgChartApp.removeMember(${index})" title="삭제">×</button>
            </div>
        `}).join('');
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const layoutRadio = document.querySelector('input[name="layoutDirection"]:checked');
        const layoutDirection = layoutRadio ? layoutRadio.value : 'vertical';

        const data = {
            deptName: document.getElementById('deptName').value.trim(),
            members: [...this.currentMembers], // 현재 편집 중인 직원 목록 사용
            isIndependent: document.getElementById('isIndependent').checked,
            layoutDirection: layoutDirection,
            connectionStart: document.getElementById('connectionStart').value,
            connectionEnd: document.getElementById('connectionEnd').value
        };

        const mode = this.nodeForm.dataset.mode;

        if (mode === 'add') {
            const parentId = this.nodeForm.dataset.parentId || null;
            let x, y;

            if (parentId) {
                const parent = this.nodes.get(parentId);
                const siblings = this.getChildren(parentId);
                x = parent.x + siblings.length * this.horizontalSpacing;
                y = parent.y + this.verticalSpacing;
            } else {
                // 최상위 노드를 캔버스 중앙 상단에 배치
                const orgChartEl = document.getElementById('orgChart');
                const canvasWidth = orgChartEl ? orgChartEl.offsetWidth : 1587; // A3 가로 기본값
                const rootNodes = Array.from(this.nodes.values()).filter(n => !n.parentId);

                // 중앙에서 시작하여 각 루트 노드를 가로로 배치
                const totalWidth = rootNodes.length * (this.horizontalSpacing + 200);
                const startX = (canvasWidth - totalWidth) / 2 + rootNodes.length * (this.horizontalSpacing + 100);

                x = startX;
                y = 150; // 상단에서 약간 아래
            }

            data.parentId = parentId;
            data.x = x;
            data.y = y;

            this.createNode(data);
        } else if (mode === 'add-child') {
            // 하위 부서 추가: 부모의 바로 아래에 배치
            const parentId = this.nodeForm.dataset.parentNodeId;
            const parent = this.nodes.get(parentId);
            const siblings = this.getChildren(parentId);

            let x, y;

            if (siblings.length === 0) {
                // 첫 번째 자식: 부모 중앙 아래에 배치
                y = parent.y + this.verticalSpacing;
                const parentElement = document.getElementById(parentId);
                const parentWidth = parentElement ? parentElement.offsetWidth : 150;
                x = parent.x + (parentWidth / 2) - 75; // 75는 대략적인 노드 너비의 절반
            } else {
                // 기존 자식들이 있으면 형제와 같은 Y 좌표, 마지막 자식의 오른쪽에 배치
                const lastSibling = siblings[siblings.length - 1];
                y = lastSibling.y; // 형제와 같은 높이
                const lastElement = document.getElementById(lastSibling.id);
                const lastWidth = lastElement ? lastElement.offsetWidth : 150;
                x = lastSibling.x + lastWidth + 30; // 30px 간격
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
            // 형제와 같은 Y 좌표 사용
            y = sibling.y;

            if (parentId) {
                // 부모가 있는 경우
                const siblings = this.getChildren(parentId);
                const siblingElement = document.getElementById(siblingId);
                const siblingWidth = siblingElement ? siblingElement.offsetWidth : 150;
                x = sibling.x + siblingWidth + 30; // 형제 오른쪽에 배치
            } else {
                // 최상위 노드인 경우
                x = sibling.x + (this.horizontalSpacing + 70);
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

        // 그룹 해제 메뉴 표시/숨김
        const element = document.getElementById(nodeId);
        const groupMenuItem = this.contextMenu.querySelector('[data-action="removeFromGroup"]');
        if (element && element.classList.contains('in-group')) {
            groupMenuItem.style.display = 'block';
        } else {
            groupMenuItem.style.display = 'none';
        }

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
            case 'adjustPosition':
                this.showPositionModal(nodeId);
                break;
            case 'toggleLock':
                this.toggleNodeLock(nodeId);
                break;
            case 'removeFromGroup':
                const element = document.getElementById(nodeId);
                if (element && element.dataset.groupId) {
                    this.removeGroup(element.dataset.groupId);
                    alert('그룹이 해제되었습니다.');
                }
                break;
            case 'delete':
                if (confirm('이 부서를 삭제하시겠습니까?\n(하위 부서는 한 단계 위로 이동됩니다)')) {
                    this.deleteNode(nodeId);
                }
                break;
        }

        this.hideContextMenu();
    }

    toggleNodeLock(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        node.locked = !node.locked;

        // 요소 클래스 업데이트
        const element = document.getElementById(nodeId);
        if (element) {
            if (node.locked) {
                element.classList.add('locked');
            } else {
                element.classList.remove('locked');
            }
        }

        this.saveState();
        this.saveToLocalStorage();
    }

    editNode(nodeId) {
        this.showEditNodeModal(nodeId);
    }

    quickCopyNode(nodeId, direction) {
        const sourceNode = this.nodes.get(nodeId);
        if (!sourceNode) return;

        // 복사할 노드 데이터 생성
        let newX = sourceNode.x;
        let newY = sourceNode.y;
        let parentId;

        // 방향에 따라 위치 및 부모 계산
        switch (direction) {
            case 'top':
                // 위쪽: 부모의 형제 노드 (상위 레벨) - 조부모의 자식
                newY = sourceNode.y - this.verticalSpacing;
                if (sourceNode.parentId) {
                    const parentNode = this.nodes.get(sourceNode.parentId);
                    parentId = parentNode ? parentNode.parentId : null;
                } else {
                    parentId = null; // 최상위 노드의 경우
                }
                break;
            case 'bottom':
                // 아래쪽: 현재 노드의 자식 노드
                parentId = nodeId; // 현재 노드를 부모로 설정
                const existingChildren = this.getChildren(nodeId);
                if (existingChildren.length > 0) {
                    // 기존 자식이 있으면 같은 Y 좌표 사용
                    newY = existingChildren[0].y;
                    // 마지막 자식 오른쪽에 배치
                    const lastChild = existingChildren[existingChildren.length - 1];
                    const lastElement = document.getElementById(lastChild.id);
                    const lastWidth = lastElement ? lastElement.offsetWidth : 150;
                    newX = lastChild.x + lastWidth + 30;
                } else {
                    // 첫 번째 자식
                    newY = sourceNode.y + this.verticalSpacing;
                }
                break;
            case 'left':
                // 왼쪽: 같은 부모의 형제 노드 (Y 좌표 유지)
                newX = sourceNode.x - this.horizontalSpacing;
                newY = sourceNode.y; // 같은 높이 유지
                parentId = sourceNode.parentId;
                break;
            case 'right':
                // 오른쪽: 같은 부모의 형제 노드 (Y 좌표 유지)
                newX = sourceNode.x + this.horizontalSpacing;
                newY = sourceNode.y; // 같은 높이 유지
                parentId = sourceNode.parentId;
                break;
        }

        // 그리드 스냅 적용
        if (this.snapToGrid) {
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        // 노드 데이터 복사
        const newNodeData = {
            deptName: sourceNode.deptName + ' (복사)',
            members: sourceNode.members ? [...sourceNode.members] : [],
            parentId: parentId,
            isIndependent: sourceNode.isIndependent,
            layoutDirection: sourceNode.layoutDirection,
            connectionStart: sourceNode.connectionStart,
            connectionEnd: sourceNode.connectionEnd,
            x: Math.max(0, newX),
            y: Math.max(0, newY)
        };

        this.createNode(newNodeData);
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

        // Zoom 단축키
        if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.zoomIn();
            return;
        }

        if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            this.zoomOut();
            return;
        }

        if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            this.zoomReset();
            return;
        }

        if (e.key === 'Escape') {
            this.hideModal();
            this.hideSpacingModal();
            this.hidePositionModal();
            this.hideVersionModal();
            this.hideContextMenu();
            this.deselectAll();
        }

        if (e.key === 'Delete' && this.selectedNode && !this.nodeModal.classList.contains('hidden') === false) {
            if (document.activeElement.tagName !== 'INPUT') {
                if (confirm('이 부서를 삭제하시겠습니까?\n(하위 부서는 한 단계 위로 이동됩니다)')) {
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
        this.clearChart();
        this.ensureSVG();

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
        // 독립 노드는 자동 배치에서 제외
        const rootNodes = Array.from(this.nodes.values()).filter(n => !n.parentId && !n.isIndependent);
        if (rootNodes.length === 0) return;

        // 실제 노드 너비를 가져오는 헬퍼 함수
        const getNodeWidth = (nodeId) => {
            const element = document.getElementById(nodeId);
            if (element) {
                const width = element.offsetWidth;
                // 가로 레이아웃 노드는 더 넓을 수 있음
                if (width > 0) {
                    console.log(`Node ${nodeId} width: ${width}px`);
                    return width;
                }
            }
            console.warn(`Node ${nodeId} width fallback to 120px`);
            return 120; // 기본값을 85에서 120으로 증가
        };

        // Step 1: Calculate subtree widths (bottom-up, Reingold-Tilford algorithm)
        const calculateSubtreeWidth = (node) => {
            const children = this.getChildren(node.id);
            const nodeWidth = getNodeWidth(node.id);

            if (children.length === 0) {
                // Leaf node: just its width
                node._subtreeWidth = nodeWidth;
                return nodeWidth;
            }

            // Calculate total width of all children with spacing between siblings
            let childrenTotalWidth = 0;
            children.forEach((child, index) => {
                const childWidth = calculateSubtreeWidth(child);
                childrenTotalWidth += childWidth;
                if (index < children.length - 1) {
                    // Add spacing between siblings only
                    childrenTotalWidth += this.horizontalSpacing;
                }
            });

            // Node occupies max of its own width or children's total width
            node._subtreeWidth = Math.max(nodeWidth, childrenTotalWidth);
            return node._subtreeWidth;
        };

        // Step 2: Position nodes (top-down)
        const positionNodes = (node, level, leftBound) => {
            const children = this.getChildren(node.id);
            const nodeWidth = getNodeWidth(node.id);
            const subtreeWidth = node._subtreeWidth;

            if (!node.locked) {
                // Center node within its subtree
                const newX = leftBound + (subtreeWidth - nodeWidth) / 2;
                const newY = 60 + level * this.verticalSpacing;

                const deltaX = newX - node.x;
                const deltaY = newY - node.y;

                node.x = newX;
                node.y = newY;

                const element = document.getElementById(node.id);
                if (element) {
                    element.style.left = `${node.x}px`;
                    element.style.top = `${node.y}px`;

                    if (element.dataset.groupId) {
                        this.updateGroupPositions(element.dataset.groupId, node.id, deltaX, deltaY);
                    }
                }
            }

            // Position children
            if (children.length > 0) {
                let childrenTotalWidth = 0;
                children.forEach((child, index) => {
                    childrenTotalWidth += child._subtreeWidth;
                    if (index < children.length - 1) {
                        childrenTotalWidth += this.horizontalSpacing;
                    }
                });

                // Start position for children (center them under parent)
                let childX = leftBound + (subtreeWidth - childrenTotalWidth) / 2;

                children.forEach(child => {
                    positionNodes(child, level + 1, childX);
                    childX += child._subtreeWidth + this.horizontalSpacing;
                });
            }
        };

        // Calculate widths for all root trees
        console.log(`Processing ${rootNodes.length} root nodes (excluding independent nodes)`);
        rootNodes.forEach(root => {
            calculateSubtreeWidth(root);
            console.log(`Root node ${root.deptName}: subtree width = ${root._subtreeWidth}px`);
        });

        // Calculate total width needed for all trees
        let totalWidth = 0;
        rootNodes.forEach((root, index) => {
            totalWidth += root._subtreeWidth;
            if (index < rootNodes.length - 1) {
                totalWidth += this.horizontalSpacing * 2.5; // Extra spacing between root trees
            }
        });

        console.log(`Total width: ${totalWidth}px, Canvas width: 1800px`);

        // Center on canvas
        const canvasWidth = 1800;
        const startX = Math.max(30, (canvasWidth - totalWidth) / 2);
        console.log(`Starting X position: ${startX}px`);

        // Position all trees
        let currentX = startX;
        rootNodes.forEach(root => {
            positionNodes(root, 0, currentX);
            currentX += root._subtreeWidth + this.horizontalSpacing * 2.5;
        });

        this.updateConnections();
        this.saveState();
        this.saveToLocalStorage();

        console.log('AutoLayout algorithm completed successfully');
    }

    updateGroupPositions(groupId, movedNodeId, deltaX, deltaY) {
        const group = this.nodeGroups.find(g => g.id === groupId);
        if (!group) return;

        // 기준 노드가 이동한 경우, 그룹 내 다른 노드들도 상대적 위치 유지
        if (group.baseNodeId === movedNodeId) {
            group.relativePositions.forEach(rel => {
                if (rel.nodeId === movedNodeId) return; // 기준 노드는 이미 이동함

                const node = this.nodes.get(rel.nodeId);
                if (!node || node.locked) return; // 잠긴 노드는 이동하지 않음

                // 상대적 위치 유지
                const baseNode = this.nodes.get(group.baseNodeId);
                node.x = baseNode.x + rel.offsetX;
                node.y = baseNode.y + rel.offsetY;

                const element = document.getElementById(rel.nodeId);
                if (element) {
                    element.style.left = `${node.x}px`;
                    element.style.top = `${node.y}px`;
                }
            });
        }
    }

    // Data Persistence
    saveToLocalStorage() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            nextId: this.nextId,
            chartTitle: this.chartTitle,
            chartDate: this.chartDate,
            chartTitlePos: this.chartTitlePos,
            chartDatePos: this.chartDatePos,
            nodeGroups: this.nodeGroups,
            nextGroupId: this.nextGroupId,
            horizontalSpacing: this.horizontalSpacing,
            verticalSpacing: this.verticalSpacing,
            memberGap: this.memberGap
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

            // 헤더 위치 복원
            if (data.chartTitlePos) {
                this.chartTitlePos = data.chartTitlePos;
                const titleEl = document.getElementById('chartTitle');
                titleEl.style.left = `${this.chartTitlePos.x}px`;
                titleEl.style.top = `${this.chartTitlePos.y}px`;
            }
            if (data.chartDatePos) {
                this.chartDatePos = data.chartDatePos;
                const dateEl = document.getElementById('chartDate');
                if (this.chartDatePos.x !== null) {
                    dateEl.style.right = `${this.chartDatePos.x}px`;
                }
                dateEl.style.top = `${this.chartDatePos.y}px`;
            }

            // Clear existing
            this.clearChart();
            this.ensureSVG();

            // Recreate nodes
            data.nodes.forEach(nodeData => {
                // 기존 데이터 호환성: position/personName을 members 배열로 변환
                let members = nodeData.members || [];
                if (!members.length && (nodeData.position || nodeData.personName)) {
                    members = [{ position: nodeData.position || '', name: nodeData.personName || '' }];
                }

                // 그리드 스냅 적용
                let x = nodeData.x;
                let y = nodeData.y;
                if (this.snapToGrid) {
                    x = Math.round(x / this.gridSize) * this.gridSize;
                    y = Math.round(y / this.gridSize) * this.gridSize;
                }

                const node = {
                    id: nodeData.id,
                    deptName: nodeData.deptName,
                    members: members,
                    parentId: nodeData.parentId,
                    isIndependent: nodeData.isIndependent || false,
                    layoutDirection: nodeData.layoutDirection || 'vertical',
                    locked: nodeData.locked || false,
                    connectionStart: nodeData.connectionStart || 'bottom',
                    connectionEnd: nodeData.connectionEnd || 'top',
                    x: x,
                    y: y
                };
                this.nodes.set(node.id, node);
                this.renderNode(node);
            });

            // 모든 노드 렌더링 후 충돌 해결
            if (this.enableCollisionDetection) {
                data.nodes.forEach(nodeData => {
                    const node = this.nodes.get(nodeData.id);
                    if (node) {
                        const resolvedPos = this.resolveCollision(node.id, node.x, node.y);
                        if (resolvedPos.x !== node.x || resolvedPos.y !== node.y) {
                            node.x = resolvedPos.x;
                            node.y = resolvedPos.y;
                            const element = document.getElementById(node.id);
                            if (element) {
                                element.style.left = `${node.x}px`;
                                element.style.top = `${node.y}px`;
                            }
                        }
                    }
                });
            }

            this.updateConnections();

            // 그룹 정보 복원
            if (data.nodeGroups) {
                this.nodeGroups = data.nodeGroups;
                this.nextGroupId = data.nextGroupId || 1;

                // 노드에 그룹 표시 적용
                this.nodeGroups.forEach(group => {
                    group.nodeIds.forEach(nodeId => {
                        const element = document.getElementById(nodeId);
                        if (element) {
                            element.classList.add('in-group');
                            element.dataset.groupId = group.id;
                        }
                    });
                });
            }

            // 간격 설정 복원
            if (data.horizontalSpacing !== undefined) {
                this.horizontalSpacing = data.horizontalSpacing;
            }
            if (data.verticalSpacing !== undefined) {
                this.verticalSpacing = data.verticalSpacing;
            }
            if (data.memberGap !== undefined) {
                this.memberGap = data.memberGap;
                this.applyMemberGap();
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    }

    saveToFile() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            nextId: this.nextId,
            chartTitle: this.chartTitle,
            chartDate: this.chartDate,
            chartTitlePos: this.chartTitlePos,
            chartDatePos: this.chartDatePos,
            nodeGroups: this.nodeGroups,
            nextGroupId: this.nextGroupId,
            horizontalSpacing: this.horizontalSpacing,
            verticalSpacing: this.verticalSpacing
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
                this.clearChart();
                this.ensureSVG();

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

                // 헤더 위치 복원
                if (data.chartTitlePos) {
                    this.chartTitlePos = data.chartTitlePos;
                    const titleEl = document.getElementById('chartTitle');
                    titleEl.style.left = `${this.chartTitlePos.x}px`;
                    titleEl.style.top = `${this.chartTitlePos.y}px`;
                }
                if (data.chartDatePos) {
                    this.chartDatePos = data.chartDatePos;
                    const dateEl = document.getElementById('chartDate');
                    if (this.chartDatePos.x !== null) {
                        dateEl.style.right = `${this.chartDatePos.x}px`;
                    }
                    dateEl.style.top = `${this.chartDatePos.y}px`;
                }

                // Recreate nodes
                data.nodes.forEach(nodeData => {
                    // 기존 데이터 호환성: position/personName을 members 배열로 변환
                    let members = nodeData.members || [];
                    if (!members.length && (nodeData.position || nodeData.personName)) {
                        members = [{ position: nodeData.position || '', name: nodeData.personName || '' }];
                    }

                    // 그리드 스냅 적용
                    let x = nodeData.x;
                    let y = nodeData.y;
                    if (this.snapToGrid) {
                        x = Math.round(x / this.gridSize) * this.gridSize;
                        y = Math.round(y / this.gridSize) * this.gridSize;
                    }

                    const node = {
                        id: nodeData.id,
                        deptName: nodeData.deptName,
                        members: members,
                        parentId: nodeData.parentId,
                        isIndependent: nodeData.isIndependent || false,
                        layoutDirection: nodeData.layoutDirection || 'vertical',
                        locked: nodeData.locked || false,
                        connectionStart: nodeData.connectionStart || 'bottom',
                        connectionEnd: nodeData.connectionEnd || 'top',
                        x: x,
                        y: y
                    };
                    this.nodes.set(node.id, node);
                    this.renderNode(node);
                });

                // 모든 노드 렌더링 후 충돌 해결
                if (this.enableCollisionDetection) {
                    data.nodes.forEach(nodeData => {
                        const node = this.nodes.get(nodeData.id);
                        if (node) {
                            const resolvedPos = this.resolveCollision(node.id, node.x, node.y);
                            if (resolvedPos.x !== node.x || resolvedPos.y !== node.y) {
                                node.x = resolvedPos.x;
                                node.y = resolvedPos.y;
                                const element = document.getElementById(node.id);
                                if (element) {
                                    element.style.left = `${node.x}px`;
                                    element.style.top = `${node.y}px`;
                                }
                            }
                        }
                    });
                }

                this.updateConnections();

                // 그룹 정보 복원
                if (data.nodeGroups) {
                    this.nodeGroups = data.nodeGroups;
                    this.nextGroupId = data.nextGroupId || 1;

                    // 노드에 그룹 표시 적용
                    this.nodeGroups.forEach(group => {
                        group.nodeIds.forEach(nodeId => {
                            const element = document.getElementById(nodeId);
                            if (element) {
                                element.classList.add('in-group');
                                element.dataset.groupId = group.id;
                            }
                        });
                    });
                }

                // 간격 설정 복원
                if (data.horizontalSpacing !== undefined) {
                    this.horizontalSpacing = data.horizontalSpacing;
                }
                if (data.verticalSpacing !== undefined) {
                    this.verticalSpacing = data.verticalSpacing;
                }

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

            // A3 landscape 전체 크기로 export (2100 x 1500px)
            const contentWidth = 2100;
            const contentHeight = 1500;
            const minX = 0;
            const minY = 0;

            // 임시 컨테이너 생성
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            tempContainer.style.width = `${contentWidth}px`;
            tempContainer.style.height = `${contentHeight}px`;
            tempContainer.style.background = 'white';
            document.body.appendChild(tempContainer);

            // 노드를 임시 컨테이너에 복제
            this.nodes.forEach(node => {
                const element = document.getElementById(node.id);
                if (element) {
                    const clone = element.cloneNode(true);
                    clone.style.left = `${node.x - minX}px`;
                    clone.style.top = `${node.y - minY}px`;
                    clone.classList.remove('selected', 'dragging');
                    tempContainer.appendChild(clone);
                }
            });

            // 헤더 복제
            const chartTitle = document.getElementById('chartTitle');
            const chartDate = document.getElementById('chartDate');

            if (chartTitle && this.chartTitle) {
                const titleClone = chartTitle.cloneNode(true);
                titleClone.style.position = 'absolute';
                titleClone.style.left = `${this.chartTitlePos.x}px`;
                titleClone.style.top = `${this.chartTitlePos.y}px`;
                titleClone.style.right = 'auto';
                titleClone.style.whiteSpace = 'nowrap';
                titleClone.style.minWidth = 'fit-content';
                titleClone.classList.remove('editing');
                tempContainer.appendChild(titleClone);
            }

            if (chartDate && this.chartDate) {
                const dateClone = chartDate.cloneNode(true);
                dateClone.style.position = 'absolute';
                dateClone.style.right = '100px';
                dateClone.style.top = `${this.chartDatePos.y}px`;
                dateClone.style.left = 'auto';
                dateClone.style.whiteSpace = 'nowrap';
                dateClone.style.minWidth = 'fit-content';
                dateClone.classList.remove('editing');
                tempContainer.appendChild(dateClone);
            }

            // SVG 연결선 복제
            const svgClone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgClone.style.position = 'absolute';
            svgClone.style.top = '0';
            svgClone.style.left = '0';
            svgClone.style.width = `${contentWidth}px`;
            svgClone.style.height = `${contentHeight}px`;
            svgClone.setAttribute('width', contentWidth);
            svgClone.setAttribute('height', contentHeight);

            // 연결선 복제 (위치 조정)
            this.nodes.forEach(node => {
                if (node.isIndependent) return;
                if (node.parentId && this.nodes.has(node.parentId)) {
                    const parent = this.nodes.get(node.parentId);
                    if (parent.isIndependent) return;

                    const startDirection = node.connectionStart || 'bottom';
                    const endDirection = node.connectionEnd || 'top';

                    const startPoint = this.getAnchorPointForExport(parent, startDirection);
                    const endPoint = this.getAnchorPointForExport(node, endDirection);

                    // 좌표 조정
                    const adjustedStartX = startPoint.x - minX;
                    const adjustedStartY = startPoint.y - minY;
                    const adjustedEndX = endPoint.x - minX;
                    const adjustedEndY = endPoint.y - minY;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                    let d;
                    if ((startDirection === 'top' || startDirection === 'bottom') &&
                        (endDirection === 'top' || endDirection === 'bottom')) {
                        const midY = (adjustedStartY + adjustedEndY) / 2;
                        d = `M ${adjustedStartX} ${adjustedStartY}
                             L ${adjustedStartX} ${midY}
                             L ${adjustedEndX} ${midY}
                             L ${adjustedEndX} ${adjustedEndY}`;
                    } else if ((startDirection === 'left' || startDirection === 'right') &&
                               (endDirection === 'left' || endDirection === 'right')) {
                        const midX = (adjustedStartX + adjustedEndX) / 2;
                        d = `M ${adjustedStartX} ${adjustedStartY}
                             L ${midX} ${adjustedStartY}
                             L ${midX} ${adjustedEndY}
                             L ${adjustedEndX} ${adjustedEndY}`;
                    } else {
                        const midX = (adjustedStartX + adjustedEndX) / 2;
                        const midY = (adjustedStartY + adjustedEndY) / 2;
                        d = `M ${adjustedStartX} ${adjustedStartY}
                             L ${midX} ${midY}
                             L ${adjustedEndX} ${adjustedEndY}`;
                    }

                    path.setAttribute('d', d);
                    path.setAttribute('stroke', '#cbd5e1');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');

                    svgClone.appendChild(path);
                }
            });

            tempContainer.insertBefore(svgClone, tempContainer.firstChild);

            // 캔버스 생성
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                width: contentWidth,
                height: contentHeight
            });

            // 임시 컨테이너 제거
            document.body.removeChild(tempContainer);

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

    // Reset to Sample Data
    resetToSample() {
        if (this.nodes.size > 0) {
            if (!confirm('현재 조직도를 삭제하고 샘플 데이터로 초기화하시겠습니까?\n\n※ 이 작업은 되돌릴 수 없습니다.')) {
                return;
            }
        }

        // Clear existing
        this.clearChart();
        this.ensureSVG();
        this.nextId = 1;

        // Reset headers
        this.chartTitle = '용인대학교 교직원 배치표';
        this.chartDate = '2024. 2. 8. 현재';
        this.chartTitlePos = { x: 100, y: 20 };
        this.chartDatePos = { x: null, y: 20 };

        // Update header elements
        const chartTitleEl = document.getElementById('chartTitle');
        const chartDateEl = document.getElementById('chartDate');

        chartTitleEl.textContent = this.chartTitle;
        chartDateEl.textContent = this.chartDate;
        chartTitleEl.style.left = `${this.chartTitlePos.x}px`;
        chartTitleEl.style.top = `${this.chartTitlePos.y}px`;
        chartTitleEl.style.right = 'auto';
        chartDateEl.style.right = '100px';
        chartDateEl.style.top = `${this.chartDatePos.y}px`;
        chartDateEl.style.left = 'auto';

        // Sample data
        const sampleData = this.getSampleData();

        // Create nodes
        sampleData.nodes.forEach(nodeData => {
            const node = {
                id: `node-${this.nextId++}`,
                deptName: nodeData.deptName,
                members: nodeData.members || [],
                parentId: nodeData.parentId,
                isIndependent: nodeData.isIndependent || false,
                layoutDirection: nodeData.layoutDirection || 'vertical',
                locked: false,
                connectionStart: nodeData.connectionStart || 'bottom',
                connectionEnd: nodeData.connectionEnd || 'top',
                x: nodeData.x,
                y: nodeData.y
            };
            this.nodes.set(node.id, node);
            this.renderNode(node);
        });

        // Update parent IDs
        const nodeArray = Array.from(this.nodes.values());
        sampleData.nodes.forEach((nodeData, index) => {
            if (nodeData.parentIndex !== undefined && nodeData.parentIndex !== null) {
                nodeArray[index].parentId = nodeArray[nodeData.parentIndex].id;
            }
        });

        // DOM 렌더링 완료 후 자동 배치 실행
        // setTimeout을 사용하여 브라우저가 레이아웃 계산을 완료하도록 충분한 시간 제공
        setTimeout(() => {
            console.log('Starting autoLayout...');
            this.autoLayout();
            this.zoomReset();
            this.saveState();
            this.saveToLocalStorage();
            console.log('AutoLayout completed');
        }, 150); // 150ms 지연

        alert('샘플 데이터로 초기화되었습니다.\n\n잠시 후 자동 배치가 실행됩니다.');
    }

    getSampleData() {
        return {
            nodes: [
                // 0: 총장
                { deptName: '총장', members: [{ position: '총장', name: '김용인' }], x: 0, y: 0, parentIndex: null },

                // 1: 감사실 (독립 노드 - 오른쪽 상단 고정)
                { deptName: '감사실', members: [{ position: '실장', name: '홍감사' }], x: 1680, y: 60, parentIndex: null, isIndependent: true },

                // 2-4: 처
                { deptName: '교무처', members: [], x: 0, y: 0, parentIndex: 0 },
                { deptName: '학생처', members: [], x: 0, y: 0, parentIndex: 0 },
                { deptName: '기획처', members: [], x: 0, y: 0, parentIndex: 0 },

                // 5-7: 교무처 하위 부서 (가로 레이아웃 포함)
                {
                    deptName: '교육혁신팀',
                    members: [
                        { position: '팀장', name: '박혁신' },
                        { position: '과장', name: '이교육' },
                        { position: '주임', name: '정개발' }
                    ],
                    x: 0, y: 0, parentIndex: 2,
                    layoutDirection: 'horizontal'
                },
                { deptName: '교수학습지원센터', members: [{ position: '센터장', name: '김교수' }], x: 0, y: 0, parentIndex: 2 },
                {
                    deptName: '교무팀',
                    members: [
                        { position: '팀장', name: '최교무' },
                        { position: '과장', name: '안행정' }
                    ],
                    x: 0, y: 0, parentIndex: 2,
                    layoutDirection: 'horizontal'
                },

                // 8-10: 학생처 하위 부서
                { deptName: '학생지원팀', members: [{ position: '팀장', name: '윤학생' }, { position: '주임', name: '서지원' }], x: 0, y: 0, parentIndex: 3 },
                { deptName: '상담센터', members: [{ position: '센터장', name: '문상담' }], x: 0, y: 0, parentIndex: 3 },
                { deptName: '취창업지원센터', members: [{ position: '센터장', name: '강취업' }], x: 0, y: 0, parentIndex: 3 },

                // 11-13: 기획처 하위 부서
                { deptName: '기획예산팀', members: [{ position: '팀장', name: '장기획' }], x: 0, y: 0, parentIndex: 4 },
                {
                    deptName: '대외협력팀',
                    members: [
                        { position: '팀장', name: '오협력' },
                        { position: '과장', name: '신국제' },
                        { position: '주임', name: '조교류' }
                    ],
                    x: 0, y: 0, parentIndex: 4,
                    layoutDirection: 'horizontal'
                },
                { deptName: '홍보팀', members: [{ position: '팀장', name: '한홍보' }], x: 0, y: 0, parentIndex: 4 },

                // 14: 노동조합 (독립 노드 - 왼쪽 상단 고정)
                { deptName: '노동조합', members: [{ position: '위원장', name: '권노동' }], x: 30, y: 60, parentIndex: null, isIndependent: true },

                // 15: 교무처 추가 하위 부서 (교육혁신팀의 자식)
                { deptName: '학사운영팀', members: [{ position: '과장', name: '임학사' }, { position: '주임', name: '배운영' }], x: 0, y: 0, parentIndex: 5 },

                // 16: 학생처 추가 하위 부서
                {
                    deptName: '학생복지팀',
                    members: [
                        { position: '팀장', name: '유복지' },
                        { position: '과장', name: '양학생' }
                    ],
                    x: 0, y: 0, parentIndex: 8,
                    layoutDirection: 'horizontal'
                }
            ]
        };
    }

    // Version Management
    showVersionModal() {
        this.renderVersionsList();
        this.versionModal.classList.remove('hidden');
        document.getElementById('versionName').focus();
    }

    hideVersionModal() {
        this.versionModal.classList.add('hidden');
        document.getElementById('versionName').value = '';
    }

    saveCurrentVersion() {
        const versionName = document.getElementById('versionName').value.trim();
        if (!versionName) {
            alert('버전 이름을 입력해주세요.');
            return;
        }

        const version = {
            id: `version-${this.nextVersionId++}`,
            name: versionName,
            timestamp: new Date().toISOString(),
            data: {
                nodes: Array.from(this.nodes.values()).map(node => ({...node})),
                nextId: this.nextId,
                chartTitle: this.chartTitle,
                chartDate: this.chartDate,
                chartTitlePos: {...this.chartTitlePos},
                chartDatePos: {...this.chartDatePos},
                nodeGroups: JSON.parse(JSON.stringify(this.nodeGroups)),
                nextGroupId: this.nextGroupId,
                horizontalSpacing: this.horizontalSpacing,
                verticalSpacing: this.verticalSpacing
            }
        };

        this.versions.push(version);
        this.saveVersionsToLocalStorage();
        this.renderVersionsList();

        document.getElementById('versionName').value = '';
        alert(`버전 "${versionName}"이(가) 저장되었습니다.`);
    }

    renderVersionsList() {
        const versionsList = document.getElementById('versionsList');

        if (this.versions.length === 0) {
            versionsList.innerHTML = '<div class="versions-empty">저장된 버전이 없습니다.</div>';
            return;
        }

        versionsList.innerHTML = this.versions.map(version => {
            const date = new Date(version.timestamp);
            const dateStr = date.toLocaleString('ko-KR');

            return `
                <div class="version-item" data-version-id="${version.id}">
                    <div class="version-info">
                        <div class="version-name">${this.escapeHtml(version.name)}</div>
                        <div class="version-date">${dateStr}</div>
                    </div>
                    <div class="version-actions">
                        <button class="btn btn-primary" onclick="window.orgChartApp.restoreVersion('${version.id}')">복원</button>
                        <button class="btn btn-secondary" onclick="window.orgChartApp.deleteVersion('${version.id}')">삭제</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    restoreVersion(versionId) {
        const version = this.versions.find(v => v.id === versionId);
        if (!version) return;

        if (!confirm(`"${version.name}" 버전으로 복원하시겠습니까?\n\n※ 현재 작업 내용은 저장되지 않습니다.`)) {
            return;
        }

        const data = version.data;

        // Clear existing
        this.clearChart();
        this.ensureSVG();

        this.nextId = data.nextId || 1;

        // Restore header info
        if (data.chartTitle) {
            this.chartTitle = data.chartTitle;
            document.getElementById('chartTitle').textContent = data.chartTitle;
        }
        if (data.chartDate) {
            this.chartDate = data.chartDate;
            document.getElementById('chartDate').textContent = data.chartDate;
        }

        // Restore header positions
        if (data.chartTitlePos) {
            this.chartTitlePos = data.chartTitlePos;
            const titleEl = document.getElementById('chartTitle');
            titleEl.style.left = `${this.chartTitlePos.x}px`;
            titleEl.style.top = `${this.chartTitlePos.y}px`;
        }
        if (data.chartDatePos) {
            this.chartDatePos = data.chartDatePos;
            const dateEl = document.getElementById('chartDate');
            if (this.chartDatePos.x !== null) {
                dateEl.style.right = `${this.chartDatePos.x}px`;
            }
            dateEl.style.top = `${this.chartDatePos.y}px`;
        }

        // Recreate nodes
        data.nodes.forEach(nodeData => {
            const node = {...nodeData};
            this.nodes.set(node.id, node);
            this.renderNode(node);
        });

        this.updateConnections();

        // Restore groups
        if (data.nodeGroups) {
            this.nodeGroups = JSON.parse(JSON.stringify(data.nodeGroups));
            this.nextGroupId = data.nextGroupId || 1;

            this.nodeGroups.forEach(group => {
                group.nodeIds.forEach(nodeId => {
                    const element = document.getElementById(nodeId);
                    if (element) {
                        element.classList.add('in-group');
                        element.dataset.groupId = group.id;
                    }
                });
            });
        }

        // Restore spacing
        if (data.horizontalSpacing !== undefined) {
            this.horizontalSpacing = data.horizontalSpacing;
        }
        if (data.verticalSpacing !== undefined) {
            this.verticalSpacing = data.verticalSpacing;
        }

        this.saveState();
        this.saveToLocalStorage();
        this.hideVersionModal();

        alert(`"${version.name}" 버전이 복원되었습니다.`);
    }

    deleteVersion(versionId) {
        const version = this.versions.find(v => v.id === versionId);
        if (!version) return;

        if (!confirm(`"${version.name}" 버전을 삭제하시겠습니까?`)) {
            return;
        }

        const index = this.versions.findIndex(v => v.id === versionId);
        this.versions.splice(index, 1);
        this.saveVersionsToLocalStorage();
        this.renderVersionsList();

        alert('버전이 삭제되었습니다.');
    }

    saveVersionsToLocalStorage() {
        localStorage.setItem('orgChartVersions', JSON.stringify({
            versions: this.versions,
            nextVersionId: this.nextVersionId
        }));
    }

    loadVersionsFromLocalStorage() {
        const saved = localStorage.getItem('orgChartVersions');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            this.versions = data.versions || [];
            this.nextVersionId = data.nextVersionId || 1;
        } catch (e) {
            console.error('Failed to load versions:', e);
        }
    }

    // Zoom Functions
    handleMouseWheel(e) {
        // Ctrl + wheel for zoom
        if (e.ctrlKey) {
            e.preventDefault();

            // deltaY > 0 means scrolling down (zoom out)
            // deltaY < 0 means scrolling up (zoom in)
            const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.zoomLevel + zoomDelta);
        }
    }

    zoomIn() {
        this.setZoom(this.zoomLevel + 0.1);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel - 0.1);
    }

    zoomReset() {
        this.setZoom(1);
    }

    setZoom(level) {
        // Clamp zoom level
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));

        // Apply transform to chart and header
        // SVG is now a child of orgChart so it inherits the transform automatically
        const transform = `scale(${this.zoomLevel})`;
        this.orgChart.style.transform = transform;
        this.orgChart.style.transformOrigin = 'top left';

        const chartHeader = document.getElementById('chartHeader');
        chartHeader.style.transform = transform;
        chartHeader.style.transformOrigin = 'top left';

        // Update zoom level display
        const percentage = Math.round(this.zoomLevel * 100);
        document.getElementById('zoomLevel').textContent = `${percentage}%`;

        // Update background grid size to match zoom
        const visualGridSize = this.gridSize * this.zoomLevel;
        this.canvasContainer.style.backgroundSize = `${visualGridSize}px ${visualGridSize}px`;

        // Redraw connections to match new zoom
        this.updateConnections();
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
