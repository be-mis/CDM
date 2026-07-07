import React, { createContext, useContext, useId, useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '../../lib/utils';

const ChartContext = createContext(null);

function useChart() {
  const context = useContext(ChartContext);
  if (!context) throw new Error('Chart components must be used within a <ChartContainer />');
  return context;
}

export function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig.map(([key, cfg]) => `  --color-${key}: ${cfg.color};`).join('\n')}
}
`,
      }}
    />
  );
}

export function ChartTooltip(props) {
  return <Tooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  label,
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'grid min-w-[10rem] gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md',
        className,
      )}
    >
      {!hideLabel && label && <div className="font-medium text-gray-900">{label}</div>}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const key = item.name || item.dataKey;
          const cfg = config[key];
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {indicator === 'dot' && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-gray-600">{cfg?.label || key}</span>
              </div>
              <span className="font-mono font-medium text-gray-900">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend(props) {
  return <Legend {...props} />;
}

export function ChartLegendContent({ payload }) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload.map((item, i) => {
        const key = item.dataKey || item.value;
        const cfg = config[key];
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{cfg?.label || key}</span>
          </div>
        );
      })}
    </div>
  );
}