export interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: number | boolean;
  banned: number | boolean;
  role: string;
  createdAt: Date;
}

export interface InvitationRow {
  id: string;
  email: string;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export interface CountRow {
  total: number;
}

export interface LockRow {
  acquired: number | string | null;
}
