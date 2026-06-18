'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, type AuthSession } from '../../lib/auth';
import { createOccurrence, fetchCategories, fetchDepartments, fetchNeighborhoods, uploadOccurrenceAttachment } from '../../lib/api';
import { fetchCurrentUser } from '../../lib/auth-api';
import { CitizenShell } from '../../components/citizen-shell';
import { CitizenMediaPicker, type PendingMedia } from '../../components/citizen-media-picker';
import type { CategoryRecord, DepartmentRecord, NeighborhoodRecord } from '../../lib/api-types';

const EMPTY_FORM = {
  title: '',
  description: '',
  street: '',
  categoryId: '',
  neighborhoodId: '',
  suggestedDepartmentId: ''
};

function hasGpsCoords(coords: { latitude?: number; longitude?: number }) {
  return coords.latitude != null && coords.longitude != null;
}

function buildOccurrenceAddress(
  street: string,
  neighborhoodId: string,
  neighborhoods: NeighborhoodRecord[],
  coords: { latitude?: number; longitude?: number }
) {
  if (hasGpsCoords(coords) && !street.trim()) {
    return 'Localização enviada pelo celular';
  }

  const parts: string[] = [];
  if (street.trim()) parts.push(street.trim());

  const neighborhoodName = neighborhoods.find((item) => item.id === neighborhoodId)?.name;
  if (neighborhoodName) parts.push(neighborhoodName);

  return parts.join(', ');
}

export default function NewOccurrencePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [mediaItems, setMediaItems] = useState<PendingMedia[]>([]);

  const usingGps = hasGpsCoords(coords);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.replace('/login');
      return;
    }

    fetchCurrentUser(currentSession.accessToken)
      .then((user) => setSession({ ...currentSession, user }))
      .catch(() => {
        clearSession();
        router.replace('/login');
      })
      .finally(() => {
        Promise.all([
          fetchCategories(currentSession.accessToken),
          fetchNeighborhoods(currentSession.accessToken),
          fetchDepartments(currentSession.accessToken)
        ])
          .then(([loadedCategories, loadedNeighborhoods, loadedDepartments]) => {
            setCategories(loadedCategories as CategoryRecord[]);
            setNeighborhoods(loadedNeighborhoods as NeighborhoodRecord[]);
            setDepartments(loadedDepartments as DepartmentRecord[]);
          })
          .finally(() => setLoading(false));
      });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.suggestedDepartmentId) {
      setError('Selecione a secretaria que deve receber sua solicitação.');
      return;
    }

    if (!usingGps) {
      if (!form.neighborhoodId) {
        setError('Selecione o bairro ou use sua localização.');
        return;
      }
      if (!form.street.trim()) {
        setError('Informe a rua ou use sua localização.');
        return;
      }
    }

    const address = buildOccurrenceAddress(form.street, form.neighborhoodId, neighborhoods, coords);
    if (!address && !usingGps) {
      setError('Informe bairro e rua, ou compartilhe sua localização.');
      return;
    }

    const accessToken = session?.accessToken ?? getSession()?.accessToken;
    if (!accessToken) {
      setError('Sessão expirada. Faça login novamente.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createOccurrence(
        {
          title: form.title.trim() || undefined,
          description: form.description.trim(),
          address: address || undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
          citizenId: session?.user.role === 'CIDADAO' ? session.user.id : undefined,
          categoryId: form.categoryId || undefined,
          neighborhoodId: usingGps ? undefined : form.neighborhoodId || undefined,
          suggestedDepartmentId: form.suggestedDepartmentId
        },
        accessToken
      );

      for (const media of mediaItems) {
        await uploadOccurrenceAttachment(result.id, media.file, accessToken);
      }

      const departmentName =
        departments.find((item) => item.id === form.suggestedDepartmentId)?.name ?? 'secretaria selecionada';

      setSuccess(
        `Solicitação ${result.protocol} enviada para ${departmentName}. Acompanhe o andamento em "Minhas solicitações".`
      );
      setForm(EMPTY_FORM);
      setCoords({});
      mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setMediaItems([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível registrar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError('Seu navegador não suporta geolocalização.');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocating(false);
      },
      () => {
        setError('Não foi possível capturar a localização. Informe bairro e rua.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function clearLocation() {
    setCoords({});
    setError(null);
  }

  if (loading) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Carregando</p>
          <h1>Preparando formulário...</h1>
        </section>
      </main>
    );
  }

  return (
    <CitizenShell
      title="Nova solicitação"
      subtitle="Descreva o problema, informe onde está ou compartilhe sua localização pelo celular."
    >
      <section className="panel citizen-form-panel">
        <form className="occurrence-form" onSubmit={handleSubmit}>
          <label>
            Secretaria responsável *
            <select
              required
              value={form.suggestedDepartmentId}
              onChange={(e) => setForm((current) => ({ ...current, suggestedDepartmentId: e.target.value }))}
            >
              <option value="">Selecione para onde enviar</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Título
            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Ex.: Buraco na rua, falta de iluminação..."
            />
          </label>

          <label>
            Descrição *
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              rows={5}
              placeholder="Explique o que está acontecendo com o máximo de detalhes possível."
            />
          </label>

          <section className="citizen-location-block">
            <div className="citizen-location-block__header">
              <div>
                <p className="eyebrow">Localização</p>
                <h3>Onde está o problema?</h3>
              </div>
            </div>

            <button
              type="button"
              className="citizen-location-block__gps-btn"
              onClick={captureLocation}
              disabled={locating}
            >
              {locating ? 'Capturando localização...' : usingGps ? 'Atualizar minha localização' : 'Usar minha localização'}
            </button>

            {usingGps ? (
              <div className="citizen-location-block__status citizen-location-block__status--ok">
                <p>Localização capturada. Bairro e rua não são necessários.</p>
                <p className="citizen-location-block__coords">
                  {coords.latitude?.toFixed(5)}, {coords.longitude?.toFixed(5)}
                </p>
                <button type="button" className="citizen-location-block__link" onClick={clearLocation}>
                  Informar endereço manualmente
                </button>
              </div>
            ) : (
              <>
                <p className="citizen-location-block__hint">
                  Sem GPS, informe bairro e rua para localizar a solicitação.
                </p>

                <label>
                  Bairro *
                  <select
                    value={form.neighborhoodId}
                    onChange={(e) => setForm((current) => ({ ...current, neighborhoodId: e.target.value }))}
                  >
                    <option value="">Selecione o bairro</option>
                    {neighborhoods.map((neighborhood) => (
                      <option key={neighborhood.id} value={neighborhood.id}>
                        {neighborhood.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Rua *
                  <input
                    value={form.street}
                    onChange={(e) => setForm((current) => ({ ...current, street: e.target.value }))}
                    placeholder="Nome da rua, número ou ponto de referência"
                  />
                </label>
              </>
            )}
          </section>

          <CitizenMediaPicker items={mediaItems} onChange={setMediaItems} disabled={submitting} />

          <label>
            Categoria
            <select value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))}>
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </div>

          {success ? <p className="success-message">{success}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </section>
    </CitizenShell>
  );
}
