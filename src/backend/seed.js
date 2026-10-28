const bcrypt = require("bcryptjs");
const db = require("./database");

console.log("Iniciando semillero de datos para Touring Driver...");

try {
  db.exec("BEGIN");

  // Limpiar datos existentes de prueba (opcional)
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM exam_simulations;
    DELETE FROM progress;
    DELETE FROM reservations;
    DELETE FROM availability_slots;
    DELETE FROM student_files;
    DELETE FROM vehicles;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync("admin1234", 10);
  const studentHash = bcrypt.hashSync("alumno1234", 10);
  const instructorHash = bcrypt.hashSync("profe1234", 10);

  // 1. Usuarios Administradores e Instructores
  const adminInfo = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone)
    VALUES ('Administrador Touring', 'admin@touringdriver.com', ?, 'admin', '999888777')
  `).run(passwordHash);

  const ins1Info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, license_number)
    VALUES ('Carlos Mendoza Ramos', 'carlos.mendoza@touringdriver.com', ?, 'instructor', '987654321', 'Q40291823')
  `).run(instructorHash);

  const ins2Info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, license_number)
    VALUES ('Rosa Flores Vílchez', 'rosa.flores@touringdriver.com', ?, 'instructor', '976543210', 'Q48291049')
  `).run(instructorHash);

  // 2. Alumnos
  const stu1Info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, dni)
    VALUES ('Diego Quispe Silva', 'diego.quispe@gmail.com', ?, 'student', '912345678', '72819203')
  `).run(studentHash);

  const stu2Info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, dni)
    VALUES ('María Torres Linares', 'maria.torres@gmail.com', ?, 'student', '923456789', '75918204')
  `).run(studentHash);

  const stu3Info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, dni)
    VALUES ('Juan Pérez Gómez', 'juan.perez@gmail.com', ?, 'student', '934567890', '70192834')
  `).run(studentHash);

  // 3. Expedientes de Matrícula (LambdaEstudiante)
  db.prepare(`
    INSERT INTO student_files (student_id, file_number, license_category, medical_exam_status, medical_exam_date, file_status, emergency_contact, emergency_phone, notes)
    VALUES (?, 'EXP-2026-0001', 'A-I', 'aprobado', '2026-09-15', 'aprobado_para_examen', 'Carmen Silva (Madre)', '944332211', 'Completó curso de primeros auxilios y normas.')
  `).run(stu1Info.lastInsertRowid);

  db.prepare(`
    INSERT INTO student_files (student_id, file_number, license_category, medical_exam_status, medical_exam_date, file_status, emergency_contact, emergency_phone, notes)
    VALUES (?, 'EXP-2026-0002', 'A-I', 'aprobado', '2026-10-01', 'en_tramite', 'Roberto Torres (Padre)', '955443322', 'En proceso de acumulación de horas prácticas.')
  `).run(stu2Info.lastInsertRowid);

  db.prepare(`
    INSERT INTO student_files (student_id, file_number, license_category, medical_exam_status, medical_exam_date, file_status, emergency_contact, emergency_phone, notes)
    VALUES (?, 'EXP-2026-0003', 'A-IIa', 'pendiente', NULL, 'inscrito', 'Lucía Gómez (Hermana)', '966554433', 'Pendiente de entregar certificado psicosomático.')
  `).run(stu3Info.lastInsertRowid);

  // 4. Vehículos (LambdaVehiculo)
  const veh1Info = db.prepare(`
    INSERT INTO vehicles (plate, model, transmission, status, mileage, year)
    VALUES ('T1A-304', 'Toyota Yaris Sedán', 'manual', 'disponible', 14200, 2024)
  `).run();

  const veh2Info = db.prepare(`
    INSERT INTO vehicles (plate, model, transmission, status, mileage, year)
    VALUES ('B8K-112', 'Hyundai Accent', 'automatica', 'disponible', 22800, 2023)
  `).run();

  const veh3Info = db.prepare(`
    INSERT INTO vehicles (plate, model, transmission, status, mileage, year)
    VALUES ('P5M-980', 'Kia Rio Hatchback', 'manual', 'mantenimiento', 48500, 2022)
  `).run();

  // Fechas dinámicas (hoy, mañana, pasado mañana)
  const today = new Date();
  const formatIsoDate = (d) => d.toISOString().slice(0, 10);

  const d0 = formatIsoDate(today);
  const d1 = formatIsoDate(new Date(today.getTime() + 1 * 86400000));
  const d2 = formatIsoDate(new Date(today.getTime() + 2 * 86400000));
  const d3 = formatIsoDate(new Date(today.getTime() + 3 * 86400000));

  // 5. Bloques de disponibilidad (LambdaInstructor)
  const slot1 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '08:00', '09:00', 'Circuito Principal', 1)
  `).run(ins1Info.lastInsertRowid, veh1Info.lastInsertRowid, d1);

  const slot2 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '09:15', '10:15', 'Circuito de Estacionamiento', 0)
  `).run(ins1Info.lastInsertRowid, veh1Info.lastInsertRowid, d1);

  const slot3 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '10:30', '11:30', 'Circuito Principal', 0)
  `).run(ins1Info.lastInsertRowid, veh1Info.lastInsertRowid, d1);

  const slot4 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '14:00', '15:00', 'Circuito Principal', 1)
  `).run(ins2Info.lastInsertRowid, veh2Info.lastInsertRowid, d2);

  const slot5 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '15:15', '16:15', 'Circuito Principal', 0)
  `).run(ins2Info.lastInsertRowid, veh2Info.lastInsertRowid, d2);

  const slot6 = db.prepare(`
    INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit, is_booked)
    VALUES (?, ?, ?, '09:00', '10:00', 'Circuito de Estacionamiento', 0)
  `).run(ins2Info.lastInsertRowid, veh2Info.lastInsertRowid, d3);

  // 6. Reservas (LambdaReservas)
  db.prepare(`
    INSERT INTO reservations (student_id, slot_id, status, notes)
    VALUES (?, ?, 'confirmada', 'Práctica de estacionamiento paralelo y cajón')
  `).run(stu1Info.lastInsertRowid, slot1.lastInsertRowid);

  db.prepare(`
    INSERT INTO reservations (student_id, slot_id, status, notes)
    VALUES (?, ?, 'confirmada', 'Manejo en circuito cerrado con cambios automáticos')
  `).run(stu2Info.lastInsertRowid, slot4.lastInsertRowid);

  // 7. Evaluaciones de Progreso (LambdaProgreso)
  const skillsDiego = JSON.stringify({
    estacionamiento_paralelo: 5,
    estacionamiento_diagonal: 4,
    control_pedales: 5,
    curvas_y_direccionales: 5,
    arranque_pendiente: 4,
    respeto_senales: 5
  });

  db.prepare(`
    INSERT INTO progress (student_id, instructor_id, hours_completed, lessons_completed, skill_level, skills_eval, notes)
    VALUES (?, ?, 16.0, 8, 'avanzado', ?, 'Excelente dominio de carril y estacionamiento en paralelo. Listo para simulacro final.')
  `).run(stu1Info.lastInsertRowid, ins1Info.lastInsertRowid, skillsDiego);

  const skillsMaria = JSON.stringify({
    estacionamiento_paralelo: 3,
    estacionamiento_diagonal: 3,
    control_pedales: 4,
    curvas_y_direccionales: 4,
    arranque_pendiente: 3,
    respeto_senales: 4
  });

  db.prepare(`
    INSERT INTO progress (student_id, instructor_id, hours_completed, lessons_completed, skill_level, skills_eval, notes)
    VALUES (?, ?, 8.0, 4, 'intermedio', ?, 'Buen avance en curvas y frenado. Reforzar referencias visuales en retroceso.')
  `).run(stu2Info.lastInsertRowid, ins2Info.lastInsertRowid, skillsMaria);

  // 8. Simulacro de Examen Teórico (LambdaSimulacro)
  db.prepare(`
    INSERT INTO exam_simulations (student_id, exam_type, score, passed, details)
    VALUES (?, 'teorico', 85, 1, ?)
  `).run(stu1Info.lastInsertRowid, JSON.stringify({
    correct: 10,
    total: 12,
    time_taken_seconds: 480,
    review: []
  }));

  // 9. Notificaciones iniciales (LambdaNotificaciones)
  db.createNotification(
    stu1Info.lastInsertRowid,
    "Reserva confirmada",
    `Tu práctica de manejo está programada para el ${d1} de 08:00 a 09:00 en Circuito Principal con Carlos Mendoza.`,
    "reserva"
  );
  db.createNotification(
    stu1Info.lastInsertRowid,
    "Evaluación de progreso actualizada",
    "Tu instructor Carlos Mendoza registró tu evaluación: Nivel Avanzado (16.0 horas acumuladas).",
    "progreso"
  );
  db.createNotification(
    stu2Info.lastInsertRowid,
    "Reserva confirmada",
    `Tu práctica con Rosa Flores está programada para el ${d2} de 14:00 a 15:00.`,
    "reserva"
  );

  db.exec("COMMIT");

  console.log("¡Semillero completado exitosamente!");
  console.log("Cuentas de prueba listas para usar:");
  console.log("- Administrador: admin@touringdriver.com / admin1234");
  console.log("- Instructor 1: carlos.mendoza@touringdriver.com / profe1234");
  console.log("- Instructor 2: rosa.flores@touringdriver.com / profe1234");
  console.log("- Alumno 1 (Avanzado): diego.quispe@gmail.com / alumno1234");
  console.log("- Alumno 2 (Intermedio): maria.torres@gmail.com / alumno1234");
  console.log("- Alumno 3 (Principiante): juan.perez@gmail.com / alumno1234");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Error al sembrar la base de datos:", err);
  process.exit(1);
}
