import { useState } from "react";
import { useListStrategies, useCreateStrategy, useUpdateStrategy, useDeleteStrategy, getListStrategiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Playbook() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: strategies, isLoading } = useListStrategies({ query: { queryKey: getListStrategiesQueryKey() } });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playbook</h1>
          <p className="text-muted-foreground mt-1">Manage your trading strategies and setups.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Strategy</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Strategy</DialogTitle>
            </DialogHeader>
            <StrategyForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-40 bg-muted/20" />
          ))}
        </div>
      ) : strategies?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-muted/10 space-y-4">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground">No strategies defined yet</p>
          <p className="text-muted-foreground">Document your setups and rules so you can tag trades and track which edge is working.</p>
          <Button className="gap-2 mt-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Your First Strategy
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies?.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteStrategy = useDeleteStrategy();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this strategy?")) {
      deleteStrategy.mutate({ id: strategy.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
          toast({ title: "Strategy deleted" });
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{strategy.name}</CardTitle>
          {strategy.description && (
            <CardDescription className="mt-2 line-clamp-3">{strategy.description}</CardDescription>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Edit2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Strategy</DialogTitle>
              </DialogHeader>
              <StrategyForm initialData={strategy} onSuccess={() => setIsEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function StrategyForm({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const createStrategy = useCreateStrategy();
  const updateStrategy = useUpdateStrategy();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, description: description || null };

    if (initialData) {
      updateStrategy.mutate({ id: initialData.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
          toast({ title: "Strategy updated" });
          onSuccess();
        }
      });
    } else {
      createStrategy.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
          toast({ title: "Strategy created" });
          onSuccess();
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Breakout Retest" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Rules, criteria, etc." rows={4} />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={createStrategy.isPending || updateStrategy.isPending}>
          {initialData ? "Save Changes" : "Create Strategy"}
        </Button>
      </div>
    </form>
  );
}