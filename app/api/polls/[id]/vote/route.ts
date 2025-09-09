import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { optionIndex } = await req.json();
  const pollId = params.id;

  if (!pollId || typeof optionIndex !== 'number' || optionIndex < 0) {
    return NextResponse.json({ error: "Invalid poll ID or option index." }, { status: 400 });
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: "Poll not found." }, { status: 404 });
  }

  if (optionIndex >= poll.options.length) {
    return NextResponse.json({ error: "Invalid option selected." }, { status: 400 });
  }

  if (user) {
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted on this poll." }, { status: 409 });
    }
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
