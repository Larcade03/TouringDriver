# ============================================================
# TERRAFORM S3 BACKEND — Almacenamiento Remoto de Estado
# Requerimiento: FLOW.md Punto 1 y Punto 4
# Clave fija requerida: lab09/dev/terraform.tfstate
# Parámetros 'bucket' y 'region' inyectados vía backend-config
# ============================================================

terraform {
  backend "s3" {
    key = "lab09/dev/terraform.tfstate"
  }
}
