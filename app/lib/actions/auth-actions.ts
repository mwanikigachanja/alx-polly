'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function login(data: LoginFormData) {
  const supabase = await createClient();

  // Rate limiting
  const headersList = await headers();
  const clientIP = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`login:${clientIP}`, 5, 300000); // 5 attempts per 5 minutes
  
  if (!rateLimitResult.allowed) {
    return { error: "Too many login attempts. Please try again later." };
  }

  // Input validation
  if (!data.email || !data.password) {
    return { error: "Email and password are required." };
  }

  if (data.email.length > 254) {
    return { error: "Email is too long." };
  }

  if (data.password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { error: "Please enter a valid email address." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  // Rate limiting
  const headersList = await headers();
  const clientIP = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`register:${clientIP}`, 3, 300000); // 3 attempts per 5 minutes
  
  if (!rateLimitResult.allowed) {
    return { error: "Too many registration attempts. Please try again later." };
  }

  // Input validation
  if (!data.name || !data.email || !data.password) {
    return { error: "Name, email, and password are required." };
  }

  if (data.name.trim().length < 2 || data.name.trim().length > 100) {
    return { error: "Name must be between 2 and 100 characters." };
  }

  if (data.email.length > 254) {
    return { error: "Email is too long." };
  }

  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (data.password.length > 128) {
    return { error: "Password is too long." };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { error: "Please enter a valid email address." };
  }

  // Password strength validation
  const hasUpperCase = /[A-Z]/.test(data.password);
  const hasLowerCase = /[a-z]/.test(data.password);
  const hasNumbers = /\d/.test(data.password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { error: "Password must contain at least one uppercase letter, one lowercase letter, and one number." };
  }

  const { error } = await supabase.auth.signUp({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    options: {
      data: {
        name: data.name.trim(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
