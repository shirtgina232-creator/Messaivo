import { forbidden } from "@/lib/api-helpers";

// Template management is restricted to the admin panel.
// Customers access available templates read-only via /api/broadcast-templates.
export async function GET()    { return forbidden(); }
export async function POST()   { return forbidden(); }
export async function PATCH()  { return forbidden(); }
export async function DELETE() { return forbidden(); }
