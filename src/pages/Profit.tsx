import { useEffect, useState } from "react";
import { api, ProfitData, Sale } from "@/lib/api";
import { saleStatusLabel } from "@/lib/sale-status";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Percent, Target } from "lucide-react";
import { toast } from "sonner";

const Profit = () => {
  const [data, setData] = useState<ProfitData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const yearStr = now.toISOString().slice(0, 4);
  const normalizeDate = (s: Sale) => (s.createdAt ?? s.date ?? "");

  const profitFor = (rows: Sale[]) => rows.reduce((sum, s) => sum + (s.profit ?? 0), 0);

  const salesToday = sales.filter((s) => normalizeDate(s).slice(0, 10) === todayStr && s.status !== "CANCELED");
  const salesMonth = sales.filter((s) => normalizeDate(s).slice(0, 7) === monthStr && s.status !== "CANCELED");
  const salesYear = sales.filter((s) => normalizeDate(s).slice(0, 4) === yearStr && s.status !== "CANCELED");

  useEffect(() => {
    const fetchProfit = async () => {
      try {
        const [result, salesResult] = await Promise.all([api.getProfit(), api.getSales()]);
        console.log("[LUCRO] GET /reports/profit + /sales =>", { result, salesResult });
        setData(result);
        setSales(Array.isArray(salesResult) ? salesResult : []);
      } catch (err: any) {
        toast.error("Erro ao carregar dados de lucro");
      } finally {
        setLoading(false);
      }
    };

    fetchProfit();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Lucro</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise de rentabilidade e margem de lucro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Lucro Total</span>
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            R$ {(data?.total || 0).toFixed(2)}
          </p>
        </Card>

        <Card className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Hoje</span>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            R$ {(data?.today ?? profitFor(salesToday) ?? 0).toFixed(2)}
          </p>
        </Card>

        <Card className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Margem de Lucro</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            {((data?.margin || 0) * 100).toFixed(1)}%
          </p>
        </Card>

        <Card className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Meta do Mês</span>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            R$ {(data?.thisMonth || 0).toFixed(2)}
          </p>
        </Card>
      </div>

      {data?.byDay && data.byDay.length > 0 && (
        <Card className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Lucro por Dia</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="var(--success)" 
                strokeWidth={2}
                dot={{ fill: "var(--success)" }}
                name="Lucro"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Vendas por Período</h2>
        <Tabs defaultValue="day">
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="year">Ano</TabsTrigger>
          </TabsList>

          {(
            [
              { key: "day", title: "Hoje", rows: salesToday },
              { key: "month", title: "Este mês", rows: salesMonth },
              { key: "year", title: "Este ano", rows: salesYear },
            ] as const
          ).map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {tab.title}: {tab.rows.length} vendas
                </p>
                <p className="text-sm font-medium">
                  Lucro: R$ {profitFor(tab.rows).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden md:table-cell">Custo</TableHead>
                      <TableHead>Lucro</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tab.rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="truncate">{s.client}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {new Date(normalizeDate(s)).toLocaleString("pt-BR")}
                            </span>
                            <span className="text-xs text-muted-foreground md:hidden">
                              Custo: R$ {(s.costTotal ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{new Date(normalizeDate(s)).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>R$ {(s.total ?? s.totalValue ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">R$ {(s.costTotal ?? 0).toFixed(2)}</TableCell>
                        <TableCell>R$ {(s.profit ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{saleStatusLabel(s.status)}</TableCell>
                      </TableRow>
                    ))}
                    {tab.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma venda no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
};

export default Profit;
