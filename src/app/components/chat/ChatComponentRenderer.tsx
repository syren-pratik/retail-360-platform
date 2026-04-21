'use client';

import { UIComponentType } from '@/app/lib/types';
import GenerativeBarChart from './GenerativeBarChart';
import GenerativeDonutChart from './GenerativeDonutChart';
import GenerativeLineChart from './GenerativeLineChart';
import GenerativeDataTable from './GenerativeDataTable';
import GenerativeKPICard from './GenerativeKPICard';
import GenerativeComparison from './GenerativeComparison';

interface ElementClickData {
  key: string;
  value: string | number;
  label: string;
  chartTitle?: string;
}

interface ChatComponentRendererProps {
  component: UIComponentType;
  onElementClick?: (data: ElementClickData) => void;
}

export default function ChatComponentRenderer({
  component,
  onElementClick,
}: ChatComponentRendererProps) {
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
