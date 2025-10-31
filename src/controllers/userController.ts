import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export async function createUser(req: Request, res: Response) {
  try {
    const { username, password, role_id, purok } = req.body;

    // Validate required fields
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        role_id: BigInt(role_id),
        purok: purok || null,
      },
      select: {
        id: true,
        username: true,
        role_id: true,
        purok: true,
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUser = {
      ...newUser,
      id: newUser.id.toString(),
      role_id: newUser.role_id.toString()
    };

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
        role: {
          select: {
            name: true
          }
        }
      },
      orderBy: { username: 'asc' }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedUsers = users.map(user => ({
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
    const { username, password, role_id, purok } = req.body;

    const updateData: any = {};

    if (username) updateData.username = username;
    if (role_id) updateData.role_id = BigInt(role_id);
    if (purok !== undefined) updateData.purok = purok;

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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { username },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
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
        role: user.role.name,
        purok: user.purok
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
}