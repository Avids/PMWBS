import type { ColorTheme } from '../types/project';

export interface ThemeDefinition {
  id: ColorTheme;
  name: string;
  subtitle: string;
  description: string;
  fontFamily: string;
  isDark?: boolean;
  appBg: string;              // Canvas / App background
  surfaceBg: string;          // Chart & grid surface
  headerBg: string;           // Header ribbon background
  headerSubBg: string;        // Sub header / Toolbar ribbon background
  headerText: string;         // Header text color
  headerSubText?: string;     // Sub header text color
  border: string;             // Borders / Grid lines
  summaryBar: string;         // Summary task bar
  summaryBarBorder?: string;  // Summary bar border
  summaryBarProgress: string; // Summary progress fill
  taskBar: string;            // Standard task bar
  taskBarBorder?: string;     // Standard task bar border
  taskProgressFill: string;   // Task progress fill
  milestone: string;          // Milestone diamond
  milestoneBorder?: string;
  baseline: string;           // Baseline bar
  baselineBorder?: string;
  signal: string;             // Signal / Selection / Today line
  critical: string;           // Critical / Late / Alert
  criticalBorder?: string;
  criticalText?: string;
  textPrimary: string;        // Primary text
  textSecondary: string;      // Secondary text (dates, WBS)
  rowAltBg: string;           // Alternating row background
  rowHoverBg: string;         // Row hover background
  rowSelectedBg: string;      // Row selected background
  weekendBg: string;          // Non-working day column shading
  labelHaloBg: string;        // Gantt text label halo background
  labelHaloBorder: string;    // Gantt text label halo border
  labelHaloText: string;      // Gantt text label text color
  swatches: string[];         // 4 representative colors for UI previews
}

export const THEMES: Record<ColorTheme, ThemeDefinition> = {
  'modern-enterprise': {
    id: 'modern-enterprise',
    name: 'Modern Enterprise',
    subtitle: 'SaaS Standard (Linear / Asana)',
    description: 'Deep navy header with soft slate canvas, standard blue task bars, and dark slate diamonds.',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    appBg: '#F8FAFC',
    surfaceBg: '#FFFFFF',
    headerBg: '#1E293B',
    headerSubBg: '#FFFFFF',
    headerText: '#FFFFFF',
    headerSubText: '#0F172A',
    border: '#E2E8F0',
    summaryBar: '#1E40AF',
    summaryBarBorder: '#172554',
    summaryBarProgress: '#172554',
    taskBar: '#3B82F6',
    taskBarBorder: '#2563EB',
    taskProgressFill: '#1D4ED8',
    milestone: '#0F172A',
    milestoneBorder: '#FFFFFF',
    baseline: '#94A3B8',
    baselineBorder: '#64748B',
    signal: '#3B82F6',
    critical: '#EF4444',
    criticalBorder: '#DC2626',
    criticalText: '#DC2626',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    rowAltBg: '#F8FAFC',
    rowHoverBg: '#F1F5F9',
    rowSelectedBg: 'rgba(59, 130, 246, 0.08)',
    weekendBg: '#F1F5F9',
    labelHaloBg: '#FFFFFF',
    labelHaloBorder: '#E2E8F0',
    labelHaloText: '#0F172A',
    swatches: ['#1E293B', '#3B82F6', '#1E40AF', '#EF4444']
  },
  construction: {
    id: 'construction',
    name: 'Construction & Engineering',
    subtitle: 'Industrial / Site Drawing',
    description: 'Rugged concrete grays, structural blue-grey bars, safety orange signals, and Barlow technical typography.',
    fontFamily: "'Barlow Semi Condensed', 'Barlow', -apple-system, sans-serif",
    appBg: '#F4F5F6',
    surfaceBg: '#FAFAF8',
    headerBg: '#2F3E46',
    headerSubBg: '#E9ECEE',
    headerText: '#FFFFFF',
    headerSubText: '#111827',
    border: '#D1D5DB',
    summaryBar: '#1D3557',
    summaryBarBorder: '#102035',
    summaryBarProgress: '#0F1D30',
    taskBar: '#457B9D',
    taskBarBorder: '#356380',
    taskProgressFill: '#26465E',
    milestone: '#E76F51',
    milestoneBorder: '#FFFFFF',
    baseline: '#9BA5AD',
    baselineBorder: '#7E8890',
    signal: '#E8590C',
    critical: '#E63946',
    criticalBorder: '#BA1E2A',
    criticalText: '#E63946',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    rowAltBg: '#F3F5F6',
    rowHoverBg: 'rgba(233, 236, 238, 0.6)',
    rowSelectedBg: 'rgba(232, 89, 12, 0.09)',
    weekendBg: '#EAECEE',
    labelHaloBg: '#FAFAF8',
    labelHaloBorder: '#C9CED2',
    labelHaloText: '#111827',
    swatches: ['#2F3E46', '#457B9D', '#E8590C', '#E63946']
  },
  primavera: {
    id: 'primavera',
    name: 'High-Contrast Data',
    subtitle: 'Primavera P6 & Excel Inspired',
    description: 'Clean high-density grid with forest green task bars, deep crimson critical path, and crisp contrast.',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    appBg: '#FFFFFF',
    surfaceBg: '#FFFFFF',
    headerBg: '#1B4332',
    headerSubBg: '#F3F4F6',
    headerText: '#FFFFFF',
    headerSubText: '#000000',
    border: '#9CA3AF',
    summaryBar: '#1B4332',
    summaryBarBorder: '#0D2319',
    summaryBarProgress: '#0D2319',
    taskBar: '#2D6A4F',
    taskBarBorder: '#1B4332',
    taskProgressFill: '#74C69D',
    milestone: '#000000',
    milestoneBorder: '#FFFFFF',
    baseline: '#6B7280',
    baselineBorder: '#4B5563',
    signal: '#2D6A4F',
    critical: '#9D0208',
    criticalBorder: '#6A0105',
    criticalText: '#9D0208',
    textPrimary: '#000000',
    textSecondary: '#6B7280',
    rowAltBg: '#F9FAFB',
    rowHoverBg: '#F3F4F6',
    rowSelectedBg: 'rgba(45, 106, 79, 0.12)',
    weekendBg: '#E5E7EB',
    labelHaloBg: '#FFFFFF',
    labelHaloBorder: '#9CA3AF',
    labelHaloText: '#000000',
    swatches: ['#1B4332', '#2D6A4F', '#74C69D', '#9D0208']
  },
  'steel-amber': {
    id: 'steel-amber',
    name: 'Industrial Steel & Amber',
    subtitle: 'Modern Construction & Field Safety',
    description: 'Dark graphite header, industrial steel summary bars, sky blue tasks, and construction amber alerts.',
    fontFamily: "'Barlow Semi Condensed', 'Barlow', -apple-system, sans-serif",
    appBg: '#F8FAFC',
    surfaceBg: '#FFFFFF',
    headerBg: '#0F172A',
    headerSubBg: '#F1F5F9',
    headerText: '#FFFFFF',
    headerSubText: '#0F172A',
    border: '#E2E8F0',
    summaryBar: '#475569',
    summaryBarBorder: '#334155',
    summaryBarProgress: '#334155',
    taskBar: '#0284C7',
    taskBarBorder: '#0369A1',
    taskProgressFill: '#0369A1',
    milestone: '#B45309',
    milestoneBorder: '#FFFFFF',
    baseline: '#94A3B8',
    baselineBorder: '#64748B',
    signal: '#D97706',
    critical: '#D97706',
    criticalBorder: '#B45309',
    criticalText: '#D97706',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    rowAltBg: '#F8FAFC',
    rowHoverBg: '#F1F5F9',
    rowSelectedBg: 'rgba(217, 119, 6, 0.08)',
    weekendBg: '#F1F5F9',
    labelHaloBg: '#FFFFFF',
    labelHaloBorder: '#E2E8F0',
    labelHaloText: '#0F172A',
    swatches: ['#0F172A', '#0284C7', '#D97706', '#B45309']
  },
  'dark-mode': {
    id: 'dark-mode',
    name: 'Precision Dark Mode',
    subtitle: 'Night Shift & Command Center',
    description: 'Deep obsidian and dark slate surfaces engineered for site trailers and reducing eye strain.',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    isDark: true,
    appBg: '#0B0F19',
    surfaceBg: '#111827',
    headerBg: '#030712',
    headerSubBg: '#111827',
    headerText: '#F9FAFB',
    headerSubText: '#F9FAFB',
    border: '#374151',
    summaryBar: '#6B7280',
    summaryBarBorder: '#4B5563',
    summaryBarProgress: '#4B5563',
    taskBar: '#3B82F6',
    taskBarBorder: '#2563EB',
    taskProgressFill: '#60A5FA',
    milestone: '#FBBF24',
    milestoneBorder: '#030712',
    baseline: '#64748B',
    baselineBorder: '#475569',
    signal: '#60A5FA',
    critical: '#EF4444',
    criticalBorder: '#DC2626',
    criticalText: '#F87171',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    rowAltBg: '#171F2E',
    rowHoverBg: 'rgba(55, 65, 81, 0.4)',
    rowSelectedBg: 'rgba(59, 130, 246, 0.2)',
    weekendBg: '#1F2937',
    labelHaloBg: '#111827',
    labelHaloBorder: '#374151',
    labelHaloText: '#F9FAFB',
    swatches: ['#030712', '#3B82F6', '#EF4444', '#FBBF24']
  },
  // Backwards compatibility aliases
  classic: {
    id: 'classic',
    name: 'Modern Enterprise',
    subtitle: 'SaaS Standard (Linear / Asana)',
    description: 'Deep navy header with soft slate canvas, standard blue task bars, and dark slate diamonds.',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    appBg: '#F8FAFC',
    surfaceBg: '#FFFFFF',
    headerBg: '#1E293B',
    headerSubBg: '#FFFFFF',
    headerText: '#FFFFFF',
    headerSubText: '#0F172A',
    border: '#E2E8F0',
    summaryBar: '#1E40AF',
    summaryBarBorder: '#172554',
    summaryBarProgress: '#172554',
    taskBar: '#3B82F6',
    taskBarBorder: '#2563EB',
    taskProgressFill: '#1D4ED8',
    milestone: '#0F172A',
    milestoneBorder: '#FFFFFF',
    baseline: '#94A3B8',
    baselineBorder: '#64748B',
    signal: '#3B82F6',
    critical: '#EF4444',
    criticalBorder: '#DC2626',
    criticalText: '#DC2626',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    rowAltBg: '#F8FAFC',
    rowHoverBg: '#F1F5F9',
    rowSelectedBg: 'rgba(59, 130, 246, 0.08)',
    weekendBg: '#F1F5F9',
    labelHaloBg: '#FFFFFF',
    labelHaloBorder: '#E2E8F0',
    labelHaloText: '#0F172A',
    swatches: ['#1E293B', '#3B82F6', '#1E40AF', '#EF4444']
  },
  'site-drawing': {
    id: 'site-drawing',
    name: 'Construction & Engineering',
    subtitle: 'Industrial / Site Drawing',
    description: 'Rugged concrete grays, structural blue-grey bars, safety orange signals, and Barlow technical typography.',
    fontFamily: "'Barlow Semi Condensed', 'Barlow', -apple-system, sans-serif",
    appBg: '#F4F5F6',
    surfaceBg: '#FAFAF8',
    headerBg: '#2F3E46',
    headerSubBg: '#E9ECEE',
    headerText: '#FFFFFF',
    headerSubText: '#111827',
    border: '#D1D5DB',
    summaryBar: '#1D3557',
    summaryBarBorder: '#102035',
    summaryBarProgress: '#0F1D30',
    taskBar: '#457B9D',
    taskBarBorder: '#356380',
    taskProgressFill: '#26465E',
    milestone: '#E76F51',
    milestoneBorder: '#FFFFFF',
    baseline: '#9BA5AD',
    baselineBorder: '#7E8890',
    signal: '#E8590C',
    critical: '#E63946',
    criticalBorder: '#BA1E2A',
    criticalText: '#E63946',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    rowAltBg: '#F3F5F6',
    rowHoverBg: 'rgba(233, 236, 238, 0.6)',
    rowSelectedBg: 'rgba(232, 89, 12, 0.09)',
    weekendBg: '#EAECEE',
    labelHaloBg: '#FAFAF8',
    labelHaloBorder: '#C9CED2',
    labelHaloText: '#111827',
    swatches: ['#2F3E46', '#457B9D', '#E8590C', '#E63946']
  }
};

export const SELECTABLE_THEMES: ThemeDefinition[] = [
  THEMES['modern-enterprise'],
  THEMES['construction'],
  THEMES['primavera'],
  THEMES['steel-amber'],
  THEMES['dark-mode'],
];

export function getTheme(themeId?: string): ThemeDefinition {
  if (themeId === 'classic') return THEMES['modern-enterprise'];
  if (themeId === 'site-drawing') return THEMES['construction'];
  if (themeId && themeId in THEMES) {
    return THEMES[themeId as ColorTheme];
  }
  return THEMES['construction'];
}
