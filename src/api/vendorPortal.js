import client from './client';

export const vendorPortalApi = {
  getDashboard: async () => {
    const { data } = await client.get('/vendor-portal/dashboard');
    return data;
  },

  getOrders: async () => {
    const { data } = await client.get('/vendor-portal/orders');
    return data;
  },

  getOrderDetail: async id => {
    const { data } = await client.get(`/vendor-portal/orders/${id}`);
    return data;
  },

  getBills: async () => {
    const { data } = await client.get('/vendor-portal/bills');
    return data;
  },

  getBillDetail: async id => {
    const { data } = await client.get(`/vendor-portal/bills/${id}`);
    return data;
  },

  getProfile: async () => {
    const { data } = await client.get('/vendor-portal/profile');
    return data;
  },

  updateProfile: async payload => {
    const { data } = await client.patch('/vendor-portal/profile', payload);
    return data;
  },
};

