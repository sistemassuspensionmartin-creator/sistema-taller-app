// Supabase devuelve como máximo 1000 filas por consulta y corta el resto sin avisar.
// traerTodos pide la lista completa de a páginas, en orden estable.
export async function traerTodos<T = any>(armarConsulta: () => any, tamanioPagina = 1000): Promise<T[]> {
  const todos: T[] = []
  for (let desde = 0; ; desde += tamanioPagina) {
    const { data, error } = await armarConsulta().range(desde, desde + tamanioPagina - 1)
    if (error) throw error
    todos.push(...(data || []))
    if (!data || data.length < tamanioPagina) break
  }
  return todos
}
