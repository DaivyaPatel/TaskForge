import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { emailQueue } from '../jobs/emailQueue.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// --- AES-256-GCM Encryption Utilities for TOTP Secret ---
// We derive a consistent 32-byte key from your JWT_SECRET for the AES encryption
const ENCRYPTION_KEY = crypto.createHash('sha256').update(env.JWT_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';

const encryptString = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

const decryptString = (text) => {
  const [ivHex, encryptedHex, authTagHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// --- Controllers ---

export const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Registration failed" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        verificationToken: tokenHash,
        verificationExpires: expiresAt
      }
    });

    await emailQueue.add('verify-email', {
      email: user.email,
      token: rawToken
    });

    res.status(201).json({ message: "Check your email to verify your account" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: tokenHash,
        verificationExpires: { gt: new Date() } 
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null
      }
    });

    res.status(200).json({ message: "Email verified" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // --- NEW: Handle TOTP (Two-Factor Auth) ---
    if (user.totpEnabled) {
      if (!totpCode) {
        return res.status(200).json({ requiresTOTP: true });
      }

      const decryptedSecret = decryptString(user.totpSecret);
      
      // 1. Check if it's a standard authenticator code
      const isTotpValid = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1 // allows 30 seconds of drift before/after
      });

      if (!isTotpValid) {
        // 2. Fallback: Check if they used a backup code
        let validBackupCodeIndex = -1;
        for (let i = 0; i < user.backupCodes.length; i++) {
          if (await bcrypt.compare(totpCode, user.backupCodes[i])) {
            validBackupCodeIndex = i;
            break;
          }
        }

        if (validBackupCodeIndex !== -1) {
          // Burn the used backup code so it can't be reused
          const updatedBackupCodes = [...user.backupCodes];
          updatedBackupCodes.splice(validBackupCodeIndex, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: updatedBackupCodes }
          });
        } else {
          return res.status(401).json({ error: "Invalid 2FA code" });
        }
      }
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 12);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt
      }
    });

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        totpEnabled: user.totpEnabled
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const rawToken = req.cookies.refreshToken;
    if (!rawToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing expired access token" });
    }

    const expiredToken = authHeader.split(' ')[1];
    const decoded = jwt.decode(expiredToken); 
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: "Invalid access token" });
    }
    const userId = decoded.sub;

    const sessions = await prisma.session.findMany({ where: { userId } });

    let currentSession = null;
    for (const session of sessions) {
      const isValid = await bcrypt.compare(rawToken, session.token);
      if (isValid) {
        currentSession = session;
        break;
      }
    }

    if (!currentSession) {
      await prisma.session.deleteMany({ where: { userId } });
      return res.status(401).json({ error: "Token reuse detected. All sessions revoked." });
    }

    if (new Date() > currentSession.expiresAt) {
      await prisma.session.delete({ where: { id: currentSession.id } });
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    await prisma.session.delete({ where: { id: currentSession.id } });

    const newAccessToken = jwt.sign(
      { sub: userId, email: decoded.email },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRawRefreshToken, 12);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId,
        token: newRefreshTokenHash,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt
      }
    });

    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ accessToken: newAccessToken });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const rawToken = req.cookies.refreshToken;

    if (rawToken) {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.split(' ')[1];
        const decoded = jwt.decode(accessToken);

        if (decoded && decoded.sub) {
          const sessions = await prisma.session.findMany({ where: { userId: decoded.sub } });
          
          for (const session of sessions) {
            const isValid = await bcrypt.compare(rawToken, session.token);
            if (isValid) {
              await prisma.session.delete({ where: { id: session.id } });
              break;
            }
          }
        }
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth'
    });

    res.status(200).json({ message: "Logged out" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: "If that email exists, you'll receive a reset link" });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetExpires: expiresAt
      }
    });

    await emailQueue.add('reset-password', {
      email: user.email,
      token: rawToken
    });

    res.status(200).json({ message: "If that email exists, you'll receive a reset link" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetExpires: null
        }
      }),
      prisma.session.deleteMany({
        where: { userId: user.id }
      })
    ]);

    res.status(200).json({ message: "Password reset successful. Please log in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSessions = async (req, res) => {
  try {
    const userId = req.user.id; 
    const currentToken = req.cookies.refreshToken;

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const formattedSessions = await Promise.all(sessions.map(async (session) => {
      let isCurrent = false;
      if (currentToken) {
        isCurrent = await bcrypt.compare(currentToken, session.token);
      }
      return {
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent
      };
    }));

    res.status(200).json(formattedSessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: userId
      }
    });

    res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.session.deleteMany({
      where: { userId }
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth'
    });

    res.status(200).json({ message: "All sessions revoked. Logged out." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- NEW: TOTP 2FA Endpoints ---

export const setupTOTP = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.totpEnabled) {
      return res.status(400).json({ error: "2FA is already enabled" });
    }

    const secret = speakeasy.generateSecret({ name: `TaskForge (${user.email})` });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    const encryptedSecret = encryptString(secret.base32);

    // Generate 10 backup codes (8 hex chars each)
    const rawBackupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedBackupCodes = await Promise.all(rawBackupCodes.map(code => bcrypt.hash(code, 10)));

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptedSecret,
        backupCodes: hashedBackupCodes
      }
    });

    res.status(200).json({
      qrCodeUrl,
      secret: secret.base32, // Provide manual text fallback if they can't scan QR
      backupCodes: rawBackupCodes // Sent ONLY this once. Must be saved by user.
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyTOTPSetup = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user.totpSecret) {
      return res.status(400).json({ error: "2FA setup has not been initiated" });
    }

    const decryptedSecret = decryptString(user.totpSecret);

    const isVerified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token
    });

    if (!isVerified) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true }
    });

    res.status(200).json({ message: "2FA successfully enabled" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const disableTOTP = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        backupCodes: []
      }
    });

    res.status(200).json({ message: "2FA successfully disabled" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};