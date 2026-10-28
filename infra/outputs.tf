output "cloudfront_url" {
  description = "URL pública de la aplicación web servida por Amazon CloudFront (HTTPS)"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "api_gateway_url" {
  description = "Endpoint base de Amazon API Gateway para las peticiones de la web"
  value       = aws_apigatewayv2_stage.prod.invoke_url
}

output "cognito_user_pool_id" {
  description = "ID del User Pool de Amazon Cognito para autenticación"
  value       = aws_cognito_user_pool.pool.id
}

output "cognito_app_client_id" {
  description = "ID del Cliente de Aplicación de Cognito para React SPA"
  value       = aws_cognito_user_pool_client.client.id
}

output "rds_proxy_endpoint" {
  description = "Endpoint de conexión de Amazon RDS Proxy para las Lambdas"
  value       = aws_db_proxy.proxy.endpoint
}

output "rds_primary_endpoint" {
  description = "Endpoint directo de la instancia RDS Multi-AZ"
  value       = aws_db_instance.rds_multi_az.endpoint
}

output "sqs_notifications_queue_url" {
  description = "URL de la cola principal de Amazon SQS para notificaciones"
  value       = aws_sqs_queue.main.id
}

output "sqs_dlq_queue_url" {
  description = "URL de la cola SQS de mensajes fallidos (DLQ)"
  value       = aws_sqs_queue.dlq.id
}

output "sns_alerts_topic_arn" {
  description = "ARN del tópico SNS de alertas de CloudWatch para el Equipo Técnico"
  value       = aws_sns_topic.alerts.arn
}
