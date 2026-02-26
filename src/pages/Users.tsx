import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { DEMO_MODE, demoUsers } from "@/lib/demo-data";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const UsersPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", isAdmin: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveLockedUntil, setSaveLockedUntil] = useState(0);

  const fetchUsers = async () => {
    if (DEMO_MODE) { setUsers(demoUsers); setLoading(false); return; }
    try { setUsers(await api.getUsers()); }
    catch { toast.error("Erro ao carregar usuários"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  if (!isAdmin) return <Navigate to="/" replace />;

  const openCreate = () => { setEditing(null); setForm({ name: "", email: "", password: "", isAdmin: false }); setDialogOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: "", isAdmin: u.perfils?.includes("ADMIN") || false }); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (saving || now < saveLockedUntil) return;
    setSaveLockedUntil(now + 4000);

    const data = { name: form.name, email: form.email, password: form.password, perfils: form.isAdmin ? ["ADMIN"] : [] };
    if (DEMO_MODE) {
      if (editing) {
        const idx = users.findIndex((u) => u.id === editing.id);
        if (idx >= 0) { const updated = [...users]; updated[idx] = { ...editing, ...data }; setUsers(updated); }
      } else {
        setUsers([...users, { id: Math.max(0, ...users.map((u) => u.id)) + 1, ...data }]);
      }
      toast.success(editing ? "Usuário atualizado" : "Usuário criado");
      setDialogOpen(false);
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await api.updateUser(editing.id, data);
        toast.success("Usuário atualizado");
      } else {
        await api.createUser(data);
        toast.success("Usuário criado");
      }
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "", isAdmin: false });
      fetchUsers();
    } catch { toast.error("Erro ao salvar usuário"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id?: number) => {
    const target = id ?? confirmTarget;
    if (!target) return;
    if (DEMO_MODE) { setUsers(users.filter((u) => u.id !== target)); toast.success("Usuário excluído"); setConfirmOpen(false); setConfirmTarget(null); return; }
    try { await api.deleteUser(target); toast.success("Usuário excluído"); fetchUsers(); }
    catch { toast.error("Erro ao excluir usuário"); }
    finally { setConfirmOpen(false); setConfirmTarget(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} usuários cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAdmin" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} className="rounded border-border" />
                <Label htmlFor="isAdmin">Administrador</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saving || Date.now() < saveLockedUntil}>
                {saving ? "Aguarde..." : `${editing ? "Salvar" : "Criar"} Usuário`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="transition-shadow hover:shadow-sm">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground sm:hidden truncate">{u.email}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{u.email}</TableCell>
                <TableCell><Badge variant={u.perfils?.includes("ADMIN") ? "default" : "secondary"}>{u.perfils?.includes("ADMIN") ? "Admin" : "Usuário"}</Badge></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setConfirmTarget(u.id); setConfirmOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></div></TableCell>
              </TableRow>
            ))}
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={(v) => { setConfirmOpen(v); if (!v) setConfirmTarget(null); }}
              title="Excluir Usuário"
              description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
              confirmLabel="Excluir"
              cancelLabel="Cancelar"
              onConfirm={() => handleDelete()}
            />
            {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersPage;
