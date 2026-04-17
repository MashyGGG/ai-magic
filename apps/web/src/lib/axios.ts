import axios from 'axios';

const api = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'success' in body && !body.success) {
      const err = new Error(body.error?.message || '请求失败');
      (err as unknown as Record<string, unknown>).code = body.error?.code;
      return Promise.reject(err);
    }
    return res;
  },
  async (error) => {
    const url = String(error.config?.url ?? '');
    const isLoginAttempt = url.includes('/api/auth/login');
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !isLoginAttempt
    ) {
      const { useAuthStore } = await import('@/store/use-auth-store');
      useAuthStore.getState().clearUser();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
