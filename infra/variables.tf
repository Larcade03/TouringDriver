variable "aws_region" {
  type        = string
  description = "Región de AWS para el despliegue de infraestructura"
  default     = "us-east-2"
}

variable "project_name" {
  type        = string
  description = "Nombre identificador del proyecto"
  default     = "touring-driver"
}

variable "environment" {
  type        = string
  description = "Ambiente de despliegue (dev, staging, prod)"
  default     = "dev"
}

variable "vpc_cidr" {
  type        = string
  description = "Bloque CIDR para la VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Zonas de disponibilidad para alta disponibilidad Multi-AZ (Az-a y Az-b)"
  default     = []
}

variable "technical_team_email" {
  type        = string
  description = "Correo del equipo técnico para recibir alertas de CloudWatch (RNF-17)"
  default     = "alertas-iac@touringdriver.com"
}
