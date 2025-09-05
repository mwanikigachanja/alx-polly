"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

// CREATE POLL
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

// GET USER POLLS
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

// GET POLL BY ID
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

// SUBMIT VOTE
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

// DELETE POLL
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

// UPDATE POLL
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
