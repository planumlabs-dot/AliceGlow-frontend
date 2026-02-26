import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = "Confirmação",
  description = "Tem certeza que deseja prosseguir?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
    };
  }, []);

  const handleConfirm = async () => {
    const now = Date.now();
    if (confirming || now < lockedUntil) return;

    const nextLockedUntil = now + 4000;
    setLockedUntil(nextLockedUntil);
    setConfirming(true);

    try {
      await onConfirm();
    } finally {
      const remaining = nextLockedUntil - Date.now();
      if (remaining > 0) {
        unlockTimerRef.current = window.setTimeout(() => {
          setConfirming(false);
        }, remaining);
      } else {
        setConfirming(false);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">{description}</div>
        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
              {cancelLabel}
            </Button>
            <Button onClick={handleConfirm} disabled={confirming || Date.now() < lockedUntil}>
              {confirming ? "Aguarde..." : confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
