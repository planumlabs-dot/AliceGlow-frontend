import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { DEMO_MODE, demoProducts, demoSales } from "@/lib/demo-data";
import type { Sale, ProductSalesStatus } from "@/lib/api";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();

  const [loadingTotals, setLoadingTotals] = useState(true);

  const [invoicingTotal, setInvoicingTotal] = useState<number | null>(null);
  const [profitTotal, setProfitTotal] = useState<number | null>(null);

  const [initialError, setInitialError] = useState<string | null>(null);
  const [initialPeriodLoaded, setInitialPeriodLoaded] = useState(false);

  const [loadingEarliest, setLoadingEarliest] = useState(false);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodLockedUntil, setPeriodLockedUntil] = useState(0);
  const [periodRevenue, setPeriodRevenue] = useState<number | null>(null);
  const [periodProfit, setPeriodProfit] = useState<number | null>(null);
  const [periodSalesCount, setPeriodSalesCount] = useState<number | null>(null);
  const [productsSalesStatus, setProductsSalesStatus] = useState<ProductSalesStatus[] | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      // demo
      setInvoicingTotal(5000);
      setProfitTotal(2000);
      setLoadingTotals(false);
      setPeriodRevenue(500);
      setPeriodProfit(200);
      setPeriodSalesCount(demoSales.length);
      setProductsSalesStatus([
        { name: "Produto A", sold: true, soldQuantity: 12 },
        { name: "Produto B", sold: false, soldQuantity: 0 },
      ]);
      return;
    }

    // Totais (2 requests leves)
    setLoadingTotals(true);
    Promise.all([api.getInvoicingTotal(), api.getProfitTotal()])
      .then(([inv, prof]) => {
        setInvoicingTotal(inv);
        setProfitTotal(prof);
      })
      .catch(() => toast.error("Erro ao carregar totais do dashboard"))
      .finally(() => setLoadingTotals(false));

    // Período inicial (hoje)
    void applyPeriod(today, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPeriod = async (nextStartDate = startDate, nextEndDate = endDate) => {
    if (!nextStartDate || !nextEndDate) {
      toast.error("Selecione a data inicial e final");
      return;
    }
    if (nextStartDate > nextEndDate) {
      toast.error("A data inicial não pode ser maior que a final");
      return;
    }

    setLoadingPeriod(true);
    try {
      const start = `${nextStartDate}T00:00:00`;
      const end = `${nextEndDate}T23:59:59`;
      const [rev, prof, status, salesRows] = await Promise.all([
        api.getInvoicingPeriod(start, end),
        api.getProfitPeriod({ start, end }),
        api.getProductsSalesStatus({ start, end }),
        api.getSalesByPeriod(start, end),
      ]);
      setPeriodRevenue(rev);
      setPeriodProfit(prof);
      setProductsSalesStatus(status);
      setPeriodSalesCount(Array.isArray(salesRows) ? salesRows.length : 0);

      if (!initialPeriodLoaded) {
        setInitialPeriodLoaded(true);
      }
      if (initialError) setInitialError(null);
    } catch (err: any) {
      const msg = err?.status === 403
        ? "Sem permissão para acessar relatórios"
        : (err?.message || "Erro ao carregar dados do período");

      // No primeiro carregamento, segura os cards e mostra erro dedicado.
      if (!initialPeriodLoaded) setInitialError(msg);
      else toast.error(msg);
    } finally {
      setLoadingPeriod(false);
    }
  };

  const ensureEarliestDate = async (): Promise<string | null> => {
    if (earliestDate) return earliestDate;
    setLoadingEarliest(true);
    try {
      const all = await api.getSales();
      const dates = (Array.isArray(all) ? all : [])
        .map((s: Sale) => (s.createdAt ?? s.date ?? "").slice(0, 10))
        .filter((d) => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (!dates.length) {
        setEarliestDate(null);
        return null;
      }
      const earliest = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
      setEarliestDate(earliest);
      return earliest;
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para acessar vendas");
      else toast.error(err?.message || "Erro ao buscar primeira data registrada");
      return null;
    } finally {
      setLoadingEarliest(false);
    }
  };

  const soldItemsQuantity = (productsSalesStatus ?? []).reduce((sum, p) => sum + (p.soldQuantity ?? 0), 0);
  const unsoldProductsCount = (productsSalesStatus ?? []).filter((p) => p.sold === false || (p.soldQuantity ?? 0) === 0).length;
  const totalProductsCount = productsSalesStatus?.length ?? 0;

  const initialReady = !loadingTotals && initialPeriodLoaded;

  const cards = [
    { 
      title: "Total de Produtos", 
      value: totalProductsCount,
      icon: Package, 
      color: "text-primary", 
      bg: "bg-primary/10",
      onClick: () => navigate("/products")
    },
    { 
      title: "Vendas (período)", 
      value: periodSalesCount ?? 0,
      icon: ShoppingCart, 
      color: "text-success", 
      bg: "bg-success/10",
      onClick: () => navigate("/sales")
    },
    { 
      title: "Faturamento (período)", 
      value: `R$ ${((periodRevenue ?? 0) || 0).toFixed(2)}`,
      icon: DollarSign, 
      color: "text-accent", 
      bg: "bg-accent/10",
      onClick: () => navigate("/revenue")
    },
    { 
      title: "Lucro (período)", 
      value: `R$ ${((periodProfit ?? 0) || 0).toFixed(2)}`,
      icon: TrendingUp, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      onClick: () => navigate("/profit")
    },
    {
      title: "Produtos Vendidos (itens)",
      value: soldItemsQuantity,
      icon: ShoppingCart,
      color: "text-emerald-600",
      bg: "bg-emerald-600/10",
      onClick: () => navigate("/reports/top-products"),
    },
    {
      title: "Produtos Não Vendidos",
      value: unsoldProductsCount,
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-600/10",
      onClick: () => navigate("/products"),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label>Data inicial</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="md:col-span-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              disabled={loadingPeriod || Date.now() < periodLockedUntil}
              onClick={() => {
                const now = Date.now();
                if (now < periodLockedUntil) return;
                setPeriodLockedUntil(now + 4000);
                void applyPeriod();
              }}
            >
              {loadingPeriod ? "Carregando..." : "Aplicar filtro"}
            </Button>
            <Button
              disabled={loadingPeriod || Date.now() < periodLockedUntil}
              variant="outline"
              onClick={() => {
                const now = Date.now();
                if (now < periodLockedUntil) return;
                setPeriodLockedUntil(now + 4000);
                setStartDate(today);
                setEndDate(today);
                void applyPeriod(today, today);
              }}
            >
              Hoje
            </Button>
            <Button
              disabled={loadingPeriod || loadingEarliest || Date.now() < periodLockedUntil}
              variant="outline"
              onClick={() => void (async () => {
                const now = Date.now();
                if (now < periodLockedUntil) return;
                setPeriodLockedUntil(now + 4000);
                const earliest = await ensureEarliestDate();
                if (!earliest) {
                  toast.message("Ainda não há registros para calcular o período geral");
                  return;
                }
                setStartDate(earliest);
                setEndDate(today);
                void applyPeriod(earliest, today);
              })()}
            >
              Geral
            </Button>

            <div className="text-sm text-muted-foreground sm:self-center w-full sm:w-auto">
              Total geral: {loadingTotals ? "—" : `R$ ${(invoicingTotal ?? 0).toFixed(2)}`} • Lucro total: {loadingTotals ? "—" : `R$ ${(profitTotal ?? 0).toFixed(2)}`}
            </div>

            {initialReady && loadingPeriod ? (
              <div className="text-sm text-muted-foreground sm:self-center w-full sm:w-auto">Atualizando...</div>
            ) : null}
          </div>
        </div>
      </Card>

      {!initialReady ? (
        <Card className="p-6">
          {initialError ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Não foi possível carregar o dashboard.</div>
              <div className="text-sm">{initialError}</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const now = Date.now();
                    if (now < periodLockedUntil) return;
                    setPeriodLockedUntil(now + 4000);
                    void applyPeriod(startDate, endDate);
                  }}
                  disabled={loadingPeriod || loadingTotals || Date.now() < periodLockedUntil}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-muted-foreground">Carregando dashboard...</div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {cards.map((card) => (
            <div
              key={card.title}
              onClick={card.onClick}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-md hover:cursor-pointer transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{card.title}</span>
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold font-display text-foreground">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
