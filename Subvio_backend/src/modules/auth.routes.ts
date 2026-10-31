import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { HttpError, badRequest, password, zOptionalText } from '../lib/http';
import { button, sendMail } from '../lib/mailer';
import { authenticate, signToken } from '../middleware/auth';

export const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  phone: true,
  company: true,
  address: true,
  gstin: true,
  createdAt: true,
} as const;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

/** Creates a single-use password (re)set link valid for `hours`. */
export async function createPasswordLink(userId: string, hours: number) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: userId },
    data: { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + hours * 3_600_000) },
  });
  return `${env.appUrl}/reset-password?token=${token}`;
}

async function session(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUser });
  return { token: signToken(user.id), user };
}

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const role = z.enum(['CUSTOMER', 'STAFF', 'ADMIN'], { message: 'Select your role' });
type SelectedRole = z.infer<typeof role>;
const roleLabel = (r: SelectedRole) => r.charAt(0) + r.slice(1).toLowerCase();

/** Staff and admin sign-ups stay inactive until an existing admin approves them on the Staff page. */
const pendingResponse = (r: SelectedRole) => ({
  pending: true,
  message: `Your ${roleLabel(r)} account has been created and is waiting for admin approval. You can log in once an admin activates it.`,
});

function assertRole(user: { role: SelectedRole; isActive: boolean }, selected: SelectedRole) {
  if (user.role !== selected) {
    throw new HttpError(401, `This account is not registered as ${roleLabel(selected)}. Select the correct role and try again.`);
  }
  if (!user.isActive) {
    throw new HttpError(403, 'Your account is not active yet. An admin must approve or re-activate it before you can log in.');
  }
}

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

const router = Router();

router.post('/signup', async (req, res) => {
  const data = z.object({ name: z.string().trim().min(2, 'Name is required'), email, password, role }).parse(req.body);
  const isCustomer = data.role === 'CUSTOMER';
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password), role: data.role, isActive: isCustomer },
  });
  if (!isCustomer) return void res.status(202).json(pendingResponse(data.role));
  res.status(201).json(await session(user.id));
});

router.post('/login', async (req, res) => {
  const data = z.object({ email, password: z.string().min(1, 'Password is required'), role }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  assertRole(user, data.role);
  res.json(await session(user.id));
});

router.post('/google', async (req, res) => {
  const { idToken, role: selected } = z.object({ idToken: z.string().min(1), role }).parse(req.body);
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, firebaseKeys, {
      issuer: `https://securetoken.google.com/${env.firebaseProjectId}`,
      audience: env.firebaseProjectId,
    }));
  } catch {
    throw new HttpError(401, 'Google sign-in could not be verified');
  }
  const googleEmail = String(payload.email ?? '').toLowerCase();
  if (!googleEmail || !payload.email_verified) throw new HttpError(401, 'Google account email is not verified');

  const existing = await prisma.user.findUnique({ where: { email: googleEmail } });
  if (!existing) {
    const isCustomer = selected === 'CUSTOMER';
    const user = await prisma.user.create({
      data: { email: googleEmail, name: String(payload.name ?? googleEmail.split('@')[0]), role: selected, isActive: isCustomer },
    });
    if (!isCustomer) return void res.status(202).json(pendingResponse(selected));
    return void res.status(201).json(await session(user.id));
  }
  assertRole(existing, selected);
  res.json(await session(existing.id));
});

router.post('/forgot-password', async (req, res) => {
  const data = z.object({ email }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (user?.isActive) {
    const link = await createPasswordLink(user.id, 1);
    try {
      await sendMail(
        user.email,
        'Reset your Subvio password',
        'Reset your password',
        `<p>Hi ${user.name},</p><p>We received a request to reset your password. This link is valid for 1 hour.</p>
         <p style="margin:24px 0">${button(link, 'Reset password')}</p>
         <p style="color:#81778B;font-size:13px">If you did not request this, you can safely ignore this email.</p>`,
      );
    } catch (err) {
      console.error('Reset email failed:', (err as Error).message);
      throw new HttpError(502, 'We could not send the email right now. Please try again later.');
    }
  }
  res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const data = z.object({ token: z.string().min(1), password }).parse(req.body);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: hashToken(data.token), resetTokenExpires: { gt: new Date() } },
  });
  if (!user) throw badRequest('This reset link is invalid or has expired');
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(data.password), resetTokenHash: null, resetTokenExpires: null },
  });
  res.json({ message: 'Password updated. You can now log in.' });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { ...publicUser, passwordHash: true } });
  const { passwordHash, ...rest } = user;
  res.json({ ...rest, hasPassword: Boolean(passwordHash) });
});

router.patch('/me', authenticate, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2, 'Name is required'),
      phone: zOptionalText,
      company: zOptionalText,
      address: zOptionalText,
      gstin: zOptionalText,
    })
    .parse(req.body);
  res.json(await prisma.user.update({ where: { id: req.user!.id }, data, select: publicUser }));
});

router.post('/change-password', authenticate, async (req, res) => {
  const data = z.object({ currentPassword: z.string().optional(), newPassword: password }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (user.passwordHash && !(await bcrypt.compare(data.currentPassword ?? '', user.passwordHash))) {
    throw badRequest('Current password is incorrect');
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } });
  res.json({ message: 'Password updated successfully' });
});

export default router;
