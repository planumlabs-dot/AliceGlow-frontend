import { useEffect, useMemo, useState } from "react";
import { api, CashOutflowsReport } from "@/lib/api";
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

export default function CashOutflows() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [start, setStart] = useState(`${today}T00:00:00`);
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 19));
  const [data, setData] = useState<CashOutflowsReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.getCashOutflows({ start, end });
      setData(result);
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para acessar saídas");
      else toast.error("Erro ao carregar saídas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Saídas (Outflows)</h1>
        <p className="text-muted-foreground text-sm mt-1">Relatório por período</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Início (ISO datetime)</Label>
            <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2026-02-23T00:00:00" />
          </div>
          <div className="space-y-2">
            <Label>Fim (ISO datetime)</Label>
            <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="2026-02-23T23:59:59" />
          </div>
          <Button disabled={loading} onClick={() => void fetchData()}>
            Filtrar
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-lg font-medium">R$ {(data?.total ?? 0).toFixed(2)}</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.outflows ?? []).map((o, idx) => (
              <TableRow key={String(o.id ?? idx)}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{o.description}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {new Date(o.occurredAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{new Date(o.occurredAt).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">R$ {o.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {(data?.outflows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Sem saídas no período
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
