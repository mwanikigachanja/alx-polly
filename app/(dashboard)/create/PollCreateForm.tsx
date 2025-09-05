"use client";

import { useState } from "react";
import { createPoll } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Poll Creation Form Component
 * 
 * This component provides a user-friendly interface for creating new polls.
 * It includes dynamic option management, form validation, and error handling.
 * 
 * Features:
 * - Dynamic option addition/removal
 * - Minimum 2 options requirement
 * - Real-time form validation
 * - Success/error state management
 * - Automatic redirect after successful creation
 */
export default function PollCreateForm() {
  // State management for form data and UI feedback
  const [options, setOptions] = useState(["", ""]); // Start with 2 empty options
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Updates a specific option at the given index
   * @param idx - The index of the option to update
   * @param value - The new value for the option
   */
  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  /**
   * Adds a new empty option to the poll
   */
  const addOption = () => setOptions((opts) => [...opts, ""]);
  
  /**
   * Removes an option at the given index
   * Prevents removal if only 2 options remain (minimum requirement)
   * @param idx - The index of the option to remove
   */
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  return (
    <form
      action={async (formData) => {
        // Reset error and success states before submission
        setError(null);
        setSuccess(false);
        
        // Call the server action to create the poll
        const res = await createPoll(formData);
        
        if (res?.error) {
          // Display error message if poll creation failed
          setError(res.error);
        } else {
          // Show success message and redirect after a short delay
          setSuccess(true);
          setTimeout(() => {
            window.location.href = "/polls";
          }, 1200);
        }
      }}
      className="space-y-6 max-w-md mx-auto"
    >
      <div>
        <Label htmlFor="question">Poll Question</Label>
        <Input name="question" id="question" required />
      </div>
      <div>
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              name="options"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
            />
            {options.length > 2 && (
              <Button type="button" variant="destructive" onClick={() => removeOption(idx)}>
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button type="button" onClick={addOption} variant="secondary">
          Add Option
        </Button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Poll created! Redirecting...</div>}
      <Button type="submit">Create Poll</Button>
    </form>
  );
} 