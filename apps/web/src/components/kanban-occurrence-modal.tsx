'use client';

import { formatOccurrenceStatus, formatPriority } from '../lib/occurrence-map';
import type { CategoryRecord, DepartmentRecord, NeighborhoodRecord } from '../lib/api-types';

const STATUSES = [
  ['ABERTO', 'Aberto'],
  ['EM_ANALISE', 'Em análise'],
  ['ENCAMINHADO', 'Encaminhado'],
  ['EM_EXECUCAO', 'Em execução'],
  ['CONCLUIDO', 'Concluído'],
  ['CANCELADO', 'Cancelado']
] as const;

const PRIORITIES = [
  ['BAIXA', 'Baixa'],
  ['MEDIA', 'Média'],
  ['ALTA', 'Alta'],
  ['URGENTE', 'Urgente']
] as const;

export type OccurrenceFormValues = {
  title: string;
  description: string;
  address: string;
  status: string;
  priority: string;
  categoryId: string;
  neighborhoodId: string;
  suggestedDepartmentId: string;
};

type KanbanOccurrenceModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  error: string | null;
  form: OccurrenceFormValues;
  categories: CategoryRecord[];
  neighborhoods: NeighborhoodRecord[];
  departments: DepartmentRecord[];
  onClose: () => void;
  onChange: (next: OccurrenceFormValues) => void;
  onSubmit: () => void;
};

export function KanbanOccurrenceModal({
  open,
  mode,
  saving,
  error,
  form,
  categories,
  neighborhoods,
  departments,
  onClose,
  onChange,
  onSubmit
}: KanbanOccurrenceModalProps) {
  if (!open) return null;

  function updateField<K extends keyof OccurrenceFormValues>(key: K, value: OccurrenceFormValues[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="kanban-modal-backdrop" onClick={onClose}>
      <section className="kanban-modal" onClick={(event) => event.stopPropagation()}>
        <header className="kanban-modal__header">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'Novo card' : 'Editar card'}</p>
            <h3>{mode === 'create' ? 'Cadastrar ocorrência' : 'Atualizar ocorrência'}</h3>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </header>

        <form
          className="occurrence-form kanban-modal__form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            Título
            <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Resumo do chamado" />
          </label>
          <label>
            Descrição *
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descreva o problema"
            />
          </label>
          <label>
            Endereço *
            <input value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Rua, número, bairro" />
          </label>

          <div className="panel-grid">
            <label>
              Status
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="panel-grid">
            <label>
              Categoria
              <select value={form.categoryId} onChange={(e) => updateField('categoryId', e.target.value)}>
                <option value="">Selecione</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name ?? item.category ?? 'Categoria'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bairro
              <select value={form.neighborhoodId} onChange={(e) => updateField('neighborhoodId', e.target.value)}>
                <option value="">Selecione</option>
                {neighborhoods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name ?? item.neighborhood ?? 'Bairro'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Secretaria responsável *
            <select
              value={form.suggestedDepartmentId}
              onChange={(e) => updateField('suggestedDepartmentId', e.target.value)}
            >
              <option value="">Selecione a secretaria</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {mode === 'edit' ? (
            <p className="muted-copy">
              Status atual: {formatOccurrenceStatus(form.status)} • Prioridade: {formatPriority(form.priority)}
            </p>
          ) : null}

          {error ? <p className="login-error">{error}</p> : null}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : mode === 'create' ? 'Criar card' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export const EMPTY_OCCURRENCE_FORM: OccurrenceFormValues = {
  title: '',
  description: '',
  address: '',
  status: 'ABERTO',
  priority: 'MEDIA',
  categoryId: '',
  neighborhoodId: '',
  suggestedDepartmentId: ''
};
