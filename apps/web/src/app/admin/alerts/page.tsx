'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAlerts, getStoredAccessToken } from '../../../lib/api';
import { GlobalFiltersBar, type GlobalFilters } from '../../../components/global-filters';
import type { AlertItem } from '../../../lib/api-types';

export default function AlertsPage() {
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
  const alerts = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters, getStoredAccessToken()),
    staleTime: 60_000
  });

  return (
    <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Alertas</p>
        <h2>Alertas gerenciais</h2>
      </header>
      <GlobalFiltersBar value={filters} onChange={setFilters} />
      {alerts.isLoading ? <p>Carregando alertas...</p> : null}
      <div className="alert-list">
        {(alerts.data ?? []).map((item: AlertItem) => (
          <article className="list-item" key={item.id}>
            <span className="pill">{item.level}</span>
            <h3>{item.title}</h3>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
