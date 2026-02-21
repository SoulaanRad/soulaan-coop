"use client";

import { CommentAlignmentBadge } from "./comment-alignment-badge";

interface Comment {
  id: string;
  authorWallet: string;
  authorName?: string | null;
  content: string;
  createdAt: string;
  aiEvaluation?: {
    alignment: string;
    score: number;
    analysis: string;
    goalsImpacted: string[];
  } | null;
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts.</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {comment.authorName || comment.authorWallet.slice(0, 10) + "..."}
              </span>
              {comment.aiEvaluation && (
                <CommentAlignmentBadge alignment={comment.aiEvaluation.alignment} />
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-sm text-gray-300">{comment.content}</p>

          {comment.aiEvaluation && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-gray-400">{comment.aiEvaluation.analysis}</p>
              {comment.aiEvaluation.goalsImpacted.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {comment.aiEvaluation.goalsImpacted.map((goal) => (
                    <span key={goal} className="text-xs bg-slate-700 text-gray-300 px-2 py-0.5 rounded">
                      {goal}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
