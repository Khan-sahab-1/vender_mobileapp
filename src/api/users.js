import client from './client';

export const usersApi = {
  getUsers: async (params = {}) => {
    const { data } = await client.get('/users', { params });
    return data; // { data, total, page, limit, totalPages }
  },
  getUser: async id => {
    const { data } = await client.get(`/users/${id}`);
    return data;
  },
  createUser: async payload => {
    const { data } = await client.post('/users', payload);
    return data;
  },
  updateUser: async (id, payload) => {
    const { data } = await client.patch(`/users/${id}`, payload);
    return data;
  },
  deleteUser: async id => {
    const { data } = await client.delete(`/users/${id}`);
    return data;
  },
};

export default usersApi;

