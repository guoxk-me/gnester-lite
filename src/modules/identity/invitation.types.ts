export interface InvitationRecord {
  id: string;
  email: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
  sentAt: string;
  expiresAt: string;
}
