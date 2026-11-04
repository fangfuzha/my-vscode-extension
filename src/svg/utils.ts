/**
 * Formats bytes into a readable string (bytes or KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  return `${(bytes / 1024).toFixed(2)} KB`
}

export function formatKilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`
}

/**
 * Calculates savings between original and optimized content
 */
export function calculateSavings(
  originalContent: string,
  optimizedContent: string
) {
  const originalSize = Buffer.byteLength(originalContent, 'utf8')
  const optimizedSize = Buffer.byteLength(optimizedContent, 'utf8')
  const savingPercent = (
    ((originalSize - optimizedSize) / originalSize) *
    100
  ).toFixed(2)

  return {
    originalSize,
    optimizedSize,
    savingPercent,
    originalSizeFormatted: formatBytes(originalSize),
    optimizedSizeFormatted: formatBytes(optimizedSize)
  }
}

export function propagateRootStroke(svgContent: string): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  if (!svgOpenTagMatch) return svgContent

  const svgOpenTag = svgOpenTagMatch[0]
  const stroke = getAttribute(svgOpenTag, 'stroke')

  if (!stroke) {
    return svgContent
  }

  const shapeElements = [
    'path',
    'line',
    'polyline',
    'polygon',
    'circle',
    'ellipse',
    'rect'
  ]
  const shapeRegex = new RegExp(
    `<(${shapeElements.join('|')})([^>]*?)(\\/?>)`,
    'gi'
  )

  return svgContent.replace(shapeRegex, (match, tagName, attrs, ending) => {
    if (attrs && /\bstroke\s*=/.test(attrs)) {
      return match
    }

    return `<${tagName}${attrs || ''} stroke="${stroke}"${ending}`
  })
}

export function ensureMinimumSize(svgContent: string, minSize: number): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  if (!svgOpenTagMatch) return svgContent

  const svgOpenTag = svgOpenTagMatch[0]
  const hasWidth = /\bwidth\s*=\s*["'][^"']+["']/.test(svgOpenTag)
  const hasHeight = /\bheight\s*=\s*["'][^"']+["']/.test(svgOpenTag)
  const viewBox = getAttribute(svgOpenTag, 'viewBox')

  if (!hasWidth && !hasHeight) {
    if (viewBox) {
      const viewBoxParts = viewBox.split(/\s+/)
      if (viewBoxParts.length >= 4) {
        const vbWidth = parseFloat(viewBoxParts[2] ?? '0')
        const vbHeight = parseFloat(viewBoxParts[3] ?? '0')
        const scale = minSize / Math.max(vbWidth, vbHeight)
        const newWidth = Math.round(vbWidth * scale)
        const newHeight = Math.round(vbHeight * scale)
        return addRootSvgAttributes(
          svgContent,
          `width="${newWidth}" height="${newHeight}"`
        )
      }
    }

    return addRootSvgAttributes(
      svgContent,
      `width="${minSize}" height="${minSize}"`
    )
  }

  const widthMatch = svgOpenTag.match(
    /\bwidth\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/
  )
  const heightMatch = svgOpenTag.match(
    /\bheight\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/
  )

  if (!widthMatch || !heightMatch) {
    return svgContent
  }

  const width = parseFloat(widthMatch[1] ?? '0')
  const height = parseFloat(heightMatch[1] ?? '0')

  if (width >= minSize || height >= minSize) {
    return svgContent
  }

  const scale = minSize / Math.max(width, height)
  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  return svgContent
    .replace(
      /\bwidth\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/,
      `width="${newWidth}"`
    )
    .replace(
      /\bheight\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/,
      `height="${newHeight}"`
    )
}

function getAttribute(attrs: string, name: string): string | null {
  const escapedName = escapeRegExp(name)
  const match = attrs.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  )
  return match?.[2] ?? null
}

function addRootSvgAttributes(svgContent: string, attributes: string): string {
  return svgContent.replace(/<svg\b/i, (match) => `${match} ${attributes}`)
}

export interface SvgDimensions {
  width: number | null;
  height: number | null;
  viewBox: string | null;
}

function parseLength(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  // 百分比不是绝对尺寸，按未知处理。
  if (trimmed.endsWith('%')) {
    return null;
  }
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/**
 * 读取 SVG 根节点的尺寸：优先用 width/height，缺失时回退到 viewBox。
 * 单位后缀（px、em 等）只取数值部分。
 */
export function getSvgDimensions(svg: string): SvgDimensions {
  const rootMatch = svg.match(/<svg\b[^>]*>/i);
  if (!rootMatch) {
    return { width: null, height: null, viewBox: null };
  }

  const attrs = rootMatch[0];
  const viewBox = getAttribute(attrs, 'viewBox');
  let width = parseLength(getAttribute(attrs, 'width'));
  let height = parseLength(getAttribute(attrs, 'height'));

  if ((width === null || height === null) && viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      width = width ?? parts[2];
      height = height ?? parts[3];
    }
  }

  return { width, height, viewBox };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
