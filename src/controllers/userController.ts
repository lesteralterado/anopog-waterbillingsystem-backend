import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from '../config/firebase';
import prisma from '../lib/prisma';
import { emitToClients } from '../services/socketService';

export async function createUser(req: Request, res: Response) {
  try {
  const { username, password, role_id, purok, meter_number, full_name, address, phone, email, idToken } = req.body;

    let firebaseUid: string | null = null;

    if (idToken) {
      // Verify Firebase token and get UID
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        firebaseUid = decodedToken.uid;

        // Check if user with this firebase_uid already exists
        const existingFirebaseUser = await prisma.users.findUnique({
          where: { firebase_uid: firebaseUid } as any
        });

        if (existingFirebaseUser) {
          return res.status(409).json({ message: "User with this Firebase account already exists" });
        }
      } catch (error) {
        console.error("Firebase token verification error:", error);
        return res.status(400).json({ message: "Invalid Firebase token" });
      }
    } else {
      // Traditional registration
      if (!username || !password || !role_id) {
        return res.status(400).json({ message: "Missing required fields: username, password, role_id" });
      }

      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { username }
      });

      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user
    const newUser = await prisma.users.create({
      data: {
        username: username || null,
        password: hashedPassword,
        firebase_uid: firebaseUid,
        role_id: BigInt(role_id),
        purok: purok ? purok.toString() : null,
        meter_number: meter_number || null,
        full_name: full_name || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      } as any,
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
        meter_number: true,
        full_name: true,
        address: true,
        phone: true,
        email: true,
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = {
      ...newUser,
      id: newUser.id.toString(),
      role_id: newUser.role_id.toString()
    };

    // Emit new customer event to connected clients (e.g., Flutter meter-reader app)
    emitToClients('newCustomer', {
      message: 'New customer added',
      data: serializedUser
    });

    // Optional: Send welcome SMS if phone number is provided in future
    // This can be extended when phone_number field is added to users table

    res.status(201).json({ success: true, user: serializedUser });
  } catch (error: any) {
    console.error("Create User Error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
        meter_number: true,
        full_name: true,
        address: true,
        phone: true,
        email: true,
        role: {
          select: {
            name: true
          }
        }
      },
      orderBy: { username: 'asc' }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUsers = users.map((user: typeof users[number]) => ({
      ...user,
      id: user.id.toString(),
      role_id: user.role_id.toString()
    }));

    res.json(serializedUsers);
  } catch (error: any) {
    console.error("Get Users Error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
        meter_number: true,
        full_name: true,
        address: true,
        phone: true,
        email: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = {
      ...user,
      id: user.id.toString(),
      role_id: user.role_id.toString()
    };

    res.json(serializedUser);
  } catch (error: any) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
  const { username, password, role_id, purok, meter_number, full_name, address, phone, email } = req.body;

  const updateData: any = {};

  if (username) updateData.username = username;
  if (role_id) updateData.role_id = BigInt(role_id);
  if (purok !== undefined) updateData.purok = purok ? purok.toString() : null;
  if (meter_number !== undefined) updateData.meter_number = meter_number;
  if (full_name !== undefined) updateData.full_name = full_name;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
        meter_number: true,
        full_name: true,
        address: true,
        phone: true,
        email: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = {
      ...updatedUser,
      id: updatedUser.id.toString(),
      role_id: updatedUser.role_id.toString()
    };

    res.json({ success: true, user: serializedUser });
  } catch (error: any) {
    console.error("Update User Error:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.users.delete({
      where: { id: BigInt(id) }
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { username, password, idToken } = req.body;

    let user;

    if (idToken) {
      // Firebase Auth login
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseUid = decodedToken.uid;

        // Find user by firebase_uid
        user = await prisma.users.findUnique({
          where: { firebase_uid: firebaseUid } as any,
          include: {
            role: true
          }
        }) as any;

        if (!user) {
          // If user not found, try to find by email if available
          if (decodedToken.email) {
            user = await prisma.users.findFirst({
              where: { email: decodedToken.email },
              include: {
                role: true
              }
            });

            // If found, update firebase_uid
            if (user) {
              await prisma.users.update({
                where: { id: user.id },
                data: { firebase_uid: firebaseUid } as any
              });
            }
          }
        }

        if (!user) {
          return res.status(401).json({ message: "User not found. Please register first." });
        }
      } catch (error) {
        console.error("Firebase token verification error:", error);
        return res.status(401).json({ message: "Invalid Firebase token" });
      }
    } else {
      // Traditional username/password login
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find user
      user = await prisma.users.findUnique({
        where: { username },
        include: {
          role: true
        }
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if password is hashed
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');

      // Check password
      let isValidPassword: boolean;
      if (isHashed) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Fallback for plain text passwords
        isValidPassword = password === user.password;
      }

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id.toString(),
        username: user.username,
        role: user.role.name
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id.toString(),
        username: user.username,
        role_id: user.role_id.toString(),
        purok: user.purok,
        meter_number: user.meter_number,
        full_name: user.full_name,
        address: user.address,
        phone: user.phone,
        email: user.email,
        role: {
          name: user.role.name
        }
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getConsumersByPurok(req: Request, res: Response) {
  try {
    const users = await prisma.users.findMany({
      where: {
        purok: {
          not: null
        }
      },
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
        meter_number: true,
        full_name: true,
        address: true,
        phone: true,
        email: true,
        role: {
          select: {
            name: true
          }
        }
      },
      orderBy: { username: 'asc' }
    });

    // Group users by purok
    const purokMap = new Map<string, typeof users>();

    users.forEach(user => {
      const purok = user.purok!;
      if (!purokMap.has(purok)) {
        purokMap.set(purok, []);
      }
      purokMap.get(purok)!.push(user);
    });

    // Convert to array of objects
    const consumersByPurok = Array.from(purokMap.entries()).map(([purok, consumers]) => ({
      purok,
      consumers: consumers.map(user => ({
        ...user,
        id: user.id.toString(),
        role_id: user.role_id.toString()
      }))
    }));

    res.json(consumersByPurok);
  } catch (error: any) {
    console.error("Get Consumers By Purok Error:", error);
    res.status(500).json({ error: error.message });
  }
}