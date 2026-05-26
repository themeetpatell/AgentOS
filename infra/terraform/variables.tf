variable "gcp_project_id" {
  description = "GCP project for Finanshels Neuro."
  type        = string
}

variable "gcp_region" {
  description = "Primary GCP region (Cloud Run, Cloud Tasks)."
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore multi-region or region (eur3, nam5, us-central1, etc.)."
  type        = string
  default     = "nam5"
}

variable "allowed_workspace_domain" {
  description = "Workspace domain allowed for Firebase Auth Google sign-in."
  type        = string
  default     = "finanshels.com"
}

variable "queue_name" {
  description = "Name of the Cloud Tasks queue that dispatches agent runs."
  type        = string
  default     = "agent-runs"
}

variable "api_image" {
  description = "Container image for the API Cloud Run service."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "web_image" {
  description = "Container image for the web Cloud Run service."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}
