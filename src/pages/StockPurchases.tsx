import { useEffect, useMemo, useState } from "react";
import { api, StockPurchase } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function StockPurchases() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [rows, setRows] = useState<StockPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState(today);
  const [description, setDescription] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    try {
      const result = await api.getStockPurchases({ start, end });
      setRows(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para acessar compras");
      else toast.error("Erro ao carregar compras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!purchaseDate || !description.trim()) {
      toast.error("Preencha data e descrição");
      return;
    }

    setLoading(true);
    try {
      await api.createStockPurchase({ purchaseDate, description: description.trim() });
      toast.success("Compra registrada");
      setDescription("");
      await fetchRows();
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para registrar compra");
      else toast.error(err?.message || "Erro ao registrar compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Compras de Estoque</h1>
        <p className="text-muted-foreground text-sm mt-1">Entradas registradas (não altera estoque automaticamente)</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Data da compra</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Compra semanal" />
          </div>
          <Button disabled={loading} onClick={() => void handleCreate()}>
            Registrar
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button disabled={loading} variant="outline" onClick={() => void fetchRows()}>
            Filtrar
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={String(r.id ?? idx)}>
                <TableCell>{new Date(r.purchaseDate).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-medium">{r.description}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  Sem compras no período
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
