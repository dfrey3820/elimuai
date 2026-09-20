# RDS Postgres (imported — created 2026-09-18 during the EFS→RDS migration).
# Master password lives in Secrets Manager `elimuai/rds-master` and is NOT
# managed here (ignore_changes below).

resource "aws_db_subnet_group" "main" {
  name       = "elimuai-fargate-rdssubnetgroup-wpvuwbtlocrc"
  subnet_ids = var.public_subnets

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "15.17"
  instance_class = "db.t4g.small"

  db_name  = "elimuai_db"
  username = "elimuai_user"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 7
  backup_window           = "01:00-02:00"
  maintenance_window      = "sun:02:34-sun:03:04"

  auto_minor_version_upgrade = true
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${var.project}-db-final"

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [password, engine_version] # pw in Secrets Manager; minor upgrades auto
  }
}
