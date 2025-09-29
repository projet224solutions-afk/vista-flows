gcloud iam service-accounts create 224solutions-service   --display-name="Service Account for 224SOLUTIONS"
gcloud iam service-accounts create solutions224service   --display-name="Service Account for 224SOLUTIONS"
gcloud config list project
cloudshell-5686
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable maps-backend.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services list --enabled
gcloud iam service-accounts keys create ~/224solutions-key.json   --iam-account=solutions224service@$(gcloud config get-value project).iam.gserviceaccount.com
