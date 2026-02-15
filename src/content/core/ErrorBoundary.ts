/**
 * 错误处理工具
 */

/**
 * 错误边界包装器 - 同步函数
 * @param fn 要执行的函数
 * @param fallback 失败时的返回值
 * @param context 错误上下文描述
 */
export function withErrorBoundary<T>(
  fn: () => T,
  fallback: T,
  context?: string
): T {
  try {
    return fn();
  } catch (error) {
    console.warn(`[Video Companion] ${context || 'Error'}:`, error);
    return fallback;
  }
}

/**
 * 重试包装器 - 支持异步函数
 * @param fn 要执行的函数
 * @param options 重试选项
 */
export async function withRetry<T>(
  fn: () => T | Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    context?: string;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 100, context, onRetry } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      onRetry?.(attempt, error);

      if (attempt < maxRetries) {
        await sleep(delay * attempt); // 指数退避
      }
    }
  }

  console.error(
    `[Video Companion] ${context || 'Operation'} failed after ${maxRetries} retries:`,
    lastError
  );
  throw lastError;
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 安全执行 DOM 操作
 */
export function safeDOMOperation<T>(
  operation: () => T,
  fallback: T,
  context?: string
): T {
  return withErrorBoundary(operation, fallback, context);
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): T {
  let lastCall = 0;

  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}
