/**
 * @fileoverview DisclaimerDialog component for legal disclaimer acceptance
 * Shows a modal dialog on first visit requiring user acknowledgment
 */

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

/**
 * A modal dialog that displays a legal disclaimer on first visit.
 * Stores user acceptance in localStorage to prevent repeated displays.
 * 
 * @component
 * @example
 * ```tsx
 * <DisclaimerDialog />
 * ```
 * 
 * @returns The disclaimer dialog component (renders null after acceptance)
 */

const DisclaimerDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem("aidyor-disclaimer-accepted");
    if (!hasAccepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("aidyor-disclaimer-accepted", "true");
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md border-primary/20 bg-background/95 backdrop-blur-sm">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl font-bold">
            Important Disclaimer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            AI DYOR provides automated analysis for informational purposes only. 
            It does not provide financial, investment, or legal advice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={handleAccept}
            className="w-full bg-primary hover:bg-primary/90"
          >
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DisclaimerDialog;
