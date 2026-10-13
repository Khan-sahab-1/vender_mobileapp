import client from './client';

/**
 * Purchase Orders API (Adhoc PO -> Direct Flow)
 */
export const purchaseOrdersApi = {
  list: async (params = {}) => {
    const { data } = await client.get('/purchase-orders', { params });
    return data; // { data: [...], total, page, limit }
  },

  get: async (id) => {
    const { data } = await client.get(`/purchase-orders/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await client.post('/purchase-orders', payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await client.patch(`/purchase-orders/${id}`, payload);
    return data;
  },

  confirm: async (id) => {
    const { data } = await client.patch(`/purchase-orders/${id}/confirm`);
    return data;
  },

  sendForApproval: async (id) => {
    const { data } = await client.patch(`/purchase-orders/${id}/send-for-approval`);
    return data;
  },

  approve: async (id) => {
    const { data } = await client.patch(`/purchase-orders/${id}/approve`);
    return data;
  },

  receiveGoods: async (id) => {
    const { data } = await client.patch(`/purchase-orders/${id}/receive`);
    return data;
  },

  cancel: async (id) => {
    const { data } = await client.patch(`/purchase-orders/${id}/cancel`);
    return data;
  },
};

/**
 * Vendor Bills & Accounting API (Odoo-style Double Entry Engine)
 */
export const vendorBillsApi = {
  list: async (params = {}) => {
    const { data } = await client.get('/vendor-bills', { params });
    return data; // { data: [...], total, page, limit }
  },

  get: async (id) => {
    const { data } = await client.get(`/vendor-bills/${id}`);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await client.patch(`/vendor-bills/${id}`, payload);
    return data;
  },

  validate: async (id) => {
    const { data } = await client.patch(`/vendor-bills/${id}/validate`);
    return data;
  },

  registerPayment: async (id, payload) => {
    const { data } = await client.post(`/vendor-bills/${id}/register-payment`, payload);
    return data;
  },

  cancel: async (id) => {
    const { data } = await client.patch(`/vendor-bills/${id}/cancel`);
    return data;
  },
};

/**
 * General Ledger & Chart of Accounts API
 */
export const accountingApi = {
  getJournals: async (params = {}) => {
    const { data } = await client.get('/account-journals', { params });
    return data; // { items: [...], total, ... }
  },

  getAccounts: async (params = {}) => {
    const { data } = await client.get('/account-accounts', { params });
    return data;
  },

  getMoves: async (params = {}) => {
    const { data } = await client.get('/account-moves', { params });
    return data;
  },

  getPartnerLedger: async (partnerId) => {
    const { data } = await client.get(`/account-moves/partner-ledger/${partnerId}`);
    return data; // { partnerId, totalDebit, totalCredit, balance, lines: [...] }
  },
};
