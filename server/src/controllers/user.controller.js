import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { fileTypeFromBuffer } from 'file-type';
import { emailQueue } from '../jobs/emailQueue.js';

const prisma = new PrismaClient();

// PUT /users/me
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, email } = req.body;
    const file = req.file;

    // 1. Find the current user
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    let updatedData = { displayName };
    let needsReverification = false;

    // 2. Handle Email Change
    if (email && email !== currentUser.email) {
      // Check if new email is already taken by someone else
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: "Email is already in use by another account" });
      }

      updatedData.email = email;
      updatedData.emailVerified = false;
      needsReverification = true;

      // Generate new verification token
      const rawToken = crypto.randomBytes(32).toString('hex');
      updatedData.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      updatedData.verificationExpires = expiresAt;

      // Enqueue verification email
      await emailQueue.add('verify-email', {
        email: email,
        token: rawToken
      });
    }

    // 3. Handle Avatar Upload (if a file was provided)
    if (file) {
      const fileTypeInfo = await fileTypeFromBuffer(file.buffer);
      if (!fileTypeInfo || !fileTypeInfo.mime.startsWith('image/')) {
        return res.status(400).json({ error: "Invalid file type. Please upload an image." });
      }

      const cloudRes = await new Promise((resolve, reject) => {
        const cld = cloudinary.uploader.upload_stream(
          { folder: 'taskforge_avatars', resource_type: 'image', transformation: [{ width: 250, height: 250, crop: 'fill' }] },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(cld);
      });

      updatedData.avatarUrl = cloudRes.secure_url;
    }

    // 4. Update Database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: { id: true, email: true, displayName: true, avatarUrl: true, emailVerified: true, totpEnabled: true }
    });

    const message = needsReverification 
      ? "Profile updated. Please check your new email to verify it." 
      : "Profile updated successfully.";

    res.status(200).json({ message, user: updatedUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /users/me/password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password AND invalidate all sessions to force re-login everywhere (optional but secure)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      }),
      prisma.session.deleteMany({
        where: { userId: userId }
      })
    ]);

    // Note: Deleting sessions will log out the current device too. 
    // The frontend should handle the 401 error on the next request and redirect to login.
    res.status(200).json({ message: "Password updated. You will be asked to log in again." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /users/me
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify password before destructive action
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Prisma cascade deletes will handle Workspaces (if owned), Tasks, Memberships, etc.
    await prisma.user.delete({ where: { id: userId } });

    // Clear the auth cookie just in case
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    res.status(200).json({ message: "Account permanently deleted" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};