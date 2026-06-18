'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  fetchDepartments,
  fetchUsers,
  getStoredAccessToken,
  updateUser
} from '../../../lib/api';
import { getSession, setSession, type AuthSession } from '../../../lib/auth';
import { fetchCurrentUser } from '../../../lib/auth-api';
import type { DepartmentRecord } from '../../../lib/api-types';

import {
  ASSIGNABLE_STAFF_ROLES,
  DEPARTMENT_ADMIN_ASSIGNABLE_ROLES,
  getRoleLabel
} from '@zeladoria/shared';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'EQUIPE_CAMPO',
  departmentId: ''
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      setSessionReady(true);
      return;
    }

    fetchCurrentUser(current.accessToken)
      .then((user) => {
        const nextSession = { ...current, user };
        setSession(nextSession);
        setSessionState(nextSession);
      })
      .catch(() => setSessionState(current))
      .finally(() => setSessionReady(true));
  }, []);
  const isFullAdmin = session?.user.role === 'ADMIN';
  const isDepartmentAdmin = session?.user.role === 'SECRETARIA';
  const canManageUsers = isFullAdmin || isDepartmentAdmin;
  const departmentId = session?.user.departmentId ?? '';
  const departmentName = session?.user.department?.name ?? '';
  const assignableRoles = isDepartmentAdmin ? DEPARTMENT_ADMIN_ASSIGNABLE_ROLES : ASSIGNABLE_STAFF_ROLES;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isDepartmentAdmin || !departmentId) return;
    setForm((current) => ({ ...current, departmentId }));
  }, [departmentId, isDepartmentAdmin]);

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchUsers(getStoredAccessToken()),
    enabled: sessionReady,
    staleTime: 30_000
  });

  const departments = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => fetchDepartments(getStoredAccessToken()),
    enabled: sessionReady && isFullAdmin,
    staleTime: 30_000
  });

  const needsDepartment = form.role === 'SECRETARIA' || form.role === 'EQUIPE_CAMPO';
  const isEditing = editingId != null;
  const canSubmitDepartmentForm = !isDepartmentAdmin || Boolean(departmentId);

  const buildUserPayload = () => {
    const payload: {
      name: string;
      email: string;
      password?: string;
      role: string;
      departmentId?: string;
    } = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role
    };

    if (form.password) {
      payload.password = form.password;
    }

    if (needsDepartment && !isDepartmentAdmin) {
      payload.departmentId = form.departmentId || undefined;
    }

    return payload;
  };

  const createMutation = useMutation({
    mutationFn: () => createUser({ ...buildUserPayload(), password: form.password }, getStoredAccessToken()),
    onSuccess: () => {
      resetForm();
      setSuccess('Usuário cadastrado com sucesso.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o usuário. Verifique e-mail duplicado ou campos obrigatórios.')
  });

  const updateMutation = useMutation({
    mutationFn: () => updateUser(editingId!, buildUserPayload(), getStoredAccessToken()),
    onSuccess: () => {
      resetForm();
      setSuccess('Usuário atualizado com sucesso.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível atualizar o usuário.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id, getStoredAccessToken()),
    onSuccess: () => {
      setSuccess('Usuário removido.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível remover o usuário.')
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function resetForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      departmentId: isDepartmentAdmin ? departmentId : ''
    });
  }

  function canManageUser(user: { id: string; role?: string }) {
    if (!canManageUsers) return false;
    if (isFullAdmin) return true;
    if (!['SECRETARIA', 'EQUIPE_CAMPO'].includes(user.role ?? '')) return false;
    return true;
  }

  function startEdit(user: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    departmentId?: string | null;
    department?: DepartmentRecord | null;
  }) {
    if (!canManageUser(user)) return;
    setEditingId(user.id);
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      role: user.role ?? 'EQUIPE_CAMPO',
      departmentId: user.departmentId ?? user.department?.id ?? departmentId
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Preencha nome e e-mail.');
      return;
    }
    if (!isEditing && form.password.length < 6) {
      setError('Informe uma senha com no mínimo 6 caracteres.');
      return;
    }
    if (isEditing && form.password && form.password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (needsDepartment && !form.departmentId) {
      setError('Usuários de secretaria ou equipe de campo precisam estar vinculados a uma secretaria.');
      return;
    }
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  return (
    <section className="admin-shell">
      <header className="hero">
        <p className="eyebrow">Administração</p>
        <h2>{isDepartmentAdmin ? 'Usuários da secretaria' : 'Usuários do sistema'}</h2>
        <p>
          {isDepartmentAdmin
            ? 'Cadastre, edite ou remova operadores vinculados à sua secretaria.'
            : 'Cadastre operadores e vincule cada usuário de secretaria à área correta.'}
        </p>
      </header>

      {sessionReady && isDepartmentAdmin && !departmentId ? (
        <section className="panel">
          <p className="login-error">
            Seu usuário não está vinculado a uma secretaria. Peça ao administrador para corrigir o cadastro.
          </p>
        </section>
      ) : null}

      {sessionReady && canManageUsers && canSubmitDepartmentForm ? (
      <section className="panel">
        <h3>{isEditing ? 'Editar usuário' : 'Novo usuário'}</h3>
        <form className="occurrence-form" onSubmit={handleSubmit}>
          <label>
            Nome
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            />
          </label>
          <label>
            {isEditing ? 'Nova senha (opcional)' : 'Senha'}
            <input
              type="password"
              value={form.password}
              placeholder={isEditing ? 'Deixe em branco para manter a atual' : undefined}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
            />
          </label>
          <div className="panel-grid">
            <label>
              Perfil
              <select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>
                {assignableRoles.map((value) => (
                  <option key={value} value={value}>
                    {getRoleLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            {needsDepartment ? (
              isDepartmentAdmin ? (
                <article>
                  <span>Secretaria vinculada</span>
                  <strong>{departmentName || 'Sua secretaria'}</strong>
                </article>
              ) : (
                <label>
                  Secretaria vinculada *
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm((c) => ({ ...c, departmentId: e.target.value }))}
                  >
                    <option value="">Selecione a secretaria</option>
                    {(departments.data ?? []).map((department: DepartmentRecord) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              )
            ) : (
              <article>
                <span>Vínculo</span>
                <strong>Perfil sem secretaria</strong>
              </article>
            )}
          </div>
          <div className="form-actions">
            {isEditing ? (
              <button type="button" className="btn-secondary" onClick={resetForm} disabled={isSaving}>
                Cancelar
              </button>
            ) : null}
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}
            </button>
          </div>
          {success ? <p className="success-message">{success}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </section>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <h3>Usuários cadastrados</h3>
          <span>{users.data?.length ?? 0} registros</span>
        </div>
        {users.isLoading ? <p>Carregando...</p> : null}
        <div className="rank-list">
          {(users.data ?? []).map((item: {
            id: string;
            name: string;
            email: string;
            role: string;
            department?: DepartmentRecord | null;
          }) => (
            <article className="list-item admin-list-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.email}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="pill">{getRoleLabel(item.role)}</span>
                  {item.department?.name ? <span className="badge badge-cyan">{item.department.name}</span> : null}
                </div>
              </div>
              <div className="admin-list-item__actions">
                {canManageUser(item) ? (
                  <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => startEdit(item)}
                  disabled={isSaving}
                >
                  Editar
                </button>
                {item.id !== session?.user.id ? (
                <button
                  type="button"
                  className="btn-error"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover usuário "${item.name}"?`)) {
                      if (editingId === item.id) resetForm();
                      deleteMutation.mutate(item.id);
                    }
                  }}
                >
                  Excluir
                </button>
                ) : null}
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
