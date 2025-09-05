"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

/**
 * Creates a new poll with comprehensive validation and security measures
 * 
 * This function handles poll creation with the following security features:
 * - User authentication verification
 * - Rate limiting to prevent spam (10 polls per hour per user)
 * - Input validation and sanitization
 * - Duplicate option prevention
 * - Length constraints for questions and options
 * 
 * @param formData - Form data containing poll question and options
 * @returns Promise<{ error: string | null }> - Returns error message if creation fails, null if successful
 * 
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('question', 'What is your favorite color?');
 * formData.append('options', 'Red');
 * formData.append('options', 'Blue');
 * formData.append('options', 'Green');
 * 
 * const result = await createPoll(formData);
 * if (result.error) {
 *   console.error('Poll creation failed:', result.error);
 * } else {
 *   // Poll created successfully
 * }
 * ```
 */
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  // Get user first for rate limiting
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  // Rate limiting per user
  const rateLimitResult = rateLimit(`createPoll:${user.id}`, 10, 3600000); // 10 polls per hour
  if (!rateLimitResult.allowed) {
    return { error: "Too many polls created. Please try again later." };
  }

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Input validation and sanitization
  if (!question || question.trim().length === 0) {
    return { error: "Question is required." };
  }
  
  if (question.length > 500) {
    return { error: "Question must be less than 500 characters." };
  }
  
  if (options.length < 2) {
    return { error: "At least two options are required." };
  }
  
  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }
  
  // Sanitize and validate options
  const sanitizedOptions = options
    .map(option => option.trim())
    .filter(option => option.length > 0 && option.length <= 200);
    
  if (sanitizedOptions.length !== options.length) {
    return { error: "All options must be between 1 and 200 characters." };
  }
  
  // Check for duplicate options
  const uniqueOptions = new Set(sanitizedOptions);
  if (uniqueOptions.size !== sanitizedOptions.length) {
    return { error: "Duplicate options are not allowed." };
  }


  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: question.trim(),
      options: sanitizedOptions,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

/**
 * Retrieves all polls created by the current authenticated user
 * 
 * This function fetches polls with the following features:
 * - Authentication verification
 * - User-specific data filtering
 * - Ordered by creation date (newest first)
 * 
 * @returns Promise<{ polls: Poll[], error: string | null }> - Returns user's polls or error message
 * 
 * @example
 * ```typescript
 * const result = await getUserPolls();
 * if (result.error) {
 *   console.error('Failed to fetch polls:', result.error);
 * } else {
 *   console.log('User has', result.polls.length, 'polls');
 *   result.polls.forEach(poll => {
 *     console.log('Poll:', poll.question);
 *   });
 * }
 * ```
 */
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

/**
 * Retrieves a specific poll by its ID
 * 
 * This function fetches a single poll with the following features:
 * - Public access (no authentication required)
 * - Single poll retrieval
 * - Error handling for non-existent polls
 * 
 * @param id - The unique identifier of the poll
 * @returns Promise<{ poll: Poll | null, error: string | null }> - Returns poll data or error message
 * 
 * @example
 * ```typescript
 * const result = await getPollById('poll-uuid-123');
 * if (result.error) {
 *   console.error('Failed to fetch poll:', result.error);
 * } else if (result.poll) {
 *   console.log('Poll question:', result.poll.question);
 *   console.log('Options:', result.poll.options);
 * } else {
 *   console.log('Poll not found');
 * }
 * ```
 */
export async function getPollById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

/**
 * Submits a vote for a specific poll option
 * 
 * This function handles voting with comprehensive validation:
 * - Poll existence verification
 * - Option index validation
 * - Duplicate vote prevention for authenticated users
 * - Support for both authenticated and anonymous voting
 * 
 * @param pollId - The unique identifier of the poll
 * @param optionIndex - The zero-based index of the selected option
 * @returns Promise<{ error: string | null }> - Returns error message if voting fails, null if successful
 * 
 * @example
 * ```typescript
 * const result = await submitVote('poll-uuid-123', 0);
 * if (result.error) {
 *   console.error('Vote submission failed:', result.error);
 * } else {
 *   console.log('Vote submitted successfully');
 * }
 * ```
 */
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Input validation
  if (!pollId || typeof optionIndex !== 'number' || optionIndex < 0) {
    return { error: "Invalid poll ID or option index." };
  }

  // Check if poll exists and get poll data
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found." };
  }

  // Validate option index
  if (optionIndex >= poll.options.length) {
    return { error: "Invalid option selected." };
  }

  // Check for existing vote (prevent duplicate voting)
  if (user) {
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      return { error: "You have already voted on this poll." };
    }
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Deletes a poll with ownership verification
 * 
 * This function handles poll deletion with security measures:
 * - User authentication verification
 * - Ownership verification (users can only delete their own polls)
 * - Database integrity maintenance
 * - Cache revalidation
 * 
 * @param id - The unique identifier of the poll to delete
 * @returns Promise<{ error: string | null }> - Returns error message if deletion fails, null if successful
 * 
 * @example
 * ```typescript
 * const result = await deletePoll('poll-uuid-123');
 * if (result.error) {
 *   console.error('Poll deletion failed:', result.error);
 * } else {
 *   console.log('Poll deleted successfully');
 * }
 * ```
 */
export async function deletePoll(id: string) {
  const supabase = await createClient();
  
  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // Only allow deleting polls owned by the user
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
    
  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

/**
 * Updates an existing poll with ownership verification
 * 
 * This function handles poll updates with comprehensive security measures:
 * - User authentication verification
 * - Ownership verification (users can only update their own polls)
 * - Input validation and sanitization (same as createPoll)
 * - Duplicate option prevention
 * - Length constraints for questions and options
 * 
 * @param pollId - The unique identifier of the poll to update
 * @param formData - Form data containing updated poll question and options
 * @returns Promise<{ error: string | null }> - Returns error message if update fails, null if successful
 * 
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('question', 'Updated question');
 * formData.append('options', 'Option 1');
 * formData.append('options', 'Option 2');
 * 
 * const result = await updatePoll('poll-uuid-123', formData);
 * if (result.error) {
 *   console.error('Poll update failed:', result.error);
 * } else {
 *   console.log('Poll updated successfully');
 * }
 * ```
 */
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Input validation and sanitization (same as createPoll)
  if (!question || question.trim().length === 0) {
    return { error: "Question is required." };
  }
  
  if (question.length > 500) {
    return { error: "Question must be less than 500 characters." };
  }
  
  if (options.length < 2) {
    return { error: "At least two options are required." };
  }
  
  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }
  
  // Sanitize and validate options
  const sanitizedOptions = options
    .map(option => option.trim())
    .filter(option => option.length > 0 && option.length <= 200);
    
  if (sanitizedOptions.length !== options.length) {
    return { error: "All options must be between 1 and 200 characters." };
  }
  
  // Check for duplicate options
  const uniqueOptions = new Set(sanitizedOptions);
  if (uniqueOptions.size !== sanitizedOptions.length) {
    return { error: "Duplicate options are not allowed." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question: question.trim(), options: sanitizedOptions })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
