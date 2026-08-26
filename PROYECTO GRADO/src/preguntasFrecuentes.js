




const preguntasFrecuentes = [
  {
    palabrasClave: ["hola", "buenas", "hey"],
    respuesta: "¡Hola! Soy el asistente de Charin Cook. Puedes preguntarme cosas como: cuánto tiempo toma la receta, qué sustituto usar, o cómo va un paso.",
  },
  {
    palabrasClave: ["tiempo", "cuanto", "demora", "dura"],
    respuesta: "TIEMPO_RECETA",
  },
  {
    palabrasClave: ["porciones", "personas", "rinde"],
    respuesta: "PORCIONES_RECETA",
  },
  {
    palabrasClave: ["ingredientes", "que necesito", "que lleva"],
    respuesta: "INGREDIENTES_RECETA",
  },
  {
    palabrasClave: ["sustituto", "reemplazo", "no tengo", "cambiar"],
    respuesta: "SUSTITUTO_INGREDIENTE",
  },
  {
    palabrasClave: ["paso", "siguiente", "que sigue"],
    respuesta: "PASO_ACTUAL",
  },
  {
    palabrasClave: ["dificultad", "dificil", "facil"],
    respuesta: "DIFICULTAD_RECETA",
  },
  {
    palabrasClave: ["calorias", "calorías", "cuanto engorda"],
    respuesta: "CALORIAS_RECETA",
  },
  {
    palabrasClave: ["gracias", "genial", "perfecto"],
    respuesta: "¡De nada! Aquí estoy si necesitas algo más mientras cocinas. 😊",
  },
  {
    palabrasClave: ["adios", "chao", "hasta luego"],
    respuesta: "¡Hasta luego! Que disfrutes tu receta. 👋",
  },
];

export default preguntasFrecuentes;