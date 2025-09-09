import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ poll: null, error: error.message }, { status: 404 });
  return NextResponse.json({ poll: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete a poll." }, { status: 401 });
  }

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  revalidatePath("/polls");
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to update a poll." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("polls")
    .update({ question: String(question).trim(), options: sanitizedOptions })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/polls/${params.id}`);
  revalidatePath('/polls');
  return NextResponse.json(data);
}
