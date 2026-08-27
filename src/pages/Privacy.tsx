import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import privacyMd from "@/content/privacy.md?raw";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated August 27, 2026
        </p>

        <article className="text-foreground/90 font-sans">
          <ReactMarkdown
            components={{
              h2: ({ node, ...props }) => (
                <h2
                  className="font-display text-2xl md:text-3xl font-semibold mt-10 mb-4 pb-2 border-b border-border"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="font-display text-xl font-semibold mt-6 mb-3"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p
                  className="text-sm md:text-base leading-relaxed mb-4"
                  {...props}
                />
              ),
              strong: ({ node, ...props }) => (
                <strong
                  className="block font-semibold text-foreground mt-5 mb-2"
                  {...props}
                />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="text-primary underline underline-offset-2 break-words"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1 text-sm md:text-base" {...props} />
              ),
              li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            }}
          >
            {privacyMd}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
