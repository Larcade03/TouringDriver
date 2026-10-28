# ============================================================
# AMAZON API GATEWAY — Puerta de Entrada y Enrutamiento HTTP
# Diagrama: Amazon API Gateway (recibe peticiones y deriva a la Lambda correcta)
# Requerimientos: RNF-07 (150 usuarios simultáneos), RNF-08 (200 usuarios pico) y RNF-13 (Comprueba token de Cognito)
# ============================================================

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api-gateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
  }

  tags = {
    Name = "${var.project_name}-api"
  }
}

# Autorizador JWT de Amazon Cognito en API Gateway (RNF-13 y RNF-14)
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "CognitoAuthorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.client.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}"
  }
}

# Enrutamiento de API Gateway hacia las 6 Lambdas
locals {
  routes = {
    "reservations" = aws_lambda_function.lambda_reservas.arn
    "instructors"  = aws_lambda_function.lambda_instructor.arn
    "progress"     = aws_lambda_function.lambda_progreso.arn
    "exams"        = aws_lambda_function.lambda_simulacro.arn
    "students"     = aws_lambda_function.lambda_estudiante.arn
    "vehicles"     = aws_lambda_function.lambda_vehiculo.arn
  }
}

resource "aws_apigatewayv2_integration" "lambda_integrations" {
  for_each               = local.routes
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api_routes" {
  for_each           = local.routes
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "ANY /api/${each.key}/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integrations[each.key].id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Permisos para que API Gateway invoque a cada Lambda
resource "aws_lambda_permission" "apigw_permissions" {
  for_each      = local.routes
  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw_logs.arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      latency        = "$context.responseLatency"
    })
  }
}

resource "aws_cloudwatch_log_group" "apigw_logs" {
  name              = "/aws/apigateway/${var.project_name}-api"
  retention_in_days = 30
}
