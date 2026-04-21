import axios from 'axios';

/**
 * Resolve the API base URL.
 * - In dev: fall back to http://localhost:3000/api so `npm run dev` Just Works.
 * - In prod builds: require NEXT_PUBLIC_API_URL, otherwise point at the
 *   same origin under /api so deployment mistakes surface loudly (the
 *   browser's dev tools will show a clear 404 instead of silently
 *   failing on a non-existent localhost call).
 */
function resolveApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000/api';
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_KEY = 'port_auth_token';

/** Defaults when captain sends only IMO (match server DEFAULT_PORT_STAY_HOURS / DEFAULT_USD_TO_GEL) */
export const CAPTAIN_DEFAULT_HOURS = Number(process.env.NEXT_PUBLIC_DEFAULT_PORT_STAY_HOURS || '120');
export const CAPTAIN_DEFAULT_USD_TO_GEL = Number(process.env.NEXT_PUBLIC_DEFAULT_USD_TO_GEL || '2.7');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export interface ShipInfo {
  name: string;
  type: string;
  grt: number;
  reducedGrt: number;
  length: number;
  width: number;
  depthM: number;
  lbd: number;
}

export interface ChargeLineItem {
  key: string;
  label: string;
  amountUSD: number;
  calculationMethod?: string;
  group?: string;
  gelAmount?: number;
}

export interface ChargeSection {
  id: string;
  title: string;
  items: ChargeLineItem[];
}

export interface CalculateResponse {
  kind: 'pda' | 'fda';
  ship: ShipInfo;
  charges: {
    sections: ChargeSection[];
    port: ChargeLineItem[];
    nonPort: ChargeLineItem[];
  };
  totalUSD: number;
  totalGEL: number;
  fda?: { advanceReceivedUsd: number; balanceUsd: number };
  meta: { model: string; tariffFile: string };
}

export interface CalculationParams {
  imo: string;
  hours: number;
  usdToGel: number;
  cargoWeightTn?: number;
  reducedGrt?: number;
  depthM?: number;
  nightPilotIn?: boolean;
  nightPilotOut?: boolean;
  holidayTowageOut?: boolean;
  holidayMooringIn?: boolean;
  holidayMooringOut?: boolean;
  freshWaterTn?: number;
  anchorageDays?: number;
  includeCertificates?: boolean;
}

export const calculatePDA = async (params: CalculationParams): Promise<CalculateResponse> => {
  const response = await api.post<CalculateResponse>('/calculate', params);
  return response.data;
};

/** IMO-only: server applies default port hours & FX */
export const calculatePdaFromImoOnly = async (imo7: string): Promise<CalculateResponse> => {
  const response = await api.post<CalculateResponse>('/calculate', { imo: imo7.trim() });
  return response.data;
};

export function getPdfUrl(imo: string, hours: number, usdToGel: number) {
  return `${API_BASE_URL}/pdf/${imo}?hours=${hours}&usdToGel=${usdToGel}`;
}

export function getExportXlsxUrl(imo: string, hours: number, usdToGel: number, kind: 'pda' | 'fda' = 'pda') {
  return `${API_BASE_URL}/export/xlsx/${imo}?hours=${hours}&usdToGel=${usdToGel}&kind=${kind}`;
}

export async function downloadPdfPost(params: CalculationParams & { kind?: 'pda' | 'fda' }): Promise<Blob> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE_URL}/pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...params, kind: params.kind ?? 'pda' }),
  });
  if (!res.ok) throw new Error('PDF request failed');
  return res.blob();
}

export interface AuthUser {
  id: number;
  email: string;
  role: 'captain' | 'admin';
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
  setAuthToken(data.token);
  return data;
}

export async function registerCaptain(email: string, password: string): Promise<{ id: number; email: string; role: string }> {
  const { data } = await api.post('/auth/register', { email, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export function logout(): void {
  setAuthToken(null);
}

export interface PortRequestPayload {
  imo: string;
  hours?: number;
  usdToGel?: number;
  eta?: string;
  cargoNotes?: string;
  cargoWeightTn?: number;
  reducedGrt?: number;
  depthM?: number;
  nightPilotIn?: boolean;
  nightPilotOut?: boolean;
  holidayTowageOut?: boolean;
  holidayMooringIn?: boolean;
  holidayMooringOut?: boolean;
  freshWaterTn?: number;
  anchorageDays?: number;
  includeCertificates?: boolean;
}

export async function createPortRequest(body: PortRequestPayload) {
  const { data } = await api.post('/port-requests', body);
  return data as {
    id: number;
    status: string;
    ship: ShipInfo;
    charges: CalculateResponse['charges'];
    totalUSD: number;
    totalGEL: number;
    meta: CalculateResponse['meta'];
  };
}

export async function listMyPortRequests() {
  const { data } = await api.get('/port-requests');
  return data as Array<{
    id: number;
    imo: string;
    vesselData: ShipInfo | null;
    eta?: string | null;
    cargoNotes?: string | null;
    status: string;
    estimatedTotalUsd: number;
    approvedTotalUsd: number | null;
    createdAt: string;
  }>;
}

export async function getPortRequest(id: number) {
  const { data } = await api.get(`/port-requests/${id}`);
  return data as {
    id: number;
    imo: string;
    vesselData: ShipInfo | null;
    status: string;
    estimatedTotalUsd: number;
    approvedTotalUsd: number | null;
    charges: CalculateResponse['charges'] | null;
    cargoNotes?: string | null;
    eta?: string | null;
  };
}

export async function adminListRequests() {
  const { data } = await api.get('/admin/requests');
  return data as Array<{
    id: number;
    userEmail: string;
    imo: string;
    vesselData: ShipInfo | null;
    status: string;
    estimatedTotalUsd: number;
    approvedTotalUsd: number | null;
    eta?: string | null;
    cargoNotes?: string | null;
    createdAt: string;
  }>;
}

export async function adminPatchRequest(id: number, action: 'approve' | 'reject', approvedTotalUsd?: number) {
  const { data } = await api.patch(`/admin/requests/${id}`, { action, approvedTotalUsd });
  return data as { status: string; estimatedTotalUsd: number; approvedTotalUsd: number | null };
}

export async function adminGetPricing() {
  const { data } = await api.get<{
    entries: Array<{ key: string; value: number; updatedAt: string }>;
    extraKeys: string[];
    hint: string;
  }>('/admin/pricing');
  return data;
}

export async function adminPutPricing(values: Record<string, number>) {
  await api.put('/admin/pricing', { values });
}

export async function adminDeletePricingKey(key: string) {
  await api.delete(`/admin/pricing/${encodeURIComponent(key)}`);
}

export async function adminAudit(limit?: number) {
  const { data } = await api.get('/admin/audit', { params: { limit } });
  return data as Array<{
    id: number;
    action: string;
    entityType: string;
    details: Record<string, unknown> | null;
    createdAt: string;
  }>;
}
