import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Choose a Date</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Select when you'd like to schedule "{selectedIdea?.title}"
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className="flex justify-center py-4 px-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          initialFocus
          className="rounded-xl border border-border pointer-events-auto"
        />
      </div>
      <div className="px-5 space-y-2">
        <label className="text-sm font-medium text-foreground block text-center">Time (optional)</label>
        <ScrollTimePicker value={selectedTime} onChange={onTimeChange} />
      </div>
      <ResponsiveDialogFooter className="gap-2 sm:gap-0 px-4 pb-6">
        <Button variant="outline" onClick={onCancel} className="h-12 rounded-xl text-base">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!selectedDate} className="gap-2 h-12 rounded-xl text-base">
          <CalendarPlus className="h-4 w-4" />
          Add to Calendar
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
};

export default DatePickerDialog;
