export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export type UsersListResponse = {
  items: User[];
  total: number;
  page: number;
  limit: number;
};
