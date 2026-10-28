# Plataforma Touring Driver — Sistema Web e Infraestructura como Código (IaC)

Proyecto desarrollado para el curso **Infraestructura como Código (UPAO)**.
Corresponde a la plataforma de gestión de la Escuela de Conductores **“Touring Driver”**, estructurada en componentes de código de aplicación (`src/`) y definición de infraestructura en la nube (`infra/`).

---

## Estructura del Repositorio

```
IAC/
├── src/
│   ├── web/                    # Aplicación Frontend en React + Vite + CSS Responsive
│   │   ├── Dockerfile          # Imagen multi-stage: Node build + Nginx Alpine
│   │   ├── nginx.conf          # Servidor Nginx para SPA y proxy reverso
│   │   └── src/                # Código fuente (reservas, expedientes, simulacros, progreso)
│   └── backend/                # API REST modular en Node.js + Express + SQLite/Postgres
│       ├── Dockerfile          # Imagen Docker de producción para el backend
│       ├── handlers/           # Handlers para las 7 Lambdas de AWS (Reservas, Instructor, etc.)
│       ├── routes/             # Lógica de negocio segmentada
│       ├── database.js         # Esquema de base de datos con índices de alto rendimiento
│       └── seed.js             # Semillero con usuarios, expedientes y vehículos de prueba
├── infra/                      # Infraestructura como Código en Terraform (Arquitectura AWS)
│   ├── provider.tf             # Proveedor AWS (~> 5.40) y tags globales
│   ├── variables.tf            # Variables parametrizables
│   ├── outputs.tf              # Endpoints y salidas de recursos
│   ├── vpc.tf                  # Red Multi-AZ en 2 Zonas (Az-a y Az-b), NAT y Subnets
│   ├── waf.tf                  # AWS WAFv2 (Rate limit y protección web)
│   ├── cognito.tf              # Amazon Cognito User Pool y Grupos de Roles
│   ├── s3.tf                   # S3 Web SPA y S3 Expedientes de Alumnos
│   ├── cloudfront.tf           # Amazon CloudFront CDN con enrutamiento SPA
│   ├── sqs.tf                  # Amazon SQS y SQS Cola de Fallidos (DLQ)
│   ├── ses.tf                  # Amazon SES Identidad de correo transaccional
│   ├── sns.tf                  # Amazon SNS Tópico de alertas técnicas
│   ├── rds.tf                  # Amazon RDS Multi-AZ (Az-a / Az-b) y Secrets Manager
│   ├── rds_proxy.tf            # Amazon RDS Proxy para pooling de conexiones
│   ├── lambda.tf               # Las 6 Lambdas de negocio + LambdaNotificaciones (SQS)
│   ├── apigateway.tf           # Amazon API Gateway HTTP API con Autorizador JWT
│   ├── cloudwatch.tf           # Amazon CloudWatch Alarms conectadas a SNS
│   └── terraform.tfvars.example # Valores de ejemplo para despliegue
├── docker-compose.yml          # Entorno local multicontenedor (Web + API)
└── .gitignore                  # Exclusiones de Git (node_modules, .terraform, etc.)
```

---

## 1. Despliegue Local con Docker

Para levantar toda la solución en entorno de desarrollo local con un solo comando:

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:80` (servido por Nginx con enrutamiento SPA y proxy a la API)
- **Backend**: `http://localhost:5000` (API REST con persistencia y endpoints listos)

---

## 2. Aprovisionamiento de Infraestructura en AWS con Terraform

1. Acceder al directorio de infraestructura:
   ```bash
   cd infra
   ```

2. Inicializar los proveedores de Terraform:
   ```bash
   terraform init
   ```

3. Validar la sintaxis y coherencia de las referencias:
   ```bash
   terraform validate
   ```

4. Previsualizar los recursos que se crearán:
   ```bash
   terraform plan
   ```

5. Aprovisionar los servicios en AWS:
   ```bash
   terraform apply
   ```

---

## 3. Matriz de Requerimientos No Funcionales (RNF)

| Código | Requerimiento de Negocio / Calidad | Componente AWS Implementado |
| :--- | :--- | :--- |
| **RNF-01 / RNF-02** | 99.9% de disponibilidad y conmutación en menos de 10 min | Amazon RDS Multi-AZ (`rds.tf`) |
| **RNF-03 / RNF-04** | Respaldo diario de base de datos entre 2:00 a.m. y 4:00 a.m. | Parámetro `backup_window` en `rds.tf` |
| **RNF-05** | Avisos que fallan no demoran la reserva ni se pierden | Amazon SQS + DLQ con 3 reintentos (`sqs.tf`) |
| **RNF-06** | Conexiones de base de datos reutilizadas y protegidas | Amazon RDS Proxy (`rds_proxy.tf`) |
| **RNF-07 / RNF-08** | Soporte de 150 concurrentes y picos de 200 sin degradación | API Gateway + Lambdas Serverless (`apigateway.tf`, `lambda.tf`) |
| **RNF-09** | Tiempos de respuesta menores a 2 segundos | Amazon CloudFront CDN + CloudWatch Alarm (`cloudfront.tf`, `cloudwatch.tf`) |
| **RNF-10 / RNF-16** | Cifrado de expedientes médicos y documentos de identidad | Amazon S3 con cifrado SSE-S3 (`s3.tf`) |
| **RNF-13 / RNF-14** | Acceso autenticado y roles de alumnos, instructores y directores | Amazon Cognito User Pool & Groups (`cognito.tf`) |
| **RNF-15** | Protección contra tráfico malicioso y ataques de fuerza bruta | AWS WAFv2 con Rate Limiting (`waf.tf`) |
| **RNF-17** | Notificación en menos de 5 minutos ante cualquier fallo crítico | CloudWatch Alarms + Amazon SNS (`cloudwatch.tf`, `sns.tf`) |
