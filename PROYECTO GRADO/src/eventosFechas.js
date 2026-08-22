// Relación simple entre fechas/meses del año y categorías o recetas
// sugeridas. Para agregar una fecha nueva, copia un bloque { ... }.
// mes: 1 = enero, 2 = febrero, ... 12 = diciembre
// dia (opcional): si se indica, aplica solo ese día del mes

const fechasEspeciales = [
  { mes: 2, dia: 14, nombre: "San Valentín", categoriaSugerida: "especial" },
  { mes: 10, dia: 31, nombre: "Halloween", categoriaSugerida: "especial" },
  { mes: 12, nombre: "Navidad", categoriaSugerida: "especial" }, // todo diciembre
  { mes: 1, dia: 1, nombre: "Año Nuevo", categoriaSugerida: "especial" },
  { mes: 1, nombre: "Propósitos de año nuevo (comer sano)", categoriaSugerida: "fitness" }, // todo enero
];

// Busca si hoy coincide con alguna fecha especial registrada
export function obtenerFechaEspecialHoy() {
  const hoy = new Date();
  const mesHoy = hoy.getMonth() + 1; // en JS enero es 0
  const diaHoy = hoy.getDate();

  return fechasEspeciales.find((f) => {
    if (f.mes !== mesHoy) return false;
    if (f.dia && f.dia !== diaHoy) return false;
    return true;
  });
}

export default fechasEspeciales;