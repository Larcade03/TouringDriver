# Infraestructura como Código (IaC) — Escuela de Conductores “Touring Driver”

Definición de Infraestructura como Código en **Terraform** organizada mediante **archivos específicos por servicio/recurso de AWS**, facilitando la comprensión, el mantenimiento y la sustentación académica de cada componente del diagrama de arquitectura.

---

## 1. Mapeo Directo entre el Diagrama de Arquitectura y los Archivos de Terraform

Cada archivo `.tf` en esta carpeta corresponde de forma directa a un servicio de AWS:

```
infra/
├── provider.tf              # Proveedores de AWS (~> 5.40), random, archive y etiquetas globales
├── variables.tf             # Variables configurables (región, CIDR VPC, ambiente, correos)
├── outputs.tf               # Salidas con URLs públicas, endpoints y ARNs
├── vpc.tf                   # Red Multi-AZ (us-east-1a Az-a y us-east-1b Az-b), subnets y NAT Gateway
├── waf.tf                   # AWS WAFv2 (Rate limit 100 req/5min y reglas administradas de AWS)
├── cognito.tf               # Amazon Cognito User Pool, Client y Grupos (Students, Instructors, Admins)
├── s3.tf                    # S3 Web Bucket (con OAC para SPA) y S3 Expedientes (cifrado AES-256)
├── cloudfront.tf            # Amazon CloudFront CDN con enrutamiento SPA (403/404 a /index.html)
├── sqs.tf                   # Amazon SQS Cola de Notificaciones y Cola de Fallidos (DLQ, 3 intentos)
├── ses.tf                   # Amazon SES Identidad de correo para notificaciones a alumnos
├── sns.tf                   # Amazon SNS Tópico de alertas técnicas con suscripción por email
├── rds.tf                   # Amazon RDS PostgreSQL Multi-AZ (Az-a y Az-b), backup diario y Secrets Manager
├── rds_proxy.tf             # Amazon RDS Proxy para pool de conexiones eficiente para Lambdas
├── lambda.tf                # Las 6 Lambdas de negocio + LambdaNotificaciones con disparador SQS
├── apigateway.tf            # Amazon API Gateway HTTP API con Autorizador JWT de Cognito integrado
├── cloudwatch.tf            # Alarmas CloudWatch (5XX, DLQ, latencia > 2s, CPU > 80%) hacia SNS
└── terraform.tfvars.example # Valores de ejemplo para despliegue
```

| Archivo | Servicios en el Diagrama | Atributos de Calidad (RNFs) |
|---|---|---|
| [`vpc.tf`](vpc.tf) | `Amazon VPC`, `Subnets Públicas/Privadas/DB`, `NAT Gateway` | **Disponibilidad**: Red distribuida en 2 Zonas (`us-east-1a` y `us-east-1b`). |
| [`waf.tf`](waf.tf) | `AWS WAFv2` | **Seguridad (RNF-15)**: Rate limit de 100 req/5min y protección contra ataques web comunes. |
| [`cognito.tf`](cognito.tf) | `Amazon Cognito User Pool & Groups` | **Seguridad (RNF-13, RNF-14)**: Roles de acceso (`Students`, `Instructors`, `Admins`) y emisión JWT. |
| [`s3.tf`](s3.tf) | `Amazon S3 (Web y Expedientes)` | **Seguridad (RNF-10, RNF-16)**: Bucket estático privado con OAC y bucket de expedientes con cifrado en reposo. |
| [`cloudfront.tf`](cloudfront.tf) | `Amazon CloudFront CDN` | **Rendimiento (RNF-12)**: Distribución global HTTPS y caché perimetral de la aplicación React. |
| [`sqs.tf`](sqs.tf) | `Amazon SQS & Dead Letter Queue (DLQ)` | **Tolerancia a fallos (RNF-05)**: Desacopla reservas de notificaciones. Mueve a DLQ tras 3 intentos fallidos. |
| [`ses.tf`](ses.tf) | `Amazon Simple Email Service (SES)` | **Confiabilidad**: Envío transaccional de confirmaciones y recordatorios de clases de manejo. |
| [`sns.tf`](sns.tf) | `Amazon Simple Notification Service (SNS)` | **Observabilidad (RNF-17)**: Avisos inmediatos al correo del equipo técnico ante incidencias. |
| [`rds.tf`](rds.tf) | `Amazon RDS PostgreSQL Multi-AZ` | **Tolerancia a fallos (RNF-01, RNF-02, RNF-03, RNF-04)**: Failover automático < 10 min y respaldo entre 2 y 4 a.m. |
| [`rds_proxy.tf`](rds_proxy.tf) | `Amazon RDS Proxy` | **Escalabilidad (RNF-06)**: Pooling y multiplexación de conexiones de BD evitando saturación por Lambdas. |
| [`lambda.tf`](lambda.tf) | `6 Lambdas de Negocio + LambdaNotificaciones` | **Escalabilidad y Mantenibilidad (RNF-07, RNF-18)**: Microservicios serverless independientes. |
| [`apigateway.tf`](apigateway.tf) | `Amazon API Gateway HTTP API` | **Rendimiento (RNF-07, RNF-08)**: Enrutamiento de alta velocidad con validación JWT en el borde. |
| [`cloudwatch.tf`](cloudwatch.tf) | `Amazon CloudWatch Alarms` | **Observabilidad (RNF-09, RNF-17)**: Detección y alerta en < 5 min (5xx > 1%, latencia > 2s, DLQ, CPU > 80%). |

---

## 2. Requisitos Previos

- **Terraform** $\ge$ 1.5.0
- **AWS CLI** configurado con credenciales (`aws configure`)

---

## 3. Guía de Ejecución Rápida

### Paso 1: Inicializar el entorno
Descarga los proveedores de AWS (`aws`, `random`, `archive`):
```bash
terraform init
```

### Paso 2: Validar la sintaxis
Comprueba que todos los archivos `.tf` estén correctamente referenciados:
```bash
terraform validate
```

### Paso 3: Visualizar el plan de despliegue
Observa los recursos que se van a crear sin alterar la nube:
```bash
terraform plan
```

### Paso 4: Aplicar la infraestructura
Aprovisiona todos los servicios en tu cuenta de AWS:
```bash
terraform apply
```
Al finalizar, Terraform mostrará en consola:
- La URL de CloudFront (tu web pública HTTPS).
- El endpoint de API Gateway.
- Los IDs de Cognito, RDS Proxy y colas SQS.
