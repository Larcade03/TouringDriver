# ============================================================
# AMAZON RDS PROXY — Pool de Conexiones de Base de Datos para Lambdas
# Diagrama: Amazon RDS Proxy (conecta las 6 Lambdas con la BD)
# Requerimiento: RNF-06 (Conexiones reutilizadas eficientemente sin saturar RDS)
# ============================================================

# Security Group para Amazon RDS Proxy
resource "aws_security_group" "rds_proxy_sg" {
  name        = "${var.project_name}-rds-proxy-sg"
  description = "Permite conexiones desde las Lambdas hacia RDS Proxy"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Trafico PostgreSQL desde las Lambdas de negocio"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  egress {
    description = "Salida hacia la instancia RDS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "${var.project_name}-rds-proxy-sg"
  }
}

# Rol de IAM para que RDS Proxy pueda leer credenciales de AWS Secrets Manager
resource "aws_iam_role" "rds_proxy_role" {
  name = "${var.project_name}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-rds-proxy-role"
  }
}

resource "aws_iam_policy" "rds_proxy_policy" {
  name        = "${var.project_name}-rds-proxy-policy"
  description = "Permite a RDS Proxy obtener el secreto de la base de datos de Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_proxy_attach" {
  role       = aws_iam_role.rds_proxy_role.name
  policy_arn = aws_iam_policy.rds_proxy_policy.arn
}

# Instancia de Proxy de Amazon RDS (RDS Proxy)
resource "aws_db_proxy" "proxy" {
  name                   = "${var.project_name}-rds-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy_sg.id]
  vpc_subnet_ids         = aws_subnet.private_db[*].id

  auth {
    auth_scheme = "SECRETS"
    description = "Autenticacion mediante Secrets Manager"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  depends_on = [
    aws_db_instance.rds_multi_az,
    aws_iam_role_policy_attachment.rds_proxy_attach
  ]

  tags = {
    Name = "${var.project_name}-rds-proxy"
  }
}

resource "aws_db_proxy_default_target_group" "target_group" {
  db_proxy_name = aws_db_proxy.proxy.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "target" {
  db_proxy_name          = aws_db_proxy.proxy.name
  target_group_name      = aws_db_proxy_default_target_group.target_group.name
  db_instance_identifier = aws_db_instance.rds_multi_az.identifier
}
