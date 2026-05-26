# Finanshels Neuro - Sprint 0 infrastructure stub.
# Will NOT apply cleanly until: APIs enabled, Workload Identity Federation
# wired for CI, and terraform.tfvars (or TF_VAR_* env) provided.

locals {
  apis = toset([
    "run.googleapis.com",
    "cloudtasks.googleapis.com",
    "firestore.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "identitytoolkit.googleapis.com",
  ])
}

resource "google_project_service" "enabled" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false
}

resource "google_firestore_database" "default" {
  provider    = google-beta
  project     = var.gcp_project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.enabled]
}

resource "google_cloud_tasks_queue" "agent_runs" {
  name     = var.queue_name
  location = var.gcp_region

  retry_config {
    max_attempts       = 3
    max_retry_duration = "600s"
    min_backoff        = "2s"
    max_backoff        = "60s"
  }

  rate_limits {
    max_concurrent_dispatches = 20
    max_dispatches_per_second = 5
  }

  depends_on = [google_project_service.enabled]
}

resource "google_service_account" "tasks_invoker" {
  account_id   = "neuro-tasks-invoker"
  display_name = "Finanshels Neuro - Cloud Tasks invoker"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "neuro-api"
  location = var.gcp_region

  template {
    containers {
      image = var.api_image
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "FIREBASE_AUTH_ALLOWED_DOMAIN"
        value = var.allowed_workspace_domain
      }
    }
  }

  depends_on = [google_project_service.enabled]
}

resource "google_cloud_run_v2_service" "web" {
  name     = "neuro-web"
  location = var.gcp_region

  template {
    containers {
      image = var.web_image
      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  depends_on = [google_project_service.enabled]
}

resource "google_cloud_run_v2_service_iam_member" "tasks_can_invoke_api" {
  project  = google_cloud_run_v2_service.api.project
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.tasks_invoker.email}"
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "tasks_invoker_sa" {
  value = google_service_account.tasks_invoker.email
}

output "queue_name" {
  value = google_cloud_tasks_queue.agent_runs.name
}
