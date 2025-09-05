'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

/**
 * Authenticates a user with email and password
 * 
 * This function handles user login with comprehensive security measures including:
 * - Rate limiting to prevent brute force attacks
 * - Input validation and sanitization
 * - Email format validation
 * - Password length requirements
 * 
 * @param data - Login credentials containing email and password
 * @returns Promise<{ error: string | null }> - Returns error message if login fails, null if successful
 * 
 * @example
 * ```typescript
 * const result = await login({ email: 'user@example.com', password: 'password123' });
 * if (result.error) {
 *   console.error('Login failed:', result.error);
 * } else {
 *   // Login successful, user is now authenticated
 * }
 * ```
 */
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

/**
 * Registers a new user account
 * 
 * This function creates a new user account with comprehensive validation including:
 * - Rate limiting to prevent spam registrations
 * - Input validation for name, email, and password
 * - Email format validation
 * - Password strength requirements (uppercase, lowercase, numbers)
 * - Length constraints for all fields
 * 
 * @param data - Registration data containing name, email, and password
 * @returns Promise<{ error: string | null }> - Returns error message if registration fails, null if successful
 * 
 * @example
 * ```typescript
 * const result = await register({ 
 *   name: 'John Doe', 
 *   email: 'john@example.com', 
 *   password: 'SecurePass123' 
 * });
 * if (result.error) {
 *   console.error('Registration failed:', result.error);
 * } else {
 *   // Registration successful, user account created
 * }
 * ```
 */
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

/**
 * Signs out the current user
 * 
 * This function handles user logout by invalidating the current session.
 * It's a simple wrapper around Supabase's signOut method.
 * 
 * @returns Promise<{ error: string | null }> - Returns error message if logout fails, null if successful
 * 
 * @example
 * ```typescript
 * const result = await logout();
 * if (result.error) {
 *   console.error('Logout failed:', result.error);
 * } else {
 *   // User successfully logged out
 * }
 * ```
 */
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Retrieves the currently authenticated user
 * 
 * This function fetches the current user from the Supabase session.
 * It's commonly used to check authentication status and get user information.
 * 
 * @returns Promise<User | null> - Returns the current user object or null if not authenticated
 * 
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('User is authenticated:', user.email);
 * } else {
 *   console.log('No user is currently authenticated');
 * }
 * ```
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Retrieves the current user session
 * 
 * This function fetches the current session from Supabase, which includes
 * both user information and session metadata like expiration time.
 * 
 * @returns Promise<Session | null> - Returns the current session object or null if no active session
 * 
 * @example
 * ```typescript
 * const session = await getSession();
 * if (session) {
 *   console.log('Session expires at:', session.expires_at);
 *   console.log('User:', session.user.email);
 * } else {
 *   console.log('No active session');
 * }
 * ```
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
