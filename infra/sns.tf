# ============================================================
# AMAZON SNS — Notificaciones y Alertas al Equipo Técnico
# Diagrama: Amazon Simple Notification Service (Amazon SNS)
# Requerimiento: RNF-05 (Avisos al celular) y RNF-17 (Alertas en menos de 5 min al equipo técnico)
# ============================================================

# Tópico SNS para alertas de monitoreo y avisos
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-tech-alerts-${var.environment}"

  tags = {
    Name = "${var.project_name}-tech-alerts"
  }
}

# Suscripción por correo para el equipo técnico (recibe alarmas de CloudWatch)
resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.technical_team_email
}
