# ============================================================
# AMAZON RDS MULTI-AZ — Base de Datos Relacional de Alta Disponibilidad
# Diagrama: Amazon RDS (Zona Az-a) -> Copia automática -> Amazon RDS (Zona Az-b)
# Requerimientos: RNF-01 (99.9% disponibilidad), RNF-02 (Failover < 10 min), RNF-03 y RNF-04 (Respaldos diarios)
# ============================================================

# Contraseña administrada de forma segura
resource "random_password" "db_password" {
  length  = 20
  special = false
}

# AWS Secrets Manager: Almacena credenciales de RDS (RNF-16)
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}-rds-secret-${var.environment}"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "touring_admin"
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.rds_multi_az.address
    port     = 5432
    dbname   = "touring_driver_db"
  })
}

# Security Group para la instancia RDS (permite tráfico únicamente desde RDS Proxy)
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Permite trafico unicamente desde RDS Proxy"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Solo RDS Proxy puede conectarse a RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds_proxy_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# Amazon RDS en dos zonas Multi-AZ (Zona Az-a primaria + copia automática en espera en Zona Az-b)
resource "aws_db_instance" "rds_multi_az" {
  identifier     = "${var.project_name}-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t4g.medium"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "touring_driver_db"
  username = "touring_admin"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  # ALTA DISPONIBILIDAD MULTI-AZ (Zona Az-a + Zona Az-b con failover < 10 min) (RNF-02)
  multi_az = true

  # RESPALDO AUTOMÁTICO DIARIO EN LA MADRUGADA (RNF-03 y RNF-04)
  # Ventana entre las 2:00 y las 4:00 a.m. hora peruana (UTC-5 -> 07:00 a 09:00 UTC)
  backup_window           = "07:00-09:00"
  backup_retention_period = 7 # Guardar copias 7 días
  maintenance_window      = "Sun:09:00-Sun:10:00"

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.project_name}-rds-multi-az"
    Environment = var.environment
  }
}
