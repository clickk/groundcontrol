export interface User {
  id: string;
  email: string;
  name: string;
  clickupUserId?: string;
  clickupEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserMapping {
  userId: string;
  clickupUserId: string;
  clickupEmail: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

