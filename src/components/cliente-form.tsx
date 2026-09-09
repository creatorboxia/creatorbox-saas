import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ClienteInput } from "@/lib/creatorbox.functions";

export type ClienteFormValues = {
  nome: string;
  nicho: string;
  instagram: string;
  cidade: string;
  servico_produto: string;
  publico_alvo: string;
  faixa_etaria: string;
  perfil_consumidor: string;
  dores: string;
  desejos: string;
  necessidades: string;
  objetivo_cliente: string;
  objetivo_redes_sociais: string;
  posicionamento: string;
  diferenciais: string;
  tom_comunicacao: string;
  ativo: boolean;
};

const vazio: ClienteFormValues = {
  nome: "",
  nicho: "",
  instagram: "",
  cidade: "",
  servico_produto: "",
  publico_alvo: "",
  faixa_etaria: "",
  perfil_consumidor: "",
  dores: "",
  desejos: "",
  necessidades: "",
  objetivo_cliente: "",
  objetivo_redes_sociais: "",
  posicionamento: "",
  diferenciais: "",
  tom_comunicacao: "",
  ativo: true,
};

export function toFormValues(cliente?: Partial<ClienteFormValues> | null): ClienteFormValues {
  if (!cliente) return { ...vazio };
  const merged = { ...vazio };
  for (const key of Object.keys(vazio) as (keyof ClienteFormValues)[]) {
    const value = cliente[key];
    if (key === "ativo") {
      merged.ativo = value === undefined || value === null ? true : Boolean(value);
    } else if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return merged;
}

export function toClienteInput(values: ClienteFormValues): ClienteInput {
  const limpo = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    nome: values.nome.trim(),
    nicho: limpo(values.nicho),
    instagram: limpo(values.instagram),
    cidade: limpo(values.cidade),
    servico_produto: limpo(values.servico_produto),
    publico_alvo: limpo(values.publico_alvo),
    faixa_etaria: limpo(values.faixa_etaria),
    perfil_consumidor: limpo(values.perfil_consumidor),
    dores: limpo(values.dores),
    desejos: limpo(values.desejos),
    necessidades: limpo(values.necessidades),
    objetivo_cliente: limpo(values.objetivo_cliente),
    objetivo_redes_sociais: limpo(values.objetivo_redes_sociais),
    posicionamento: limpo(values.posicionamento),
    diferenciais: limpo(values.diferenciais),
    tom_comunicacao: limpo(values.tom_comunicacao),
    ativo: values.ativo,
  };
}

export function ClienteForm({
  initial,
  submitLabel,
  saving,
  onSubmit,
}: {
  initial: ClienteFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: ClienteFormValues) => void;
}) {
  const [values, setValues] = useState<ClienteFormValues>(initial);

  function set<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-6"
    >
      <Secao titulo="Informações básicas" descricao="Quem é a empresa e o que ela vende.">
        <Campo label="Nome do cliente" required value={values.nome} onChange={(v) => set("nome", v)} />
        <Campo label="Nicho" value={values.nicho} onChange={(v) => set("nicho", v)} />
        <Campo
          label="Instagram"
          placeholder="@perfil"
          value={values.instagram}
          onChange={(v) => set("instagram", v)}
        />
        <Campo label="Cidade" value={values.cidade} onChange={(v) => set("cidade", v)} />
        <Area
          label="Serviço ou produto"
          value={values.servico_produto}
          onChange={(v) => set("servico_produto", v)}
        />
      </Secao>

      <Secao titulo="Público" descricao="Para quem essa marca fala.">
        <Area
          label="Público-alvo"
          value={values.publico_alvo}
          onChange={(v) => set("publico_alvo", v)}
        />
        <Campo
          label="Faixa etária"
          placeholder="25 a 40 anos"
          value={values.faixa_etaria}
          onChange={(v) => set("faixa_etaria", v)}
        />
        <Area
          label="Perfil do consumidor"
          value={values.perfil_consumidor}
          onChange={(v) => set("perfil_consumidor", v)}
        />
        <Area label="Dores" value={values.dores} onChange={(v) => set("dores", v)} />
        <Area label="Desejos" value={values.desejos} onChange={(v) => set("desejos", v)} />
        <Area
          label="Necessidades"
          value={values.necessidades}
          onChange={(v) => set("necessidades", v)}
        />
      </Secao>

      <Secao titulo="Estratégia" descricao="O que a marca quer alcançar e como se comunica.">
        <Area
          label="Objetivo do cliente"
          value={values.objetivo_cliente}
          onChange={(v) => set("objetivo_cliente", v)}
        />
        <Area
          label="Objetivo nas redes sociais"
          value={values.objetivo_redes_sociais}
          onChange={(v) => set("objetivo_redes_sociais", v)}
        />
        <Area
          label="Posicionamento"
          value={values.posicionamento}
          onChange={(v) => set("posicionamento", v)}
        />
        <Area
          label="Diferenciais"
          value={values.diferenciais}
          onChange={(v) => set("diferenciais", v)}
        />
        <Area
          label="Tom de comunicação"
          value={values.tom_comunicacao}
          onChange={(v) => set("tom_comunicacao", v)}
        />
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Cliente ativo</p>
            <p className="text-xs text-muted-foreground">
              Desative para arquivar sem apagar o histórico.
            </p>
          </div>
          <Switch checked={values.ativo} onCheckedChange={(v) => set("ativo", v)} />
        </div>
      </Secao>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        required={required ?? false}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} rows={3} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
