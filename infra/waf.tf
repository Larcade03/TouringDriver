# ============================================================
# AWS WAF — Firewall de Aplicaciones Web
# Diagrama: AWS WAF (conectado a Amazon CloudFront)
# Requerimiento: RNF-15 (Bloqueo de ataques y rate limit de 100 peticiones en 5 min)
# ============================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-waf-${var.environment}"
  description = "Reglas WAF para Touring Driver: Rate Limit (100 req/5min) y proteccion OWASP"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Regla 1: Rate Limiting (RNF-15: mas de 100 peticiones en 5 minutos se bloquean)
  rule {
    name     = "RateLimit100Per5Min"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit100Per5Min"
      sampled_requests_enabled   = true
    }
  }

  # Regla 2: Reglas comunes gestionadas por AWS (OWASP Top 10, SQLi, XSS)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommon"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-metrics"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-waf"
  }
}
