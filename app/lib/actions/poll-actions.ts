'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

type ActionResult<T> = T & { error?: string };

// Concrete Poll type that matches the database schema
export interface Poll {
	id: string;
	user_id: string;
	question: string;
	options: string[];
	created_at: string;
	updated_at?: string | null;
}

function sanitizeOptions(options: string[]): string[] {
	return options
		.map((opt) => String(opt).trim())
		.filter((opt) => opt.length > 0 && opt.length <= 200);
}

export async function createPoll(formData: FormData): Promise<ActionResult<{}>> {
	const supabase = await createClient();

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError) return { error: userError.message };
	if (!user) return { error: 'You must be logged in to create a poll.' };

	const headersList = headers() as unknown as { get(name: string): string | null };
	const firstIp =
		(headersList.get('x-forwarded-for')?.split(',')[0].trim()) ||
		headersList.get('x-real-ip') ||
		'unknown';
	const limited = rateLimit(`createPoll:${firstIp}`, 10, 3600000);
	if (!limited.allowed) return { error: 'Too many polls created. Please try again later.' };

	const question = String(formData.get('question') ?? '').trim();
	const options = formData.getAll('options').map(String);

	if (!question) return { error: 'Question is required.' };
	if (question.length > 500) return { error: 'Question must be less than 500 characters.' };
	if (!Array.isArray(options) || options.length < 2)
		return { error: 'At least two options are required.' };
	if (options.length > 10) return { error: 'Maximum 10 options allowed.' };

	const sanitized = sanitizeOptions(options);
	if (sanitized.length !== options.length)
		return { error: 'All options must be between 1 and 200 characters.' };
	if (new Set(sanitized).size !== sanitized.length)
		return { error: 'Duplicate options are not allowed.' };

	const { error } = await supabase
		.from('polls')
		.insert([{ user_id: user.id, question, options: sanitized }]);
	if (error) return { error: error.message };

	revalidatePath('/polls');
	return {};
}

export async function getUserPolls(): Promise<{ polls: Poll[]; error?: string }> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError) return { polls: [], error: userError.message };
	if (!user) return { polls: [], error: 'Not authenticated' };

	const { data, error } = await supabase
		.from('polls')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });
	if (error) return { polls: [], error: error.message };
	return { polls: (data ?? []) as Poll[] };
}

export async function getPollById(id: string): Promise<{ poll: Poll | null; error?: string }> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('polls')
		.select('*')
		.eq('id', id)
		.single();
	if (error) return { poll: null, error: error.message };
	return { poll: (data as Poll) };
}

export async function updatePoll(id: string, formData: FormData): Promise<ActionResult<{}>> {
	const supabase = await createClient();

	// Authenticate early and verify ownership before any validation
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError) return { error: userError.message };
	if (!user) return { error: 'You must be logged in to update a poll.' };

	const { data: existingPoll, error: fetchError } = await supabase
		.from('polls')
		.select('user_id')
		.eq('id', id)
		.single();
	if (fetchError || !existingPoll) return { error: 'Poll not found.' };
	if ((existingPoll as any).user_id !== user.id) return { error: 'You do not have permission to update this poll.' };

	// Proceed with validation and sanitization after ownership is confirmed
	const question = String(formData.get('question') ?? '').trim();
	const options = formData.getAll('options').map(String);

	if (!question) return { error: 'Question is required.' };
	if (question.length > 500) return { error: 'Question must be less than 500 characters.' };
	if (!Array.isArray(options) || options.length < 2)
		return { error: 'At least two options are required.' };
	if (options.length > 10) return { error: 'Maximum 10 options allowed.' };

	const sanitized = sanitizeOptions(options);
	if (sanitized.length !== options.length)
		return { error: 'All options must be between 1 and 200 characters.' };
	if (new Set(sanitized).size !== sanitized.length)
		return { error: 'Duplicate options are not allowed.' };

	const { error } = await supabase
		.from('polls')
		.update({ question, options: sanitized })
		.eq('id', id)
		.eq('user_id', user.id);
	if (error) return { error: error.message };

	revalidatePath(`/polls/${id}`);
	revalidatePath('/polls');
	return {};
}

export async function deletePoll(id: string): Promise<ActionResult<{}>> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError) return { error: userError.message };
	if (!user) return { error: 'You must be logged in to delete a poll.' };

	const { error } = await supabase.from('polls').delete().eq('id', id).eq('user_id', user.id);
	if (error) return { error: error.message };

	revalidatePath('/polls');
	return {};
}

export async function voteOnPoll(
	pollId: string,
	formData: FormData
): Promise<ActionResult<{}>> {
	const supabase = await createClient();
	// Per-IP rate limiting: 5 votes per minute
	try {
		const headersList = headers() as unknown as { get(name: string): string | null };
		const voteIp =
			(headersList.get('x-forwarded-for')?.split(',')[0].trim()) ||
			headersList.get('x-real-ip') ||
			'unknown';
		const rate = rateLimit(`vote:${voteIp}`, 5, 60000);
		if (!rate.allowed) {
			return { error: 'Too many requests' };
		}
	} catch (_) {
		// If header parsing fails, continue without blocking
	}
	const raw = formData.get('optionIndex');
	const optionIndex = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number(raw);
	if (!pollId || Number.isNaN(optionIndex) || optionIndex < 0)
		return { error: 'Invalid poll ID or option index.' };

	const { data: poll, error: pollError } = await supabase
		.from('polls')
		.select('options')
		.eq('id', pollId)
		.single();
	if (pollError || !poll) return { error: 'Poll not found.' };
	if (optionIndex >= (poll.options as string[]).length)
		return { error: 'Invalid option selected.' };

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		const { data: existing } = await supabase
			.from('votes')
			.select('id')
			.eq('poll_id', pollId)
			.eq('user_id', user.id)
			.single();
		if (existing) return { error: 'You have already voted on this poll.' };
	}

	const { error } = await supabase.from('votes').insert([
		{ poll_id: pollId, user_id: user?.id ?? null, option_index: optionIndex },
	]);
	if (error) {
		const code = (error as any)?.code;
		const message = (error as any)?.message ?? '';
		if (code === '23505' || /duplicate key/i.test(message)) {
			return { error: 'You have already voted on this poll.' };
		}
		return { error: error.message };
	}

	revalidatePath(`/polls/${pollId}`);
	return {};
}

export async function getPollResults(pollId: string): Promise<{
	counts: number[];
	error?: string;
}> {
	const supabase = await createClient();
	const { data: poll, error: pollError } = await supabase
		.from('polls')
		.select('options')
		.eq('id', pollId)
		.single();
	if (pollError || !poll) return { counts: [], error: 'Poll not found.' };
	const options = (poll as any).options as string[];

	const { data, error } = await supabase
		.from('votes')
		.select('option_index')
		.eq('poll_id', pollId);
	if (error) return { counts: [], error: error.message };
	const counts = new Array(options.length).fill(0);
	for (const row of data ?? []) {
		if (typeof (row as any).option_index === 'number' && (row as any).option_index >= 0 && (row as any).option_index < counts.length) {
			counts[(row as any).option_index] += 1;
		}
	}
	return { counts };
}


