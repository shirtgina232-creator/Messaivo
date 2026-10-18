// Removed the development credential bypass. Use the authenticated Page-scoped registration endpoint.
export async function POST() { return new Response(null, { status: 410 }); }
