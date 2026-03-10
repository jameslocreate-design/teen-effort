import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScrollTimePicker from "@/components/ScrollTimePicker";
import type { DateIdea } from "@/lib/date-planner";

interface DatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIdea: DateIdea | null;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const DatePickerDialog = ({
  open,
  onOpenChange,
  selectedIdea,
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeChange,
  onConfirm,
  onCancel,
}: DatePickerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose a Date</DialogTitle>
          <DialogDescription>
            Select when you'd like to schedule "{selectedIdea?.title}"
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            className="rounded-xl border border-border pointer-events-auto"
          />
        </div>
        <div className="px-1 space-y-2">
          <label className="text-sm font-medium text-foreground block text-center">Time (optional)</label>
          <ScrollTimePicker value={selectedTime} onChange={onTimeChange} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!selectedDate} className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            Add to Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatePickerDialog;
