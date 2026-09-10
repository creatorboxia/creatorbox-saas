import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/creatorbox.functions";

export function useClientes() {
  return useQuery({ queryKey: ["clientes"], queryFn: () => listClientes() });
}

export function FiltroCliente({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (valor: string) => void;
}) {
  const { data: clientes } = useClientes();

  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className="w-56" aria-label="Filtrar por cliente">
        <SelectValue placeholder="Todos os clientes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os clientes</SelectItem>
        {(clientes ?? []).map((cliente) => (
          <SelectItem key={cliente.id} value={cliente.id}>
            {cliente.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
