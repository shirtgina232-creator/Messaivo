import { forbidden } from "@/lib/api-helpers";

export async function GET()    { return forbidden(); }
export async function PATCH()  { return forbidden(); }
export async function DELETE() { return forbidden(); }
