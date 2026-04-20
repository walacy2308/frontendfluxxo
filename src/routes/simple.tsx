import { createFileRoute } from "@tanstack/react-router";
import SimpleDashboard from "../components/SimpleDashboard";

export const Route = createFileRoute("/simple")({
  component: SimpleDashboard,
  head: () => ({
    meta: [
      { title: "Fluxxo — Teste Simplificado" },
    ],
  }),
});
