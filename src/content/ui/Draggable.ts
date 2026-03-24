/**
 * 拖拽功能
 * 增量回调模式：不直接操作元素 style，只通过回调通知拖拽增量
 */

export interface DraggableOptions {
  excludeSelector?: string;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: () => void;
}

const DRAGGING_CLASS = 'vc-dragging';

export class Draggable {
  private element: HTMLElement;
  private options: DraggableOptions;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor(element: HTMLElement, options: DraggableOptions = {}) {
    this.element = element;
    this.options = options;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    this.init();
  }

  private init(): void {
    this.element.style.cursor = 'move';
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // 排除特定元素
    if (target.tagName === 'BUTTON') return;
    if (this.options.excludeSelector && target.closest(this.options.excludeSelector)) return;

    e.preventDefault();
    this.isDragging = true;

    // 添加拖拽状态类（禁用 transition）
    this.element.classList.add(DRAGGING_CLASS);

    // 记录拖拽起始鼠标坐标
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.element.style.cursor = 'grabbing';
    this.options.onDragStart?.();

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    e.preventDefault();

    // 只通知增量，不直接操作 style
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    this.options.onDragMove?.(deltaX, deltaY);
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.element.classList.remove(DRAGGING_CLASS);
    this.element.style.cursor = 'move';

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    this.options.onDragEnd?.();
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}

export function makeDraggable(element: HTMLElement, options?: DraggableOptions): Draggable {
  return new Draggable(element, options);
}
