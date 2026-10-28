# ============================================================
# RED Y ALTA DISPONIBILIDAD MULTI-AZ (Zona Az-a y Zona Az-b)
# ============================================================

# Detección dinámica de zonas de disponibilidad en la región configurada
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  selected_azs = length(var.availability_zones) >= 2 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw-${var.environment}"
  }
}

# Subredes Públicas (Distribuidas en Zona Az-a y Zona Az-b)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = local.selected_azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-az-${count.index == 0 ? "a" : "b"}"
    Tier = "Public"
  }
}

# Subredes Privadas para Funciones Lambda (2 Zonas)
resource "aws_subnet" "private_app" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.selected_azs[count.index]

  tags = {
    Name = "${var.project_name}-private-app-subnet-az-${count.index == 0 ? "a" : "b"}"
    Tier = "PrivateApp"
  }
}

# Subredes Privadas Aisladas para Amazon RDS Multi-AZ y RDS Proxy (2 Zonas)
resource "aws_subnet" "private_db" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = local.selected_azs[count.index]

  tags = {
    Name = "${var.project_name}-private-db-subnet-az-${count.index == 0 ? "a" : "b"}"
    Tier = "PrivateDB"
  }
}

# IP Elástica y NAT Gateway (permite a Lambdas privadas enviar correos SES y mensajes SQS)
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat-gateway"
  }
}

# Tabla de Enrutamiento Pública
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Tabla de Enrutamiento Privada (vía NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_app" {
  count          = 2
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private.id
}

# Subnet Group para Amazon RDS Multi-AZ (Zona Az-a y Zona Az-b)
resource "aws_db_subnet_group" "rds" {
  name        = "${var.project_name}-rds-subnet-group"
  description = "Subnet group para RDS Multi-AZ en Zona Az-a y Az-b"
  subnet_ids  = aws_subnet.private_db[*].id

  tags = {
    Name = "${var.project_name}-rds-subnet-group"
  }
}
