'use client';

import { UIComponentType } from '@/app/lib/types';
import GenerativeBarChart from '@/app/components/chat/GenerativeBarChart';
import GenerativeDonutChart from '@/app/components/chat/GenerativeDonutChart';
import GenerativeLineChart from '@/app/components/chat/GenerativeLineChart';
import GenerativeDataTable from '@/app/components/chat/GenerativeDataTable';
import GenerativeKPICard from '@/app/components/chat/GenerativeKPICard';
import GenerativeComparison from '@/app/components/chat/GenerativeComparison';

interface ElementClickData {
  key: string;
  value: string | number;
  label: string;
  chartTitle?: string;
}

interface SingleComponentRendererProps {
  component: UIComponentType;
  onElementClick?: (data: ElementClickData) => void;
}

// Exact mapping copied from ChatComponentRenderer — one component at a time.
function SingleComponentRenderer({ component, onElementClick }: SingleComponentRendererProps) {
  if (!component || component.type === 'text_only') {
    return null;
  }

  switch (component.type) {
    case 'bar_chart':
      return (
        <GenerativeBarChart
          data={component.data}
          x_key={component.x_key}
          y_key={component.y_key}
          title={component.title}
          color={component.color}
          onBarClick={onElementClick ? (data) => onElementClick({
            key: component.x_key,
            value: data[component.x_key] as string | number,
            label: component.x_key,
            chartTitle: component.title,
          }) : undefined}
        />
      );

    case 'donut_chart':
      return (
        <GenerativeDonutChart
          data={component.data}
          name_key={component.name_key}
          value_key={component.value_key}
          title={component.title}
          onSegmentClick={onElementClick ? (data) => onElementClick({
            key: component.name_key,
            value: data[component.name_key] as string | number,
            label: component.name_key,
            chartTitle: component.title,
          }) : undefined}
        />
      );

    case 'line_chart':
      return (
        <GenerativeLineChart
          data={component.data}
          x_key={component.x_key}
          y_key={component.y_key}
          title={component.title}
          onPointClick={onElementClick ? (data) => onElementClick({
            key: component.x_key,
            value: data[component.x_key] as string | number,
            label: component.x_key,
            chartTitle: component.title,
          }) : undefined}
        />
      );

    case 'data_table':
      return (
        <GenerativeDataTable
          data={component.data}
          columns={component.columns}
          title={component.title}
        />
      );

    case 'kpi_card':
      return (
        <GenerativeKPICard
          label={component.label}
          value={component.value}
          change={component.change}
          direction={component.direction}
        />
      );

    case 'comparison':
      return <GenerativeComparison items={component.items} />;

    default:
      return null;
  }
}

interface AskCanvasProps {
  components: UIComponentType[];
  onElementClick?: (data: ElementClickData) => void;
}

export default function AskCanvas({ components, onElementClick }: AskCanvasProps) {
  if (!components || components.length === 0) return null;

  // KPI cards flow side-by-side; everything else stacks full-width.
  const kpis = components.filter((c) => c.type === 'kpi_card');
  const rest = components.filter((c) => c.type !== 'kpi_card');

  return (
    <div className="space-y-3 mt-3">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.map((component, index) => (
            <SingleComponentRenderer key={`kpi-${index}`} component={component} onElementClick={onElementClick} />
          ))}
        </div>
      )}
      {rest.map((component, index) => (
        <div key={index}>
          <SingleComponentRenderer component={component} onElementClick={onElementClick} />
        </div>
      ))}
    </div>
  );
}
