import type { ColorTheme } from '../types/project';

export interface ThemeDefinition {
  id: ColorTheme;
  name: string;
  description: string;
  fontFamily: string;
  appBg: string;              // Concrete in site drawing (#E9ECEE)
  surfaceBg: string;          // Chart & grid surface (#FAFAF8)
  headerBg: string;           // Steel header (#37434D)
  headerSubBg: string;        // Sub header
  headerText: string;
  border: string;             // Borders (#C9CED2)
  summaryBar: string;         // Steel summary (#37434D)
  taskBar: string;            // Structural blue-grey (#4F7A99)
  taskProgressFill: string;   // Progress fill (#26465E)
  baseline: string;           // Baseline (#9BA5AD)
  signal: string;             // Safety orange (#E8590C)
  critical: string;           // Critical / late red (#C62828)
  textPrimary: string;
  textSecondary: string;
  rowAltBg: string;
  rowSelectedBg: string;
}

export const THEMES: Record<ColorTheme, ThemeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Modern Classic',
    description: 'High contrast vibrant theme with deep indigo ribbon, rich blue tasks, and amber baselines',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    appBg: '#0f172a',
    surfaceBg: '#ffffff',
    headerBg: '#0f172a',
    headerSubBg: '#f1f5f9',
    headerText: '#ffffff',
    border: '#cbd5e1',
    summaryBar: '#0f172a',
    taskBar: '#2563eb',
    taskProgressFill: '#1d4ed8',
    baseline: '#f59e0b',
    signal: '#4f46e5',
    critical: '#dc2626',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    rowAltBg: '#f8fafc',
    rowSelectedBg: '#eef2ff'
  },
  'site-drawing': {
    id: 'site-drawing',
    name: 'Site Drawing',
    description: 'Architectural engineering palette with concrete/steel neutrals, structural blue-grey bars, and safety orange signals',
    fontFamily: "'Barlow Semi Condensed', 'Barlow', -apple-system, sans-serif",
    appBg: '#E9ECEE',
    surfaceBg: '#FAFAF8',
    headerBg: '#37434D',
    headerSubBg: '#E9ECEE',
    headerText: '#FFFFFF',
    border: '#C9CED2',
    summaryBar: '#37434D',
    taskBar: '#4F7A99',
    taskProgressFill: '#26465E',
    baseline: '#9BA5AD',
    signal: '#E8590C',
    critical: '#C62828',
    textPrimary: '#1E293B',
    textSecondary: '#5A6570',
    rowAltBg: '#F3F5F6',
    rowSelectedBg: 'rgba(232, 89, 12, 0.08)'
  }
};
