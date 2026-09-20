variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "elimuai"
}

variable "vpc_id" {
  type    = string
  default = "vpc-0f4a33b0e45f574f1"
}

variable "public_subnets" {
  type    = list(string)
  default = ["subnet-06ef9077f6e3c5314", "subnet-0d7e057904efb1549", "subnet-078ee7580d380c1d4"]
}

# Default cert (venus.elimuai.africa); apex cert attached additionally below.
variable "certificate_arn" {
  type    = string
  default = "arn:aws:acm:eu-west-1:977233000130:certificate/8d90fa7e-504e-4a57-9b34-6c0c8ef754e2"
}

variable "extra_certificate_arn" {
  type    = string
  default = "arn:aws:acm:eu-west-1:977233000130:certificate/4dd1591f-3db0-4306-9109-9bd7093d8c2e"
}

variable "image_tag" {
  type        = string
  description = "ECR image tag for all app containers (set by CI)."
}

variable "task_cpu" {
  type    = string
  default = "1024"
}

variable "task_memory" {
  type    = string
  default = "3072"
}

# Flip to true once the Fargate vCPU quota increases are approved:
# enables rolling deployments (min 100%/max 200%) and 1-4 task autoscaling.
# Until then the account quota (2 vCPU/pool, shared with other workloads)
# only fits ONE task, so deploys are stop-then-start on Spot.
variable "scale_ready" {
  type    = bool
  default = false
}

variable "min_tasks" {
  type    = number
  default = 1
}

variable "max_tasks" {
  type    = number
  default = 4
}

variable "payment_gateway_secret_arn" {
  type    = string
  default = "arn:aws:secretsmanager:eu-west-1:977233000130:secret:elimuai/payment-gateway-S4yUEB"
}

locals {
  config_bucket  = "${var.project}-config-${data.aws_caller_identity.current.account_id}"
  uploads_bucket = "${var.project}-uploads-${data.aws_caller_identity.current.account_id}"
  ecr            = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  env_file_arn   = "arn:aws:s3:::${local.config_bucket}/env/prod.env"
}
