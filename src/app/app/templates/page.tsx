import { redirect } from "next/navigation";

// Templates are managed by admins only. Customers access available templates
// through the Send Message workflow at /app/broadcasts.
export default function TemplatesPage() {
  redirect("/app/broadcasts");
}
