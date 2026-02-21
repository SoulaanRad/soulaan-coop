"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
}

export function CommentForm({ onSubmit, isSubmitting }: CommentFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length < 5) return;
    await onSubmit(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts on this proposal..."
        className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 min-h-[80px]"
        maxLength={5000}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{content.length}/5000</span>
        <Button
          type="submit"
          disabled={isSubmitting || content.length < 5}
          className="bg-amber-600 hover:bg-amber-700"
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
