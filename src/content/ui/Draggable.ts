/**
 * 拖拽功能
 */

export interface DraggableOptions {
  excludeSelector?: string;
}

const DRAGGING_CLASS = 'vc-dragging';

export class Draggable {
  private element: HTMLElement;
  private options: DraggableOptions;
  private isDragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private parentOffsetX = 0;
  private parentOffsetY = 0;

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

    // 计算鼠标相对于元素的偏移
    const rect = this.element.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    // 缓存父元素偏移（只计算一次）
    const parent = this.element.offsetParent as HTMLElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
    this.parentOffsetX = parentRect.left;
    this.parentOffsetY = parentRect.top;

    this.element.style.cursor = 'grabbing';

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    e.preventDefault();

    // 计算新的 left/top（相对于定位父元素）
    const newLeft = e.clientX - this.parentOffsetX - this.offsetX;
    const newTop = e.clientY - this.parentOffsetY - this.offsetY;

    // 清除 transform 以便使用 left/top 定位
    this.element.style.transform = 'none';
    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;
    this.element.style.right = 'auto';
    this.element.style.bottom = 'auto';
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.element.classList.remove(DRAGGING_CLASS);
    this.element.style.cursor = 'move';

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}

export function makeDraggable(element: HTMLElement, options?: DraggableOptions): Draggable {
  return new Draggable(element, options);
}
