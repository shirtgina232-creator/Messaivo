import { redirect } from "next/navigation";

// Template management has moved to the admin panel.
// Customers access templates only through the Broadcast wizard.
export default function TemplatesPage() {
  redirect("/app");
}
