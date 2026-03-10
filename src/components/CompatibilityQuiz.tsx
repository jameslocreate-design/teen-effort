import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, CheckCircle, Link2 } from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

const QUESTIONS: QuizQuestion[] = [
  { id: "weekend", question: "Ideal weekend together?", options: ["Adventure outdoors", "Cozy at home", "Exploring the city", "Road trip"] },
  { id: "movie", question: "Pick a movie genre for date night:", options: ["Comedy", "Romance", "Action/Thriller", "Horror"] },
  { id: "food", question: "Go-to date meal?", options: ["Fancy dinner out", "Cook together at home", "Street food / casual", "Takeout & chill"] },
  { id: "gift", question: "Best kind of gift?", options: ["Something handmade", "An experience together", "Something practical", "A surprise"] },
  { id: "conflict", question: "When you disagree, you prefer to:", options: ["Talk it out immediately", "Take space then discuss", "Write it out / text", "Humor to diffuse"] },
  { id: "love", question: "You feel most loved when:", options: ["They say sweet things", "They do things for you", "They give you a thoughtful gift", "Quality time together"] },
  { id: "vacation", question: "Dream vacation?", options: ["Beach resort", "Mountain cabin", "European city tour", "Theme park adventure"] },
  { id: "music", question: "Road trip playlist vibe?", options: ["Pop/Top 40", "R&B/Soul", "Country", "Indie/Alternative"] },
  { id: "pet", question: "If you got a pet together:", options: ["Dog 🐕", "Cat 🐱", "Something exotic 🦎", "No pets please"] },
  { id: "future", question: "In 5 years together, most important:", options: ["Traveling the world", "Building a home", "Career growth together", "Starting a family"] },
];

const CompatibilityQuiz = () => {
  const { user } = useAuth();
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, string> | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: link } = await supabase
      .from("partner_links").select("id, user1_id, user2_id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();

    if (!link) { setLoading(false); return; }
    setPartnerLinkId(link.id);

    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("*")
      .eq("partner_link_id", link.id);

    if (answers) {
      const myA = (answers as any[]).find(a => a.user_id === user.id);
      const pA = (answers as any[]).find(a => a.user_id !== user.id);
      if (myA) { setMyAnswers(myA.answers); setSubmitted(true); }
      if (pA) setPartnerAnswers(pA.answers);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAnswer = (questionId: string, answer: string) => {
    setMyAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(prev => prev + 1), 300);
    }
  };

  const handleSubmit = async () => {
    if (!user || !partnerLinkId) return;
    const { error } = await supabase
      .from("quiz_answers")
      .upsert({
        user_id: user.id,
        partner_link_id: partnerLinkId,
        answers: myAnswers,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id,partner_link_id" });

    if (error) toast.error("Failed to save answers");
    else {
      setSubmitted(true);
      toast.success("Quiz submitted! 🎉");
    }
  };

  const handleRetake = async () => {
    setMyAnswers({});
    setCurrentQ(0);
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Heart className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  if (!partnerLinkId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No Partner Linked</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Link with your partner to take the quiz together.</p>
      </div>
    );
  }

  // Results view
  if (submitted) {
    const matchCount = partnerAnswers
      ? QUESTIONS.filter(q => myAnswers[q.id] && partnerAnswers[q.id] && myAnswers[q.id] === partnerAnswers[q.id]).length
      : 0;
    const percentage = partnerAnswers ? Math.round((matchCount / QUESTIONS.length) * 100) : null;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Quiz Results</h2>
        </div>

        {partnerAnswers ? (
          <>
            {/* Score */}
            <div className="text-center space-y-3">
              <div className="text-5xl font-bold text-primary">{percentage}%</div>
              <p className="text-sm text-muted-foreground">
                {percentage! >= 80 ? "🔥 You two are incredibly in sync!" :
                 percentage! >= 60 ? "💕 Great compatibility — you complement each other!" :
                 percentage! >= 40 ? "✨ Different but exciting — opposites attract!" :
                 "🌈 Very different perspectives — lots to explore together!"}
              </p>
              <div className="w-48 h-3 rounded-full bg-secondary mx-auto overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            {/* Comparison */}
            <div className="space-y-3">
              {QUESTIONS.map(q => {
                const match = myAnswers[q.id] === partnerAnswers[q.id];
                return (
                  <div key={q.id} className={`rounded-xl border p-4 space-y-2 ${match ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-2">
                      {match && <CheckCircle className="h-4 w-4 text-primary" />}
                      <h4 className="text-sm font-medium text-foreground">{q.question}</h4>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted-foreground">You: <span className="text-foreground font-medium">{myAnswers[q.id] || "—"}</span></span>
                      <span className="text-muted-foreground">Partner: <span className="text-foreground font-medium">{partnerAnswers[q.id] || "—"}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              ✅ Your answers are saved! Waiting for your partner to take the quiz to see results.
            </p>
          </div>
        )}

        <Button variant="outline" onClick={handleRetake} className="w-full">Retake Quiz</Button>
      </div>
    );
  }

  // Quiz view
  const answeredAll = Object.keys(myAnswers).length === QUESTIONS.length;
  const q = QUESTIONS[currentQ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Compatibility Quiz</h2>
        <p className="text-sm text-muted-foreground">Answer honestly — your partner takes it too!</p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Object.keys(myAnswers).length} answered</span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-4 animate-fade-in" key={q.id}>
        <h3 className="text-lg font-semibold text-foreground text-center">{q.question}</h3>
        <div className="grid grid-cols-1 gap-2">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleAnswer(q.id, opt)}
              className={`rounded-xl border p-4 text-sm font-medium text-left transition-all ${
                myAnswers[q.id] === opt
                  ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {currentQ > 0 && (
          <Button variant="outline" onClick={() => setCurrentQ(prev => prev - 1)} className="flex-1">
            Previous
          </Button>
        )}
        {currentQ < QUESTIONS.length - 1 && myAnswers[q.id] && (
          <Button onClick={() => setCurrentQ(prev => prev + 1)} className="flex-1">
            Next
          </Button>
        )}
        {answeredAll && (
          <Button onClick={handleSubmit} className="flex-1 gap-1.5">
            <Heart className="h-4 w-4" /> Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompatibilityQuiz;
