import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { JWTPayload, User } from './types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'nextgen_learn_jwt_secret_production_2026_super_key';
const TOKEN_EXPIRY = '7d';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  fullUser?: User;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

export function authenticateOptional(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export async function authenticateRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const user = await db.users.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = decoded;
  req.fullUser = user;
  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired credentials.' });
  }

  const user = await db.users.findById(decoded.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  req.user = decoded;
  req.fullUser = user;
  next();
}
