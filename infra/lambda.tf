# ============================================================
# AWS LAMBDA — Lógica de Negocio y Funciones Serverless
# Diagrama: 6 Lambdas de negocio + LambdaNotificaciones (activada por SQS)
# Requerimientos: RNF-06 (Falla parcial no tumba el sistema), RNF-08, RNF-10 y RNF-18 (Mantenibilidad)
# ============================================================

# Security Group para las funciones Lambda
resource "aws_security_group" "lambda_sg" {
  name        = "${var.project_name}-lambda-sg"
  description = "Security Group para las 7 funciones Lambda de Touring Driver"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Permitir salida hacia RDS Proxy y servicios AWS via NAT / VPC Endpoints"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-lambda-sg"
  }
}

# Código empaquetado inicial para Lambdas
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda_payload.zip"

  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Touring Driver Lambda OK' }) });"
    filename = "index.js"
  }
}

# Rol IAM base para Lambdas (VPC Execution + CloudWatch Logs)
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Política IAM adicional para SQS, SES, SNS y S3 Expedientes
resource "aws_iam_policy" "lambda_app_policy" {
  name = "${var.project_name}-lambda-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = ["${aws_sqs_queue.main.arn}*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = ["${aws_s3_bucket.documents.arn}", "${aws_s3_bucket.documents.arn}/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_app_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_app_policy.arn
}

# ----------------------------------------------------
# 1. LAS 6 LAMBDAS DE NEGOCIO (RNF-06 y RNF-18)
# ----------------------------------------------------

# LambdaReservas: Crea, modifica o cancela reservas y envía aviso a SQS
resource "aws_lambda_function" "lambda_reservas" {
  function_name    = "LambdaReservas"
  runtime          = "nodejs22.x"
  handler          = "handlers/reservations.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      RDS_PROXY_HOST = aws_db_proxy.proxy.endpoint
      SQS_QUEUE_URL  = aws_sqs_queue.main.id
    }
  }

  tags = { Component = "LambdaReservas" }
}

# LambdaInstructor: Horarios y disponibilidad de instructores
resource "aws_lambda_function" "lambda_instructor" {
  function_name    = "LambdaInstructor"
  runtime          = "nodejs22.x"
  handler          = "handlers/instructors.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = { RDS_PROXY_HOST = aws_db_proxy.proxy.endpoint }
  }

  tags = { Component = "LambdaInstructor" }
}

# LambdaProgreso: Registra avance, horas y habilidades por alumno
resource "aws_lambda_function" "lambda_progreso" {
  function_name    = "LambdaProgreso"
  runtime          = "nodejs22.x"
  handler          = "handlers/progress.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = { RDS_PROXY_HOST = aws_db_proxy.proxy.endpoint }
  }

  tags = { Component = "LambdaProgreso" }
}

# LambdaSimulacro: Banco de preguntas y calificación de examen
resource "aws_lambda_function" "lambda_simulacro" {
  function_name    = "LambdaSimulacro"
  runtime          = "nodejs22.x"
  handler          = "handlers/exams.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = { RDS_PROXY_HOST = aws_db_proxy.proxy.endpoint }
  }

  tags = { Component = "LambdaSimulacro" }
}

# LambdaEstudiante: Perfil, matrícula y expediente
resource "aws_lambda_function" "lambda_estudiante" {
  function_name    = "LambdaEstudiante"
  runtime          = "nodejs22.x"
  handler          = "handlers/students.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      RDS_PROXY_HOST   = aws_db_proxy.proxy.endpoint
      DOCUMENTS_BUCKET = aws_s3_bucket.documents.id
    }
  }

  tags = { Component = "LambdaEstudiante" }
}

# LambdaVehiculo: Disponibilidad y estado de la flota vehicular
resource "aws_lambda_function" "lambda_vehiculo" {
  function_name    = "LambdaVehiculo"
  runtime          = "nodejs22.x"
  handler          = "handlers/vehicles.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = { RDS_PROXY_HOST = aws_db_proxy.proxy.endpoint }
  }

  tags = { Component = "LambdaVehiculo" }
}

# ----------------------------------------------------
# 2. LAMBDA NOTIFICACIONES (Triggered by Amazon SQS)
# ----------------------------------------------------
resource "aws_lambda_function" "lambda_notificaciones" {
  function_name    = "LambdaNotificaciones"
  runtime          = "nodejs22.x"
  handler          = "handlers/notifications.handler"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = { Component = "LambdaNotificaciones" }
}

# Event Source Mapping: Conecta la cola SQS con LambdaNotificaciones
# Si falla, SQS reintenta hasta 3 veces antes de pasar a la DLQ (RNF-05)
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.lambda_notificaciones.arn
  batch_size       = 5
}
