# ============================================================
# AMAZON COGNITO — Gestión de Identidad y Roles
# Diagrama: Amazon Cognito (autenticación y entrega de token a usuario)
# Requerimientos: RNF-13 (Cierre de sesión automático a la hora) y RNF-14 (Roles diferenciados)
# ============================================================

# User Pool principal para la plataforma
resource "aws_cognito_user_pool" "pool" {
  name = "${var.project_name}-user-pool-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # Atributo personalizado para DNI del alumno
  schema {
    attribute_data_type      = "String"
    name                     = "dni"
    required                 = false
    mutable                  = true
    string_attribute_constraints {
      min_length = 8
      max_length = 8
    }
  }

  tags = {
    Name = "${var.project_name}-user-pool"
  }
}

# Grupos de usuarios en Cognito (Separación de roles RNF-14)
resource "aws_cognito_user_group" "students" {
  name         = "Students"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "Grupo para Alumnos matriculados"
}

resource "aws_cognito_user_group" "instructors" {
  name         = "Instructors"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "Grupo para Instructores de manejo"
}

resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "Grupo para Administradores de la escuela"
}

# Cliente de aplicación de Cognito (para React SPA)
resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project_name}-web-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret = false # La SPA pública no almacena secretos

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Caducidad de sesión (RNF-13: La sesion se cierra sola cuando el acceso vence a la hora)
  id_token_validity      = 1
  access_token_validity  = 1
  token_validity_units {
    id_token      = "hours"
    access_token  = "hours"
    refresh_token = "days"
  }
}
