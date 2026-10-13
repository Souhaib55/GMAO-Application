import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { fmtHours, fmtMoney, fmtNumber, fmtPercent } from '../../utils/gm-format';

/*
 * Small SVG charts drawn by hand: no chart library, nothing loaded from the network,
 * readable at a glance on a workshop tablet. Colours come from the design tokens.
 */

export type ChartFormat = 'number' | 'money' | 'hours' | 'percent';

export const CHART_COLORS = ['#3d60dc', '#23a07a', '#e0981f', '#8c96a5', '#7c5cc4', '#d4553f'];

export function formatValue(v: number | null | undefined, format: ChartFormat = 'number'): string {
  switch (format) {
    case 'money': return fmtMoney(v);
    case 'hours': return fmtHours(v);
    case 'percent': return fmtPercent(v);
    default: return fmtNumber(v, v !== null && v !== undefined && Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0);
  }
}

/** Rounds the axis maximum up to a readable value (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/* ------------------------------------------------------------------ Bar list */

export interface BarItem { label: string; value: number; sub?: string; tone?: 'ok' | 'warn' | 'bad' | 'info'; key?: any; }

@Component({
  selector: 'gm-bar-list',
  host: { class: 'gm-bar-list' },
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="bars" *ngIf="items?.length; else empty">
      <button type="button" class="bar" *ngFor="let it of items" [class.clickable]="clickable" (click)="clickable && pick.emit(it)">
        <span class="label" [title]="it.label">{{ it.label }}<small *ngIf="it.sub">{{ it.sub }}</small></span>
        <span class="track"><i [class]="'tone-' + (it.tone || 'info')" [style.width.%]="pct(it.value)"></i></span>
        <span class="value">{{ fmt(it.value) }}</span>
      </button>
    </div>
    <ng-template #empty><div class="empty">{{ emptyText }}</div></ng-template>
  `,
  styles: [`
    .bars { display: flex; flex-direction: column; gap: 4px; }
    .bar { display: grid; grid-template-columns: minmax(90px, 34%) 1fr auto; align-items: center; gap: 10px; padding: 5px 4px; border: 0; background: none; border-radius: 6px; text-align: left; font: inherit; color: inherit; cursor: default; }
    .bar.clickable { cursor: pointer; }
    .bar.clickable:hover { background: var(--gray-50); }
    .label { font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label small { display: block; font-size: 0.7rem; color: var(--text-muted); }
    .track { height: 10px; border-radius: 5px; background: var(--gray-100); overflow: hidden; }
    .track i { display: block; height: 100%; border-radius: 5px; transition: width .5s cubic-bezier(.4,0,.2,1); min-width: 2px; }
    .tone-info { background: var(--primary-600); } .tone-ok { background: var(--success); } .tone-warn { background: var(--warning); } .tone-bad { background: var(--error); }
    .value { font-size: 0.8125rem; font-weight: 600; font-variant-numeric: tabular-nums; min-width: 52px; text-align: right; }
    .empty { padding: 24px 8px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
  `]
})
export class GmBarListComponent {
  @Input() items: BarItem[] = [];
  @Input() format: ChartFormat = 'number';
  @Input() max: number | null = null;
  @Input() clickable = false;
  @Input() emptyText = 'Aucune donnée sur la période';
  @Output() pick = new EventEmitter<BarItem>();

  pct(v: number): number {
    const max = this.max ?? Math.max(...this.items.map(i => i.value), 0);
    return max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
  }

  fmt(v: number): string { return formatValue(v, this.format); }
}

/* ------------------------------------------------------------------ Line chart */

export interface Series { name: string; values: (number | null)[]; color?: string; dashed?: boolean; }

@Component({
  selector: 'gm-line-chart',
  host: { class: 'gm-line-chart' },
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="chart" *ngIf="labels?.length; else empty">
      <div class="legend" *ngIf="series.length > 1">
        <span *ngFor="let s of series; let i = index"><i [style.background]="color(s, i)"></i>{{ s.name }}</span>
      </div>
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" (mouseleave)="hover = null">
        <g class="grid">
          <ng-container *ngFor="let t of ticks">
            <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(t)" [attr.y2]="y(t)"></line>
            <text [attr.x]="L - 6" [attr.y]="y(t) + 3" text-anchor="end">{{ short(t) }}</text>
          </ng-container>
        </g>
        <ng-container *ngFor="let s of series; let i = index">
          <path *ngIf="area && i === 0" class="area" [attr.d]="areaPath(s)" [attr.fill]="color(s, i)"></path>
          <path class="line" [attr.d]="path(s)" [attr.stroke]="color(s, i)" [attr.stroke-dasharray]="s.dashed ? '5 4' : null"></path>
        </ng-container>
        <g class="xlab">
          <ng-container *ngFor="let l of labels; let j = index">
            <text *ngIf="showLabel(j)" [attr.x]="x(j)" [attr.y]="H - 4" text-anchor="middle">{{ l }}</text>
          </ng-container>
        </g>
        <ng-container *ngFor="let l of labels; let j = index">
          <rect class="hit" [attr.x]="x(j) - step() / 2" y="0" [attr.width]="step()" [attr.height]="H - B" (mouseenter)="hover = j"></rect>
        </ng-container>
        <g *ngIf="hover !== null">
          <line class="cursor" [attr.x1]="x(hover)" [attr.x2]="x(hover)" [attr.y1]="T" [attr.y2]="H - B"></line>
          <ng-container *ngFor="let s of series; let i = index">
            <circle *ngIf="s.values[hover] !== null" [attr.cx]="x(hover)" [attr.cy]="y(s.values[hover] || 0)" r="3.5" [attr.fill]="color(s, i)"></circle>
          </ng-container>
        </g>
      </svg>
      <div class="tip" *ngIf="hover !== null" [style.left.%]="(x(hover) / W) * 100">
        <strong>{{ labels[hover] }}</strong>
        <span *ngFor="let s of series; let i = index"><i [style.background]="color(s, i)"></i>{{ s.name }} : {{ fmt(s.values[hover]) }}</span>
      </div>
    </div>
    <ng-template #empty><div class="empty">{{ emptyText }}</div></ng-template>
  `,
  styles: [`
    .chart { position: relative; }
    svg { width: 100%; height: auto; max-height: 230px; display: block; overflow: visible; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px; }
    .legend i, .tip i { display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
    .grid line { stroke: var(--gray-100); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .grid text, .xlab text { font-size: 10px; fill: var(--text-muted); font-family: var(--font-sans); }
    .line { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
    .area { opacity: 0.08; }
    .hit { fill: transparent; }
    .cursor { stroke: var(--gray-300); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .tip { position: absolute; top: 18px; transform: translateX(-50%); background: var(--gray-900); color: #fff; border-radius: 6px; padding: 6px 9px; font-size: 0.72rem; pointer-events: none; display: flex; flex-direction: column; gap: 2px; white-space: nowrap; z-index: 2; }
    .empty { padding: 40px 8px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
  `]
})
export class GmLineChartComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: Series[] = [];
  @Input() format: ChartFormat = 'number';
  @Input() area = true;
  @Input() emptyText = 'Aucune donnée sur la période';

  readonly W = 600; readonly H = 200; readonly L = 40; readonly R = 10; readonly T = 10; readonly B = 22;
  ticks: number[] = [];
  hover: number | null = null;
  private max = 1;

  ngOnChanges(): void {
    const all = this.series.flatMap(s => s.values.filter((v): v is number => v !== null));
    this.max = niceMax(Math.max(...all, 0));
    this.ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * this.max);
  }

  color(s: Series, i: number): string { return s.color || CHART_COLORS[i % CHART_COLORS.length]; }
  step(): number { return (this.W - this.L - this.R) / Math.max(1, this.labels.length - 1); }
  x(i: number): number { return this.labels.length === 1 ? (this.W + this.L - this.R) / 2 : this.L + i * this.step(); }
  y(v: number): number { return this.H - this.B - (v / this.max) * (this.H - this.B - this.T); }

  path(s: Series): string {
    let d = '';
    s.values.forEach((v, i) => {
      if (v === null) return;
      d += `${d && s.values[i - 1] !== null ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(v).toFixed(1)} `;
    });
    return d;
  }

  areaPath(s: Series): string {
    const pts = s.values.map((v, i) => `${this.x(i).toFixed(1)},${this.y(v ?? 0).toFixed(1)}`);
    if (!pts.length) return '';
    return `M${this.x(0)},${this.H - this.B} L${pts.join(' L')} L${this.x(s.values.length - 1)},${this.H - this.B} Z`;
  }

  showLabel(i: number): boolean {
    const n = this.labels.length;
    const every = Math.ceil(n / 8);
    return i % every === 0 || i === n - 1 && n <= 12;
  }

  short(v: number): string {
    if (this.format === 'money' && v >= 1000) return `${fmtNumber(v / 1000, 1)} k`;
    if (this.format === 'percent') return `${fmtNumber(v)} %`;
    return fmtNumber(v, v < 10 && v % 1 !== 0 ? 1 : 0);
  }

  fmt(v: number | null): string { return formatValue(v, this.format); }
}

/* ------------------------------------------------------------------ Stacked columns */

@Component({
  selector: 'gm-column-chart',
  host: { class: 'gm-column-chart' },
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="chart" *ngIf="labels?.length; else empty">
      <div class="legend" *ngIf="series.length > 1 || target !== null">
        <span *ngFor="let s of series; let i = index"><i [style.background]="color(s, i)"></i>{{ s.name }}</span>
        <span *ngIf="target !== null"><i class="dash"></i>{{ targetLabel }}</span>
      </div>
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" (mouseleave)="hover = null">
        <g class="grid">
          <ng-container *ngFor="let t of ticks">
            <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(t)" [attr.y2]="y(t)"></line>
            <text [attr.x]="L - 6" [attr.y]="y(t) + 3" text-anchor="end">{{ short(t) }}</text>
          </ng-container>
        </g>
        <ng-container *ngFor="let l of labels; let j = index">
          <ng-container *ngFor="let s of series; let i = index">
            <rect [attr.x]="x(j)" [attr.width]="bw()" [attr.y]="y(stackTop(j, i))" [attr.height]="y(stackBottom(j, i)) - y(stackTop(j, i))"
                  [attr.fill]="color(s, i)" [attr.opacity]="hover === null || hover === j ? 1 : 0.55" rx="2"></rect>
          </ng-container>
          <rect class="hit" [attr.x]="x(j) - gap() / 2" y="0" [attr.width]="bw() + gap()" [attr.height]="H - B" (mouseenter)="hover = j"></rect>
          <text class="xl" [attr.x]="x(j) + bw() / 2" [attr.y]="H - 4" text-anchor="middle">{{ l }}</text>
        </ng-container>
        <line *ngIf="target !== null" class="target" [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(target)" [attr.y2]="y(target)"></line>
      </svg>
      <div class="tip" *ngIf="hover !== null" [style.left.%]="((x(hover) + bw() / 2) / W) * 100">
        <strong>{{ labels[hover] }} — {{ fmt(total(hover)) }}</strong>
        <span *ngFor="let s of series; let i = index"><i [style.background]="color(s, i)"></i>{{ s.name }} : {{ fmt(s.values[hover]) }}</span>
      </div>
    </div>
    <ng-template #empty><div class="empty">{{ emptyText }}</div></ng-template>
  `,
  styles: [`
    .chart { position: relative; }
    svg { width: 100%; height: auto; max-height: 230px; display: block; overflow: visible; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px; }
    .legend i, .tip i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
    .legend i.dash { height: 0; border-top: 2px dashed var(--error); border-radius: 0; vertical-align: middle; }
    .grid line { stroke: var(--gray-100); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .grid text, .xl { font-size: 10px; fill: var(--text-muted); font-family: var(--font-sans); }
    .hit { fill: transparent; }
    .target { stroke: var(--error); stroke-width: 1.5; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }
    .tip { position: absolute; top: 18px; transform: translateX(-50%); background: var(--gray-900); color: #fff; border-radius: 6px; padding: 6px 9px; font-size: 0.72rem; pointer-events: none; display: flex; flex-direction: column; gap: 2px; white-space: nowrap; z-index: 2; }
    .empty { padding: 40px 8px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
  `]
})
export class GmColumnChartComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: Series[] = [];
  @Input() format: ChartFormat = 'number';
  @Input() target: number | null = null;
  @Input() targetLabel = 'Objectif';
  @Input() emptyText = 'Aucune donnée sur la période';

  readonly W = 600; readonly H = 200; readonly L = 40; readonly R = 10; readonly T = 10; readonly B = 22;
  ticks: number[] = [];
  hover: number | null = null;
  private max = 1;

  ngOnChanges(): void {
    const totals = this.labels.map((_, j) => this.total(j));
    this.max = niceMax(Math.max(...totals, this.target ?? 0, 0));
    this.ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * this.max);
  }

  color(s: Series, i: number): string { return s.color || CHART_COLORS[i % CHART_COLORS.length]; }
  slot(): number { return (this.W - this.L - this.R) / Math.max(1, this.labels.length); }
  gap(): number { return this.slot() * 0.3; }
  bw(): number { return this.slot() - this.gap(); }
  x(j: number): number { return this.L + j * this.slot() + this.gap() / 2; }
  y(v: number): number { return this.H - this.B - (v / this.max) * (this.H - this.B - this.T); }
  total(j: number): number { return this.series.reduce((sum, s) => sum + (s.values[j] ?? 0), 0); }
  stackBottom(j: number, i: number): number { return this.series.slice(0, i).reduce((sum, s) => sum + (s.values[j] ?? 0), 0); }
  stackTop(j: number, i: number): number { return this.stackBottom(j, i) + (this.series[i].values[j] ?? 0); }

  short(v: number): string {
    if (this.format === 'money' && v >= 1000) return `${fmtNumber(v / 1000, 1)} k`;
    return fmtNumber(v, v < 10 && v % 1 !== 0 ? 1 : 0);
  }

  fmt(v: number | null): string { return formatValue(v, this.format); }
}

/* ------------------------------------------------------------------ Donut */

export interface DonutSlice { label: string; value: number; color?: string; }

@Component({
  selector: 'gm-donut',
  host: { class: 'gm-donut' },
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="donut" *ngIf="total > 0; else empty">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--gray-100)" stroke-width="6"></circle>
        <circle *ngFor="let s of arcs; let i = index" cx="21" cy="21" r="15.9" fill="none" [attr.stroke]="s.color"
                stroke-width="6" [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.offset" transform="rotate(-90 21 21)"></circle>
        <text x="21" y="20.5" text-anchor="middle" class="c-val">{{ center ?? total }}</text>
        <text x="21" y="26" text-anchor="middle" class="c-lab">{{ centerLabel }}</text>
      </svg>
      <div class="leg">
        <div *ngFor="let s of arcs"><i [style.background]="s.color"></i><span>{{ s.label }}</span><b>{{ s.pct }} %</b></div>
      </div>
    </div>
    <ng-template #empty><div class="empty">{{ emptyText }}</div></ng-template>
  `,
  styles: [`
    .donut { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    svg { width: 132px; height: 132px; flex-shrink: 0; }
    .c-val { font-size: 6.5px; font-weight: 600; fill: var(--text); font-family: var(--font-sans); }
    .c-lab { font-size: 2.8px; fill: var(--text-muted); font-family: var(--font-sans); }
    .leg { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 7px; }
    .leg div { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--text-secondary); }
    .leg i { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .leg b { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--text); font-weight: 600; }
    .empty { padding: 24px 8px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
  `]
})
export class GmDonutComponent implements OnChanges {
  @Input() slices: DonutSlice[] = [];
  @Input() center: string | number | null = null;
  @Input() centerLabel = '';
  @Input() emptyText = 'Aucune donnée';

  total = 0;
  arcs: { label: string; color: string; dash: string; offset: number; pct: number }[] = [];

  ngOnChanges(): void {
    this.total = this.slices.reduce((s, x) => s + x.value, 0);
    let acc = 0;
    this.arcs = this.slices.filter(s => s.value > 0).map((s, i) => {
      const pct = this.total ? (s.value / this.total) * 100 : 0;
      const arc = { label: s.label, color: s.color || CHART_COLORS[i % CHART_COLORS.length], dash: `${pct} ${100 - pct}`, offset: -acc, pct: Math.round(pct) };
      acc += pct;
      return arc;
    });
  }
}

/* ------------------------------------------------------------------ Sparkline */

@Component({
  selector: 'gm-sparkline',
  host: { class: 'gm-sparkline' },
  standalone: true,
  imports: [NgIf, NgStyle],
  template: `
    <svg *ngIf="points" viewBox="0 0 100 28" preserveAspectRatio="none">
      <polyline [attr.points]="points" [attr.stroke]="color"></polyline>
    </svg>
  `,
  styles: [`
    :host { display: inline-block; width: 78px; height: 24px; }
    svg { width: 100%; height: 100%; overflow: visible; }
    polyline { fill: none; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  `]
})
export class GmSparklineComponent implements OnChanges {
  @Input() values: number[] = [];
  @Input() color = 'var(--primary-500)';
  points = '';

  ngOnChanges(): void {
    if (!this.values?.length) { this.points = ''; return; }
    const max = Math.max(...this.values);
    const min = Math.min(...this.values);
    const span = max - min || 1;
    const step = this.values.length > 1 ? 100 / (this.values.length - 1) : 100;
    this.points = this.values.map((v, i) => `${(i * step).toFixed(1)},${(26 - ((v - min) / span) * 24).toFixed(1)}`).join(' ');
  }
}

export const GM_CHARTS = [GmBarListComponent, GmLineChartComponent, GmColumnChartComponent, GmDonutComponent, GmSparklineComponent] as const;
