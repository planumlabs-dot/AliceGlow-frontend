import React from "react";
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
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
            <Button onClick={handleConfirm}>{confirmLabel}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
