import { useEffect, useMemo, useState } from "react";
import { api, Sale, SaleDetail, Product } from "@/lib/api";
import { DEMO_MODE, demoSales, demoProducts } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, XCircle, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { saleStatusLabel } from "@/lib/sale-status";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface SaleItem {
  productId: number;
  productQuery?: string;
  quantity?: number;
  quantityInput?: string;
  unitPrice?: number;
  unitPriceInput?: string;
}

type PaymentMethod = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
type CreateSaleStatus = "PENDING" | "PAID";

type SalesPageMode = "all" | "pending" | "paid";

function apiErrorMessage(err: unknown, fallback: string) {
  const status = (err as any)?.status as number | undefined;
  const body = (err as any)?.body as any;

  if (status === 409) {
    return body?.message || "Estoque insuficiente para concluir a venda.";
  }

  if (status === 403) {
    return body?.message || "Sem permissão para realizar esta ação.";
  }

  if (status === 400) {
    if (typeof body?.message === "string" && body.message.trim()) return body.message;

    const errors = body?.errors;
    if (Array.isArray(errors) && errors.length) {
      const first = errors[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const msg = first.message || first.defaultMessage;
        if (typeof msg === "string" && msg.trim()) return msg;
      }
    }

    if (errors && typeof errors === "object") {
      const firstKey = Object.keys(errors)[0];
      const firstVal = errors[firstKey];
      if (typeof firstVal === "string") return firstVal;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") return firstVal[0];
    }
  }

  return fallback;
}

function statusVariant(status: string | undefined): "default" | "destructive" | "secondary" {
  switch (status) {
    case "CANCELED":
      return "destructive";
    case "PAID":
      return "secondary";
    default:
      return "default";
  }
}

function shouldShowCancel(status: string | undefined) {
  return status !== "CANCELED" && status !== "PAID";
}

function shouldShowPay(status: string | undefined) {
  return status === "PENDING";
}

export default function SalesPage({ mode }: { mode: SalesPageMode }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<number | null>(null);

  const [paidAlertOpen, setPaidAlertOpen] = useState(false);
  const [paidSaleId, setPaidSaleId] = useState<number | null>(null);

  const [client, setClient] = useState("");
  const [items, setItems] = useState<SaleItem[]>([
    { productId: 0, productQuery: "", quantity: 1, quantityInput: "1", unitPrice: undefined, unitPriceInput: "" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [createStatus, setCreateStatus] = useState<CreateSaleStatus | "">("");

  const getSalePrice = (productId: number) => {
    const p = products.find((x) => x.id === productId);
    return typeof p?.salePrice === "number" ? p.salePrice : undefined;
  };

  const getStock = (productId: number) => {
    const p = products.find((x) => x.id === productId);
    return typeof p?.stock === "number" ? p.stock : undefined;
  };

  const title = mode === "pending" ? "Vendas Pendentes" : mode === "paid" ? "Vendas Pagas" : "Vendas";

  const fetchAll = async () => {
    if (DEMO_MODE) {
      setSales(demoSales as unknown as Sale[]);
      setProducts(demoProducts as unknown as Product[]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.getSales(), api.getProducts()]);
      setSales(s);
      setProducts(p);
    } catch {
      toast.error("Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleSales = useMemo(() => {
    if (mode === "pending") return sales.filter((s) => s.status === "PENDING");
    if (mode === "paid") return sales.filter((s) => s.status === "PAID");
    return sales;
  }, [mode, sales]);

  const addItem = () => {
    setItems([...items, { productId: 0, productQuery: "", quantity: 1, quantityInput: "1", unitPrice: undefined, unitPriceInput: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem | "unitPriceInput", value: any) => {
    const updated = [...items];

    if (field === "unitPriceInput") {
      let digits = String(value ?? "").replace(/\D/g, "");
      if (digits.length > 8) digits = digits.slice(0, 8);

      let formatted = "";
      if (digits.length === 0) {
        formatted = "";
      } else if (digits.length === 1) {
        formatted = "0,0" + digits;
      } else if (digits.length === 2) {
        formatted = "0," + digits;
      } else {
        formatted = (parseInt(digits, 10) / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }

      updated[index].unitPriceInput = formatted;
      const parsed = parseFloat(formatted.replace(",", "."));
      updated[index].unitPrice = !isNaN(parsed) ? parsed : undefined;
    } else if (field === "quantityInput") {
      let digits = String(value ?? "").replace(/\D/g, "");
      if (digits.length > 6) digits = digits.slice(0, 6);

      updated[index].quantityInput = digits;
      if (digits.length === 0) {
        updated[index].quantity = undefined;
      } else {
        const parsedQty = parseInt(digits, 10);
        updated[index].quantity = !isNaN(parsedQty) ? parsedQty : undefined;
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };

      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        updated[index].productQuery = "";
        // Ao selecionar produto, sugere o preço de VENDA (não custo/estoque)
        updated[index].unitPrice = product?.salePrice ?? 0;
        updated[index].unitPriceInput = product?.salePrice?.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) ?? "";
        if (!updated[index].quantityInput) {
          updated[index].quantity = 1;
          updated[index].quantityInput = "1";
        }
      }

      if (field === "unitPrice") {
        updated[index].unitPriceInput = value?.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) ?? "";
      }

      if (field === "quantity") {
        updated[index].quantityInput = value ? String(value) : "";
      }
    }

    setItems(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createStatus) {
      toast.error("Selecione o status da venda (Pendente ou Paga)");
      return;
    }

    const validItems = items.filter((i) => i.productId > 0 && (i.quantity ?? 0) > 0 && i.unitPrice !== undefined);
    if (!validItems.length) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    const invalidQtyItem = items.find((i) => i.productId > 0 && (!i.quantity || i.quantity <= 0));
    if (invalidQtyItem) {
      toast.error("Quantidade inválida: não pode ser 0.");
      return;
    }

    const overStockItem = items
      .filter((i) => i.productId > 0 && typeof i.quantity === "number")
      .map((i) => ({ item: i, stock: getStock(i.productId) }))
      .find((x) => typeof x.stock === "number" && (x.item.quantity as number) > (x.stock as number));

    if (overStockItem) {
      toast.error(`Quantidade acima do estoque (estoque: ${overStockItem.stock}).`);
      return;
    }

    const belowSalePrice = validItems
      .map((it) => ({ it, salePrice: getSalePrice(it.productId) }))
      .find((x) => typeof x.salePrice === "number" && typeof x.it.unitPrice === "number" && x.it.unitPrice < (x.salePrice as number));

    if (belowSalePrice) {
      toast.warning(`Atenção: existe item com preço abaixo do preço de venda (R$ ${(belowSalePrice.salePrice as number).toFixed(2)}).`);
    }

    if (DEMO_MODE) {
      const total = validItems.reduce((sum, item) => sum + ((item.unitPrice || 0) * item.quantity), 0);
      setSales([
        ...sales,
        {
          id: Math.max(0, ...sales.map((s) => s.id)) + 1,
          client,
          date: new Date().toISOString(),
          totalValue: total,
          status: createStatus,
          paidAt: createStatus === "PAID" ? new Date().toISOString() : null,
        } as unknown as Sale,
      ]);
      toast.success("Venda criada");
      setDialogOpen(false);
      setClient("");
      setCreateStatus("");
      setItems([{ productId: 0, productQuery: "", quantity: 1, quantityInput: "1", unitPrice: undefined, unitPriceInput: "" }]);
      return;
    }

    try {
      const saleItems = validItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity ?? 0,
        unitPrice: item.unitPrice ?? 0,
      }));

      const payload = { client, paymentMethod, status: createStatus, saleItems };

      const created = await api.createSale(payload);

      // Fallback: caso o backend ignore "status" no POST, garantimos estado pago via endpoint /pay.
      if (createStatus === "PAID" && created?.id && created.status !== "PAID") {
        try {
          await api.paySale(created.id);
        } catch {
          // Se falhar, a lista vai refletir o estado real após o fetch.
        }
      }
      await fetchAll();

      toast.success("Venda criada");
      setDialogOpen(false);
      setClient("");
      setCreateStatus("");
      setItems([{ productId: 0, productQuery: "", quantity: 1, quantityInput: "1", unitPrice: undefined, unitPriceInput: "" }]);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Erro ao criar venda"));
    }
  };

  const openSaleDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedSale(null);

    try {
      if (DEMO_MODE) {
        const s = sales.find((x) => x.id === id);
        if (s) {
          const demoItems = (demoProducts.slice(0, 3) || []).map((p, idx) => ({
            productId: p.id,
            quantity: idx + 1,
            price: p.costPrice,
            productName: p.name,
          }));
          setSelectedSale({
            id: s.id,
            client: s.client,
            date: s.date,
            totalValue: s.totalValue as number,
            status: s.status,
            items: demoItems,
          } as unknown as SaleDetail);
        }
      } else {
        const detail = await api.getSale(id);
        setSelectedSale(detail);
      }

      setDetailOpen(true);
    } catch {
      toast.error("Erro ao carregar detalhes da venda");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async (id?: number) => {
    const target = id ?? confirmCancelTarget;
    if (!target) return;

    if (DEMO_MODE) {
      setSales(sales.map((s) => (s.id === target ? ({ ...s, status: "CANCELED" } as Sale) : s)));
      toast.success("Venda cancelada");
      setConfirmCancelOpen(false);
      setConfirmCancelTarget(null);
      return;
    }

    try {
      await api.cancelSale(target);
      await fetchAll();
      toast.success("Venda cancelada");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Erro ao cancelar venda"));
    } finally {
      setConfirmCancelOpen(false);
      setConfirmCancelTarget(null);
    }
  };

  const handlePay = async (id: number) => {
    if (DEMO_MODE) {
      setSales(sales.map((s) => (s.id === id ? ({ ...s, status: "PAID" } as Sale) : s)));
      setPaidSaleId(id);
      setPaidAlertOpen(true);
      toast.success("Venda marcada como paga");
      return;
    }

    try {
      await api.paySale(id);
      await fetchAll();
      setPaidSaleId(id);
      setPaidAlertOpen(true);
      toast.success("Venda marcada como paga");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Erro ao marcar venda como paga"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{visibleSales.length} vendas</p>
        </div>

        {mode !== "paid" && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(v) => {
              setDialogOpen(v);
              if (v) {
                setClient("");
                setPaymentMethod("CASH");
                setCreateStatus("");
                setItems([{ productId: 0, productQuery: "", quantity: 1, quantityInput: "1", unitPrice: undefined, unitPriceInput: "" }]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Venda</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Nome do cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={createStatus === "PENDING" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setCreateStatus("PENDING")}
                    >
                      Pendente
                    </Button>
                    <Button
                      type="button"
                      variant={createStatus === "PAID" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setCreateStatus("PAID")}
                    >
                      Paga
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Selecione uma opção para cadastrar a venda.
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Itens</Label>
                  {items.map((item, i) => {
                    const salePrice = item.productId ? getSalePrice(item.productId) : undefined;
                    const isBelow = typeof salePrice === "number" && typeof item.unitPrice === "number" && item.unitPrice < salePrice;
                    const stock = item.productId ? getStock(item.productId) : undefined;
                    const isQtyInvalid = item.productId > 0 && (!!item.quantityInput || typeof item.quantity === "number") && (!item.quantity || item.quantity <= 0);
                    const isQtyOverStock = typeof stock === "number" && typeof item.quantity === "number" && item.quantity > stock;
                    const q = (item.productQuery ?? "").trim().toLowerCase();
                    const filteredProducts = q
                      ? products.filter((p) => (p.name ?? "").toLowerCase().includes(q))
                      : products;

                    return (
                      <div key={i} className="space-y-1">
                        <Input
                          value={item.productQuery ?? ""}
                          onChange={(e) => updateItem(i, "productQuery", e.target.value)}
                          placeholder="Buscar produto pelo nome"
                        />
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select
                              value={item.productId ? String(item.productId) : ""}
                              onValueChange={(v) => updateItem(i, "productId", parseInt(v, 10))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredProducts.length ? (
                                  filteredProducts.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="__no_results__" disabled>
                                    Nenhum produto encontrado
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-20">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={item.quantityInput ?? (typeof item.quantity === "number" ? String(item.quantity) : "")}
                              onChange={(e) => updateItem(i, "quantityInput", e.target.value)}
                              placeholder="0"
                              className={cn(
                                (isQtyInvalid || isQtyOverStock) && "border-destructive focus-visible:ring-destructive",
                              )}
                            />
                          </div>

                          <div className="w-32 flex items-center gap-1">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.unitPriceInput ?? ""}
                              onChange={(e) => updateItem(i, "unitPriceInput", e.target.value)}
                              placeholder="0,00"
                              className={cn(isBelow && "border-destructive focus-visible:ring-destructive")}
                            />
                          </div>

                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        {typeof salePrice === "number" && (
                          <div className="text-[11px] text-muted-foreground pl-1">
                            Preço de venda: {" "}
                            <span className={cn(isBelow && "text-destructive font-medium")}>
                              R$ {salePrice.toFixed(2)}
                            </span>
                            {isBelow && <span className="ml-2 text-destructive">Abaixo do preço de venda</span>}
                          </div>
                        )}

                        {typeof stock === "number" && item.productId > 0 && (
                          <div className="text-[11px] text-muted-foreground pl-1">
                            Estoque: {" "}
                            <span className={cn((isQtyOverStock || isQtyInvalid) && "text-destructive font-medium")}>
                              {stock}
                            </span>
                            {isQtyInvalid && <span className="ml-2 text-destructive">Quantidade não pode ser 0</span>}
                            {isQtyOverStock && <span className="ml-2 text-destructive">Quantidade acima do estoque</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar item
                  </Button>
                </div>

                <Button type="submit" className="w-full">
                  Criar Venda
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              {mode !== "paid" && <TableHead className="w-28">Ações</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleSales.map((s) => (
              <TableRow
                key={s.id}
                onClick={() => openSaleDetail(s.id)}
                className="hover:cursor-pointer transition-shadow hover:shadow-sm"
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{s.client}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {new Date(s.createdAt ?? s.date ?? "").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {new Date(s.createdAt ?? s.date ?? "").toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>R$ {(s.total ?? s.totalValue ?? 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(s.status)}>{saleStatusLabel(s.status)}</Badge>
                </TableCell>

                {mode !== "paid" && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {mode === "pending" && shouldShowPay(s.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 sm:px-3"
                          title="Marcar como paga"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handlePay(s.id);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 sm:mr-1" />
                          <span className="hidden sm:inline">Pagar</span>
                        </Button>
                      )}

                      {shouldShowCancel(s.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancelar venda"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmCancelTarget(s.id);
                            setConfirmCancelOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {visibleSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={mode === "paid" ? 4 : 5} className="text-center text-muted-foreground py-8">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {detailLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!detailLoading && selectedSale && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Cliente: <strong>{selectedSale.client}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Data:{" "}
                  <strong>
                    {new Date(selectedSale.createdAt ?? selectedSale.date ?? "").toLocaleString("pt-BR")}
                  </strong>
                </p>

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Itens</h3>
                  <div className="space-y-2">
                    {(((selectedSale.saleItems as any) || (selectedSale as any).items) ?? []).map(
                      (it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>
                            {it.productName || `Produto ${it.productId}`} x {it.quantity}
                          </span>
                          <span>R$ {(it.unitPrice ?? it.price ?? 0).toFixed(2)}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-4 text-right">
                  <strong>Total: R$ {(selectedSale.total ?? selectedSale.totalValue ?? 0).toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={(v) => {
          setConfirmCancelOpen(v);
          if (!v) setConfirmCancelTarget(null);
        }}
        title="Cancelar Venda"
        description="Deseja realmente cancelar esta venda? Essa ação pode ser irreversível."
        confirmLabel="Cancelar Venda"
        cancelLabel="Manter"
        onConfirm={() => handleCancel()}
      />

      <AlertDialog open={paidAlertOpen} onOpenChange={setPaidAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Venda paga</AlertDialogTitle>
            <AlertDialogDescription>
              {paidSaleId ? `A venda #${paidSaleId} foi marcada como paga com sucesso.` : "A venda foi marcada como paga com sucesso."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
