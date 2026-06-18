'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, type AuthSession } from '../../lib/auth';
import { fetchCurrentUser } from '../../lib/auth-api';
import {
  createOccurrence,
  fetchCategories,
  fetchDepartments,
  fetchNeighborhoods,
  fetchOccurrences,
  updateOccurrence,
  updateOccurrenceStatus
} from '../../lib/api';
import { formatOccurrenceStatus, formatPriority } from '../../lib/occurrence-map';
import { SidebarShell } from '../../components/sidebar-shell';
import {
  EMPTY_OCCURRENCE_FORM,
  KanbanOccurrenceModal,
  type OccurrenceFormValues
} from '../../components/kanban-occurrence-modal';
import type { CategoryRecord, DepartmentRecord, NeighborhoodRecord } from '../../lib/api-types';

type Occurrence = {
  id: string;
  protocol: string;
  title?: string | null;
  description: string;
  status: string;
  priority: string;
  address: string;
  categoryId?: string | null;
  neighborhoodId?: string | null;
  suggestedDepartmentId?: string | null;
  category?: { id?: string; name?: string | null } | null;
  neighborhood?: { id?: string; name?: string | null } | null;
  suggestedDepartment?: { id?: string; name?: string | null } | null;
};

const columns = [
  { key: 'ABERTO', label: 'Aberto' },
  { key: 'EM_ANALISE', label: 'Em análise' },
  { key: 'ENCAMINHADO', label: 'Encaminhado' },
  { key: 'EM_EXECUCAO', label: 'Execução' },
  { key: 'CONCLUIDO', label: 'Concluído' }
];

function pickValidId(
  value: string | null | undefined,
  fallback: string | undefined,
  options: { id: string }[]
) {
  const candidate = value ?? fallback ?? '';
  return candidate && options.some((item) => item.id === candidate) ? candidate : '';
}

function resolveOptionId(
  value: string | null | undefined,
  related: { id?: string; name?: string | null } | null | undefined,
  options: { id: string; name?: string | null }[]
) {
  const byId = pickValidId(value, related?.id, options);
  if (byId) return byId;

  const name = related?.name?.trim();
  if (!name) return '';

  return options.find((item) => item.name === name)?.id ?? '';
}

function formatSaveError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Não foi possível salvar a ocorrência.';
}

function getAccessToken(session: AuthSession | null) {
  return session?.accessToken ?? getSession()?.accessToken;
}

function mapOccurrenceToForm(
  item: Occurrence,
  categories: { id: string; name?: string | null }[],
  neighborhoods: { id: string; name?: string | null }[],
  departments: { id: string; name?: string | null }[]
): OccurrenceFormValues {
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    address: item.address ?? '',
    status: item.status,
    priority: item.priority,
    categoryId: resolveOptionId(item.categoryId, item.category, categories),
    neighborhoodId: resolveOptionId(item.neighborhoodId, item.neighborhood, neighborhoods),
    suggestedDepartmentId: resolveOptionId(
      item.suggestedDepartmentId,
      item.suggestedDepartment,
      departments
    )
  };
}

function mapFormToPayload(form: OccurrenceFormValues) {
  return {
    title: form.title.trim() || undefined,
    description: form.description.trim(),
    address: form.address.trim(),
    status: form.status,
    priority: form.priority,
    categoryId: form.categoryId || undefined,
    neighborhoodId: form.neighborhoodId || undefined,
    suggestedDepartmentId: form.suggestedDepartmentId || undefined
  };
}

export default function OccurrencesPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<Occurrence[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OccurrenceFormValues>(EMPTY_OCCURRENCE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

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
          fetchOccurrences(currentSession.accessToken),
          fetchCategories(currentSession.accessToken),
          fetchNeighborhoods(currentSession.accessToken),
          fetchDepartments(currentSession.accessToken)
        ])
          .then(([occurrences, loadedCategories, loadedNeighborhoods, loadedDepartments]) => {
            setItems(occurrences as Occurrence[]);
            setCategories(loadedCategories as CategoryRecord[]);
            setNeighborhoods(loadedNeighborhoods as NeighborhoodRecord[]);
            setDepartments(loadedDepartments as DepartmentRecord[]);
          })
          .catch(() => setItems([]))
          .finally(() => setLoading(false));
      });
  }, [router]);

  function openCreateModal(status = 'ABERTO') {
    setModalMode('create');
    setEditingId(null);
    setForm({ ...EMPTY_OCCURRENCE_FORM, status });
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(item: Occurrence) {
    setModalMode('edit');
    setEditingId(item.id);
    setForm(mapOccurrenceToForm(item, categories, neighborhoods, departments));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function moveOccurrence(id: string, status: string) {
    setBusyId(id);
    try {
      const updated = await updateOccurrenceStatus(id, status, getAccessToken(session));
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...updated, status: updated.status } : item))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveForm() {
    if (!form.description.trim() || !form.address.trim()) {
      setFormError('Preencha descrição e endereço.');
      return;
    }
    if (!form.suggestedDepartmentId) {
      setFormError('Selecione a secretaria responsável.');
      return;
    }

    setSavingForm(true);
    setFormError(null);

    try {
      const payload = mapFormToPayload(form);
      const accessToken = getAccessToken(session);

      if (!accessToken) {
        setFormError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (modalMode === 'create') {
        const created = await createOccurrence(payload, accessToken);
        setItems((current) => [created, ...current]);
      } else if (editingId) {
        const updated = await updateOccurrence(editingId, payload, accessToken);
        setItems((current) =>
          current.map((item) => (item.id === editingId ? { ...item, ...updated } : item))
        );
      }

      closeModal();
    } catch (error) {
      setFormError(formatSaveError(error));
    } finally {
      setSavingForm(false);
    }
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDrop(status: string) {
    if (!draggingId) return;
    void moveOccurrence(draggingId, status).finally(() => setDraggingId(null));
  }

  if (loading) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Carregando</p>
          <h1>Ocorrências...</h1>
          <p className="login-copy">Preparando o quadro operacional.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <SidebarShell />

      <section className="content">
        <header className="hero kanban-hero">
          <div>
            <p className="eyebrow">Operação</p>
            <h2>Kanban de ocorrências</h2>
            <p>Arraste os cards, crie novos chamados ou edite os existentes.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => openCreateModal()}>
            Nova ocorrência
          </button>
        </header>

        <div className="kanban">
          {columns.map((column) => (
            <article
              key={column.key}
              className={`kanban-column ${draggingId ? 'kanban-drop-ready' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.key)}
            >
              <div className="kanban-column-header">
                <h3>{column.label}</h3>
                <div className="kanban-column-tools">
                  <span>{items.filter((item) => item.status === column.key).length}</span>
                  <button type="button" className="kanban-add-btn" onClick={() => openCreateModal(column.key)}>
                    +
                  </button>
                </div>
              </div>
              <div className="kanban-list">
                {items
                  .filter((item) => item.status === column.key)
                  .map((item) => {
                    const nextColumn = columns.find(
                      (candidate) => columns.indexOf(candidate) === columns.indexOf(column) + 1
                    );
                    return (
                      <article
                        key={item.id}
                        className={`kanban-card ${draggingId === item.id ? 'is-dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(item.id)}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <div className="kanban-card-top">
                          <p className="eyebrow">{item.protocol}</p>
                          <button type="button" className="kanban-edit-btn" onClick={() => openEditModal(item)}>
                            Editar
                          </button>
                        </div>
                        <h4>{item.title ?? item.description}</h4>
                        <p>{item.address}</p>
                        <p>
                          {item.category?.name ?? 'Sem categoria'} • {item.neighborhood?.name ?? 'Sem bairro'}
                        </p>
                        <p className="kanban-meta">
                          {formatOccurrenceStatus(item.status)} • {formatPriority(item.priority)}
                        </p>
                        {item.suggestedDepartment?.name ? (
                          <p className="kanban-meta">{item.suggestedDepartment.name}</p>
                        ) : null}
                        <div className="kanban-actions">
                          {nextColumn ? (
                            <button
                              disabled={busyId === item.id}
                              onClick={() => moveOccurrence(item.id, nextColumn.key)}
                              type="button"
                            >
                              {busyId === item.id ? 'Salvando...' : `Mover para ${nextColumn.label}`}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <KanbanOccurrenceModal
        open={modalOpen}
        mode={modalMode}
        saving={savingForm}
        error={formError}
        form={form}
        categories={categories}
        neighborhoods={neighborhoods}
        departments={departments}
        onClose={closeModal}
        onChange={setForm}
        onSubmit={handleSaveForm}
      />
    </main>
  );
}
