import { useEffect, useState } from "react";
import { api, TopProduct } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TopProducts() {
  const [rows, setRows] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await api.getTopProducts();
        setRows(Array.isArray(result) ? result : []);
      } catch {
        toast.error("Erro ao carregar top produtos");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Top Produtos</h1>
        <p className="text-muted-foreground text-sm mt-1">Mais vendidos por quantidade (exclui canceladas)</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={String(r.productName ?? idx)}>
                <TableCell className="font-medium">{r.productName}</TableCell>
                <TableCell className="text-right">{r.totalSold}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  Sem dados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
