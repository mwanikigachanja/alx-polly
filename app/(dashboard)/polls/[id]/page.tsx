import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getPollById, getPollResults, voteOnPoll } from '@/app/lib/actions/poll-actions';

export default async function PollDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const { poll } = await getPollById(params.id);
  if (!poll) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/polls" className="text-blue-600 hover:underline">&larr; Back to Polls</Link>
        <div className="mt-6">Poll not found.</div>
      </div>
    );
  }

  let counts: number[] = [];
  let resultsLoadFailed = false;
  try {
    const result = await getPollResults(params.id);
    if (result && Array.isArray(result.counts)) {
      counts = result.counts;
    } else {
      counts = [];
    }
  } catch (err) {
    console.error('Failed to load poll results', err);
    resultsLoadFailed = true;
    counts = [];
  }

  const optionCount = (poll.options as string[]).length;
  if (counts.length !== optionCount) {
    const normalized: number[] = new Array(optionCount).fill(0);
    for (let i = 0; i < optionCount; i++) {
      const value = counts[i];
      normalized[i] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }
    counts = normalized;
  }

  const totalVotes = counts.reduce((a, b) => a + b, 0);

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/polls" className="text-blue-600 hover:underline">
          &larr; Back to Polls
        </Link>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/polls/${params.id}/edit`}>Edit Poll</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
          <CardDescription>Vote and see live results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={async (formData) => {
              try {
                const result = await voteOnPoll(params.id, formData);
                if (result && result.error) {
                  console.error('Vote submission failed', { pollId: params.id, error: result.error });
                  redirect(`/polls/${params.id}?error=${encodeURIComponent('Unable to submit your vote. Please try again.')}`);
                }
                redirect(`/polls/${params.id}`);
              } catch (err) {
                console.error('Unexpected error during vote submission', { pollId: params.id, err });
                redirect(`/polls/${params.id}?error=${encodeURIComponent('Unable to submit your vote. Please try again.')}`);
              }
            }}
            className="space-y-3"
          >
            {poll.options.map((opt: string, idx: number) => (
              <label key={idx} className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-slate-50">
                <input type="radio" name="optionIndex" value={idx} className="h-4 w-4" required />
                <span>{opt}</span>
              </label>
            ))}
            <Button type="submit" className="mt-2">Submit Vote</Button>
          </form>

          <div className="space-y-4">
            <h3 className="font-medium">Results</h3>
            {searchParams?.error && (
              <div className="text-sm text-red-600">{Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error}</div>
            )}
            {resultsLoadFailed && (
              <div className="text-sm text-red-600">Unable to load live results. Showing fallback.</div>
            )}
            {poll.options.map((opt: string, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{opt}</span>
                  <span>{getPercentage(counts[idx] ?? 0)}% ({counts[idx] ?? 0} votes)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${getPercentage(counts[idx] ?? 0)}%` }} />
                </div>
              </div>
            ))}
            <div className="text-sm text-slate-500 pt-2">Total votes: {totalVotes}</div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-slate-500 flex justify-between">
          <span>Poll ID: {poll.id}</span>
        </CardFooter>
      </Card>
    </div>
  );
}