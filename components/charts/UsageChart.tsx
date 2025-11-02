'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface UsageChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  valuePrefix?: string;
  valueSuffix?: string;
  color?: string;
  height?: number;
}

export function UsageChart({
  title,
  description,
  data,
  valuePrefix = '',
  valueSuffix = '',
  color = '#3b82f6',
  height = 200,
}: UsageChartProps) {
  const { maxValue, points, totalValue } = useMemo(() => {
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const total = values.reduce((sum, v) => sum + v, 0);

    // Create SVG path points
    const chartWidth = 100; // percentage
    const chartHeight = 100; // percentage
    const step = chartWidth / Math.max(data.length - 1, 1);

    const pts = data.map((d, i) => {
      const x = i * step;
      const y = chartHeight - (d.value / max) * chartHeight;
      return { x, y, value: d.value, date: d.date, label: d.label };
    });

    return { maxValue: max, points: pts, totalValue: total };
  }, [data]);

  // Create SVG path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [points]);

  // Create area path (for gradient fill)
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} 100`; // Start at bottom left
    path += ` L ${points[0].x} ${points[0].y}`; // Go to first point
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    path += ` L ${points[points.length - 1].x} 100`; // Go to bottom right
    path += ' Z'; // Close path
    return path;
  }, [points]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="text-2xl font-bold">
          {valuePrefix}
          {totalValue.toLocaleString()}
          {valueSuffix}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: `${height}px` }}>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                d={areaPath}
                fill={`url(#gradient-${title})`}
              />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />

              {/* Data points */}
              {points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="1"
                    fill={color}
                    className="cursor-pointer hover:r-1.5 transition-all"
                  />
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* Labels */}
        {data.length > 0 && (
          <div className="flex justify-between mt-4 text-xs text-muted-foreground">
            <span>{data[0].label || new Date(data[0].date).toLocaleDateString()}</span>
            <span>
              {data[data.length - 1].label || new Date(data[data.length - 1].date).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

