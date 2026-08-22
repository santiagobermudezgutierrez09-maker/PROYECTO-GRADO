// Lista de sustituciones de ingredientes.
// Si al usuario le falta el ingrediente "original", se le sugiere el "sustituto".
// Para agregar más, copia una línea y cambia los valores.

const equivalencias = [
  { original: "mantequilla", sustituto: "aceite vegetal" },
  { original: "leche", sustituto: "leche de almendras" },
  { original: "azúcar", sustituto: "panela raspada" },
  { original: "crema de leche", sustituto: "yogur natural" },
  { original: "harina", sustituto: "harina de avena" },
  { original: "queso costeño", sustituto: "queso mozzarella" },
  { original: "cebolla", sustituto: "cebolla en polvo" },
  { original: "ajo", sustituto: "ajo en polvo" },
  { original: "limón", sustituto: "vinagre blanco" },
  { original: "cilantro", sustituto: "perejil" },
  { original: "pechuga de pollo", sustituto: "pechuga de pavo" },
  { original: "carne molida", sustituto: "carne de soya texturizada" },
  { original: "arroz", sustituto: "quinua" },
  { original: "yogur griego", sustituto: "yogur natural" },
  { original: "leche de coco", sustituto: "leche de coco light" },
  { original: "panela", sustituto: "miel" },
  { original: "aceite de oliva", sustituto: "aceite vegetal" },
  { original: "vino blanco", sustituto: "caldo de verduras" },
  { original: "chocolate para cubrir", sustituto: "cacao en polvo con azúcar" },
  { original: "almendras", sustituto: "maní" },
];

export default equivalencias;