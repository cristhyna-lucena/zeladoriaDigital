'use client';

import { useQuery } from '@tanstack/react-query';
import { MapRegionPicker } from './map-region-picker';
import { fetchServiceAreas, getStoredAccessToken } from '../lib/api';
import { useOccurrenceMapMarkers } from '../hooks/use-occurrence-map-markers';
import { DEFAULT_MAP_REGION, mapRegionFromServiceArea } from '../lib/map-region';
import type { OccurrenceRecord } from '../lib/api-types';

type OperationalMapPanelProps = {
  occurrences: OccurrenceRecord[];
  compact?: boolean;
};

export function OperationalMapPanel({ occurrences, compact = true }: OperationalMapPanelProps) {
  const regionQuery = useQuery({
    queryKey: ['map-region'],
    queryFn: () => fetchServiceAreas(getStoredAccessToken()),
    staleTime: 60_000
  });

  const activeArea = (regionQuery.data ?? []).find((area) => area.ativo) ?? regionQuery.data?.[0];
  const region = activeArea ? mapRegionFromServiceArea(activeArea) : DEFAULT_MAP_REGION;
  const { markers, activeCount, withoutLocation, geocoding } = useOccurrenceMapMarkers(occurrences, region);

  return (
    <div className="operational-map-panel">
      <MapRegionPicker
        latitude={region.latitudeCentro}
        longitude={region.longitudeCentro}
        raioMetros={region.raioMetros}
        interactive={false}
        showCenterPin={false}
        markers={markers}
      />
      <div className="operational-map-badge">
        <strong>{markers.length}</strong>
        <span>{markers.length === 1 ? 'chamado no mapa' : 'chamados no mapa'}</span>
      </div>
      {geocoding ? (
        <p className="operational-map-empty muted-copy">Localizando chamados pelo endereço...</p>
      ) : null}
      {!geocoding && activeCount === 0 ? (
        <p className="operational-map-empty muted-copy">Nenhum chamado aberto ou em atendimento.</p>
      ) : null}
      {!geocoding && activeCount > 0 && markers.length === 0 ? (
        <p className="operational-map-empty muted-copy">
          {activeCount} chamado(s) ativo(s), mas sem endereço ou localização para exibir no mapa.
        </p>
      ) : null}
      {!geocoding && withoutLocation > 0 && markers.length > 0 ? (
        <p className="operational-map-empty muted-copy">
          {withoutLocation} chamado(s) ativo(s) ainda sem localização no mapa.
        </p>
      ) : null}
    </div>
  );
}
