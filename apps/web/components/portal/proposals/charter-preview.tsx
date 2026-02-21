"use client";

interface CharterPreviewProps {
  text: string;
}

export function CharterPreview({ text }: CharterPreviewProps) {
  // Simple markdown-ish rendering: headers, bold, lists
  const lines = text.split("\n");

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto text-sm">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) {
            return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>;
          }
          if (line.startsWith("## ")) {
            return <h3 key={i} className="text-base font-semibold text-white mt-3 mb-1">{line.slice(3)}</h3>;
          }
          if (line.startsWith("### ")) {
            return <h4 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-1">{line.slice(4)}</h4>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return <li key={i} className="text-gray-300 ml-4">{line.slice(2)}</li>;
          }
          if (line.startsWith("---")) {
            return <hr key={i} className="border-slate-700 my-2" />;
          }
          if (line.trim() === "") {
            return <br key={i} />;
          }
          return <p key={i} className="text-gray-300 mb-1">{line}</p>;
        })}
      </div>
    </div>
  );
}
