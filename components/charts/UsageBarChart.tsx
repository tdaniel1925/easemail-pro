'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BarData {
  label: string;
  value: number;
  color?: string;
  subLabel?: string;
}

interface UsageBarChartProps {
  title: string;
  description?: string;
  data: BarData[];
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
}

export function UsageBarChart({
  title,
  description,
  data,
  valuePrefix = '',
  valueSuffix = '',
  height = 300,
}: UsageBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ minHeight: `${height}px` }}>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              const color = item.color || '#3b82f6';

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{item.label}</span>
                      {item.subLabel && (
                        <span className="text-muted-foreground text-xs">
                          ({item.subLabel})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold">
                      {valuePrefix}
                      {item.value.toLocaleString()}
                      {valueSuffix}
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

