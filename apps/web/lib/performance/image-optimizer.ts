/**
 * Image Optimization Utilities
 */

export interface ImageOptimizerConfig {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
}

export class ImageOptimizer {
  /**
   * Generate optimized image URL
   */
  static getOptimizedUrl(
    src: string,
    config: ImageOptimizerConfig = {}
  ): string {
    const { quality = 75, format = 'webp', width, height } = config;

    // Use Next.js Image Optimization API
    const params = new URLSearchParams({
      url: src,
      q: quality.toString(),
      ...(width && { w: width.toString() }),
      ...(height && { h: height.toString() }),
    });

    return `/_next/image?${params.toString()}`;
  }

  /**
   * Generate srcset for responsive images
   */
  static generateSrcSet(
    src: string,
    widths: number[] = [640, 750, 828, 1080, 1200]
  ): string {
    return widths
      .map((width) => {
        const url = this.getOptimizedUrl(src, { width });
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Preload critical images
   */
  static preloadImage(src: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
}
