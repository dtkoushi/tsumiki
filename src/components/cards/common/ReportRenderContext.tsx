import { createContext } from 'react';

export interface ReportRenderSize { width: number; height: number }

/**
 * Provides fixed dimensions for static SVG rendering (renderToStaticMarkup).
 * When this context is present, AutoFitSvg uses these values instead of ResizeObserver.
 */
export const ReportRenderContext = createContext<ReportRenderSize | null>(null);
