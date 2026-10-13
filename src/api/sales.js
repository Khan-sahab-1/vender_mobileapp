import client from './client';

export const salesApi = {
  getStats: async () => {
    const { data } = await client.get('/sales/stats');
    return data;
  },

  getOrders: async ({ search, state, limit } = {}) => {
    const params = {};
    if (search) params.search = search;
    if (state && state !== 'all') params.state = state;
    if (limit) params.limit = limit;

    const { data } = await client.get('/sales/orders', { params });
    return data;
  },

  getOrderDetail: async id => {
    const { data } = await client.get(`/sales/orders/${id}`);
    return data;
  },
};

