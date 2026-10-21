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

  createOrder: async payload => {
    const { data } = await client.post('/sales/orders', payload);
    return data;
  },

  updateOrder: async (id, payload) => {
    const { data } = await client.patch(`/sales/orders/${id}`, payload);
    return data;
  },

  sendForApproval: async id => {
    const { data } = await client.post(`/sales/orders/${id}/send-for-approval`);
    return data;
  },

  approveOrder: async id => {
    const { data } = await client.post(`/sales/orders/${id}/approve`);
    return data;
  },

  confirmOrder: async id => {
    const { data } = await client.post(`/sales/orders/${id}/confirm`);
    return data;
  },

  cancelOrder: async id => {
    const { data } = await client.post(`/sales/orders/${id}/cancel`);
    return data;
  },
};
