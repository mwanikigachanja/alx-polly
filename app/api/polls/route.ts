import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to create a poll." }, { status: 401 });
  }

  const rateLimitResult = rateLimit(`createPoll:${user.id}`, 10, 3600000); // 10 polls per hour
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: "Too many polls created. Please try again later." }, { status: 429 });
  }

  const { question, options } = await req.json();

  if (!question || String(question).trim().length === 0) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  
  if (String(question).length > 500) {
    return NextResponse.json({ error: "Question must be less than 500 characters." }, { status: 400 });
  }
  
  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "At least two options are required." }, { status: 400 });
  }
  
  if (options.length > 10) {
    return NextResponse.json({ error: "Maximum 10 options allowed." }, { status: 400 });
  }
  
  const sanitizedOptions = options
    .map(option => String(option).trim())
    .filter(option => option.length > 0 && option.length <= 200);
    
  if (sanitizedOptions.length !== options.length) {
    return NextResponse.json({ error: "All options must be between 1 and 200 characters." }, { status: 400 });
  }
  
  const uniqueOptions = new Set(sanitizedOptions);
  if (uniqueOptions.size !== sanitizedOptions.length) {
    return NextResponse.json({ error: "Duplicate options are not allowed." }, { status: 400 });
  }

  const { data, error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: String(question).trim(),
      options: sanitizedOptions,
    },
  ]).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/polls");
  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ polls: [], error: "Not authenticated" }, { status: 401 });
  
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
  
    if (error) return NextResponse.json({ polls: [], error: error.message }, { status: 500 });
    return NextResponse.json({ polls: data ?? [] });
}
