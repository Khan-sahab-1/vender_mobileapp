import client from './client';
import { createCrudApi } from './crud';

export const stockQuantsApi = {
  list: async (params = {}) => {
    const { data } = await client.get('/stock-quants', { params });
    return data;
  },
  onHand: async (productId, locationId) => {
    const { data } = await client.get('/stock-quants/on-hand', {
      params: { productId, locationId },
    });
    return data; // { productId, locationId, quantity }
  },
};

const baseMoves = createCrudApi('/stock-moves');
export const stockMovesApi = {
  ...baseMoves,
  confirm: async id => {
    const { data } = await client.patch(`/stock-moves/${id}/confirm`);
    return data;
  },
  validate: async id => {
    const { data } = await client.patch(`/stock-moves/${id}/validate`);
    return data;
  },
  cancel: async id => {
    const { data } = await client.patch(`/stock-moves/${id}/cancel`);
    return data;
  },
};

const basePickings = createCrudApi('/stock-pickings');
export const stockPickingsApi = {
  ...basePickings,
  confirm: async id => {
    const { data } = await client.patch(`/stock-pickings/${id}/confirm`);
    return data;
  },
  validate: async id => {
    const { data } = await client.patch(`/stock-pickings/${id}/validate`);
    return data;
  },
  cancel: async id => {
    const { data } = await client.patch(`/stock-pickings/${id}/cancel`);
    return data;
  },
  createReturn: async id => {
    const { data } = await client.post(`/stock-pickings/${id}/return`);
    return data;
  },
};

const baseAdjustments = createCrudApi('/inventory-adjustments');
export const inventoryAdjustmentsApi = {
  ...baseAdjustments,
  start: async id => {
    const { data } = await client.post(`/inventory-adjustments/${id}/start`);
    return data;
  },
  addLine: async (id, payload) => {
    const { data } = await client.post(`/inventory-adjustments/${id}/lines`, payload);
    return data;
  },
  updateLine: async (id, lineId, payload) => {
    const { data } = await client.patch(
      `/inventory-adjustments/${id}/lines/${lineId}`,
      payload,
    );
    return data;
  },
  validate: async id => {
    const { data } = await client.patch(`/inventory-adjustments/${id}/validate`);
    return data;
  },
  cancel: async id => {
    const { data } = await client.patch(`/inventory-adjustments/${id}/cancel`);
    return data;
  },
};

export const stockValuationApi = {
  list: async (params = {}) => {
    const { data } = await client.get('/stock-valuation', { params });
    return data;
  },
  summary: async () => {
    const { data } = await client.get('/stock-valuation/summary');
    return data;
  },
  summaryForProduct: async productId => {
    const { data } = await client.get(`/stock-valuation/summary/${productId}`);
    return data;
  },
};
