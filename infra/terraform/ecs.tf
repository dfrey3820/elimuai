# ECS cluster, task definition (single task, 9 containers) and service.
# Container layout mirrors task definition elimuai-stack:25 exactly, with all
# app images unified onto var.image_tag (set by CI per deploy).

locals {
  log_group = aws_cloudwatch_log_group.ecs.name

  # HTTP API services fronted by the nginx gateway.
  http_services = {
    auth-service     = 5100
    users-service    = 5101
    schools-service  = 5102
    billing-service  = 5103
    learning-service = 5104
    admin-service    = 5105
  }

  env_files = [{ value = local.env_file_arn, type = "s3" }]

  service_containers = [
    for name, port in local.http_services : {
      name         = name
      image        = "${local.ecr}/${var.project}/${name}:${var.image_tag}"
      essential    = true
      portMappings = [{ containerPort = port, hostPort = port, protocol = "tcp" }]
      environment = [
        { name = "PORT", value = tostring(port) },
        { name = "SERVICE_NAME", value = name },
      ]
      secrets = name == "billing-service" ? [
        { name = "PAYMENT_GATEWAY_API_KEY", valueFrom = "${var.payment_gateway_secret_arn}:PAYMENT_GATEWAY_API_KEY::" },
        { name = "PAYMENT_GATEWAY_API_SECRET", valueFrom = "${var.payment_gateway_secret_arn}:PAYMENT_GATEWAY_API_SECRET::" },
      ] : []
      environmentFiles = local.env_files
      dependsOn        = [{ containerName = "redis", condition = "HEALTHY" }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = local.log_group
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = replace(name, "-service", "")
        }
      }
    }
  ]

  worker_container = {
    name             = "notifications-service"
    image            = "${local.ecr}/${var.project}/notifications-service:${var.image_tag}"
    essential        = true
    command          = ["python", "-m", "app.worker"]
    environment      = [{ name = "SERVICE_NAME", value = "notifications-service" }]
    environmentFiles = local.env_files
    dependsOn        = [{ containerName = "redis", condition = "HEALTHY" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = local.log_group
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "notifications"
      }
    }
  }

  redis_container = {
    name         = "redis"
    image        = "public.ecr.aws/docker/library/redis:7-alpine"
    essential    = true
    portMappings = [{ containerPort = 6379, hostPort = 6379, protocol = "tcp" }]
    command      = ["redis-server", "--appendonly", "no"]
    healthCheck = {
      command     = ["CMD-SHELL", "redis-cli ping | grep -q PONG"]
      interval    = 15
      timeout     = 3
      retries     = 5
      startPeriod = 20
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = local.log_group
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "redis"
      }
    }
  }

  gateway_container = {
    name         = "gateway"
    image        = "${local.ecr}/${var.project}/gateway:${var.image_tag}"
    essential    = true
    portMappings = [{ containerPort = 8091, hostPort = 8091, protocol = "tcp" }]
    dependsOn = [
      for name, _ in local.http_services : { containerName = name, condition = "START" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = local.log_group
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "gateway"
      }
    }
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project}"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

resource "aws_ecs_task_definition" "stack" {
  family                   = "${var.project}-stack"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode(concat(
    [local.redis_container],
    local.service_containers,
    [local.worker_container, local.gateway_container],
  ))
}

resource "aws_ecs_service" "main" {
  name            = "${var.project}-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.stack.arn
  desired_count   = var.min_tasks

  # Until Fargate vCPU quotas are raised (scale_ready=false) only ONE task fits:
  # stop-then-start deploys on Spot. Flip scale_ready for rolling deploys.
  deployment_minimum_healthy_percent = var.scale_ready ? 100 : 0
  deployment_maximum_percent         = var.scale_ready ? 200 : 100

  enable_execute_command = true

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = var.public_subnets
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 8091
  }

  lifecycle {
    ignore_changes = [desired_count] # autoscaling owns it once scale_ready
  }

  depends_on = [aws_lb_listener.https]
}

# ── Autoscaling (only once quotas allow >1 task) ─────────────────────────────

resource "aws_appautoscaling_target" "ecs" {
  count              = var.scale_ready ? 1 : 0
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.min_tasks
  max_capacity       = var.max_tasks
}

resource "aws_appautoscaling_policy" "cpu" {
  count              = var.scale_ready ? 1 : 0
  name               = "${var.project}-cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs[0].service_namespace
  resource_id        = aws_appautoscaling_target.ecs[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[0].scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
