'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDepartment, deleteDepartment, fetchDepartments, getStoredAccessToken } from '../../../lib/api';
import type { DepartmentRecord } from '../../../lib/api-types';

export default function AdminDepartmentsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const departments = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => fetchDepartments(getStoredAccessToken()),
    staleTime: 30_000
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => createDepartment(payload, getStoredAccessToken()),
    onSuccess: () => {
      setName('');
      setSuccess('Secretaria cadastrada com sucesso.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    },
    onError: () => setError('Não foi possível cadastrar a secretaria.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id, getStoredAccessToken()),
    onSuccess: () => {
      setSuccess('Secretaria removida.');
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    },
    onError: () => setError('Não foi possível remover. Verifique se há usuários ou solicitações vinculadas.')
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome da secretaria.');
      return;
    }
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Administração</p>
        <h2>Secretarias municipais</h2>
        <p>Cadastre as secretarias que aparecem no app do cidadão e vincule usuários a cada uma.</p>
      </header>

      <section className="panel">
        <h3>Nova secretaria</h3>
        <form className="occurrence-form" onSubmit={handleSubmit}>
          <label>
            Nome da secretaria
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Secretaria Municipal de Saúde"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar secretaria'}
            </button>
          </div>
          {success ? <p className="success-message">{success}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Secretarias cadastradas</h3>
          <span>{departments.data?.length ?? 0} registros</span>
        </div>
        {departments.isLoading ? <p>Carregando...</p> : null}
        <div className="rank-list">
          {(departments.data ?? []).map((item: DepartmentRecord) => (
            <article className="list-item admin-list-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p className="muted-copy">ID: {item.id}</p>
              </div>
              <button
                type="button"
                className="btn-error"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Remover "${item.name}"?`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              >
                Excluir
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
