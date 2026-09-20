# Security groups (imported from the retired CloudFormation stack).

resource "aws_security_group" "alb" {
  name        = "elimuai-fargate-AlbSecurityGroup-VAY1tcvEnixd"
  description = "elimuai ALB SG"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_security_group" "service" {
  name        = "elimuai-fargate-ServiceSecurityGroup-DBAzfHWrhMaI"
  description = "elimuai ECS task SG"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_vpc_security_group_ingress_rule" "service_from_alb" {
  security_group_id            = aws_security_group.service.id
  ip_protocol                  = "tcp"
  from_port                    = 8091
  to_port                      = 8091
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group" "rds" {
  name        = "elimuai-fargate-RdsSecurityGroup-98MIZb3qBPA4"
  description = "elimuai RDS SG"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_service" {
  security_group_id            = aws_security_group.rds.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.service.id
}
