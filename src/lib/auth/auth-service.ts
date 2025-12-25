import { CreateUserInput, LoginInput, User } from '@/types/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export class AuthService {
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = this.generateToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as Omit<User, 'passwordHash'>,
      token,
    };
  }

  async register(input: CreateUserInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
    });

    const token = this.generateToken(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as Omit<User, 'passwordHash'>,
      token,
    };
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }
}

export const authService = new AuthService();

