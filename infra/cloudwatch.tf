# ============================================================
# AMAZON CLOUDWATCH — Monitoreo, Métricas y Alarmas Automáticas
# Diagrama: Amazon CloudWatch (Monitorea todo el sistema) -> Si algo falla -> Amazon SNS
# Requerimientos: 
# - RNF-09: Tiempos de respuesta menores a 2 segundos
# - RNF-17: Detección y notificación en menos de 5 minutos ante cualquier fallo
# - RNF-05: Supervisión de mensajes fallidos en Dead Letter Queue (DLQ)
# ============================================================

# Alarma 1: Tasa de Errores 5XX en API Gateway
# Notifica si se generan errores del servidor que superen el umbral aceptable
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.project_name}-api-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutos (RNF-17)
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alarma cuando se presentan mas de 5 errores 5xx en la API en 5 minutos"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.api.id
  }

  tags = {
    Name = "${var.project_name}-api-5xx-alarm"
  }
}

# Alarma 2: Mensajes acumulados en SQS Dead Letter Queue (DLQ)
# Detecta si hay mensajes de notificación que han fallado tras 3 reintentos (RNF-05)
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  alarm_name          = "${var.project_name}-sqs-dlq-messages-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300 # 5 minutos (RNF-17)
  statistic           = "Sum"
  threshold           = 0 # Cualquier mensaje en la DLQ activa la alerta inmediata
  alarm_description   = "Alerta si un aviso falla 3 veces y cae en la cola de fallidos DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  tags = {
    Name = "${var.project_name}-sqs-dlq-alarm"
  }
}

# Alarma 3: Latencia elevada en API Gateway (> 2 segundos)
# Asegura el cumplimiento de RNF-09 (respuestas en menos de 2 segundos)
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.project_name}-api-high-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 2000 # 2000 ms = 2 segundos (RNF-09)
  alarm_description   = "Alerta si la latencia promedio de la API supera los 2 segundos"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.api.id
  }

  tags = {
    Name = "${var.project_name}-api-latency-alarm"
  }
}

# Alarma 4: Consumo alto de CPU en Amazon RDS (> 80%)
# Monitorea la salud de la base de datos PostgreSQL Multi-AZ
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # 80% de utilización de CPU
  alarm_description   = "Alerta si la CPU de RDS supera el 80% por 10 minutos continuos"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.rds_multi_az.identifier
  }

  tags = {
    Name = "${var.project_name}-rds-cpu-alarm"
  }
}
