# ============================================================
# AMAZON S3 — Almacenamiento de Objetos en la Nube
# Diagrama: Amazon Simple Storage Service (Amazon S3)
# Requerimientos: RNF-12 (Carga de página rápida) y RNF-16 (Datos protegidos y cifrados)
# ============================================================

# 1. Bucket S3 para archivos estáticos del Frontend Web (React SPA)
resource "aws_s3_bucket" "web" {
  bucket        = "${var.project_name}-web-frontend-${var.environment}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-web-bucket"
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Bucket S3 Privado para Documentos y Expedientes de Alumnos (Mejora #2 del Informe)
resource "aws_s3_bucket" "documents" {
  bucket        = "${var.project_name}-student-files-${var.environment}"
  force_destroy = false

  tags = {
    Name = "${var.project_name}-documents-bucket"
  }
}

# Versionado para recuperación de documentos y expedientes ante errores (RNF-04)
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado de datos en reposo con AES-256 (RNF-16)
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control (OAC) para que CloudFront acceda a S3 de forma segura
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC para permitir a CloudFront leer de S3 sin exponer el bucket publicamente"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Política de S3 que restringe lectura única y exclusivamente a CloudFront
resource "aws_s3_bucket_policy" "web_policy" {
  bucket = aws_s3_bucket.web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.web.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
