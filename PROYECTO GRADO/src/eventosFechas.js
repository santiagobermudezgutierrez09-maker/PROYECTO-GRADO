




const fechasEspeciales = [
  { mes: 2, dia: 14, nombre: "San Valentín", categoriaSugerida: "especial" },
  { mes: 10, dia: 31, nombre: "Halloween", categoriaSugerida: "especial" },
  { mes: 12, nombre: "Navidad", categoriaSugerida: "especial" },
  { mes: 1, dia: 1, nombre: "Año Nuevo", categoriaSugerida: "especial" },
  { mes: 1, nombre: "Propósitos de año nuevo (comer sano)", categoriaSugerida: "fitness" },
];


export function obtenerFechaEspecialHoy() {
  const hoy = new Date();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  return fechasEspeciales.find((f) => {
    if (f.mes !== mesHoy) return false;
    if (f.dia && f.dia !== diaHoy) return false;
    return true;
  });
}

export default fechasEspeciales;