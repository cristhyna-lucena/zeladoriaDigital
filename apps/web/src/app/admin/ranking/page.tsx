'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRanking, getStoredAccessToken } from '../../../lib/api';
import { GlobalFiltersBar, type GlobalFilters } from '../../../components/global-filters';
import type { RankingCityItem, RankingItem } from '../../../lib/api-types';

type RankingResponse = {
  city?: RankingCityItem[];
  departments?: RankingItem[];
  neighborhoods?: RankingItem[];
  categories?: RankingItem[];
};

export default function RankingPage() {
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
  const ranking = useQuery({
    queryKey: ['ranking', queryFilters],
    queryFn: () => fetchRanking(queryFilters, getStoredAccessToken()),
    staleTime: 60_000
  });
  const rankingData = ranking.data as RankingResponse | undefined;

  return (
    <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Ranking</p>
        <h2>Ranking inteligente de ocorrencias</h2>
      </header>
      <GlobalFiltersBar value={filters} onChange={setFilters} />
      {ranking.isLoading ? <p>Carregando ranking...</p> : null}
      <div className="two-col">
        <article className="chart-card">
          <h3>Cidade</h3>
          <div className="rank-list">
            {(rankingData?.city ?? []).slice(0, 10).map((item, index) => (
              <article className="list-item" key={item.id ?? index}>
                <strong>#{index + 1} {item.classification ?? 'MEDIA'}</strong>
                <p>{item.title}</p>
                <p>Score: {item.score ?? 0}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="chart-card">
          <h3>Secretarias criticas</h3>
          <div className="rank-list">
            {(rankingData?.departments ?? []).slice(0, 8).map((item) => (
              <article className="list-item" key={item.label}>
                <strong>{item.label}</strong>
                <p>Total: {item.total}</p>
                <p>Media: {item.averageScore}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
      <div className="two-col">
        <article className="chart-card">
          <h3>Bairros</h3>
          <div className="rank-list">
            {(rankingData?.neighborhoods ?? []).slice(0, 8).map((item) => (
              <article className="list-item" key={item.label}>
                <strong>{item.label}</strong>
                <p>Total: {item.total}</p>
                <p>Urgentes: {item.urgent}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="chart-card">
          <h3>Categorias</h3>
          <div className="rank-list">
            {(rankingData?.categories ?? []).slice(0, 8).map((item) => (
              <article className="list-item" key={item.label}>
                <strong>{item.label}</strong>
                <p>Total: {item.total}</p>
                <p>Media: {item.averageScore}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
