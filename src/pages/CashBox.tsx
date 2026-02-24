import { useEffect, useMemo, useState } from "react";
import { api, CashBox as CashBoxType } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CashBox() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [cashBox, setCashBox] = useState<CashBoxType | null>(null);

  const [cashBoxesAvailable, setCashBoxesAvailable] = useState<Pick<CashBoxType, "id" | "businessDate">[]>([]);
  const [loadingCashBoxesList, setLoadingCashBoxesList] = useState(false);
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>("");
  const [cashBoxesPage, setCashBoxesPage] = useState(0);
  const [cashBoxesTotalPages, setCashBoxesTotalPages] = useState<number | null>(null);

  const cashBoxesAvailableSorted = useMemo(() => {
    return [...cashBoxesAvailable].sort((a, b) => Number(a.id) - Number(b.id));
  }, [cashBoxesAvailable]);

  const [createBalance, setCreateBalance] = useState("100");
  const [editBalance, setEditBalance] = useState("");

  const nowLocalDateTime = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
  const [outflowDescription, setOutflowDescription] = useState("");
  const [outflowAmount, setOutflowAmount] = useState("");
  const [outflowOccurredAt, setOutflowOccurredAt] = useState(nowLocalDateTime);

  const RECENT_KEY = "aliceglow_cashboxes_recent";
  const rememberCashBox = (cb: CashBoxType) => {
    if (!cb?.id) return;
    try {
      const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as { id: number; businessDate?: string }[];
      const next = [{ id: cb.id, businessDate: cb.businessDate }, ...prev.filter((x) => x.id !== cb.id)].slice(0, 25);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const getRecentCashBoxes = (): { id: number; businessDate?: string }[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (Array.isArray(raw)) return raw;
      return [];
    } catch {
      return [];
    }
  };

  const fetchByDate = async (d: string) => {
    setLoading(true);
    try {
      const result = await api.getCashBoxByDate(d);
      setCashBox(result);
      setEditBalance(String(result.balance ?? ""));
      setSelectedCashBoxId(String(result.id ?? ""));
      rememberCashBox(result);
    } catch (err: any) {
      setCashBox(null);
      if (err?.status === 404) {
        toast.message("Nenhum caixa encontrado para a data selecionada");
      } else if (err?.status === 403) {
        toast.error("Sem permissão para acessar caixa");
      } else {
        toast.error("Erro ao buscar caixa");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchById = async (idRaw: string) => {
    const id = parseInt(String(idRaw).replace(/\D/g, ""), 10);
    if (!id || id <= 0) {
      toast.error("Informe um ID de caixa válido");
      return;
    }

    setLoading(true);
    try {
      const result = await api.getCashBoxById(id);
      setCashBox(result);
      setEditBalance(String(result.balance ?? ""));
      if (result?.businessDate) setDate(result.businessDate);
      setSelectedCashBoxId(String(result.id ?? id));
      rememberCashBox(result);
    } catch (err: any) {
      if (err?.status === 404) {
        toast.message("Caixa não encontrado para o ID informado");
      } else if (err?.status === 403) {
        toast.error("Sem permissão para acessar caixa");
      } else {
        toast.error("Erro ao buscar caixa por ID");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCashBoxesList = async (opts?: { reset?: boolean }) => {
    const reset = opts?.reset ?? false;
    const nextPage = reset ? 0 : cashBoxesPage;

    setLoadingCashBoxesList(true);
    try {
      const page = await api.getCashBoxesPage({ page: nextPage, size: 50, sort: "businessDate,desc" });
      const content = (page?.content ?? []).map((c) => ({ id: c.id, businessDate: c.businessDate }));

      setCashBoxesTotalPages(typeof page?.totalPages === "number" ? page.totalPages : null);
      setCashBoxesPage((page?.number ?? nextPage) + 1);

      setCashBoxesAvailable((prev) => {
        const base = reset ? [] : prev;
        const merged = [...base, ...content];
        // dedupe por id
        const byId = new Map<number, { id: number; businessDate: string }>();
        for (const item of merged) {
          byId.set(item.id, { id: item.id, businessDate: item.businessDate });
        }
        return Array.from(byId.values());
      });
    } catch {
      // Fallback: mostra histórico recente do usuário.
      const recent = getRecentCashBoxes()
        .filter((x) => typeof x?.id === "number")
        .map((x) => ({ id: x.id, businessDate: x.businessDate || "" }))
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setCashBoxesAvailable(recent);
      setCashBoxesTotalPages(null);
    } finally {
      setLoadingCashBoxesList(false);
    }
  };

  useEffect(() => {
    void fetchByDate(today);
    void loadCashBoxesList({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    const bal = parseFloat(createBalance);
    if (isNaN(bal)) {
      toast.error("Saldo inválido");
      return;
    }

    setLoading(true);
    try {
      const result = await api.createCashBox({ businessDate: date, balance: bal });
      toast.success("Caixa criado");
      setCashBox(result);
      setEditBalance(String(result.balance));
      setSelectedCashBoxId(String(result.id ?? ""));
      rememberCashBox(result);
      setCashBoxesPage(0);
      void loadCashBoxesList({ reset: true });
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para criar caixa");
      else toast.error(err?.message || "Erro ao criar caixa");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!cashBox) return;
    const bal = parseFloat(editBalance);
    if (isNaN(bal)) {
      toast.error("Saldo inválido");
      return;
    }

    setLoading(true);
    try {
      const result = await api.updateCashBox(cashBox.id, { balance: bal });
      toast.success("Saldo atualizado");
      setCashBox(result);
      rememberCashBox(result);
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para editar caixa");
      else toast.error(err?.message || "Erro ao editar caixa");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOutflow = async () => {
    if (!cashBox) return;
    const amount = parseFloat(outflowAmount.replace(",", "."));

    if (!outflowDescription.trim()) {
      toast.error("Informe a descrição da saída");
      return;
    }
    if (!outflowOccurredAt) {
      toast.error("Informe a data/hora da saída");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    setLoading(true);
    try {
      // datetime-local => "YYYY-MM-DDTHH:mm". Backend geralmente aceita LocalDateTime.
      const occurredAt = outflowOccurredAt.length === 16 ? `${outflowOccurredAt}:00` : outflowOccurredAt;
      await api.addCashBoxOutflow(cashBox.id, {
        description: outflowDescription.trim(),
        amount,
        occurredAt,
      });
      toast.success("Saída registrada (saldo debitado)");
      setOutflowDescription("");
      setOutflowAmount("");
      // Refetch para pegar o saldo atualizado e a saída com createdAt/id
      const refreshed = await api.getCashBoxById(cashBox.id);
      setCashBox(refreshed);
      setEditBalance(String(refreshed.balance ?? ""));
      setSelectedCashBoxId(String(refreshed.id ?? ""));
      rememberCashBox(refreshed);
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para registrar saída");
      else toast.error(err?.message || "Erro ao registrar saída");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Caixa do Dia</h1>
          <p className="text-muted-foreground text-sm mt-1">Criar/buscar caixa por data de operação</p>
        </div>

        <div className="w-full sm:w-80">
          <div className="flex items-center justify-between">
            <Label>Caixas disponíveis</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Atualizar lista"
              disabled={loadingCashBoxesList || loading}
              onClick={() => {
                setCashBoxesPage(0);
                void loadCashBoxesList({ reset: true });
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <Select
            value={selectedCashBoxId}
            onValueChange={(v) => {
              setSelectedCashBoxId(v);
              void fetchById(v);
            }}
          >
            <SelectTrigger disabled={loading || loadingCashBoxesList}>
              <SelectValue placeholder={loadingCashBoxesList ? "Carregando..." : "Selecione o caixa"} />
            </SelectTrigger>
            <SelectContent>
              {cashBoxesAvailableSorted.map((c) => (
                <SelectItem key={String(c.id)} value={String(c.id)}>
                  {c.id}
                </SelectItem>
              ))}
              {cashBoxesAvailable.length === 0 && (
                <SelectItem value="__empty" disabled>
                  Nenhum caixa disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loadingCashBoxesList || loading || (cashBoxesTotalPages !== null && cashBoxesPage >= cashBoxesTotalPages)}
              onClick={() => void loadCashBoxesList({ reset: false })}
            >
              Carregar mais
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Data de Operação</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <Button disabled={loading} variant="outline" onClick={() => void fetchByDate(date)}>
            Buscar
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Saldo inicial</Label>
              <Input value={createBalance} onChange={(e) => setCreateBalance(e.target.value)} inputMode="decimal" />
            </div>
            <Button disabled={loading} onClick={() => void handleCreate()}>
              Criar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Caixa</div>
            <div className="text-lg font-medium">
              {cashBox ? `#${cashBox.id} — ${cashBox.businessDate}` : "Não encontrado"}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-muted-foreground">Saldo</div>
            <div className="text-2xl font-bold tabular-nums">R$ {(cashBox?.balance ?? 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Editar saldo</Label>
            <Input value={editBalance} onChange={(e) => setEditBalance(e.target.value)} inputMode="decimal" disabled={!cashBox} />
          </div>
          <Button disabled={loading || !cashBox} onClick={() => void handleUpdateBalance()}>
            Salvar saldo
          </Button>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div>
            <div className="text-sm font-medium">Registrar Saída (despesa)</div>
            <div className="text-xs text-muted-foreground">
              Ao registrar, o backend debita automaticamente do saldo do caixa.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={outflowDescription}
                onChange={(e) => setOutflowDescription(e.target.value)}
                placeholder="Ex.: combustível, aluguel, entrega..."
                disabled={!cashBox}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={outflowAmount}
                onChange={(e) => setOutflowAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                disabled={!cashBox}
              />
            </div>
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input
                type="datetime-local"
                value={outflowOccurredAt}
                onChange={(e) => setOutflowOccurredAt(e.target.value)}
                disabled={!cashBox}
              />
            </div>
            <div className="md:col-span-4">
              <Button disabled={loading || !cashBox} onClick={() => void handleAddOutflow()}>
                Registrar saída
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Saídas registradas: {cashBox?.outflows?.length ?? 0}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Ocorrência</TableHead>
                    <TableHead className="hidden md:table-cell">Registrado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashBox?.outflows ?? []).map((o) => (
                    <TableRow key={o.id ?? `${o.description}-${o.occurredAt}`}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="truncate">{o.description}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            {o.occurredAt ? new Date(o.occurredAt).toLocaleString("pt-BR") : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            Registrado: {o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{o.occurredAt ? new Date(o.occurredAt).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right">R$ {Number(o.amount ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {!(cashBox?.outflows?.length) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma saída registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
