export type InventoryOperation =
  | "cloudformation_stacks"
  | "cloudformation_resources"
  | "rds_instances"
  | "rds_clusters"
  | "rds_snapshots"
  | "rds_events"
  | "lambda_functions"
  | "lambda_event_sources"
  | "ec2_instances"
  | "ec2_volumes"
  | "ec2_addresses"
  | "ec2_images"
  | "vpcs"
  | "subnets"
  | "security_groups"
  | "route_tables"
  | "nat_gateways"
  | "internet_gateways"
  | "network_acls"
  | "vpc_endpoints"
  | "network_interfaces"
  | "vpc_peerings"
  | "log_groups_inventory"
  | "log_streams"
  | "cloudtrail_events"
  | "cloudtrail_trails"
  | "dynamodb_tables"
  | "dynamodb_details"
  | "ecs_clusters"
  | "ecs_services"
  | "ecs_tasks"
  | "eks_clusters"
  | "eks_nodegroups"
  | "s3_buckets"
  | "iam_roles"
  | "iam_users"
  | "iam_policies"
  | "load_balancers"
  | "target_groups"
  | "route53_zones"
  | "route53_records"
  | "cloudwatch_alarms"
  | "sqs_queues"
  | "sns_topics"
  | "sns_subscriptions"
  | "api_gateway_apis"
  | "api_gateway_v2_apis"
  | "step_functions"
  | "step_function_executions"
  | "ecr_repositories"
  | "ecr_images"
  | "elasticache_clusters"
  | "cloudfront_distributions"
  | "secrets_metadata"
  | "kms_keys"
  | "backup_vaults"
  | "backup_jobs";
export type Query =
  | {
      operation: InventoryOperation;
      region?: string;
      limit: number;
      resourceId?: string;
      cluster?: string;
      hours: number;
    }
  | {
      operation: "aws_metric";
      region?: string;
      service: "ec2" | "rds" | "lambda" | "dynamodb" | "ecs" | "sqs";
      resourceId: string;
      cluster?: string;
      metric: string;
      hours: number;
    }
  | { operation: "instances" | "log_groups"; region?: string }
  | { operation: "cpu"; instanceId: string; hours: number; region?: string }
  | {
      operation: "logs";
      region?: string;
      logGroup: string;
      hours: number;
      filter: string;
      limit: number;
    }
  | {
      operation: "table";
      table: string;
      limit: number;
      status?: string;
      region?: string;
    };
export interface WidgetSpec {
  id: string;
  type: "chart" | "metric" | "logs" | "table" | "text" | "custom";
  title: string;
  description: string;
  width: "half" | "full";
  connectorId: "aws";
  query?: Query;
  series?: { label: string; query: Query }[];
  custom?: { source: string; bindings: { id: string; query: Query }[] };
  threshold?: number;
  content?: string;
  groupBy?: string;
}
export interface DashboardSpec {
  title: string;
  widgets: WidgetSpec[];
}
export interface Session {
  id: string;
  title: string;
  status: string;
  error: string | null;
  revision: string | null;
  syncStatus: string;
  canEdit: boolean;
  mode: string;
  provider: string;
  dashboard: DashboardSpec;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}
export const getSessionId = () =>
  window.location.pathname.split("/").filter(Boolean)[0] || "";
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result;
}
