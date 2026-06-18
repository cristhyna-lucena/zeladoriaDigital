'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geocodeAddress } from '../lib/geocode';
import {
  isActiveOccurrenceForMap,
  OCCURRENCE_STATUS_COLORS,
  occurrencePopupHtml
} from '../lib/occurrence-map';
import type { OccurrenceRecord } from '../lib/api-types';
import type { MapRegionConfig } from '../lib/map-region';
import type { MapRegionMarker } from '../components/map-region-picker';

export function useOccurrenceMapMarkers(occurrences: OccurrenceRecord[], region: MapRegionConfig) {
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const [geocoding, setGeocoding] = useState(false);
  const geocodedIds = useRef(new Set<string>());

  const activeOccurrences = useMemo(
    () => occurrences.filter((item) => isActiveOccurrenceForMap(item.status)),
    [occurrences]
  );

  const missingCoords = useMemo(
    () =>
      activeOccurrences.filter(
        (item) =>
          (item.latitude == null || item.longitude == null) &&
          typeof item.address === 'string' &&
          item.address.trim()
      ),
    [activeOccurrences]
  );

  useEffect(() => {
    const pending = missingCoords.filter((item) => !geocodedIds.current.has(item.id));
    if (pending.length === 0) return;

    let cancelled = false;

    async function resolveMissing() {
      setGeocoding(true);

      for (const item of pending) {
        if (cancelled) break;

        const coords = await geocodeAddress(item.address ?? '', region.municipio, region.estado);
        if (coords) {
          geocodedIds.current.add(item.id);
          setResolvedCoords((current) => ({
            ...current,
            [item.id]: coords
          }));
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (!cancelled) setGeocoding(false);
    }

    void resolveMissing();

    return () => {
      cancelled = true;
    };
  }, [missingCoords, region.municipio, region.estado]);

  const markers = useMemo(() => {
    return activeOccurrences
      .map((item) => {
        const latitude = item.latitude ?? resolvedCoords[item.id]?.latitude;
        const longitude = item.longitude ?? resolvedCoords[item.id]?.longitude;
        if (latitude == null || longitude == null) return null;

        return {
          lat: latitude,
          lng: longitude,
          color: OCCURRENCE_STATUS_COLORS[item.status ?? 'ABERTO'] ?? OCCURRENCE_STATUS_COLORS.ABERTO,
          popupHtml: occurrencePopupHtml({
            id: item.id,
            protocol: item.protocol ?? '',
            title: item.title ?? undefined,
            description: item.description ?? '',
            status: item.status ?? 'ABERTO',
            priority: item.priority ?? 'MEDIA',
            latitude,
            longitude,
            category: item.category,
            suggestedDepartment: item.suggestedDepartment,
            neighborhood: item.neighborhood
          })
        } satisfies MapRegionMarker;
      })
      .filter(Boolean) as MapRegionMarker[];
  }, [activeOccurrences, resolvedCoords]);

  const withoutLocation = activeOccurrences.length - markers.length;

  return {
    markers,
    activeCount: activeOccurrences.length,
    withoutLocation,
    geocoding
  };
}
