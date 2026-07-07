import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComingSoonModal({ open, onOpenChange }: ComingSoonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Coming Soon</DialogTitle>
          <DialogDescription className="text-base leading-relaxed pt-1">
            Online payments are currently being configured. Paytm Payment
            Gateway will be available soon.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Back
          </Button>
          <Button
            className="w-full sm:w-auto rounded-xl"
            onClick={() => {
              toast.success("We'll let you know when payments go live.");
              onOpenChange(false);
            }}
          >
            Notify Me Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
