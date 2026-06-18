export type NamedCountItem = {
  label: string;
  value: number;
};

export type RankingCityItem = {
  id?: string;
  classification?: string;
  title?: string;
  score?: number;
};

export type RankingItem = {
  label: string;
  total: number;
  averageScore?: number;
  urgent?: number;
};

export type AlertItem = {
  id: string;
  level: string;
  title: string;
  message: string;
};

export type DepartmentRecord = {
  id: string;
  name: string;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string | null;
  department?: DepartmentRecord | null;
};

export type CategoryRecord = {
  id: string;
  name?: string;
  category?: string;
  quantity?: number;
};

export type NeighborhoodRecord = {
  id: string;
  name?: string;
  neighborhood?: string;
  total?: number;
};

export type ServiceOrderRecord = {
  id: string;
  createdAt?: string;
  occurrenceProtocol?: string;
  occurrenceTitle?: string;
  occurrenceStatus?: string;
  occurrenceId?: string;
};

export type OccurrenceRecord = {
  id: string;
  protocol: string;
  title?: string | null;
  description?: string;
  status?: string;
  priority?: string;
  priorityScore?: number;
  createdAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  category?: { name?: string } | null;
  neighborhood?: { name?: string } | null;
  suggestedDepartment?: { name?: string } | null;
  serviceOrders?: ServiceOrderRecord[];
  departmentId?: string | null;
  categoryId?: string | null;
  neighborhoodId?: string | null;
};

export type TransparencySummary = {
  totalDemandas?: number;
  demandasConcluidas?: number;
  tempoMedioHoras?: number;
  categoriasMaisFrequentes?: NamedCountItem[];
  bairrosMaisAtendidos?: NamedCountItem[];
};

export type DashboardSnapshot = {
  occurrences: OccurrenceRecord[];
  citizens: unknown[];
  users: unknown[];
  categories: unknown[];
};
