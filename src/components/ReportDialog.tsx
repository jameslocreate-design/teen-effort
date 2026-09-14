import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Flag, ShieldAlert } from "lucide-react";
import {
  REPORT_REASONS,
  submitReport,
  type ReportContentType,
} from "@/lib/moderation";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ReportContentType;
  contentId?: string | null;
  reportedUserId?: string | null;
  snapshot?: string | null;
  /** Shown in the dialog, e.g. "this love letter" */
  label: string;
  onReported?: () => void;
}

const ReportDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  reportedUserId,
  snapshot,
  label,
  onReported,
}: ReportDialogProps) => {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Pick a reason first");
      return;
    }
    setSending(true);
    try {
      await submitReport({ contentType, contentId, reportedUserId, snapshot, reason, details });
      toast.success("Report sent — our team reviews every one.");
      reset();
      onOpenChange(false);
      onReported?.();
    } catch {
      toast.error("Couldn't send that report. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-2 h-11 w-11 rounded-2xl bg-destructive/15 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle className="text-center font-display">Report {label}</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Tell us what's wrong. Reports are private — the other person is never told who reported
            them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REPORT_REASONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(option)}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all min-h-[44px] ${
                reason === option
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Anything else we should know? (optional)"
          rows={3}
          className="rounded-xl bg-secondary/50 border-border text-base"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={sending || !reason}
            className="rounded-xl gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Flag className="h-4 w-4" />
            {sending ? "Sending..." : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
