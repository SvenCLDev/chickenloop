const API_BASE = '/api';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  // Check if response is JSON before trying to parse
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    // Response is not JSON (likely HTML error page)
    const text = await response.text();
    console.error('Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      url: `${API_BASE}${endpoint}`,
      preview: text.substring(0, 200),
    });

    // Try to extract error message from HTML or use status text
    throw new Error(
      response.status === 500
        ? 'Server error. Please check the server logs.'
        : response.status === 404
          ? 'API endpoint not found. Please check the endpoint URL.'
          : `Unexpected response format. Status: ${response.status} ${response.statusText}`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; role: string }) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
    }),
  me: () => apiRequest('/auth/me'),
};

export const jobsApi = {
  getAll: () => apiRequest('/jobs'),
  getOne: (id: string) => apiRequest(`/jobs/${id}`),
  getMyJobs: () => apiRequest('/jobs/my'),
  create: (data: any) =>
    apiRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest(`/jobs/${id}`, {
      method: 'DELETE',
    }),
  toggleFavourite: (id: string) =>
    apiRequest(`/jobs/${id}/favourite`, {
      method: 'POST',
    }),
  checkFavourite: (id: string) => apiRequest(`/jobs/${id}/favourite`),
  getFavourites: () => apiRequest('/jobs/favourites'),
};

export const cvApi = {
  get: () => apiRequest('/cv'),
  create: (data: any) =>
    apiRequest('/cv', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (data: any) =>
    apiRequest('/cv', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: () =>
    apiRequest('/cv', {
      method: 'DELETE',
    }),
  togglePublish: () =>
    apiRequest('/cv/toggle-publish', {
      method: 'POST',
    }),
};

export const savedSearchesApi = {
  getAll: () => apiRequest('/saved-searches'),
  create: (data: any) =>
    apiRequest('/saved-searches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest(`/saved-searches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest(`/saved-searches/${id}`, {
      method: 'DELETE',
    }),
};

export const companyApi = {
  get: () => apiRequest('/company'),
  create: (data: any) =>
    apiRequest('/company', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (data: any) =>
    apiRequest('/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: () =>
    apiRequest('/company', {
      method: 'DELETE',
    }),
};

export const candidatesApi = {
  getAll: () => apiRequest('/candidates-list'),
  getOne: (id: string) => apiRequest(`/candidates-list/${id}`),
  toggleFavourite: (id: string) =>
    apiRequest(`/candidates-list/${id}/favourite`, {
      method: 'POST',
    }),
  checkFavourite: (id: string) => apiRequest(`/candidates-list/${id}/favourite`),
  getFavourites: () => apiRequest('/candidates-list/favourites'),
};

export const accountApi = {
  update: (data: { name?: string; email?: string }) =>
    apiRequest('/account', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: () =>
    apiRequest('/account', {
      method: 'DELETE',
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest('/account/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const adminApi = {
  getUsers: () => apiRequest('/admin/users'),
  getUser: (id: string) => apiRequest(`/admin/users/${id}`),
  updateUser: (id: string, data: any) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getJobs: () => apiRequest('/admin/jobs'),
  getJob: (id: string) => apiRequest(`/admin/jobs/${id}`),
  updateJob: (id: string, data: any) =>
    apiRequest(`/admin/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteJob: (id: string) =>
    apiRequest(`/admin/jobs/${id}`, {
      method: 'DELETE',
    }),
  getCompanies: () => apiRequest('/admin/companies'),
  getCompany: (id: string) => apiRequest(`/admin/companies/${id}`),
  updateCompany: (id: string, data: any) =>
    apiRequest(`/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCompany: (id: string) =>
    apiRequest(`/admin/companies/${id}`, {
      method: 'DELETE',
    }),
  getAuditLogs: (params?: {
    limit?: number;
    offset?: number;
    action?: string;
    entityType?: string;
    userId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset !== undefined) {
        queryParams.append('offset', params.offset.toString());
      }
      if (params.action) {
        queryParams.append('action', params.action);
      }
      if (params.entityType) {
        queryParams.append('entityType', params.entityType);
      }
      if (params.userId) {
        queryParams.append('userId', params.userId);
      }
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/admin/audit-logs?${queryString}`
      : '/admin/audit-logs';
    return apiRequest(endpoint);
  },
  getStatistics: () => apiRequest('/admin/statistics'),
  getCVs: () => apiRequest('/admin/cvs'),
};

export const careerAdviceApi = {
  getAll: (includeUnpublished?: boolean) => {
    const query = includeUnpublished ? '?includeUnpublished=true' : '';
    return apiRequest(`/career-advice${query}`);
  },
  getOne: (id: string) => apiRequest(`/career-advice/${id}`),
  create: (data: { title: string; picture?: string; content: string; published?: boolean }) =>
    apiRequest('/career-advice', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { title?: string; picture?: string; content?: string; published?: boolean }) =>
    apiRequest(`/career-advice/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest(`/career-advice/${id}`, {
      method: 'DELETE',
    }),
};

