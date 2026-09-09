import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createConversa,
  listConversas,
  listMensagens,
  sendMensagem,
} from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat de ideias — CreatorBox" },
      {
        name: "description",
        content: "Converse sobre pautas, roteiros e legendas dos seus clientes no CreatorBox.",
      },
      { property: "og:title", content: "Chat de ideias — CreatorBox" },
      {
        property: "og:description",
        content: "Converse sobre pautas, roteiros e legendas dos seus clientes no CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat;
});

function Chat() {
  return null;
}
