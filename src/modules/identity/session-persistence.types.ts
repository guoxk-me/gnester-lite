export interface AccountRow {
  id: string;
  email: string;
  name: string;
  image: string | null;
  banned: boolean | number;
  password: string | null;
}

export interface SessionRow {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  rememberMe: boolean | number;
}
