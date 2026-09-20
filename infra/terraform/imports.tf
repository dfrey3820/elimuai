# One-time import of the live (formerly CloudFormation-managed) resources.
# Safe to keep after the first apply — imports of already-managed resources
# are no-ops. Delete this file once state is settled.

import {
  to = aws_security_group.alb
  id = "sg-08d8a1391e8553f41"
}

import {
  to = aws_security_group.service
  id = "sg-0d570b8dc409e35e6"
}

import {
  to = aws_security_group.rds
  id = "sg-045fc0c3cca96e8a2"
}

import {
  to = aws_vpc_security_group_ingress_rule.service_from_alb
  id = "sgr-0839fbabe25debd40"
}

import {
  to = aws_vpc_security_group_ingress_rule.rds_from_service
  id = "sgr-0fbe9eba30a729846"
}

import {
  to = aws_iam_role.task_execution
  id = "elimuai-ecs-exec-role"
}

import {
  to = aws_iam_role.task
  id = "elimuai-ecs-task-role"
}

import {
  to = aws_iam_role_policy_attachment.task_execution_managed
  id = "elimuai-ecs-exec-role/arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

import {
  to = aws_iam_role_policy.read_config_bucket
  id = "elimuai-ecs-exec-role:ReadConfigBucket"
}

import {
  to = aws_iam_role_policy.read_payment_gateway_secret
  id = "elimuai-ecs-exec-role:ReadPaymentGatewaySecret"
}

import {
  to = aws_iam_role_policy.uploads_bucket_rw
  id = "elimuai-ecs-task-role:UploadsBucketRW"
}

import {
  to = aws_iam_role_policy.ecs_exec_over_ssm
  id = "elimuai-ecs-task-role:EcsExecOverSsm"
}

import {
  to = aws_lb.main
  id = "arn:aws:elasticloadbalancing:eu-west-1:977233000130:loadbalancer/app/elimuai-alb/b712edf49c1f67e3"
}

import {
  to = aws_lb_target_group.gateway
  id = "arn:aws:elasticloadbalancing:eu-west-1:977233000130:targetgroup/elimuai-gw-tg/de5e92706f33c8c5"
}

import {
  to = aws_lb_listener.https
  id = "arn:aws:elasticloadbalancing:eu-west-1:977233000130:listener/app/elimuai-alb/b712edf49c1f67e3/1fd4191969c2e380"
}

import {
  to = aws_lb_listener.http
  id = "arn:aws:elasticloadbalancing:eu-west-1:977233000130:listener/app/elimuai-alb/b712edf49c1f67e3/6744120f037805ae"
}

import {
  to = aws_lb_listener_certificate.apex
  id = "arn:aws:elasticloadbalancing:eu-west-1:977233000130:listener/app/elimuai-alb/b712edf49c1f67e3/1fd4191969c2e380_arn:aws:acm:eu-west-1:977233000130:certificate/4dd1591f-3db0-4306-9109-9bd7093d8c2e"
}

import {
  to = aws_cloudwatch_log_group.ecs
  id = "/ecs/elimuai"
}

import {
  to = aws_ecs_cluster.main
  id = "elimuai-cluster"
}

import {
  to = aws_ecs_cluster_capacity_providers.main
  id = "elimuai-cluster"
}

import {
  to = aws_ecs_service.main
  id = "elimuai-cluster/elimuai-svc"
}

import {
  to = aws_db_subnet_group.main
  id = "elimuai-fargate-rdssubnetgroup-wpvuwbtlocrc"
}

import {
  to = aws_db_instance.main
  id = "elimuai-db"
}
