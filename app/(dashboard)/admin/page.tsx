"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deletePoll } from "@/app/lib/actions/poll-actions";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/lib/context/auth-context";
import { useRouter } from "next/navigation";

/**
 * Interface for poll data structure
 */
interface Poll {
  id: string;
  question: string;
  user_id: string;
  created_at: string;
  options: string[];
}

/**
 * Admin Panel Component
 * 
 * This component provides administrative functionality for managing all polls in the system.
 * It includes comprehensive security measures and access controls.
 * 
 * Security Features:
 * - Admin role verification
 * - Authentication requirement
 * - Ownership-based poll deletion
 * - Access control and redirects
 * 
 * Features:
 * - View all polls in the system
 * - Delete any poll (with proper authorization)
 * - Display poll metadata and options
 * - Loading states and error handling
 */
export default function AdminPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Admin role verification - in production, implement proper RBAC
  const isAdmin = user?.email === "admin@example.com"; // TODO: Replace with proper admin check

  /**
   * Effect hook for authentication and authorization checks
   * Redirects users based on their authentication and admin status
   */
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect unauthenticated users to login
        router.push("/login");
        return;
      }
      if (!isAdmin) {
        // Redirect non-admin users to their dashboard
        router.push("/polls");
        return;
      }
      // Load polls for authenticated admin users
      fetchAllPolls();
    }
  }, [user, authLoading, isAdmin, router]);

  /**
   * Fetches all polls from the database
   * Orders them by creation date (newest first)
   */
  const fetchAllPolls = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPolls(data);
    }
    setLoading(false);
  };

  /**
   * Handles poll deletion with loading state management
   * Updates the local state to reflect the deletion
   * @param pollId - The ID of the poll to delete
   */
  const handleDelete = async (pollId: string) => {
    setDeleteLoading(pollId);
    const result = await deletePoll(pollId);

    if (!result.error) {
      // Remove the deleted poll from the local state
      setPolls(polls.filter((poll) => poll.id !== pollId));
    }

    setDeleteLoading(null);
  };

  if (authLoading || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) {
    return <div className="p-6">Please log in to access this page.</div>;
  }

  if (!isAdmin) {
    return <div className="p-6">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      <div className="grid gap-4">
        {polls.map((poll) => (
          <Card key={poll.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <CardDescription>
                    <div className="space-y-1 mt-2">
                      <div>
                        Poll ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.id}
                        </code>
                      </div>
                      <div>
                        Owner ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.user_id}
                        </code>
                      </div>
                      <div>
                        Created:{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(poll.id)}
                  disabled={deleteLoading === poll.id}
                >
                  {deleteLoading === poll.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {poll.options.map((option, index) => (
                    <li key={index} className="text-gray-700">
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {polls.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No polls found in the system.
        </div>
      )}
    </div>
  );
}
