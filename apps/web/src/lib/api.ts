import type {
  AlertItem,
  CategoryRecord,
  DashboardSnapshot,
  DepartmentRecord,
  NeighborhoodRecord,
  OccurrenceRecord,
  RankingCityItem,
  RankingItem,
  ServiceOrderRecord,
  UserRecord,
  TransparencySummary
} from './api-types';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

async function safeJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function authHeaders(accessToken?: string): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function fetchDashboardData(accessToken?: string) {
  const [occurrencesRes, citizensRes, usersRes, categoriesRes] = await Promise.allSettled([
    fetch(`${API_URL}/occurrences`, { cache: 'no-store', headers: authHeaders(accessToken) }),
    fetch(`${API_URL}/citizens`, { cache: 'no-store', headers: authHeaders(accessToken) }),
    fetch(`${API_URL}/users`, { cache: 'no-store', headers: authHeaders(accessToken) }),
    fetch(`${API_URL}/categories`, { cache: 'no-store' })
  ]);

  const occurrences = occurrencesRes.status === 'fulfilled' ? await safeJson<OccurrenceRecord[]>(occurrencesRes.value) : null;
  const citizens = citizensRes.status === 'fulfilled' ? await safeJson<unknown[]>(citizensRes.value) : null;
  const users = usersRes.status === 'fulfilled' ? await safeJson<unknown[]>(usersRes.value) : null;
  const categories = categoriesRes.status === 'fulfilled' ? await safeJson<unknown[]>(categoriesRes.value) : null;

  return {
    occurrences: occurrences ?? [],
    citizens: citizens ?? [],
    users: users ?? [],
    categories: categories ?? []
  };
}

export async function fetchUsers(accessToken?: string) {
  const response = await fetch(`${API_URL}/users`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const users = await safeJson<UserRecord[]>(response);
  return users ?? [];
}

export async function fetchServiceOrders(accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const occurrences = await safeJson<OccurrenceRecord[]>(response);
  return (occurrences ?? [])
    .flatMap((occurrence) =>
      (occurrence.serviceOrders ?? []).map((serviceOrder) => ({
        ...serviceOrder,
        occurrenceProtocol: occurrence.protocol,
        occurrenceTitle: occurrence.title ?? occurrence.description,
        occurrenceStatus: occurrence.status,
        occurrenceId: occurrence.id
      }))
    )
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
}

export async function startServiceOrder(id: string, accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences/service-orders/${id}/start`, {
    method: 'PATCH',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error('Falha ao iniciar OS');
  return response.json();
}

export async function registerServiceOrderExecution(
  id: string,
  payload: Record<string, unknown>,
  accessToken?: string
) {
  const response = await fetch(`${API_URL}/occurrences/service-orders/${id}/execution`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken)
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Falha ao registrar execução');
  return response.json();
}

export async function finishServiceOrder(id: string, payload: Record<string, unknown>, accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences/service-orders/${id}/finish`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken)
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Falha ao finalizar OS');
  return response.json();
}

export async function fetchOccurrences(accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const occurrences = await safeJson<OccurrenceRecord[]>(response);
  return occurrences ?? [];
}

export async function fetchDepartments(accessToken?: string) {
  const response = await fetch(`${API_URL}/departments`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const departments = await safeJson<DepartmentRecord[]>(response);
  return departments ?? [];
}

export async function createDepartment(payload: { name: string }, accessToken?: string) {
  const response = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Falha ao cadastrar secretaria');
  return response.json();
}

export async function deleteDepartment(id: string, accessToken?: string) {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error('Falha ao excluir secretaria');
  return response.json();
}

export async function createUser(
  payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    departmentId?: string;
  },
  accessToken?: string
) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Falha ao cadastrar usuário'));
  return response.json();
}

export async function updateUser(
  id: string,
  payload: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    departmentId?: string;
  },
  accessToken?: string
) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Falha ao atualizar usuário'));
  return response.json();
}

export async function deleteUser(id: string, accessToken?: string) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Falha ao excluir usuário'));
  return response.json();
}

export type ServiceAreaRecord = {
  id: string;
  nome: string;
  municipio: string;
  estado: string;
  latitudeCentro?: number | null;
  longitudeCentro?: number | null;
  raioMetros?: number | null;
  validacaoAtiva: boolean;
  bloquearForaDaArea: boolean;
  ativo: boolean;
};

export async function fetchServiceAreas(accessToken?: string) {
  const response = await fetch(`${API_URL}/admin/service-area`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  });
  const areas = await safeJson<ServiceAreaRecord[]>(response);
  return areas ?? [];
}

export async function saveServiceArea(payload: Record<string, unknown>, accessToken?: string) {
  const areas = await fetchServiceAreas(accessToken);
  const existing = areas.find((area) => area.ativo) ?? areas[0];
  const response = await fetch(
    existing?.id ? `${API_URL}/admin/service-area/${existing.id}` : `${API_URL}/admin/service-area`,
    {
      method: existing?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) throw new Error('Falha ao salvar região');
  return response.json() as Promise<ServiceAreaRecord>;
}

export async function fetchCategories(accessToken?: string) {
  const response = await fetch(`${API_URL}/categories`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const categories = await safeJson<CategoryRecord[]>(response);
  return categories ?? [];
}

export async function fetchNeighborhoods(accessToken?: string) {
  const response = await fetch(`${API_URL}/neighborhoods`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const neighborhoods = await safeJson<NeighborhoodRecord[]>(response);
  return neighborhoods ?? [];
}

export async function createOccurrence(payload: Record<string, unknown>, accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken)
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Falha ao criar ocorrência'));
  }

  return response.json();
}

export function resolveAttachmentUrl(fileUrl: string) {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  return `${API_URL}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}

export async function uploadOccurrenceAttachment(occurrenceId: string, file: File, accessToken?: string) {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/occurrences/${occurrenceId}/attachments`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: formData
    });
  } catch {
    throw new Error('Não foi possível enviar o anexo.');
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Falha ao enviar anexo'));
  }

  return response.json();
}

export async function fetchMyOccurrences(accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences/mine`, { cache: 'no-store', headers: authHeaders(accessToken) });
  const occurrences = await safeJson<OccurrenceRecord[]>(response);
  return occurrences ?? [];
}

export async function fetchOccurrenceByProtocol(protocol: string, accessToken?: string) {
  const response = await fetch(`${API_URL}/occurrences/protocol/${encodeURIComponent(protocol)}`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  });
  return safeJson<OccurrenceRecord>(response);
}

export async function updateOccurrenceStatus(id: string, status: string, accessToken?: string) {
  return updateOccurrence(id, { status }, accessToken);
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (body.message) return body.message;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export async function updateOccurrence(
  id: string,
  payload: Record<string, unknown>,
  accessToken?: string
) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/occurrences/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o servidor está ativo.');
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Falha ao atualizar ocorrência'));
  }

  return response.json();
}

async function fetchAdmin<T>(path: string, accessToken?: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: {
      ...authHeaders(accessToken),
      ...(init?.headers ?? {})
    },
    ...init
  });
  return safeJson<T>(response);
}

function buildQueryString(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getStoredAccessToken() {
  return typeof window === 'undefined' ? undefined : JSON.parse(window.localStorage.getItem('zeladoria.session') ?? 'null')?.accessToken;
}

export async function fetchExecutiveDashboard(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<DashboardSnapshot>(`/admin/dashboard/executive${buildQueryString(filters)}`, accessToken)) ?? { occurrences: [], citizens: [], users: [], categories: [] };
}

export async function fetchStatusIndicators(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<{ status: string; quantity: number }[]>(`/admin/indicators/status${buildQueryString(filters)}`, accessToken)) ?? [];
}

export async function fetchDepartmentIndicators(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<RankingItem[]>(`/admin/indicators/departments${buildQueryString(filters)}`, accessToken)) ?? [];
}

export async function fetchCategoryIndicators(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<RankingItem[]>(`/admin/indicators/categories${buildQueryString(filters)}`, accessToken)) ?? [];
}

export async function fetchNeighborhoodIndicators(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<RankingItem[]>(`/admin/indicators/neighborhoods${buildQueryString(filters)}`, accessToken)) ?? [];
}

export async function fetchRanking(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<{ city?: RankingCityItem[]; departments?: RankingItem[]; neighborhoods?: RankingItem[]; categories?: RankingItem[] }>(`/admin/ranking${buildQueryString(filters)}`, accessToken)) ?? {};
}

export async function fetchAlerts(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<AlertItem[]>(`/admin/alerts${buildQueryString(filters)}`, accessToken)) ?? [];
}

export async function fetchReportsSummary(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<Record<string, unknown>>('/admin/reports/generate', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  })) ?? {};
}

export async function fetchExecutiveSummary(filters: Record<string, unknown> = {}, accessToken?: string) {
  return (await fetchAdmin<Record<string, unknown>>('/admin/ai/executive-summary', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  })) ?? {};
}

export async function fetchPublicTransparency(filters: Record<string, unknown> = {}) {
  return (await fetchAdmin<TransparencySummary>(`/transparency${buildQueryString(filters)}`)) ?? {};
}

export async function fetchWhatsAppHistory(accessToken?: string, limit = 50) {
  return (await fetchAdmin<Array<{ id: string; subject: string; body: string; createdAt: string }>>(`/whatsapp/history?limit=${limit}`, accessToken)) ?? [];
}

export async function exportAdminGrid(
  format: 'pdf' | 'csv' | 'xlsx',
  filters: Record<string, unknown>,
  accessToken?: string
) {
  const response = await fetch(`${API_URL}/admin/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken)
    },
    body: JSON.stringify({ format, filters })
  });

  if (!response.ok) {
    throw new Error('Falha ao exportar grid');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] ?? `export.${format}`
  };
}
