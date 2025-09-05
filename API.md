# API Documentation

This document provides comprehensive documentation for the ALX Polly application's server actions and API endpoints.

## Overview

ALX Polly uses Next.js Server Actions for all server-side operations. These actions provide type-safe, secure, and efficient data handling with built-in CSRF protection.

## Authentication Actions

### `login(data: LoginFormData)`

Authenticates a user with email and password.

**Parameters:**
- `data.email` (string): User's email address
- `data.password` (string): User's password

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Rate limiting: 5 attempts per 5 minutes per IP
- Email format validation
- Password length validation (minimum 6 characters)
- Input sanitization

**Example:**
```typescript
const result = await login({ 
  email: 'user@example.com', 
  password: 'password123' 
});
```

### `register(data: RegisterFormData)`

Creates a new user account.

**Parameters:**
- `data.name` (string): User's full name (2-100 characters)
- `data.email` (string): User's email address
- `data.password` (string): User's password (8-128 characters)

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Rate limiting: 3 attempts per 5 minutes per IP
- Password strength requirements (uppercase, lowercase, numbers)
- Email format validation
- Input validation and sanitization

**Example:**
```typescript
const result = await register({ 
  name: 'John Doe', 
  email: 'john@example.com', 
  password: 'SecurePass123' 
});
```

### `logout()`

Signs out the current user.

**Returns:**
```typescript
Promise<{ error: string | null }>
```

### `getCurrentUser()`

Retrieves the currently authenticated user.

**Returns:**
```typescript
Promise<User | null>
```

### `getSession()`

Retrieves the current user session.

**Returns:**
```typescript
Promise<Session | null>
```

## Poll Management Actions

### `createPoll(formData: FormData)`

Creates a new poll with comprehensive validation.

**Parameters:**
- `formData.question` (string): Poll question (1-500 characters)
- `formData.options` (string[]): Poll options (2-10 options, 1-200 characters each)

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Rate limiting: 10 polls per hour per user
- Input validation and sanitization
- Duplicate option prevention
- Length constraints

**Example:**
```typescript
const formData = new FormData();
formData.append('question', 'What is your favorite color?');
formData.append('options', 'Red');
formData.append('options', 'Blue');
formData.append('options', 'Green');

const result = await createPoll(formData);
```

### `getUserPolls()`

Retrieves all polls created by the current user.

**Returns:**
```typescript
Promise<{ polls: Poll[], error: string | null }>
```

**Security Features:**
- Authentication required
- User-specific data filtering

### `getPollById(id: string)`

Retrieves a specific poll by its ID.

**Parameters:**
- `id` (string): Poll UUID

**Returns:**
```typescript
Promise<{ poll: Poll | null, error: string | null }>
```

**Security Features:**
- Public access (no authentication required)
- Error handling for non-existent polls

### `updatePoll(pollId: string, formData: FormData)`

Updates an existing poll.

**Parameters:**
- `pollId` (string): Poll UUID
- `formData.question` (string): Updated poll question
- `formData.options` (string[]): Updated poll options

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Authentication required
- Ownership verification
- Same validation as createPoll

### `deletePoll(id: string)`

Deletes a poll with ownership verification.

**Parameters:**
- `id` (string): Poll UUID

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Authentication required
- Ownership verification
- Cache revalidation

## Voting Actions

### `submitVote(pollId: string, optionIndex: number)`

Submits a vote for a specific poll option.

**Parameters:**
- `pollId` (string): Poll UUID
- `optionIndex` (number): Zero-based index of the selected option

**Returns:**
```typescript
Promise<{ error: string | null }>
```

**Security Features:**
- Poll existence verification
- Option index validation
- Duplicate vote prevention (for authenticated users)
- Support for anonymous voting

**Example:**
```typescript
const result = await submitVote('poll-uuid-123', 0);
```

## Data Types

### `LoginFormData`
```typescript
interface LoginFormData {
  email: string;
  password: string;
}
```

### `RegisterFormData`
```typescript
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}
```

### `Poll`
```typescript
interface Poll {
  id: string;
  question: string;
  options: string[];
  user_id: string;
  created_at: string;
  updated_at?: string;
}
```

### `User`
```typescript
interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
  created_at: string;
  // ... other Supabase user properties
}
```

## Error Handling

All server actions return a consistent error format:

```typescript
{ error: string | null }
```

Common error scenarios:
- **Authentication errors**: "You must be logged in to perform this action"
- **Authorization errors**: "You don't have permission to perform this action"
- **Validation errors**: "Invalid input provided"
- **Rate limiting**: "Too many requests. Please try again later"
- **Database errors**: Supabase error messages

## Rate Limiting

The application implements rate limiting for security:

- **Login attempts**: 5 per 5 minutes per IP
- **Registration attempts**: 3 per 5 minutes per IP
- **Poll creation**: 10 per hour per user
- **Voting**: No rate limiting (but duplicate prevention)

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Authentication**: Required for sensitive operations
3. **Authorization**: Users can only access their own data
4. **Rate Limiting**: Prevents abuse and brute force attacks
5. **CSRF Protection**: Built into Next.js Server Actions
6. **SQL Injection**: Prevented by Supabase's parameterized queries

## Usage Examples

### Complete Poll Creation Flow

```typescript
// 1. Create a poll
const formData = new FormData();
formData.append('question', 'What is your favorite programming language?');
formData.append('options', 'JavaScript');
formData.append('options', 'Python');
formData.append('options', 'TypeScript');

const createResult = await createPoll(formData);
if (createResult.error) {
  console.error('Failed to create poll:', createResult.error);
  return;
}

// 2. Get user's polls
const pollsResult = await getUserPolls();
if (pollsResult.error) {
  console.error('Failed to fetch polls:', pollsResult.error);
  return;
}

console.log('User has', pollsResult.polls.length, 'polls');
```

### Voting Flow

```typescript
// 1. Get poll details
const pollResult = await getPollById('poll-uuid-123');
if (pollResult.error || !pollResult.poll) {
  console.error('Poll not found');
  return;
}

// 2. Submit vote
const voteResult = await submitVote('poll-uuid-123', 0);
if (voteResult.error) {
  console.error('Vote failed:', voteResult.error);
  return;
}

console.log('Vote submitted successfully');
```

## Best Practices

1. **Always check for errors** in server action responses
2. **Handle loading states** in your UI components
3. **Validate inputs** on both client and server side
4. **Use proper TypeScript types** for better development experience
5. **Implement proper error boundaries** for graceful error handling
6. **Test rate limiting** to ensure it works as expected
7. **Monitor authentication state** changes in your components
