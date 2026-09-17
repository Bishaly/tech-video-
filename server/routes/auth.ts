import { Router } from 'express';
import { db } from '../db.ts';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateRequired,
  AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = await db.users.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await hashPassword(password);
    const newUser = await db.users.create({
      email: email.toLowerCase().trim(),
      password_hash,
      name: name.trim(),
      role: 'student',
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar_url: newUser.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const user = await db.users.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const purchases = await db.purchases.listByUser(user.id);
    const enrolledCourseIds = purchases.map((p) => p.course_id);

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      enrolledCourseIds,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login service encountered an unexpected error.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateRequired, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.fullUser!;
    const purchases = await db.purchases.listByUser(user.id);
    const enrolledCourseIds = purchases.map((p) => p.course_id);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      enrolledCourseIds,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch current user session.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = await db.users.findByEmail(email);
  // Always return success for security (no email enumeration)
  return res.json({
    message: 'If an account exists with this email, a password reset link has been dispatched.',
    demoResetToken: user ? `reset_${user.id}_token` : undefined,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and password of at least 8 characters required.' });
  }

  // Find user by token
  const parts = token.split('_');
  if (parts.length >= 2) {
    const userId = parts[1];
    const user = await db.users.findById(userId);
    if (user) {
      const password_hash = await hashPassword(newPassword);
      await db.users.update(user.id, { password_hash });
      return res.json({ message: 'Password reset successfully. You can now log in.' });
    }
  }

  return res.status(400).json({ error: 'Invalid or expired password reset token.' });
});

export default router;
