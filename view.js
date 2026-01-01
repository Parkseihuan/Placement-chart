// Organization Chart Viewer (Read-Only)
class OrgChartViewer {
    constructor() {
        // DOM Elements
        this.orgChart = document.getElementById('orgChart');
        this.connections = document.getElementById('connections');
        this.canvasContainer = document.querySelector('.canvas-container');

        // Data
        this.nodes = new Map(); // Map<id, node>
        this.nextId = 1;

        // 헤더 정보
        this.chartTitle = '용인대학교 교직원 배치표';
        this.chartDate = '2024. 2. 8. 현재';

        // Zoom 관련
        this.minZoom = 0.25;
        this.maxZoom = 2;
        this.zoomLevel = 1;

        // 직원 항목 간격
        this.memberGap = 8;

        // Initialize
        this.initEventListeners();
        this.loadFromLocalStorage();

        // SVG 크기 설정
        this.connections.setAttribute('width', '2100');
        this.connections.setAttribute('height', '1500');
        this.connections.style.width = '2100px';
        this.connections.style.height = '1500px';
    }

    initEventListeners() {
        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.zoomReset());

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportAsImage());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Mouse wheel zoom
        this.canvasContainer.addEventListener('wheel', (e) => this.handleMouseWheel(e));
    }

    handleKeyDown(e) {
        // Zoom shortcuts
        if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.zoomIn();
        } else if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            this.zoomOut();
        } else if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            this.zoomReset();
        }
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
            element.classList.add('no-members');
        }

        element.innerHTML = `
            <div class="node-header">${this.escapeHtml(node.deptName)}</div>
            ${bodyHtml}
        `;

        this.orgChart.appendChild(element);
    }

    updateConnections() {
        // Clear existing connections
        this.connections.innerHTML = '';

        this.nodes.forEach(node => {
            if (node.isIndependent) return;
            if (node.parentId && this.nodes.has(node.parentId)) {
                const parent = this.nodes.get(node.parentId);
                if (parent.isIndependent) return;

                const startDirection = node.connectionStart || 'bottom';
                const endDirection = node.connectionEnd || 'top';

                const startPoint = this.getAnchorPoint(parent, startDirection);
                const endPoint = this.getAnchorPoint(node, endDirection);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.classList.add('connection-line');

                let d;
                if ((startDirection === 'top' || startDirection === 'bottom') &&
                    (endDirection === 'top' || endDirection === 'bottom')) {
                    const midY = (startPoint.y + endPoint.y) / 2;
                    d = `M ${startPoint.x} ${startPoint.y}
                         L ${startPoint.x} ${midY}
                         L ${endPoint.x} ${midY}
                         L ${endPoint.x} ${endPoint.y}`;
                } else if ((startDirection === 'left' || startDirection === 'right') &&
                           (endDirection === 'left' || endDirection === 'right')) {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    d = `M ${startPoint.x} ${startPoint.y}
                         L ${midX} ${startPoint.y}
                         L ${midX} ${endPoint.y}
                         L ${endPoint.x} ${endPoint.y}`;
                } else {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    d = `M ${startPoint.x} ${startPoint.y}
                         L ${midX} ${midY}
                         L ${endPoint.x} ${endPoint.y}`;
                }

                path.setAttribute('d', d);
                this.connections.appendChild(path);
            }
        });
    }

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

    // Zoom Functions
    handleMouseWheel(e) {
        if (e.ctrlKey) {
            e.preventDefault();
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
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));

        const transform = `scale(${this.zoomLevel})`;
        this.orgChart.style.transform = transform;
        this.orgChart.style.transformOrigin = 'top left';

        const chartHeader = document.getElementById('chartHeader');
        chartHeader.style.transform = transform;
        chartHeader.style.transformOrigin = 'top left';

        const connections = document.getElementById('connections');
        connections.style.transform = transform;
        connections.style.transformOrigin = 'top left';

        const percentage = Math.round(this.zoomLevel * 100);
        document.getElementById('zoomLevel').textContent = `${percentage}%`;

        const gridSize = 20 * this.zoomLevel;
        this.canvasContainer.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    }

    applyMemberGap() {
        const style = document.createElement('style');
        style.id = 'member-gap-style';

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

    loadFromLocalStorage() {
        const saved = localStorage.getItem('orgChartData');
        if (!saved) {
            alert('저장된 조직도 데이터가 없습니다.\n관리자 모드에서 먼저 조직도를 만들어주세요.');
            return;
        }

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
                const titleEl = document.getElementById('chartTitle');
                titleEl.style.left = `${data.chartTitlePos.x}px`;
                titleEl.style.top = `${data.chartTitlePos.y}px`;
            }
            if (data.chartDatePos) {
                const dateEl = document.getElementById('chartDate');
                dateEl.style.right = '100px';
                dateEl.style.top = `${data.chartDatePos.y}px`;
            }

            // Clear existing
            this.orgChart.innerHTML = '';
            this.nodes.clear();

            // Recreate nodes
            data.nodes.forEach(nodeData => {
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

            // 직원 정보 간격 복원
            if (data.memberGap !== undefined) {
                this.memberGap = data.memberGap;
                this.applyMemberGap();
            }
        } catch (e) {
            console.error('Failed to load data:', e);
            alert('조직도 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async exportAsImage() {
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas 라이브러리를 불러오는 중 오류가 발생했습니다.');
            return;
        }

        try {
            const contentWidth = 2100;
            const contentHeight = 1500;
            const minX = 0;
            const minY = 0;

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
                    tempContainer.appendChild(clone);
                }
            });

            // 헤더 복제
            const chartTitle = document.getElementById('chartTitle');
            const chartDate = document.getElementById('chartDate');

            if (chartTitle && this.chartTitle) {
                const titleClone = chartTitle.cloneNode(true);
                titleClone.style.position = 'absolute';
                titleClone.style.left = chartTitle.style.left || '100px';
                titleClone.style.top = chartTitle.style.top || '20px';
                titleClone.style.right = 'auto';
                titleClone.style.whiteSpace = 'nowrap';
                titleClone.style.minWidth = 'fit-content';
                tempContainer.appendChild(titleClone);
            }

            if (chartDate && this.chartDate) {
                const dateClone = chartDate.cloneNode(true);
                dateClone.style.position = 'absolute';
                dateClone.style.right = '100px';
                dateClone.style.top = chartDate.style.top || '20px';
                dateClone.style.left = 'auto';
                dateClone.style.whiteSpace = 'nowrap';
                dateClone.style.minWidth = 'fit-content';
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

            this.nodes.forEach(node => {
                if (node.isIndependent) return;
                if (node.parentId && this.nodes.has(node.parentId)) {
                    const parent = this.nodes.get(node.parentId);
                    if (parent.isIndependent) return;

                    const startDirection = node.connectionStart || 'bottom';
                    const endDirection = node.connectionEnd || 'top';

                    const startPoint = this.getAnchorPoint(parent, startDirection);
                    const endPoint = this.getAnchorPoint(node, endDirection);

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

            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                width: contentWidth,
                height: contentHeight
            });

            document.body.removeChild(tempContainer);

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `조직도_${new Date().toISOString().slice(0, 10)}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });
        } catch (error) {
            console.error('Export error:', error);
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.orgChartViewer = new OrgChartViewer();
});
