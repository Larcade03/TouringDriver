# ============================================================
# AMAZON SES — Envío de Correos Electrónicos
# Diagrama: Amazon Simple Email Service (Amazon SES)
# Requerimiento: RNF-05 (Confirmaciones de reserva y recordatorios por correo)
# ============================================================

resource "aws_ses_email_identity" "notification_email" {
  email = var.technical_team_email
}
