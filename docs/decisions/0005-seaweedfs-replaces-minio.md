# ADR 0005 - SeaweedFS replaces MinIO for local file storage

- Status: accepted
- Date: 2026-10-26

## Context

The private upload bucket needs an S3-compatible server for local development. The original
plan used MinIO, but its community edition was archived upstream and its images are no longer
pullable: Docker Hub refuses `minio/minio` and `dl.min.io` returns 410. The first builds had to
move MinIO behind the optional `storage` profile so it could not block PostgreSQL and Mailpit.

## Decision

- `infra/docker-compose.yml` runs **SeaweedFS** (`chrislusf/seaweedfs:latest`) as the
  S3-compatible storage behind the `storage` profile, on the same port 9000.
- The bucket stays **`egna-private`** and stays **private**: objects are only reachable
  through the short lived signed URLs the API hands out. Any S3 access key pair works locally,
  so the `egna` / `egna-secret` pair in `apps/api/.env` is unchanged.
- The API keeps talking plain S3 through `@aws-sdk/client-s3`, so the development storage and a
  production object store are interchangeable.
- A future object store change (a hosted S3, another compatible server) only touches
  `infra/docker-compose.yml` and the `S3_*` environment variables.

## Consequences

- `npm run infra:storage` starts SeaweedFS on 9000 (master UI on 9333). There is no web
  console port; inspect the bucket with any S3 client or `aws s3 --endpoint-url`.
- The volume name `egna-minio-data` is kept for continuity with existing developer machines.
- SeaweedFS is the local development storage only; production storage is a separate, later
  decision.
