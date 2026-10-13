import client from './client';

/**
 * Builds a standard CRUD API object for a REST resource that follows the
 * Master Data API convention:
 *   GET    /:endpoint?page&limit&search&active
 *   GET    /:endpoint/:id
 *   POST   /:endpoint
 *   PATCH  /:endpoint/:id
 *   DELETE /:endpoint/:id
 */
export const createCrudApi = endpoint => ({
  list: async (params = {}) => {
    const { data } = await client.get(endpoint, { params });
    return data; // { data, total, page, limit, totalPages }
  },
  get: async id => {
    const { data } = await client.get(`${endpoint}/${id}`);
    return data;
  },
  create: async payload => {
    const { data } = await client.post(endpoint, payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await client.patch(`${endpoint}/${id}`, payload);
    return data;
  },
  remove: async id => {
    const { data } = await client.delete(`${endpoint}/${id}`);
    return data;
  },
});
