const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Banco de preguntas del examen teórico oficial Touring / MTC (categorizadas y con base legal)
const QUESTION_BANK = [
  {
    id: 1,
    category: "Señalización vial",
    question: "¿Qué indica una línea continua amarilla en el eje central de la calzada?",
    options: [
      "Separación de carriles en el mismo sentido de marcha",
      "Prohibido adelantar invadiendo el carril contrario",
      "Zona autorizada para estacionamiento temporal",
      "Carril exclusivo para vehículos de transporte público"
    ],
    answer: 1,
    explanation: "La línea continua amarilla separa flujos opuestos e indica prohibición estricta de adelantar o circular sobre ella (Art. 211 RNT)."
  },
  {
    id: 2,
    category: "Velocidades y preferencias",
    question: "¿Cuál es la velocidad máxima permitida en zonas escolares y hospitalarias sin señal específica?",
    options: ["50 km/h", "30 km/h", "40 km/h", "20 km/h"],
    answer: 1,
    explanation: "El Art. 162 del Reglamento Nacional de Tránsito establece un límite máximo de 30 km/h en zonas escolares y comerciales/hospitalarias."
  },
  {
    id: 3,
    category: "Señalización vial",
    question: "Ante una luz amarilla intermitente en el semáforo, ¿cómo debe actuar el conductor?",
    options: [
      "Detenerse obligatoriamente hasta que cambie a verde",
      "Disminuir la velocidad y cruzar con extrema precaución",
      "Acelerar para despejar rápidamente la intersección",
      "Realizar un giro en U de forma inmediata"
    ],
    answer: 1,
    explanation: "La luz amarilla intermitente indica precaución y advierte el cruce con derecho de paso relativo (Art. 138 RNT)."
  },
  {
    id: 4,
    category: "Normativa y documentos",
    question: "¿Qué documentos obligatorios debe portar todo conductor durante la marcha?",
    options: [
      "Licencia de conducir vigente, SOAT vigente y Tarjeta de Identificación Vehicular",
      "Solo el DNI original y la factura de compra del vehículo",
      "Licencia de conducir y carnet universitario",
      "Copia simple del contrato de compraventa vehicular"
    ],
    answer: 0,
    explanation: "De acuerdo con el Art. 91 del RNT, el conductor debe portar licencia de conducir, tarjeta de propiedad y certificado SOAT vigente."
  },
  {
    id: 5,
    category: "Velocidades y preferencias",
    question: "En una intersección no semaforizada ni señalizada, ¿quién tiene la prioridad de paso?",
    options: [
      "El vehículo que circula a mayor velocidad",
      "El vehículo que se aproxima por el lado derecho del conductor",
      "El vehículo que se aproxima por el lado izquierdo",
      "El vehículo de mayor dimensión o peso"
    ],
    answer: 1,
    explanation: "Regla general de prioridad: ante intersecciones no controladas, la preferencia la tiene el vehículo que asoma por la derecha (Art. 176 RNT)."
  },
  {
    id: 6,
    category: "Seguridad y prevención",
    question: "¿Cuál es la distancia de seguridad mínima recomendada respecto al vehículo que antecede en pavimento seco?",
    options: [
      "1 metro por cada 20 km/h de velocidad",
      "Regla de los 2 a 3 segundos de separación temporal",
      "Medio metro para evitar que otros autos se interpongan",
      "No existe norma, depende del criterio del chofer"
    ],
    answer: 1,
    explanation: "La regla de los 2 a 3 segundos garantiza el tiempo necesario de reacción y distancia de frenado eficaz (Art. 168 RNT)."
  },
  {
    id: 7,
    category: "Seguridad y prevención",
    question: "Si sufre una avería en la vía y debe detenerse, ¿a qué distancia mínima debe colocar los dispositivos de advertencia (triángulos)?",
    options: [
      "Pegados al parachoques trasero",
      "Entre 50 y 100 metros antes del vehículo en el mismo sentido",
      "En el techo del automóvil con las luces encendidas",
      "A 10 metros del vehículo únicamente de noche"
    ],
    answer: 1,
    explanation: "Los triángulos o balizas reflectivas deben situarse a no menos de 50 metros en zona urbana y 100 metros en carretera (Art. 202 RNT)."
  },
  {
    id: 8,
    category: "Señalización vial",
    question: "¿Qué forma y colores caracterizan a las señales de tránsito reglamentarias o prohibitivas?",
    options: [
      "Forma rectangular de fondo verde",
      "Forma circular con borde rojo y fondo blanco",
      "Forma de rombo con fondo amarillo y símbolo negro",
      "Forma triangular invertida de fondo azul"
    ],
    answer: 1,
    explanation: "Las señales reglamentarias son predominantemente circulares con anillo y barra oblicua roja sobre fondo blanco, denotando prohibición o restricción."
  },
  {
    id: 9,
    category: "Seguridad y prevención",
    question: "Antes de efectuar una maniobra de cambio de carril, el conductor debe obligatoriamente:",
    options: [
      "Tocar la bocina e ingresar con decisión",
      "Mirar por los espejos, verificar el punto ciego y encender la luz direccional con al menos 30 metros de anticipación",
      "Frenar en seco para asegurar que no vienen autos",
      "Encender únicamente las luces de emergencia"
    ],
    answer: 1,
    explanation: "El Art. 195 del RNT dispone advertir el cambio de carril mediante luces direccionales con suficiente anticipación y verificar ángulos muertos."
  },
  {
    id: 10,
    category: "Normativa y documentos",
    question: "Respecto al cinturón de seguridad, ¿cuál es la disposición legal obligatoria?",
    options: [
      "Obligatorio solo en vías expresas y carreteras nacionales",
      "Exigible únicamente para el piloto y copiloto",
      "Obligatorio para todos los ocupantes del vehículo que dispongan de cinturón",
      "Opcional si el vehículo cuenta con bolsas de aire (airbags)"
    ],
    answer: 2,
    explanation: "El uso del cinturón es obligatorio para todos los ocupantes de los asientos delanteros y traseros provistos de fábrica (Art. 85 RNT)."
  },
  {
    id: 11,
    category: "Velocidades y preferencias",
    question: "¿Quién tiene la preferencia de paso en una rotonda u óvalo?",
    options: [
      "El vehículo que intenta ingresar a la rotonda",
      "El vehículo que ya está circulando dentro de la rotonda",
      "El vehículo que sale de una vía de mayor jerarquía",
      "El que toque la bocina con anticipación"
    ],
    answer: 1,
    explanation: "En glorietas o rotondas, tiene prioridad el vehículo que ya se encuentra circulando dentro del anillo sobre el que pretende incorporarse (Art. 178 RNT)."
  },
  {
    id: 12,
    category: "Seguridad y mecánica",
    question: "¿Qué función cumple el sistema de frenos antibloqueo (ABS)?",
    options: [
      "Detiene el vehículo instantáneamente en cero metros",
      "Evita que las ruedas se bloqueen ante un frenado de pánico, permitiendo mantener el control de la dirección",
      "Aumenta la potencia del motor en descensos pronunciados",
      "Bloquea las ruedas traseras para realizar derrapes controlados"
    ],
    answer: 1,
    explanation: "El ABS modula la presión del fluido de frenos para impedir el bloqueo de los neumáticos, preservando la capacidad de maniobra del conductor."
  }
];

// Obtener preguntas para rendir el simulacro (sin las respuestas)
router.get("/questions", requireAuth, (req, res) => {
  const publicQuestions = QUESTION_BANK.map(({ id, category, question, options }) => ({
    id,
    category,
    question,
    options
  }));
  res.json(publicQuestions);
});

// Enviar y calificar simulacro
router.post("/submit", requireAuth, requireRole("student"), (req, res) => {
  const { exam_type, answers, time_taken_seconds } = req.body;

  if (exam_type === "teorico") {
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Debes enviar tus respuestas." });
    }

    let correct = 0;
    const review = [];
    const categoryStats = {};

    QUESTION_BANK.forEach((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.answer;
      if (isCorrect) correct += 1;

      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { correct: 0, total: 0 };
      }
      categoryStats[q.category].total += 1;
      if (isCorrect) categoryStats[q.category].correct += 1;

      review.push({
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options,
        selectedOption: selected !== undefined ? selected : null,
        correctOption: q.answer,
        isCorrect,
        explanation: q.explanation
      });
    });

    const score = Math.round((correct / QUESTION_BANK.length) * 100);
    const passed = score >= 70 ? 1 : 0;

    const detailsObj = {
      correct,
      total: QUESTION_BANK.length,
      time_taken_seconds: time_taken_seconds || null,
      categoryStats,
      review
    };

    const info = db
      .prepare(
        "INSERT INTO exam_simulations (student_id, exam_type, score, passed, details) VALUES (?,?,?,?,?)"
      )
      .run(req.user.id, "teorico", score, passed, JSON.stringify(detailsObj));

    // Notificación automática al alumno
    const statusText = passed ? "¡Aprobaste el simulacro!" : "Simulacro no aprobado";
    db.createNotification(
      req.user.id,
      `${statusText} (${score}/100)`,
      `Obtuviste ${correct} aciertos de ${QUESTION_BANK.length}. Revisa el desglose de explicaciones para reforzar tus conocimientos.`,
      "examen"
    );

    return res.status(201).json({
      id: info.lastInsertRowid,
      score,
      passed: !!passed,
      correct,
      total: QUESTION_BANK.length,
      categoryStats,
      review
    });
  }

  if (exam_type === "practico") {
    const { score, details } = req.body;
    if (typeof score !== "number") return res.status(400).json({ error: "Debes indicar un puntaje válido." });
    const passed = score >= 70 ? 1 : 0;
    const info = db
      .prepare(
        "INSERT INTO exam_simulations (student_id, exam_type, score, passed, details) VALUES (?,?,?,?,?)"
      )
      .run(req.user.id, "practico", score, passed, details ? JSON.stringify(details) : null);
    return res.status(201).json({ id: info.lastInsertRowid, score, passed: !!passed });
  }

  return res.status(400).json({ error: "Tipo de examen inválido." });
});

// Historial de simulacros con detalle
router.get("/history/:studentId", requireAuth, (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === "student" && Number(studentId) !== req.user.id) {
    return res.status(403).json({ error: "No puedes ver el historial de otro alumno." });
  }

  const rows = db
    .prepare("SELECT * FROM exam_simulations WHERE student_id = ? ORDER BY taken_at DESC")
    .all(studentId);

  const parsed = rows.map((r) => {
    let details = null;
    try {
      details = r.details ? JSON.parse(r.details) : null;
    } catch {
      details = null;
    }
    return { ...r, details };
  });

  res.json(parsed);
});

module.exports = router;
