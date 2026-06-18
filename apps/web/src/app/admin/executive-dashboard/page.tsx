'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExecutiveDashboard, fetchExecutiveSummary } from '../../../lib/api';
import { GlobalFiltersBar, type GlobalFilters } from '../../../components/global-filters';

type ExecutiveDashboardResponse = {
  totalOccurrences?: number;
  openOccurrences?: number;
  inProgressOccurrences?: number;
  completedOccurrences?: number;
  satisfactionIndex?: number;
  averageResolutionHours?: number;
};

export default function ExecutiveDashboardPage() {
  const [filters, setFilters] = useState<GlobalFilters>({
    periodStart: '',
    periodEnd: '',
    departmentId: '',
    categoryId: '',
    neighborhoodId: '',
    status: '',
    priority: '',
    source: ''
  });
  const queryFilters = useMemo(() => filters, [filters]);
  const dashboard = useQuery({
    queryKey: ['executive-dashboard', queryFilters],
    queryFn: () => fetchExecutiveDashboard(queryFilters),
    staleTime: 60_000
  });
  const summary = useQuery({
    queryKey: ['executive-summary', queryFilters],
    queryFn: () => fetchExecutiveSummary(queryFilters) as Promise<{ summary?: string }>,
    staleTime: 60_000
  });
  const data = (dashboard.data ?? {}) as ExecutiveDashboardResponse;

  const metrics = [
    ['Total de Ocorrências', data.totalOccurrences ?? 0],
    ['Abertas', data.openOccurrences ?? 0],
    ['Em andamento', data.inProgressOccurrences ?? 0],
    ['Concluídas', data.completedOccurrences ?? 0]
  ];

  return (
    <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Painel Executivo</p>
        <h2>Painel executivo municipal</h2>
        <p>Visão consolidada da operação com resumo automático e indicadores principais.</p>
      </header>
      <GlobalFiltersBar value={filters} onChange={setFilters} />
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <article className="metric" key={label as string}>
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </article>
        ))}
      </div>
      <div className="two-col">
        <article className="chart-card">
          <h3>Resumo executivo</h3>
          <p>{summary.data?.summary ?? 'Carregando resumo...'}</p>
        </article>
        <article className="chart-card">
          <h3>Indicadores rápidos</h3>
          <p>Total concluído: {data.completedOccurrences ?? 0}</p>
          <p>Índice de satisfação: {data.satisfactionIndex ?? 0}</p>
          <p>Tempo médio de atendimento: {data.averageResolutionHours ?? 0}h</p>
        </article>
      </div>
    </section>
  );
}
