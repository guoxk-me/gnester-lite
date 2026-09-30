export interface UserRecord {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
}
