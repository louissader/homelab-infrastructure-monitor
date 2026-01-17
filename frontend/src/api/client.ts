import axios from 'axios';
import type { Host, Metric, Alert, AlertRule, PaginatedResponse, HealthResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health
export const getHealth = async (): Promise<HealthResponse> => {
  const response = await axios.get('/health');
  return response.data;
};

// Hosts
export const getHosts = async (page = 1, size = 50): Promise<PaginatedResponse<Host>> => {
  const response = await apiClient.get('/hosts', { params: { page, size } });
  return response.data;
};

export const getHost = async (id: string): Promise<Host> => {
  const response = await apiClient.get(`/hosts/${id}`);
  return response.data;
};

export const createHost = async (data: { hostname: string; ip_address: string; metadata?: Record<string, unknown> }): Promise<Host & { api_key: string }> => {
  const response = await apiClient.post('/hosts', data);
  return response.data;
};

export const updateHost = async (id: string, data: Partial<Host>): Promise<Host> => {
  const response = await apiClient.put(`/hosts/${id}`, data);
  return response.data;
};

export const deleteHost = async (id: string): Promise<void> => {
  await apiClient.delete(`/hosts/${id}`);
};

// Metrics
export const getMetrics = async (params: {
  host_id?: string;
  metric_type?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Metric>> => {
  const response = await apiClient.get('/metrics', { params });
  return response.data;
};

export const getLatestMetrics = async (): Promise<Record<string, Metric>> => {
  const response = await apiClient.get('/metrics/latest');
  return response.data;
};

// Alerts
export const getAlerts = async (params: {
  host_id?: string;
  severity?: string;
  resolved?: boolean;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Alert>> => {
  const response = await apiClient.get('/alerts', { params });
  return response.data;
};

export const acknowledgeAlert = async (id: string): Promise<Alert> => {
  const response = await apiClient.post(`/alerts/${id}/acknowledge`);
  return response.data;
};

export const resolveAlert = async (id: string): Promise<Alert> => {
  const response = await apiClient.post(`/alerts/${id}/resolve`);
  return response.data;
};

// Alert Rules
export const getAlertRules = async (): Promise<AlertRule[]> => {
  const response = await apiClient.get('/alerts/rules');
  return response.data;
};

export const createAlertRule = async (data: Omit<AlertRule, 'id' | 'created_at'>): Promise<AlertRule> => {
  const response = await apiClient.post('/alerts/rules', data);
  return response.data;
};

export const updateAlertRule = async (id: string, data: Partial<AlertRule>): Promise<AlertRule> => {
  const response = await apiClient.put(`/alerts/rules/${id}`, data);
  return response.data;
};

export const deleteAlertRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/alerts/rules/${id}`);
};
