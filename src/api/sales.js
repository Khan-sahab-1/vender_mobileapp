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

  deliverGoods: async id => {
    const { data } = await client.post(`/sales/orders/${id}/deliver-goods`);
    return data;
  },

  cancelOrder: async id => {
    const { data } = await client.post(`/sales/orders/${id}/cancel`);
    return data;
  },
};

export const customerInvoicesApi = {
  list: async ({ state, search, limit } = {}) => {
    const params = {};
    if (state && state !== 'all') params.state = state;
    if (search) params.search = search;
    if (limit) params.limit = limit;
    const { data } = await client.get('/customer-invoices', { params });
    return data;
  },

  getStats: async () => {
    const { data } = await client.get('/customer-invoices/stats');
    return data;
  },

  getById: async id => {
    const { data } = await client.get(`/customer-invoices/${id}`);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await client.patch(`/customer-invoices/${id}`, payload);
    return data;
  },

  validate: async id => {
    const { data } = await client.patch(`/customer-invoices/${id}/validate`);
    return data;
  },

  registerPayment: async (id, payload) => {
    const { data } = await client.post(`/customer-invoices/${id}/register-payment`, payload);
    return data;
  },

  cancel: async id => {
    const { data } = await client.patch(`/customer-invoices/${id}/cancel`);
    return data;
  },
};
