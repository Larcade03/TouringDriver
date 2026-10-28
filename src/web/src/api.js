const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || "Ocurrió un error al comunicarse con el servidor.";
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Autenticación
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),

  // Usuarios (Personal / Alumnos)
  listUsers: (token) => request("/users", { token }),
  createUser: (token, payload) => request("/users", { method: "POST", body: payload, token }),
  deleteUser: (token, id) => request(`/users/${id}`, { method: "DELETE", token }),
  listInstructors: (token) => request("/users/instructors", { token }),

  // Expedientes de matrícula (LambdaEstudiante)
  getMyFile: (token) => request("/students/my-file", { token }),
  listStudentFiles: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/students/files${qs ? `?${qs}` : ""}`, { token });
  },
  getStudentFile: (token, id) => request(`/students/${id}/file`, { token }),
  updateStudentFile: (token, id, payload) =>
    request(`/students/${id}/file`, { method: "PUT", body: payload, token }),

  // Vehículos (LambdaVehiculo)
  listVehicles: (token) => request("/vehicles", { token }),
  createVehicle: (token, payload) => request("/vehicles", { method: "POST", body: payload, token }),
  updateVehicle: (token, id, payload) => request(`/vehicles/${id}`, { method: "PUT", body: payload, token }),
  setVehicleStatus: (token, id, status) =>
    request(`/vehicles/${id}/status`, { method: "PUT", body: { status }, token }),
  deleteVehicle: (token, id) => request(`/vehicles/${id}`, { method: "DELETE", token }),

  // Horarios de instructores (LambdaInstructor)
  listAvailability: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/instructors/availability${qs ? `?${qs}` : ""}`, { token });
  },
  createAvailability: (token, payload) =>
    request("/instructors/availability", { method: "POST", body: payload, token }),
  deleteAvailability: (token, id) =>
    request(`/instructors/availability/${id}`, { method: "DELETE", token }),

  // Reservas (LambdaReservas)
  listReservations: (token) => request("/reservations", { token }),
  createReservation: (token, payload) =>
    request("/reservations", { method: "POST", body: payload, token }),
  cancelReservation: (token, id, reason) =>
    request(`/reservations/${id}/cancel`, { method: "PUT", body: { reason }, token }),
  completeReservation: (token, id) =>
    request(`/reservations/${id}/complete`, { method: "PUT", token }),

  // Progreso y Evaluaciones (LambdaProgreso)
  getProgress: (token, studentId) => request(`/progress/${studentId}`, { token }),
  listAllProgress: (token) => request("/progress", { token }),
  addProgress: (token, payload) => request("/progress", { method: "POST", body: payload, token }),

  // Simulacro de examen (LambdaSimulacro)
  getExamQuestions: (token) => request("/exams/questions", { token }),
  submitExam: (token, payload) => request("/exams/submit", { method: "POST", body: payload, token }),
  getExamHistory: (token, studentId) => request(`/exams/history/${studentId}`, { token }),

  // Notificaciones (LambdaNotificaciones / SQS)
  listNotifications: (token) => request("/notifications", { token }),
  markNotificationRead: (token, id) => request(`/notifications/${id}/read`, { method: "PUT", token }),
  markAllNotificationsRead: (token) => request("/notifications/read-all", { method: "PUT", token }),
  deleteNotification: (token, id) => request(`/notifications/${id}`, { method: "DELETE", token }),
};
