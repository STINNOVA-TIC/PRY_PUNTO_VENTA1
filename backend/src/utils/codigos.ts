// backend/src/utils/codigos.ts

const MAX_INTENTOS = 50;

/**
 * Genera un código aleatorio garantizando unicidad: verifica contra la BD
 * antes de retornar y regenera en caso de colisión .
 */
export const generarCodigoUnico = async (
  construir: (intento: number) => string,
  verificarUnico: (codigo: string) => Promise<boolean>
): Promise<string> => {
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const codigo = construir(intento);
    if (!(await verificarUnico(codigo))) {
      return codigo;
    }
  }
  return `${construir(MAX_INTENTOS)}-${Date.now().toString().slice(-4)}`;
};