import client from './client';

export const authApi = {
  login: async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    return data; // { accessToken, user }
  },

  signup: async (dto) => {
    const { data } = await client.post('/auth/signup', dto);
    return data; // { accessToken, user }
  },

  getCompaniesList: async () => {
    const { data } = await client.get('/companies/public-list');
    return data; // [{ id, name, code, companyType, city, state }]
  },

  me: async () => {
    const { data } = await client.get('/users/me');
    return data;
  },
};
