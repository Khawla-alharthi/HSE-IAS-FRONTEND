// src/app/data-access/api/endpoints.ts

const API_BASE_URL = '/api/v1';

export const ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    logout: `${API_BASE_URL}/auth/logout`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    profile: `${API_BASE_URL}/auth/profile`
  },
  incidents: {
    analyze: `${API_BASE_URL}/incidents/analyze`,
    save: `${API_BASE_URL}/incidents`,
    list: `${API_BASE_URL}/incidents`,
    detail: `${API_BASE_URL}/incidents`,
    update: `${API_BASE_URL}/incidents`,
    delete: `${API_BASE_URL}/incidents`,
    stats: `${API_BASE_URL}/incidents/stats`,
    export: `${API_BASE_URL}/incidents/export`
  },
  users: {
    list: `${API_BASE_URL}/users`,
    detail: `${API_BASE_URL}/users`,
    update: `${API_BASE_URL}/users`,
    delete: `${API_BASE_URL}/users`
  }
} as const;

export type ApiEndpoint = typeof ENDPOINTS;