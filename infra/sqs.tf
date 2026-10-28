# ============================================================
# AMAZON SQS — Colas de Mensajería y Tolerancia a Fallos
# Diagrama: Amazon SQS y SQS cola de fallidos (3 intentos fallidos)
# Requerimientos: RNF-05 (Avisos que fallan no demoran la reserva ni se pierden)
# ============================================================

# SQS Cola de Fallidos (Dead Letter Queue - DLQ) (RNF-05)
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-notifications-dlq"
  message_retention_seconds = 1209600 # 14 días para auditar mensajes no entregados

  tags = {
    Name = "${var.project_name}-notifications-dlq"
  }
}

# SQS Cola Principal de Notificaciones
# Desacopla LambdaReservas de LambdaNotificaciones.
# Tras 3 intentos fallidos, el mensaje pasa automáticamente a la DLQ ("3 intentos fallidos").
resource "aws_sqs_queue" "main" {
  name                       = "${var.project_name}-notifications-queue"
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KB
  message_retention_seconds  = 86400  # 1 día
  visibility_timeout_seconds  = 60     # Ventana para que LambdaNotificaciones procese antes de reintentar

  # Política de reintento: Si falla 3 veces regresa a la DLQ
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.project_name}-notifications-queue"
  }
}
