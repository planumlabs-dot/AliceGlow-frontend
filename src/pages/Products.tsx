import { useEffect, useMemo, useState } from "react";
import { api, Product } from "@/lib/api";
import { DEMO_MODE, demoProducts } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type ProductFilter = "active" | "inactive" | "all";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<ProductFilter>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", costPrice: "", salePrice: "", stock: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const demoVisibleProducts = useMemo(() => {
    if (!DEMO_MODE) return [] as Product[];

    const base = (demoProducts as unknown as Product[]).filter((p) => {
      if (filter === "active") return p.active !== false;
      if (filter === "inactive") return p.active === false;
      return true;
    });

    const normalizedQuery = normalizeText(debouncedSearch.trim());
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (!queryTokens.length) return base;
    return base.filter((p) => {
      const name = normalizeText(p.name ?? "");
      return queryTokens.every((t) => name.includes(t));
    });
  }, [debouncedSearch, filter]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        if (DEMO_MODE) {
          setProducts(demoVisibleProducts);
          setPage(0);
          setTotalPages(1);
          setTotalElements(demoVisibleProducts.length);
          return;
        }

        const params = nextFilterToApiParams(filter);
        const result = await api.getProductsPage({
          page: 0,
          size: 20,
          sort: "name,asc",
          ...params,
          q: debouncedSearch,
        });
        setProducts(result.content ?? []);
        setPage(result.number ?? 0);
        setTotalPages(result.totalPages ?? 0);
        setTotalElements(typeof result.totalElements === "number" ? result.totalElements : null);
      } catch {
        toast.error("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [debouncedSearch, demoVisibleProducts, filter, refreshSeq]);

  const nextFilterToApiParams = (f: ProductFilter) => {
    if (f === "active") return undefined;
    if (f === "inactive") return { active: false } as const;
    return { includeInactive: true } as const;
  };

  const canLoadMore = !DEMO_MODE && page + 1 < totalPages;

  const handleLoadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = nextFilterToApiParams(filter);
      const nextPage = page + 1;
      const result = await api.getProductsPage({
        page: nextPage,
        size: 20,
        sort: "name,asc",
        ...params,
        q: debouncedSearch,
      });

      setProducts((prev) => [...prev, ...(result.content ?? [])]);
      setPage(result.number ?? nextPage);
      setTotalPages(result.totalPages ?? totalPages);
      setTotalElements(typeof result.totalElements === "number" ? result.totalElements : totalElements);
    } catch {
      toast.error("Erro ao carregar mais produtos");
    } finally {
      setLoadingMore(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ name: "", costPrice: "", salePrice: "", stock: "" }); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, costPrice: String(p.costPrice), salePrice: p.salePrice !== undefined ? String(p.salePrice) : "", stock: String(p.stock) }); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const costPrice = parseFloat(form.costPrice);
    const salePrice = parseFloat(form.salePrice);
    const stock = parseInt(form.stock, 10);
    if (!form.name || isNaN(costPrice) || isNaN(salePrice) || isNaN(stock) || costPrice < 0.01 || salePrice < 0.01 || stock < 0) {
      toast.error("Preencha todos os campos corretamente. Preços devem ser no mínimo 0,01 e estoque não pode ser negativo.");
      return;
    }
    const data = { name: form.name, costPrice, salePrice, stock };
    try {
      setSaving(true);
      if (DEMO_MODE) {
        if (editing) {
          const idx = products.findIndex((p) => p.id === editing.id);
          if (idx >= 0) { const updated = [...products]; updated[idx] = { ...editing, ...data }; setProducts(updated); }
        } else {
          setProducts([...products, { id: Math.max(0, ...products.map((p) => p.id)) + 1, ...data }]);
        }
        toast.success(editing ? "Produto atualizado" : "Produto criado");
        setDialogOpen(false);
        return;
      }
      if (editing) { await api.updateProduct(editing.id, data); toast.success("Produto atualizado"); }
      else { await api.createProduct(data); toast.success("Produto criado"); }
      setDialogOpen(false);
      // refetch mantém filtro atual
      setRefreshSeq((x) => x + 1);
    } catch (err) {
      if ((err as any)?.status === 403) {
        toast.error("Sem permissão para cadastrar/editar produto");
        return;
      }
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    if (!p?.id) return;
    if (DEMO_MODE) {
      setProducts(products.map((x) => (x.id === p.id ? { ...x, active: !(x.active ?? true) } : x)));
      toast.success((p.active ?? true) ? "Produto desativado" : "Produto ativado");
      return;
    }
    try {
      if (p.active ?? true) {
        await api.deactivateProduct(p.id);
        toast.success("Produto desativado");
      } else {
        await api.activateProduct(p.id);
        toast.success("Produto ativado");
      }
      // refetch respeitando filtro (se desativar em 'ativos', pode sumir da lista)
      setRefreshSeq((x) => x + 1);
    } catch (err: any) {
      if (err?.status === 403) toast.error("Sem permissão para ativar/desativar produto");
      else toast.error(err?.message || "Erro ao alterar status do produto");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">{(totalElements ?? products.length)} produtos cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />Cadastrar Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Produto" : "Cadastrar Produto"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Preço de Custo</Label><Input type="number" step="0.01" min="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Preço de Venda</Label><Input type="number" step="0.01" min="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Estoque</Label><Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Aguarde..." : (editing ? "Salvar" : "Cadastrar")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-sm text-muted-foreground mr-2">Filtro:</div>
        <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>Ativos</Button>
        <Button variant={filter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setFilter("inactive")}>Inativos</Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Todos</Button>
      </div>

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar produto por palavra-chave"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Custo</TableHead>
              <TableHead className="hidden sm:table-cell">Venda</TableHead>
              <TableHead className="hidden sm:table-cell">Estoque</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} className="transition-shadow hover:shadow-sm">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Custo: R$ {p.costPrice.toFixed(2)} • Venda: R$ {(p.salePrice ?? 0).toFixed(2)} • Estoque: {p.stock}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={p.active === false ? "text-muted-foreground" : "text-foreground"}>
                    {p.active === false ? "Inativo" : "Ativo"}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">R$ {p.costPrice.toFixed(2)}</TableCell>
                <TableCell className="hidden sm:table-cell">R$ {(p.salePrice ?? 0).toFixed(2)}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.stock}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleToggleActive(p)}
                      title={p.active === false ? "Ativar produto" : "Desativar produto"}
                    >
                      {p.active === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {!loading && canLoadMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void handleLoadMore()} disabled={loadingMore}>
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Products;
