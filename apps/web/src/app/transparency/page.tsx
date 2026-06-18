'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTransparency } from '../../lib/api';
import { GlobalFiltersBar, type GlobalFilters } from '../../components/global-filters';
import { SidebarShell } from '../../components/sidebar-shell';
import type { NamedCountItem, TransparencySummary } from '../../lib/api-types';

export default function TransparencyPage() {
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
    queryKey: ['public-transparency', queryFilters],
    queryFn: () => fetchPublicTransparency(queryFilters),
    staleTime: 60_000
  });
  const data = dashboard.data ?? {} as TransparencySummary;

  return (
    <main className="shell">
      <SidebarShell />
      <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Transparencia</p>
        <h2>Portal de transparencia</h2>
        <p>Sem exposicao de dados pessoais sensiveis.</p>
      </header>
      <GlobalFiltersBar value={filters} onChange={setFilters} />
      <div className="metrics">
        <article className="metric"><span>Total de demandas</span><strong>{data.totalDemandas ?? 0}</strong></article>
        <article className="metric"><span>Concluidas</span><strong>{data.demandasConcluidas ?? 0}</strong></article>
        <article className="metric"><span>Tempo medio</span><strong>{data.tempoMedioHoras ?? 0}h</strong></article>
        <article className="metric"><span>Sigilo</span><strong>Ativo</strong></article>
      </div>
      <div className="two-col">
        <article className="chart-card">
          <h3>Categorias mais frequentes</h3>
          <ul className="rank-list">
            {(data.categoriasMaisFrequentes ?? []).map((item: NamedCountItem) => (
              <li className="list-item" key={item.label}>{item.label} - {item.value}</li>
            ))}
          </ul>
        </article>
        <article className="chart-card">
          <h3>Bairros mais atendidos</h3>
          <ul className="rank-list">
            {(data.bairrosMaisAtendidos ?? []).map((item: NamedCountItem) => (
              <li className="list-item" key={item.label}>{item.label} - {item.value}</li>
            ))}
          </ul>
        </article>
      </div>
      </section>
    </main>
  );
}
